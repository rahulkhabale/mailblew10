# Custom SMTP Server with IP Rotation

A high-performance, production-ready SMTP server built from scratch in Rust, designed for email SaaS/PaaS platforms like SendGrid. Features automatic IP rotation across 10 IPs for optimal deliverability and reputation management.

## Features

- **Custom SMTP Implementation**: Built from scratch without external SMTP libraries
- **IP Rotation**: Automatically rotates through 10 configured IPs for each email
- **Concurrent Processing**: Handles up to 50 concurrent email sends
- **Retry Mechanism**: Automatic retry with exponential backoff on failures
- **Rate Limiting**: Built-in semaphore-based rate limiting
- **Comprehensive Logging**: Full tracing of all SMTP operations
- **Statistics Tracking**: Real-time monitoring of IP usage, success/failure rates
- **Batch Sending**: Efficient parallel batch email processing
- **MIME Support**: Full support for text, HTML, and multipart emails
- **Authentication**: Support for SMTP AUTH LOGIN

## Architecture

```
┌─────────────────┐
│  SmtpServer     │
│  - Config       │
│  - IP Pool      │
│  - Rate Limiter │
└────────┬────────┘
         │
         ├──> IpPoolManager (Round-robin IP selection)
         │    ├─> IP 1: 192.168.1.100
         │    ├─> IP 2: 192.168.1.101
         │    ├─> IP 3: 192.168.1.102
         │    └─> ... (10 IPs total)
         │
         └──> SmtpClient (Custom SMTP protocol)
              ├─> TCP Connection with Source IP Binding
              ├─> EHLO/HELO
              ├─> AUTH LOGIN
              ├─> MAIL FROM / RCPT TO
              └─> DATA (MIME formatted email)
```

## Installation

1. Ensure you have Rust installed:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. Navigate to the server directory:
```bash
cd /Users/rahulkhabale/Desktop/mailblew10/server
```

3. Build the project:
```bash
cargo build --release
```

## Configuration

### 1. Configure Your IP Pool

Update the IP addresses in `src/main.rs` (lines 466-517) with your actual server IPs:

```rust
let ip_configs = vec![
    IpConfig {
        ip: "YOUR_IP_1".to_string(),
        interface_name: "eth0".to_string(),
        enabled: true,
    },
    // ... configure all 10 IPs
];
```

### 2. Configure SMTP Settings

Update the SMTP configuration in `src/main.rs` (lines 520-527):

```rust
let smtp_config = SmtpConfig {
    host: "smtp.your-server.com".to_string(),
    port: 587,  // or 25, 465, 2525
    username: Some("your-username".to_string()),
    password: Some("your-password".to_string()),
    use_tls: false,  // Set to true for STARTTLS
    helo_domain: "yourdomain.com".to_string(),
};
```

## Usage

### Basic Email Sending

```rust
let email = EmailMessage {
    from: "noreply@yourdomain.com".to_string(),
    from_name: Some("Your Company".to_string()),
    to: vec!["customer@example.com".to_string()],
    cc: None,
    bcc: None,
    subject: "Welcome!".to_string(),
    body_text: Some("Plain text version".to_string()),
    body_html: Some("<h1>HTML version</h1>".to_string()),
    reply_to: Some("support@yourdomain.com".to_string()),
    headers: None,
};

match smtp_server.send_email(email).await {
    Ok(msg) => info!("Email sent: {}", msg),
    Err(e) => error!("Failed: {}", e),
}
```

### Batch Sending

```rust
let batch_emails = vec![
    EmailMessage { /* ... */ },
    EmailMessage { /* ... */ },
    EmailMessage { /* ... */ },
];

let results = smtp_server.send_batch(batch_emails).await;
for result in results {
    match result {
        Ok(msg) => println!("Success: {}", msg),
        Err(e) => println!("Error: {}", e),
    }
}
```

### Running the Server

