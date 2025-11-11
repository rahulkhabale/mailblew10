use crate::models::{DnsRecord, DnsRecords, Domain};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use dashmap::DashMap;
use hickory_resolver::config::*;
use hickory_resolver::TokioAsyncResolver;
use rand::Rng;
use rsa::pkcs1::EncodeRsaPublicKey;
use rsa::pkcs8::EncodePrivateKey;
use rsa::{RsaPrivateKey, RsaPublicKey};
use std::sync::Arc;
use tracing::{debug, info};
use uuid::Uuid;

pub struct DomainManager {
    pub domains: Arc<DashMap<String, Domain>>,
}

impl DomainManager {
    pub fn new() -> Self {
        Self {
            domains: Arc::new(DashMap::new()),
        }
    }

    pub fn generate_verification_code() -> String {
        let mut rng = rand::thread_rng();
        (0..32)
            .map(|_| format!("{:02x}", rng.gen::<u8>()))
            .collect()
    }

    pub fn generate_dkim_keypair() -> Result<(String, String)> {
        let mut rng = rand::thread_rng();
        let bits = 2048;
        let private_key = RsaPrivateKey::new(&mut rng, bits)?;
        let public_key = RsaPublicKey::from(&private_key);

        // Export keys
        let private_pem = private_key
            .to_pkcs8_pem(rsa::pkcs8::LineEnding::LF)?
            .to_string();
        let public_der = public_key.to_pkcs1_der()?;
        let public_base64 = general_purpose::STANDARD.encode(public_der.as_bytes());

        Ok((public_base64, private_pem))
    }

    pub fn add_domain(&self, domain_name: String) -> Result<Domain> {
        let verification_code = Self::generate_verification_code();
        let (public_key, private_key) = Self::generate_dkim_keypair()?;

        let domain = Domain {
            id: Uuid::new_v4().to_string(),
            domain: domain_name.clone(),
            verification_code: verification_code.clone(),
            dkim_selector: "mailblew".to_string(),
            dkim_public_key: public_key,
            dkim_private_key: private_key,
            verified: false,
            created_at: Utc::now(),
        };

        info!("Adding domain: {}", domain_name);
        self.domains.insert(domain.id.clone(), domain.clone());
        Ok(domain)
    }

    pub fn get_domain(&self, id: &str) -> Option<Domain> {
        self.domains.get(id).map(|d| d.clone())
    }

    pub fn get_all_domains(&self) -> Vec<Domain> {
        self.domains
            .iter()
            .map(|entry| entry.value().clone())
            .collect()
    }

    pub fn delete_domain(&self, id: &str) -> Result<()> {
        if self.domains.remove(id).is_some() {
            Ok(())
        } else {
            anyhow::bail!("Domain not found")
        }
    }

    pub fn get_dns_records(&self, domain: &Domain) -> DnsRecords {
        DnsRecords {
            verification: DnsRecord {
                record_type: "TXT".to_string(),
                record_name: "@".to_string(),
                record_value: format!("mailblew-verification={}", domain.verification_code),
            },
            spf: DnsRecord {
                record_type: "TXT".to_string(),
                record_name: "@".to_string(),
                record_value: "v=spf1 include:spf.mailblew.com ~all".to_string(),
            },
            dkim: DnsRecord {
                record_type: "CNAME".to_string(),
                record_name: format!("{}._domainkey", domain.dkim_selector),
                record_value: format!(
                    "{}._domainkey.mailblew.com",
                    domain.dkim_selector
                ),
            },
            dmarc: DnsRecord {
                record_type: "TXT".to_string(),
                record_name: "_dmarc".to_string(),
                record_value: "v=DMARC1; p=none; rua=mailto:postmaster@mailblew.com".to_string(),
            },
        }
    }

    pub async fn verify_domain(&self, id: &str) -> Result<bool> {
        let domain = self
            .get_domain(id)
            .ok_or_else(|| anyhow::anyhow!("Domain not found"))?;

        // Check verification TXT record
        let resolver = TokioAsyncResolver::tokio(ResolverConfig::default(), ResolverOpts::default());

        match resolver.txt_lookup(&domain.domain).await {
            Ok(response) => {
                let verification_string = format!("mailblew-verification={}", domain.verification_code);

                for txt_record in response.iter() {
                    let txt_data = txt_record
                        .txt_data()
                        .iter()
                        .map(|b| String::from_utf8_lossy(b).to_string())
                        .collect::<Vec<String>>()
                        .join("");

                    debug!("Found TXT record: {}", txt_data);

                    if txt_data.contains(&verification_string) {
                        // Mark domain as verified
                        if let Some(mut d) = self.domains.get_mut(id) {
                            d.verified = true;
                            info!("Domain {} verified successfully", domain.domain);
                            return Ok(true);
                        }
                    }
                }
                Ok(false)
            }
            Err(e) => {
                debug!("Failed to lookup TXT records for {}: {}", domain.domain, e);
                Ok(false)
            }
        }
    }
}
