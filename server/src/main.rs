mod api;
mod domain_manager;
mod models;
mod smtp;

use anyhow::Result;
use chrono::Utc;
use domain_manager::DomainManager;
use models::{IpConfig, SmtpConfig};
use smtp::{IpPoolManager, SmtpServer};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use tracing_subscriber::EnvFilter;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("debug".parse().unwrap()))
        .init();

    info!("Starting Custom SMTP Server with REST API");

    // Initialize with empty IP pool - IPs will be added via API
    let ip_configs: Vec<IpConfig> = vec![];

    // SMTP configuration for direct delivery (no relay needed!)
    let smtp_config = SmtpConfig {
        helo_domain: "mailblew.net".to_string(),
        smtp_port: 25, // Standard SMTP port for direct delivery
    };

    let ip_pool = Arc::new(IpPoolManager::new(ip_configs));
    let smtp_server = Arc::new(SmtpServer::new(smtp_config, ip_pool.clone(), 50));
    let domain_manager = Arc::new(DomainManager::new());

    // Create API router
    let app = api::create_router(smtp_server, domain_manager)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    let addr = "0.0.0.0:3001";
    info!("API Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
