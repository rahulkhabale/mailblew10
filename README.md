# MailBlew

A production-ready, custom SMTP server with automatic IP rotation, built for SaaS/PaaS email delivery platforms like SendGrid. Features a modern web interface for managing IP addresses, composing emails, and tracking deliveries in real-time.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange.svg)
![Next.js](https://img.shields.io/badge/next.js-16.0-black.svg)

**🔗 Repository**: https://github.com/rahulkhabale/mailblew10

## Quick Deploy

```bash
# Clone and deploy to your server
ssh root@your-server-ip
cd /opt
git clone https://github.com/rahulkhabale/mailblew10.git mailblew
cd mailblew && ./deploy-to-contabo.sh
```

See [SIMPLE_DEPLOY.md](SIMPLE_DEPLOY.md) for complete deployment guide.

## Features

### Backend (Rust)
- **Custom SMTP Implementation**: Built from scratch without external SMTP libraries
- **Automatic IP Rotation**: Round-robin distribution across multiple IPv4 addresses
- **REST API**: Full-featured API for email sending and management
- **High Performance**: Async/await with Tokio for maximum throughput
- **Retry Mechanism**: Automatic retry with exponential backoff
- **Rate Limiting**: Built-in concurrency control
- **Real-time Statistics**: Track success/failure rates per IP
- **Delivery Tracking**: Monitor email status in real-time

### Frontend (Next.js)
- **Modern UI**: Clean, responsive interface built with React 19
- **Dashboard**: Real-time statistics and IP performance metrics
- **Email Composer**: Rich email editor with HTML/plain text support
- **IP Management**: Add, enable/disable, and remove IP addresses
- **Delivery Tracking**: Monitor all email deliveries with detailed status
- **Real-time Updates**: Auto-refreshing data every few seconds

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js Frontend                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐ │
│  │Dashboard │  │ Compose  │  │IP Manager │  │ Deliveries │ │
│  └──────────┘  └──────────┘  └───────────┘  └────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
┌────────────────────────▼────────────────────────────────────┐
│                    Rust API Server (Axum)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Email Routes │ IP Routes │ Stats Routes             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    SMTP Server Engine                        │
│  ┌─────────────────┐      ┌──────────────────┐             │
│  │  IP Pool Manager│──────│  SMTP Client     │             │
│  │  - Round-robin  │      │  - TCP Connection│             │
│  │  - Statistics   │      │  - SMTP Protocol │             │
│  │  - Enable/Disable│     │  - IP Binding    │             │
│  └─────────────────┘      └──────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Recipient Servers   │
              │   via 10 IPv4 IPs    │
              └──────────────────────┘
```

## Quick Start

### Prerequisites
- Rust 1.70+
- Node.js 20+
- Multiple IPv4 addresses configured on your server

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/mailblew.git
cd mailblew
```

### 2. Backend Setup

```bash
cd server

# Install dependencies and build
cargo build --release

# Configure SMTP settings in src/main.rs (lines 32-39)
# Update with your SMTP server details

# Run the API server
cargo run --release
```

The API will be available at `http://localhost:3001`

**API Endpoints:**
- `POST /api/emails/send` - Send an email
- `GET /api/emails` - Get all email deliveries
- `GET /api/emails/:id` - Get specific email delivery
- `GET /api/ips` - Get all IP addresses
- `POST /api/ips` - Add new IP address
- `PUT /api/ips/:id` - Update IP (enable/disable)
- `DELETE /api/ips/:id` - Delete IP address
- `GET /api/stats` - Get server statistics

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local and set API URL
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Add Your IP Addresses

1. Open `http://localhost:3000`
2. Navigate to "IP Management" tab
3. Add all your IPv4 addresses
4. Each new email will automatically rotate through enabled IPs

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Contabo or any VPS with multiple IPv4 addresses.

Key steps:
1. Configure all IPv4 addresses on your server
2. Set up DNS records (SPF, DKIM, PTR)
3. Deploy backend with systemd
4. Deploy frontend with PM2
5. Configure Nginx reverse proxy
6. Enable SSL with Let's Encrypt

## Configuration

### Backend Configuration

Edit `server/src/main.rs`:

```rust
// SMTP Configuration (lines 32-39)
let smtp_config = SmtpConfig {
    host: "smtp.your-server.com".to_string(),
    port: 587,
    username: Some("your-username".to_string()),
    password: Some("your-password".to_string()),
    use_tls: false,
    helo_domain: "yourdomain.com".to_string(),
};

// Concurrent connections (line 42)
let smtp_server = Arc::new(SmtpServer::new(smtp_config, ip_pool.clone(), 50));
```

### Frontend Configuration

Edit `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Usage Examples

### Sending an Email via API

```bash
curl -X POST http://localhost:3001/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@yourdomain.com",
    "from_name": "Your Company",
    "to": ["recipient@example.com"],
    "subject": "Test Email",
    "body_text": "This is a test email",
    "body_html": "<h1>Test Email</h1><p>This is a test email</p>"
  }'
