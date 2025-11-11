use crate::models::{DeliveryStatus, EmailDelivery, EmailMessage, IpConfig, SmtpConfig};
use crate::smtp::client::SmtpClient;
use anyhow::{Context, Result};
use chrono::Utc;
use dashmap::DashMap;
use hickory_resolver::TokioAsyncResolver;
use hickory_resolver::config::*;
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, Semaphore};
use tracing::{debug, error, info, warn};

#[derive(Debug, Clone)]
pub struct IpStatistics {
    pub total_sent: u64,
    pub last_used: Instant,
    pub failures: u64,
}

pub struct IpPoolManager {
    pub ips: Arc<Mutex<Vec<IpConfig>>>,
    current_index: Arc<Mutex<usize>>,
    pub usage_stats: Arc<DashMap<String, IpStatistics>>,
}

impl IpPoolManager {
    pub fn new(ips: Vec<IpConfig>) -> Self {
        let usage_stats = Arc::new(DashMap::new());
        for ip in &ips {
            usage_stats.insert(
                ip.ip.clone(),
                IpStatistics {
                    total_sent: 0,
                    last_used: Instant::now(),
                    failures: 0,
                },
            );
        }

        Self {
            ips: Arc::new(Mutex::new(ips)),
            current_index: Arc::new(Mutex::new(0)),
            usage_stats,
        }
    }

    pub async fn get_next_ip(&self) -> Result<IpConfig> {
        let ips = self.ips.lock().await;
        let enabled_ips: Vec<_> = ips.iter().filter(|ip| ip.enabled).collect();

        if enabled_ips.is_empty() {
            anyhow::bail!("No IPs available in the pool");
        }

        let mut index = self.current_index.lock().await;
        let ip = enabled_ips[*index % enabled_ips.len()].clone();
        *index = (*index + 1) % enabled_ips.len();

        if let Some(mut stats) = self.usage_stats.get_mut(&ip.ip) {
            stats.last_used = Instant::now();
        }

        info!("Selected IP: {} for next email", ip.ip);
        Ok(ip)
    }

    pub async fn add_ip(&self, ip: IpConfig) {
        self.usage_stats.insert(
            ip.ip.clone(),
            IpStatistics {
                total_sent: 0,
                last_used: Instant::now(),
                failures: 0,
            },
        );
        let mut ips = self.ips.lock().await;
        ips.push(ip);
    }

    pub async fn update_ip(&self, id: &str, enabled: bool) -> Result<()> {
        let mut ips = self.ips.lock().await;
        if let Some(ip) = ips.iter_mut().find(|i| i.id == id) {
            ip.enabled = enabled;
            Ok(())
        } else {
            anyhow::bail!("IP not found")
        }
    }

    pub async fn delete_ip(&self, id: &str) -> Result<()> {
        let mut ips = self.ips.lock().await;
        if let Some(pos) = ips.iter().position(|i| i.id == id) {
            let removed = ips.remove(pos);
            self.usage_stats.remove(&removed.ip);
            Ok(())
        } else {
            anyhow::bail!("IP not found")
        }
    }

    pub async fn get_all_ips(&self) -> Vec<IpConfig> {
        self.ips.lock().await.clone()
    }

    pub fn record_success(&self, ip: &str) {
        if let Some(mut stats) = self.usage_stats.get_mut(ip) {
            stats.total_sent += 1;
        }
    }

    pub fn record_failure(&self, ip: &str) {
        if let Some(mut stats) = self.usage_stats.get_mut(ip) {
            stats.failures += 1;
        }
    }
}

pub struct SmtpServer {
    pub config: SmtpConfig,
    pub ip_pool: Arc<IpPoolManager>,
    rate_limiter: Arc<Semaphore>,
    pub deliveries: Arc<DashMap<String, EmailDelivery>>,
}

impl SmtpServer {
    pub fn new(config: SmtpConfig, ip_pool: Arc<IpPoolManager>, max_concurrent: usize) -> Self {
        Self {
            config,
            ip_pool,
            rate_limiter: Arc::new(Semaphore::new(max_concurrent)),
            deliveries: Arc::new(DashMap::new()),
        }
    }

