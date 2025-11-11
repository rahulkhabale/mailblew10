mod domains;

use crate::domain_manager::DomainManager;
use crate::models::*;
use crate::smtp::SmtpServer;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde_json::json;
use std::sync::Arc;
use tracing::info;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub smtp_server: Arc<SmtpServer>,
    pub domain_manager: Arc<DomainManager>,
}

pub fn create_router(smtp_server: Arc<SmtpServer>, domain_manager: Arc<DomainManager>) -> Router {
    let state = AppState {
        smtp_server,
        domain_manager,
    };

    Router::new()
        // Email routes
        .route("/api/emails/send", post(send_email))
        .route("/api/emails", get(get_all_emails))
        .route("/api/emails/:id", get(get_email))
        // IP routes
        .route("/api/ips", get(get_all_ips))
        .route("/api/ips", post(add_ip))
        .route("/api/ips/:id", put(update_ip))
        .route("/api/ips/:id", delete(delete_ip))
        // Domain routes
        .route("/api/domains", post(domains::add_domain))
        .route("/api/domains", get(domains::get_domains))
        .route("/api/domains/:id", get(domains::get_domain))
        .route("/api/domains/:id/dns", get(domains::get_dns_records))
        .route("/api/domains/:id/verify", post(domains::verify_domain))
        .route("/api/domains/:id", delete(domains::delete_domain))
        // Stats routes
        .route("/api/stats", get(get_stats))
        .with_state(state)
}

// ==================== Email Handlers ====================

async fn send_email(
    State(state): State<AppState>,
    Json(req): Json<EmailRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!("Received email send request");

    let email: EmailMessage = req.into();

    match state.smtp_server.send_email(email).await {
        Ok(delivery_id) => Ok((
            StatusCode::OK,
            Json(json!({
                "success": true,
                "delivery_id": delivery_id,
                "message": "Email queued for delivery"
            })),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to send email: {}", e),
        )),
    }
}

async fn get_all_emails(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let deliveries = state.smtp_server.get_all_deliveries();
    Ok(Json(deliveries))
}

async fn get_email(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.smtp_server.get_delivery(&id) {
        Some(delivery) => Ok(Json(delivery)),
        None => Err((StatusCode::NOT_FOUND, "Email not found".to_string())),
    }
}

// ==================== IP Handlers ====================

#[derive(serde::Deserialize)]
struct AddIpRequest {
    ip: String,
    interface_name: String,
}

async fn get_all_ips(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let ips = state.smtp_server.ip_pool.get_all_ips().await;
    Ok(Json(ips))
}

async fn add_ip(
    State(state): State<AppState>,
    Json(req): Json<AddIpRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let ip_config = IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: req.ip,
        interface_name: req.interface_name,
        enabled: true,
        created_at: Some(Utc::now()),
    };

    state.smtp_server.ip_pool.add_ip(ip_config.clone()).await;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "success": true,
            "ip": ip_config
        })),
    ))
}

#[derive(serde::Deserialize)]
struct UpdateIpRequest {
    enabled: bool,
}

async fn update_ip(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateIpRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.smtp_server.ip_pool.update_ip(&id, req.enabled).await {
        Ok(_) => Ok(Json(json!({
            "success": true,
            "message": "IP updated successfully"
        }))),
        Err(e) => Err((StatusCode::NOT_FOUND, e.to_string())),
    }
}

async fn delete_ip(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match state.smtp_server.ip_pool.delete_ip(&id).await {
        Ok(_) => Ok(Json(json!({
            "success": true,
            "message": "IP deleted successfully"
        }))),
        Err(e) => Err((StatusCode::NOT_FOUND, e.to_string())),
    }
}

// ==================== Stats Handler ====================

async fn get_stats(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let deliveries = state.smtp_server.get_all_deliveries();

    let total_emails = deliveries.len();
    let sent = deliveries
        .iter()
        .filter(|d| d.status == DeliveryStatus::Sent)
        .count();
    let failed = deliveries
        .iter()
        .filter(|d| d.status == DeliveryStatus::Failed)
        .count();
    let pending = deliveries
        .iter()
        .filter(|d| matches!(d.status, DeliveryStatus::Pending | DeliveryStatus::Sending))
        .count();

    let mut ip_stats = Vec::new();
    for entry in state.smtp_server.ip_pool.usage_stats.iter() {
        let (ip, stats) = (entry.key(), entry.value());
        ip_stats.push(IpStats {
            ip: ip.clone(),
            total_sent: stats.total_sent,
            failures: stats.failures,
            last_used: None,
        });
    }

    let server_stats = ServerStats {
        total_emails,
        sent,
        failed,
        pending,
        ip_stats,
    };

    Ok(Json(server_stats))
}