```bash
# Development mode with logging
RUST_LOG=debug cargo run

# Production mode
cargo run --release

# Run in background
nohup cargo run --release > smtp_server.log 2>&1 &
```

## IP Rotation Strategies

The system supports two IP selection strategies:

1. **Round-Robin** (Default): `get_next_ip()` - Cycles through IPs sequentially
2. **Random**: `get_random_ip()` - Randomly selects an IP for each email

You can modify the strategy in `SmtpServer::send_email()` method.

## Monitoring

### IP Usage Statistics

The server tracks detailed statistics for each IP:

```rust
let stats = ip_pool.get_stats();
for (ip, stat) in stats {
    println!("IP: {} | Sent: {} | Failures: {}",
        ip, stat.total_sent, stat.failures);
}
```

### Logging Levels

Set the `RUST_LOG` environment variable:

```bash
RUST_LOG=info cargo run    # Standard logging
RUST_LOG=debug cargo run   # Detailed SMTP protocol logging
RUST_LOG=warn cargo run    # Warnings and errors only
```

## Production Deployment

### Prerequisites

1. **IP Configuration**: Ensure all 10 IPs are properly configured on your server:
```bash
# Check configured IPs
ip addr show

# Add IP alias (example)
sudo ip addr add 192.168.1.101/24 dev eth0
```

2. **DNS Configuration**: Set up proper SPF, DKIM, and DMARC records for all IPs

3. **Firewall Rules**: Allow outbound SMTP traffic:
```bash
# Allow SMTP ports
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp
sudo ufw allow 465/tcp
```

### Systemd Service

Create `/etc/systemd/system/smtp-server.service`:

```ini
[Unit]
Description=Custom SMTP Server with IP Rotation
After=network.target

[Service]
Type=simple
User=smtp
WorkingDirectory=/opt/smtp-server
ExecStart=/opt/smtp-server/target/release/server
Restart=always
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable smtp-server
sudo systemctl start smtp-server
sudo systemctl status smtp-server
```

## Performance Tuning

### Concurrent Connections

Adjust the maximum concurrent connections (default: 50):

```rust
let smtp_server = SmtpServer::new(smtp_config, ip_pool.clone(), 100); // 100 concurrent
```

### Retry Configuration

Modify retry attempts in `send_with_retry()` method:

```rust
match self.send_with_retry(&ip_config.ip, &email, 5).await { // 5 retries instead of 3
```

### Timeout Settings

Adjust connection timeout in `SmtpClient::send_email()`:

```rust
// Add timeout wrapper
tokio::time::timeout(
    Duration::from_secs(60),
    client.send_email(email)
).await??;
```

## API Integration

To integrate with your web application, consider adding:

1. **REST API**: Use `axum` or `actix-web` to expose HTTP endpoints
2. **Message Queue**: Integrate with Redis or RabbitMQ for job queuing
3. **Webhook Support**: Add delivery status callbacks
4. **Template Engine**: Support for email templates

## Troubleshooting

### Connection Refused

```
Error: Connection refused (os error 61)
```

**Solution**: Check SMTP server is reachable and port is correct

### Authentication Failed

```
Error: SMTP error: 535 Authentication failed
```

**Solution**: Verify username/password and AUTH method support

### IP Binding Failed

```
Error: Cannot assign requested address
```

**Solution**: Ensure the IP is configured on your network interface

### Rate Limiting

If experiencing rate limits:
- Increase delay between retries
- Reduce concurrent connections
- Implement per-IP rate limiting

## Email Best Practices

1. **Warm Up IPs**: Gradually increase sending volume on new IPs
2. **Monitor Reputation**: Track bounce rates and spam complaints
3. **SPF/DKIM**: Configure proper email authentication
4. **List Hygiene**: Remove invalid/bounced addresses
5. **Engagement**: Monitor open/click rates per IP

## License

MIT

## Support

For issues or questions, please open an issue on the GitHub repository.
