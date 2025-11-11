use crate::domain_manager::DomainManager;
use crate::models::{DomainRequest, DnsRecords};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use tracing::error;

pub async fn add_domain(
    State(manager): State<Arc<DomainManager>>,
    Json(req): Json<DomainRequest>,
) -> impl IntoResponse {
    match manager.add_domain(req.domain) {
        Ok(domain) => (StatusCode::CREATED, Json(domain)).into_response(),
        Err(e) => {
            error!("Failed to add domain: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn get_domains(State(manager): State<Arc<DomainManager>>) -> impl IntoResponse {
    let domains = manager.get_all_domains();
    Json(domains)
}

pub async fn get_domain(
    State(manager): State<Arc<DomainManager>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match manager.get_domain(&id) {
        Some(domain) => Json(domain).into_response(),
        None => (StatusCode::NOT_FOUND, "Domain not found").into_response(),
    }
}

pub async fn get_dns_records(
    State(manager): State<Arc<DomainManager>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match manager.get_domain(&id) {
        Some(domain) => {
            let records = manager.get_dns_records(&domain);
            Json(records).into_response()
        }
        None => (StatusCode::NOT_FOUND, "Domain not found").into_response(),
    }
}

pub async fn verify_domain(
    State(manager): State<Arc<DomainManager>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match manager.verify_domain(&id).await {
        Ok(verified) => {
            if verified {
                (StatusCode::OK, Json(serde_json::json!({ "verified": true }))).into_response()
            } else {
                (StatusCode::OK, Json(serde_json::json!({ "verified": false, "message": "Verification record not found" }))).into_response()
            }
        }
        Err(e) => {
            error!("Failed to verify domain: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn delete_domain(
    State(manager): State<Arc<DomainManager>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match manager.delete_domain(&id) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => {
            error!("Failed to delete domain: {}", e);
            (StatusCode::NOT_FOUND, e.to_string()).into_response()
        }
    }
}