```

### Adding an IP via API

```bash
curl -X POST http://localhost:3001/api/ips \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.100",
    "interface_name": "eth0"
  }'
```

### Getting Statistics

```bash
curl http://localhost:3001/api/stats
```

## Screenshots

### Dashboard
View real-time statistics for sent, failed, and pending emails, plus IP performance metrics.

### Email Composer
Rich email editor supporting both plain text and HTML formats with CC, BCC, and reply-to fields.

### IP Management
Add, enable/disable, and manage all your IPv4 addresses in one place.

### Email Deliveries
Track all email deliveries with real-time status updates and detailed delivery information.

## Development

### Backend Development

```bash
cd server

# Run with debug logging
RUST_LOG=debug cargo run

# Run tests
cargo test

# Format code
cargo fmt

# Lint
cargo clippy
```

### Frontend Development

```bash
cd client

# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

## Email Best Practices

1. **Warm Up New IPs**: Gradually increase sending volume on new IP addresses
2. **Monitor Reputation**: Regularly check IP reputation on blacklist databases
3. **SPF/DKIM/DMARC**: Properly configure email authentication records
4. **Clean Lists**: Remove bounced and invalid email addresses
5. **Engagement**: Track open and click rates to improve deliverability
6. **Throttling**: Respect rate limits of recipient servers
7. **PTR Records**: Set up reverse DNS for all IP addresses

## Monitoring

### IP Reputation Tools
- [MXToolbox](https://mxtoolbox.com/blacklists.aspx)
- [Spamhaus](https://www.spamhaus.org/)
- [MultiRBL](https://multirbl.valli.org/)
- [SenderScore](https://www.senderscore.org/)

### Server Monitoring

```bash
# Backend logs
sudo journalctl -u mailblew-api -f

# Frontend logs
pm2 logs mailblew-frontend

# System resources
htop
```

## Troubleshooting

### Backend not receiving requests
- Check if port 3001 is open
- Verify CORS configuration
- Check firewall rules

### Emails not sending
- Verify SMTP credentials
- Check IP addresses are properly configured
- Review backend logs for errors
- Test SMTP connection manually

### IP rotation not working
- Ensure all IPs are enabled in IP Management
- Check IP binding permissions
- Verify network interface configuration

## Performance Tuning

For high-volume sending:

1. **Increase concurrent connections**: Adjust `max_concurrent` parameter
2. **Optimize retry logic**: Fine-tune retry attempts and backoff
3. **Scale horizontally**: Deploy multiple instances with load balancer
4. **Database integration**: Store deliveries in PostgreSQL/MySQL instead of in-memory

## Roadmap

- [ ] Database integration (PostgreSQL/MySQL)
- [ ] Email templates system
- [ ] Webhook support for delivery notifications
- [ ] Advanced analytics and reporting
- [ ] Email scheduling
- [ ] Attachment support
- [ ] DKIM signing
- [ ] TLS/STARTTLS support
- [ ] Message queue integration (Redis/RabbitMQ)
- [ ] Multi-user support with authentication
- [ ] API rate limiting
- [ ] Advanced IP rotation strategies (weighted, geo-based)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Review the troubleshooting section

## Acknowledgments

- Built with Rust and Tokio for high-performance async networking
- Frontend powered by Next.js 16 and React 19
- Inspired by SendGrid, Mailgun, and other email delivery platforms

---

**Note**: This is a powerful email sending tool. Please use it responsibly and in compliance with anti-spam laws and email best practices.
