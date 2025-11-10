# MailBlew - Deployment Guide for Contabo Server

This guide will help you deploy both the Rust backend and Next.js frontend on your Contabo server for production email delivery with IPv4.

## Prerequisites

- Contabo VPS with multiple IPv4 addresses
- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name pointed to your server
- At least 2GB RAM recommended

## Part 1: Server Setup

### 1.1 Configure Multiple IP Addresses

First, configure all your IPv4 addresses on your Contabo server.

```bash
# Check current IP configuration
ip addr show

# Edit network configuration (Ubuntu/Debian)
sudo nano /etc/netplan/50-cloud-init.yaml
```

Example configuration for multiple IPs:
```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - YOUR_PRIMARY_IP/24
        - YOUR_IP_2/24
        - YOUR_IP_3/24
        - YOUR_IP_4/24
        - YOUR_IP_5/24
        - YOUR_IP_6/24
        - YOUR_IP_7/24
        - YOUR_IP_8/24
        - YOUR_IP_9/24
        - YOUR_IP_10/24
      gateway4: YOUR_GATEWAY
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

Apply the configuration:
```bash
sudo netplan apply
```

### 1.2 Install Required Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build essentials
sudo apt install -y build-essential pkg-config libssl-dev

# Install PM2 for process management
sudo npm install -g pm2
```

### 1.3 Configure DNS Records

For each IP address, configure proper DNS records:

**SPF Record:**
```
v=spf1 ip4:IP1 ip4:IP2 ip4:IP3 ... ip4:IP10 ~all
```

**DKIM Record:**
Set up DKIM signing (optional but recommended for better deliverability)

**DMARC Record:**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

**PTR (Reverse DNS) Records:**
Contact Contabo support to set up PTR records for each IP pointing to your domain.

## Part 2: Backend Deployment

### 2.1 Clone and Configure Backend

```bash
# Create application directory
sudo mkdir -p /opt/mailblew
sudo chown $USER:$USER /opt/mailblew

# Navigate to directory
cd /opt/mailblew

# Upload your code (using git, scp, or rsync)
# If using git:
git clone YOUR_REPOSITORY_URL .

# Or copy files from local machine:
# rsync -avz /Users/rahulkhabale/Desktop/mailblew10/ user@your-server:/opt/mailblew/
```

### 2.2 Configure SMTP Settings

Edit `server/src/main.rs` (lines 32-39):

```rust
let smtp_config = SmtpConfig {
    host: "YOUR_SMTP_RELAY_SERVER".to_string(), // e.g., "smtp.sendgrid.net" or your own relay
    port: 587,
    username: Some("YOUR_SMTP_USERNAME".to_string()),
    password: Some("YOUR_SMTP_PASSWORD".to_string()),
    use_tls: false,
    helo_domain: "yourdomain.com".to_string(),
};
```

**Note:** For direct email delivery without a relay, you can:
1. Set up your own SMTP relay on port 25
2. Or modify the code to connect directly to recipient MX servers

### 2.3 Build and Run Backend

```bash
cd /opt/mailblew/server

# Build in release mode
cargo build --release

# Test the server
./target/release/server
```

### 2.4 Create Systemd Service for Backend

```bash
sudo nano /etc/systemd/system/mailblew-api.service
```

```ini
[Unit]
Description=MailBlew API Server
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/opt/mailblew/server
ExecStart=/opt/mailblew/server/target/release/server
Restart=always
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable mailblew-api
sudo systemctl start mailblew-api
sudo systemctl status mailblew-api
```

## Part 3: Frontend Deployment

### 3.1 Configure Frontend Environment

```bash
cd /opt/mailblew/client

# Create environment file
nano .env.local
```

Add:
```env
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001
# Or if using domain:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 3.2 Install Dependencies and Build

```bash
cd /opt/mailblew/client

# Install dependencies
npm install

# Build for production
npm run build
```

### 3.3 Run with PM2

```bash
# Start the frontend
pm2 start npm --name "mailblew-frontend" -- start

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

