use crate::models::{EmailMessage, SmtpConfig};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use std::net::{IpAddr, SocketAddr};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tracing::debug;
use uuid::Uuid;

pub struct SmtpClient {
    config: SmtpConfig,
    source_ip: Option<IpAddr>,
}

impl SmtpClient {
    pub fn new(config: SmtpConfig, source_ip: Option<IpAddr>) -> Self {
        Self { config, source_ip }
    }

    pub async fn send_email(&self, email: &EmailMessage) -> Result<String> {
        // Create TCP connection with optional source IP binding
        let socket = if let Some(ip) = self.source_ip {
            let bind_addr = SocketAddr::new(ip, 0);
            let socket = tokio::net::TcpSocket::new_v4()?;
            socket.bind(bind_addr)?;
            let server_addr = format!("{}:{}", self.config.host, self.config.port);
            socket.connect(server_addr.parse()?).await?
        } else {
            TcpStream::connect(format!("{}:{}", self.config.host, self.config.port)).await?
        };

        let (read_half, mut write_half) = socket.into_split();
        let mut reader = BufReader::new(read_half);

        // Read server greeting
        let greeting = self.read_response(&mut reader).await?;
        debug!("Server greeting: {}", greeting);

        // Send EHLO/HELO
        self.send_command(&mut write_half, &format!("EHLO {}", self.config.helo_domain))
            .await?;
        let ehlo_response = self.read_response(&mut reader).await?;
        debug!("EHLO response: {}", ehlo_response);

        // AUTH LOGIN if credentials provided
        if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
            self.send_command(&mut write_half, "AUTH LOGIN").await?;
            self.read_response(&mut reader).await?;

            let encoded_username = general_purpose::STANDARD.encode(username);
            self.send_command(&mut write_half, &encoded_username).await?;
            self.read_response(&mut reader).await?;

            let encoded_password = general_purpose::STANDARD.encode(password);
            self.send_command(&mut write_half, &encoded_password).await?;
            let auth_response = self.read_response(&mut reader).await?;
            debug!("AUTH response: {}", auth_response);
        }

        // MAIL FROM
        self.send_command(&mut write_half, &format!("MAIL FROM:<{}>", email.from))
            .await?;
        self.read_response(&mut reader).await?;

        // RCPT TO (combine to, cc, bcc)
        let mut all_recipients = email.to.clone();
        if let Some(cc) = &email.cc {
            all_recipients.extend(cc.clone());
        }
        if let Some(bcc) = &email.bcc {
            all_recipients.extend(bcc.clone());
        }

        for recipient in &all_recipients {
            self.send_command(&mut write_half, &format!("RCPT TO:<{}>", recipient))
                .await?;
            self.read_response(&mut reader).await?;
        }

        // DATA
        self.send_command(&mut write_half, "DATA").await?;
        self.read_response(&mut reader).await?;

        // Build and send email body
        let email_body = self.build_email_body(email)?;
        write_half.write_all(email_body.as_bytes()).await?;
        write_half.write_all(b"\r\n.\r\n").await?;
        let data_response = self.read_response(&mut reader).await?;

        // QUIT
        self.send_command(&mut write_half, "QUIT").await?;
        let quit_response = self.read_response(&mut reader).await?;
        debug!("QUIT response: {}", quit_response);

        Ok(data_response)
    }

    async fn send_command(
        &self,
        writer: &mut tokio::net::tcp::OwnedWriteHalf,
        command: &str,
    ) -> Result<()> {
        debug!("Sending: {}", command);
        writer.write_all(command.as_bytes()).await?;
        writer.write_all(b"\r\n").await?;
        writer.flush().await?;
        Ok(())
    }

    async fn read_response(
        &self,
        reader: &mut BufReader<tokio::net::tcp::OwnedReadHalf>,
    ) -> Result<String> {
        let mut line = String::new();
        reader.read_line(&mut line).await?;
        let trimmed = line.trim().to_string();
        debug!("Received: {}", trimmed);

        // Check for error codes (4xx, 5xx)
        if let Some(code) = trimmed.split_whitespace().next() {
            if code.starts_with('4') || code.starts_with('5') {
                anyhow::bail!("SMTP error: {}", trimmed);
            }
        }

        Ok(trimmed)
    }

    fn build_email_body(&self, email: &EmailMessage) -> Result<String> {
        let mut body = String::new();
        let message_id = format!(
            "<{}.{}@{}>",
            Uuid::new_v4(),
            Utc::now().timestamp(),
            self.config.helo_domain
        );
        let date = Utc::now().to_rfc2822();

        // Standard headers
        body.push_str(&format!("Message-ID: {}\r\n", message_id));
        body.push_str(&format!("Date: {}\r\n", date));

        // From header
        if let Some(ref name) = email.from_name {
            body.push_str(&format!("From: \"{}\" <{}>\r\n", name, email.from));
        } else {
            body.push_str(&format!("From: <{}>\r\n", email.from));
        }

        // To header
        body.push_str(&format!("To: {}\r\n", email.to.join(", ")));

        // CC header
        if let Some(ref cc) = email.cc {
            if !cc.is_empty() {
                body.push_str(&format!("Cc: {}\r\n", cc.join(", ")));
            }
        }

        // Reply-To header
        if let Some(ref reply_to) = email.reply_to {
            body.push_str(&format!("Reply-To: <{}>\r\n", reply_to));
        }

        // Subject
        body.push_str(&format!("Subject: {}\r\n", email.subject));

        // Custom headers
        if let Some(ref headers) = email.headers {
            for (key, value) in headers {
                body.push_str(&format!("{}: {}\r\n", key, value));
            }
        }

        // MIME headers and body
        match (&email.body_text, &email.body_html) {
            (Some(text), Some(html)) => {
                let boundary = format!("----=_Part_{}", Uuid::new_v4());
                body.push_str("MIME-Version: 1.0\r\n");
                body.push_str(&format!(
                    "Content-Type: multipart/alternative; boundary=\"{}\"\r\n",
                    boundary
                ));
                body.push_str("\r\n");

                // Plain text part
                body.push_str(&format!("--{}\r\n", boundary));
                body.push_str("Content-Type: text/plain; charset=UTF-8\r\n");
                body.push_str("Content-Transfer-Encoding: 7bit\r\n\r\n");
                body.push_str(text);
                body.push_str("\r\n");

                // HTML part
                body.push_str(&format!("--{}\r\n", boundary));
                body.push_str("Content-Type: text/html; charset=UTF-8\r\n");
                body.push_str("Content-Transfer-Encoding: 7bit\r\n\r\n");
                body.push_str(html);
                body.push_str("\r\n");

                body.push_str(&format!("--{}--\r\n", boundary));
            }
            (Some(text), None) => {
                body.push_str("MIME-Version: 1.0\r\n");
                body.push_str("Content-Type: text/plain; charset=UTF-8\r\n");
                body.push_str("Content-Transfer-Encoding: 7bit\r\n\r\n");
                body.push_str(text);
            }
            (None, Some(html)) => {
                body.push_str("MIME-Version: 1.0\r\n");
                body.push_str("Content-Type: text/html; charset=UTF-8\r\n");
                body.push_str("Content-Transfer-Encoding: 7bit\r\n\r\n");
                body.push_str(html);
            }
            (None, None) => {
                body.push_str("MIME-Version: 1.0\r\n");
                body.push_str("Content-Type: text/plain; charset=UTF-8\r\n\r\n");
            }
        }

        Ok(body)
    }
}
