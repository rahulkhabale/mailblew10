use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub use_tls: bool,
    pub helo_domain: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpConfig {
    pub id: String,
    pub ip: String,
    pub interface_name: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailMessage {
    pub from: String,
    pub from_name: Option<String>,
    pub to: Vec<String>,
    pub cc: Option<Vec<String>>,
    pub bcc: Option<Vec<String>>,
    pub subject: String,
    pub body_text: Option<String>,
    pub body_html: Option<String>,
    pub reply_to: Option<String>,
    pub headers: Option<Vec<(String, String)>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailRequest {
    pub from: String,
    pub from_name: Option<String>,
    pub to: Vec<String>,
    pub cc: Option<Vec<String>>,
    pub bcc: Option<Vec<String>>,
    pub subject: String,
    pub body_text: Option<String>,
    pub body_html: Option<String>,
    pub reply_to: Option<String>,
}

impl From<EmailRequest> for EmailMessage {
    fn from(req: EmailRequest) -> Self {
        EmailMessage {
            from: req.from,
            from_name: req.from_name,
            to: req.to,
            cc: req.cc,
            bcc: req.bcc,
            subject: req.subject,
            body_text: req.body_text,
            body_html: req.body_html,
            reply_to: req.reply_to,
            headers: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailDelivery {
    pub id: String,
    pub email: EmailMessage,
    pub status: DeliveryStatus,
    pub ip_used: Option<String>,
    pub created_at: DateTime<Utc>,
    pub sent_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DeliveryStatus {
    Pending,
    Sending,
    Sent,
    Failed,
}

impl EmailDelivery {
    pub fn new(email: EmailMessage) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            email,
            status: DeliveryStatus::Pending,
            ip_used: None,
            created_at: Utc::now(),
            sent_at: None,
            error_message: None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct IpStats {
    pub ip: String,
    pub total_sent: u64,
    pub failures: u64,
    pub last_used: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ServerStats {
    pub total_emails: usize,
    pub sent: usize,
    pub failed: usize,
    pub pending: usize,
    pub ip_stats: Vec<IpStats>,
}