## Part 4: Nginx Reverse Proxy (Recommended)

### 4.1 Install Nginx

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 4.2 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/mailblew
```

```nginx
# API Backend
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name mail.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/mailblew /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3 Setup SSL with Let's Encrypt

```bash
sudo certbot --nginx -d api.yourdomain.com -d mail.yourdomain.com
```

Update frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Rebuild frontend:
```bash
cd /opt/mailblew/client
npm run build
pm2 restart mailblew-frontend
```

## Part 5: Add Your IP Addresses via UI

1. Open your browser and navigate to `https://mail.yourdomain.com`
2. Click on "IP Management" tab
3. Add all 10 of your Contabo IPv4 addresses

Example:
- 1.2.3.4
- 1.2.3.5
- 1.2.3.6
- ... (all 10 IPs)

## Part 6: Testing

### 6.1 Test Email Sending

1. Go to "Compose Email" tab
2. Fill in the form:
   - From: noreply@yourdomain.com
   - To: your-personal-email@gmail.com
   - Subject: Test Email
   - Body: This is a test email
3. Click "Send Email"

### 6.2 Monitor Delivery

1. Go to "Email Deliveries" tab
2. Check the status of your email
3. Verify it was sent from one of your IPs

### 6.3 Check Logs

```bash
# Backend logs
sudo journalctl -u mailblew-api -f

# Frontend logs
pm2 logs mailblew-frontend
```

## Part 7: Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SMTP (if running your own relay)
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp

# Enable firewall
sudo ufw enable
```

## Part 8: Monitoring and Maintenance

### 8.1 Set Up Log Rotation

```bash
sudo nano /etc/logrotate.d/mailblew
```

```
/var/log/mailblew/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 YOUR_USERNAME YOUR_USERNAME
    sharedscripts
}
```

### 8.2 Monitor IP Reputation

Regularly check your IP reputation on:
- https://mxtoolbox.com/blacklists.aspx
- https://www.spamhaus.org/
- https://multirbl.valli.org/

### 8.3 Backup Strategy

```bash
# Create backup script
sudo nano /opt/mailblew/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/mailblew"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/mailblew_$DATE.tar.gz /opt/mailblew

# Keep only last 7 days
find $BACKUP_DIR -name "mailblew_*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /opt/mailblew/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/mailblew/backup.sh
```

## Troubleshooting

### Backend not starting
```bash
sudo journalctl -u mailblew-api -n 50
```

### Frontend not accessible
```bash
pm2 logs mailblew-frontend
```

### Email delivery failing
```bash
# Check if IPs are properly configured
ip addr show

# Test SMTP connection
telnet YOUR_SMTP_HOST 587
```

### IP binding not working
```bash
# Ensure IPs are assigned
ip addr show

# Check if application has permission to bind
sudo setcap 'cap_net_bind_service=+ep' /opt/mailblew/server/target/release/server
```

## Performance Optimization

### For high-volume sending:

1. **Increase concurrent connections** (server/src/main.rs:42):
```rust
let smtp_server = Arc::new(SmtpServer::new(smtp_config, ip_pool.clone(), 100));
```

2. **Enable connection pooling** in your SMTP client configuration

3. **Monitor server resources**:
```bash
htop
iotop
```

4. **Scale horizontally**: Deploy multiple instances behind a load balancer

## Security Recommendations

1. **Use SSH keys** instead of passwords
2. **Enable fail2ban**:
```bash
sudo apt install fail2ban
```

3. **Keep system updated**:
```bash
sudo apt update && sudo apt upgrade
```

4. **Monitor for suspicious activity**
5. **Implement rate limiting** per IP
6. **Use strong SMTP credentials**

## Support and Maintenance

### Update Application

```bash
cd /opt/mailblew

# Pull latest changes
git pull

# Rebuild backend
cd server
cargo build --release
sudo systemctl restart mailblew-api

# Rebuild frontend
cd ../client
npm install
npm run build
pm2 restart mailblew-frontend
```

Your MailBlew server is now fully deployed and ready for production use!