    pub async fn send_email(&self, email: EmailMessage) -> Result<String> {
        // Create delivery record
        let delivery = EmailDelivery::new(email.clone());
        let delivery_id = delivery.id.clone();
        self.deliveries.insert(delivery_id.clone(), delivery);

        // Update status to sending
        if let Some(mut d) = self.deliveries.get_mut(&delivery_id) {
            d.status = DeliveryStatus::Sending;
        }

        let _permit = self.rate_limiter.acquire().await?;

        // Get next IP from pool
        let ip_config = self.ip_pool.get_next_ip().await?;

        info!(
            "Sending email from {} to {:?} using IP {}",
            email.from, email.to, ip_config.ip
        );

        // Update delivery with IP used
        if let Some(mut d) = self.deliveries.get_mut(&delivery_id) {
            d.ip_used = Some(ip_config.ip.clone());
        }

        match self.send_with_retry(&ip_config.ip, &email, 3).await {
            Ok(_response) => {
                self.ip_pool.record_success(&ip_config.ip);
                info!("Email sent successfully via IP {}", ip_config.ip);

                // Update delivery status
                if let Some(mut d) = self.deliveries.get_mut(&delivery_id) {
                    d.status = DeliveryStatus::Sent;
                    d.sent_at = Some(Utc::now());
                }

                Ok(delivery_id)
            }
            Err(e) => {
                self.ip_pool.record_failure(&ip_config.ip);
                error!("Failed to send email via IP {}: {}", ip_config.ip, e);

                // Update delivery status
                if let Some(mut d) = self.deliveries.get_mut(&delivery_id) {
                    d.status = DeliveryStatus::Failed;
                    d.error_message = Some(e.to_string());
                }

                Err(e)
            }
        }
    }

    async fn lookup_mx_servers(&self, domain: &str) -> Result<Vec<String>> {
        let resolver = TokioAsyncResolver::tokio(
            ResolverConfig::default(),
            ResolverOpts::default()
        );

        let mx_records = resolver.mx_lookup(domain).await
            .context(format!("Failed to lookup MX records for {}", domain))?;

        let mut servers: Vec<(u16, String)> = mx_records
            .iter()
            .map(|mx| (mx.preference(), mx.exchange().to_string()))
            .collect();

        // Sort by preference (lower is higher priority)
        servers.sort_by_key(|&(pref, _)| pref);

        let mx_list: Vec<String> = servers.into_iter().map(|(_, host)| {
            // Remove trailing dot if present
            let mut h = host;
            if h.ends_with('.') {
                h.pop();
            }
            h
        }).collect();

        if mx_list.is_empty() {
            anyhow::bail!("No MX records found for {}", domain);
        }

        debug!("Found MX servers for {}: {:?}", domain, mx_list);
        Ok(mx_list)
    }

    async fn resolve_hostname(&self, hostname: &str) -> Result<String> {
        let resolver = TokioAsyncResolver::tokio(
            ResolverConfig::default(),
            ResolverOpts::default()
        );

        let response = resolver.lookup_ip(hostname).await
            .context(format!("Failed to resolve hostname: {}", hostname))?;

        let ip = response.iter().next()
            .context("No IP addresses found for hostname")?;

        debug!("Resolved {} to {}", hostname, ip);
        Ok(ip.to_string())
    }

    async fn send_with_retry(
        &self,
        source_ip: &str,
        email: &EmailMessage,
        max_retries: u32,
    ) -> Result<String> {
        // Extract domain from first recipient
        let recipient = email.to.first()
            .context("No recipients specified")?;
        let domain = recipient.split('@')
            .nth(1)
            .context("Invalid email format")?;

        // Lookup MX servers
        let mx_servers = self.lookup_mx_servers(domain).await?;
        info!("MX servers for {}: {:?}", domain, mx_servers);

        let mut attempts = 0;
        let mut last_error = None;

        // Try each MX server
        for mx_server in &mx_servers {
            // Resolve MX hostname to IP
            let mx_ip = match self.resolve_hostname(mx_server).await {
                Ok(ip) => ip,
                Err(e) => {
                    warn!("Failed to resolve {}: {}", mx_server, e);
                    continue; // Try next MX server
                }
            };

            attempts = 0;
            loop {
                attempts += 1;

                let ip_addr = IpAddr::from_str(source_ip)
                    .context(format!("Invalid IP address: {}", source_ip))?;

                let client = SmtpClient::new(self.config.clone(), Some(ip_addr));

                info!("Attempting to send via MX server: {} ({})", mx_server, mx_ip);
                match client.send_email(email, &mx_ip).await {
                    Ok(response) => {
                        info!("Successfully sent via MX server: {} ({})", mx_server, mx_ip);
                        return Ok(response);
                    }
                    Err(e) => {
                        warn!("Send attempt {} to {} failed: {}", attempts, mx_server, e);
                        last_error = Some(e);
                        if attempts >= max_retries {
                            break; // Try next MX server
                        }
                        tokio::time::sleep(Duration::from_secs(2u64.pow(attempts - 1))).await;
                    }
                }
            }
        }

        Err(anyhow::anyhow!(
            "Failed to send email after trying all MX servers: {}",
            last_error.map(|e| e.to_string()).unwrap_or_else(|| "Unknown error".to_string())
        ))
    }

    pub fn get_delivery(&self, id: &str) -> Option<EmailDelivery> {
        self.deliveries.get(id).map(|d| d.clone())
    }

    pub fn get_all_deliveries(&self) -> Vec<EmailDelivery> {
        self.deliveries
            .iter()
            .map(|entry| entry.value().clone())
            .collect()
    }
}

impl Clone for SmtpServer {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            ip_pool: Arc::clone(&self.ip_pool),
            rate_limiter: Arc::clone(&self.rate_limiter),
            deliveries: Arc::clone(&self.deliveries),
        }
    }
}
