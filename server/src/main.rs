mod api;
mod models;
mod smtp;

use anyhow::Result;
use chrono::Utc;
use models::{IpConfig, SmtpConfig};
use smtp::{IpPoolManager, SmtpServer};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().with_env_filter("info").init();

    info!("Starting Custom SMTP Server with REST API");

    // Initialize with some default IPs - these will be managed via API
    let ip_configs = vec![
        IpConfig {
            id: Uuid::new_v4().to_string(),
            ip: "127.0.0.1".to_string(), // Default localhost for testing
            interface_name: "lo0".to_string(),
            enabled: true,
            created_at: Some(Utc::now()),
        },
    ];

    // SMTP configuration - UPDATE WITH YOUR SMTP SERVER DETAILS
    let smtp_config = SmtpConfig {
        host: "smtp.gmail.com".to_string(), // or your SMTP relay server
        port: 587,
        username: Some("your-email@gmail.com".to_string()),
        password: Some("your-app-password".to_string()),
        use_tls: false,
        helo_domain: "yourdomain.com".to_string(),
    };

    let ip_pool = Arc::new(IpPoolManager::new(ip_configs));
    let smtp_server = Arc::new(SmtpServer::new(smtp_config, ip_pool.clone(), 50));

    // Create API router
    let app = api::create_router(smtp_server)
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
