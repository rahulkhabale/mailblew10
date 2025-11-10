# MailBlew - Contabo Deployment Guide

## Your Server Configuration

**Server Details:**
- Primary IP: 5.189.129.178
- Domain: mailblew.net
- OS: Ubuntu 22.04
- CPU: AMD Ryzen 9 7900 (12 Cores)

**IP Addresses & PTR Records:**
| IP Address | PTR Record |
|------------|------------|
| 5.189.129.178 | mail.mailblew.net |
| 157.173.122.74 | mail1.mailblew.net |
| 157.173.122.75 | mail2.mailblew.net |
| 157.173.122.76 | mail3.mailblew.net |
| 157.173.122.77 | mail4.mailblew.net |
| 157.173.122.78 | mail5.mailblew.net |
| 157.173.122.79 | mail6.mailblew.net |
| 157.173.122.80 | mail7.mailblew.net |
| 157.173.122.81 | mail8.mailblew.net |
| 157.173.122.82 | mail9.mailblew.net |

## Prerequisites Completed ✅
- [x] PTR records configured
- [x] Server provisioned

## Step 1: Configure DNS Records

Go to your mailblew.net DNS provider and add these records:

### A Records
```
mail.mailblew.net       A    5.189.129.178
mail1.mailblew.net      A    157.173.122.74
mail2.mailblew.net      A    157.173.122.75
mail3.mailblew.net      A    157.173.122.76
mail4.mailblew.net      A    157.173.122.77
mail5.mailblew.net      A    157.173.122.78
mail6.mailblew.net      A    157.173.122.79
mail7.mailblew.net      A    157.173.122.80
mail8.mailblew.net      A    157.173.122.81
mail9.mailblew.net      A    157.173.122.82
app.mailblew.net        A    5.189.129.178
api.mailblew.net        A    5.189.129.178
```

### SPF Record
```
mailblew.net  TXT  "v=spf1 ip4:5.189.129.178 ip4:157.173.122.74 ip4:157.173.122.75 ip4:157.173.122.76 ip4:157.173.122.77 ip4:157.173.122.78 ip4:157.173.122.79 ip4:157.173.122.80 ip4:157.173.122.81 ip4:157.173.122.82 ~all"
```

### DMARC Record
```
_dmarc.mailblew.net  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@mailblew.net; ruf=mailto:dmarc@mailblew.net; fo=1"
```

### MX Record (Optional - for receiving emails)
```
mailblew.net  MX  10  mail.mailblew.net
```

## Step 2: Connect to Your Server

```bash
ssh root@5.189.129.178
# Password: Lk2679UHsDaMx9HJ
```

**Important:** Change your root password immediately!
```bash
passwd
```

## Step 3: Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y build-essential pkg-config libssl-dev curl git nginx certbot python3-certbot-nginx ufw

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2
```

## Step 4: Configure Network Interfaces

Check your current network interface name:
```bash
ip addr show
# Look for the interface name (likely ens3, eth0, or similar)
```

Edit netplan configuration:
```bash
# Backup first
cp /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.backup

# Edit the file
nano /etc/netplan/50-cloud-init.yaml
```

Replace with (adjust `ens3` to your actual interface name):
```yaml
network:
  version: 2
  ethernets:
    ens3:
      addresses:
        - 5.189.129.178/32
        - 157.173.122.74/32
        - 157.173.122.75/32
        - 157.173.122.76/32
        - 157.173.122.77/32
        - 157.173.122.78/32
        - 157.173.122.79/32
        - 157.173.122.80/32
        - 157.173.122.81/32
        - 157.173.122.82/32
      gateway4: 157.173.112.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
      routes:
        - to: 0.0.0.0/0
          via: 157.173.112.1
```

Apply the configuration:
```bash
netplan apply

# Verify all IPs are configured
ip addr show
```

## Step 5: Upload Your Code

From your **local machine**, run:
```bash
# Navigate to your project directory
cd /Users/rahulkhabale/Desktop/mailblew10

# Upload to server
rsync -avz --exclude 'node_modules' --exclude 'target' --exclude '.next' \
  . root@5.189.129.178:/opt/mailblew/

# Or use SCP
scp -r /Users/rahulkhabale/Desktop/mailblew10 root@5.189.129.178:/opt/
```

## Step 6: Configure Backend

SSH back into your server:
```bash
ssh root@5.189.129.178
cd /opt/mailblew/server
```

Edit `src/main.rs` and update the SMTP configuration (lines 32-39):
```rust
let smtp_config = SmtpConfig {
    host: "localhost".to_string(),  // We'll set up local SMTP
    port: 25,
    username: None,  // No auth for local relay
    password: None,
    use_tls: false,
    helo_domain: "mailblew.net".to_string(),
};
```

Update the default IP configuration (lines 21-29) to include your actual IPs:
```rust
let ip_configs = vec![
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "5.189.129.178".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.74".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.75".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.76".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.77".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.78".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.79".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.80".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.81".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
    IpConfig {
        id: Uuid::new_v4().to_string(),
        ip: "157.173.122.82".to_string(),
        interface_name: "ens3".to_string(),
        enabled: true,
        created_at: Some(Utc::now()),
    },
];
```

Build the backend:
```bash
cd /opt/mailblew/server
cargo build --release
```

## Step 7: Set Up Local SMTP Relay (Postfix)

For direct email delivery, install Postfix:
```bash
apt install -y postfix

# During installation, choose:
# 1. "Internet Site"
# 2. System mail name: mailblew.net
```

Configure Postfix for multiple IPs:
```bash
nano /etc/postfix/main.cf
```

Add/modify these lines:
```
myhostname = mail.mailblew.net
mydomain = mailblew.net
myorigin = $mydomain
inet_interfaces = all
smtp_bind_address = 5.189.129.178
```

Restart Postfix:
```bash
systemctl restart postfix
systemctl enable postfix
```

## Step 8: Create Systemd Service for Backend

```bash
nano /etc/systemd/system/mailblew-api.service
```

Add:
```ini
[Unit]
Description=MailBlew API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/mailblew/server
ExecStart=/opt/mailblew/server/target/release/server
Restart=always
RestartSec=10
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl daemon-reload
systemctl enable mailblew-api
systemctl start mailblew-api
systemctl status mailblew-api
```

## Step 9: Configure Frontend

```bash
cd /opt/mailblew/client

# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://api.mailblew.net
EOF

# Install dependencies
npm install

# Build for production
npm run build

# Start with PM2
pm2 start npm --name "mailblew-frontend" -- start
pm2 save
pm2 startup
```

## Step 10: Configure Nginx

```bash
nano /etc/nginx/sites-available/mailblew
```

Add:
```nginx
# API Backend
server {
    listen 80;
    server_name api.mailblew.net;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name app.mailblew.net mailblew.net www.mailblew.net;

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

Enable and test:
```bash
ln -s /etc/nginx/sites-available/mailblew /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Step 11: Install SSL Certificates

```bash
# Install SSL for both domains
certbot --nginx -d api.mailblew.net -d app.mailblew.net -d mailblew.net -d www.mailblew.net

# Auto-renewal
certbot renew --dry-run
```

Update frontend environment:
```bash
cd /opt/mailblew/client
nano .env.local
# Change to: NEXT_PUBLIC_API_URL=https://api.mailblew.net

npm run build
pm2 restart mailblew-frontend
```

## Step 12: Configure Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 25/tcp
ufw allow 587/tcp
ufw --force enable
ufw status
```

## Step 13: Test Your Setup

### Test Backend API
```bash
curl http://localhost:3001/api/stats
```

### Test from outside
```bash
# From your local machine
curl https://api.mailblew.net/api/stats
```

### Access Frontend
Open in browser: https://app.mailblew.net

### Send Test Email
1. Go to https://app.mailblew.net
2. Navigate to "Compose Email"
3. Send a test email

## Step 14: Monitoring

### View Backend Logs
```bash
journalctl -u mailblew-api -f
```

### View Frontend Logs
```bash
pm2 logs mailblew-frontend
```

### Check IP Configuration
```bash
ip addr show
```

### Test Email Delivery
```bash
# Test SMTP
telnet localhost 25

# Check mail queue
mailq

# View mail logs
tail -f /var/log/mail.log
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
journalctl -u mailblew-api -n 50

# Test manually
cd /opt/mailblew/server
./target/release/server
```

### Frontend not accessible
```bash
pm2 list
pm2 logs mailblew-frontend
```

### Emails not sending
```bash
# Check if IPs are bound
netstat -tulpn | grep :25

# Check Postfix
systemctl status postfix
tail -f /var/log/mail.log

# Test SMTP
telnet localhost 25
```

### IP binding issues
```bash
# Verify all IPs are configured
ip addr show

# Test binding to specific IP
curl --interface 157.173.122.74 https://api.ipify.org
```

## Security Checklist

- [ ] Change root password
- [ ] Create non-root user for running services
- [ ] Configure fail2ban
- [ ] Set up automatic updates
- [ ] Configure backup strategy
- [ ] Monitor server resources
- [ ] Set up log rotation
- [ ] Configure email alerts

## Next Steps

1. **Test email deliverability** - Send test emails to Gmail, Outlook, etc.
2. **Monitor IP reputation** - Check on MXToolbox, Spamhaus
3. **Set up monitoring** - Use tools like Netdata or Prometheus
4. **Configure backups** - Regularly backup your data
5. **Scale as needed** - Add more IPs if required

## Quick Commands Reference

```bash
# Restart backend
systemctl restart mailblew-api

# Restart frontend
pm2 restart mailblew-frontend

# View logs
journalctl -u mailblew-api -f
pm2 logs mailblew-frontend

# Check status
systemctl status mailblew-api
pm2 list

# Update code
cd /opt/mailblew
git pull
cd server && cargo build --release
systemctl restart mailblew-api
cd ../client && npm run build
pm2 restart mailblew-frontend
```

## Support URLs

- **Frontend**: https://app.mailblew.net
- **API**: https://api.mailblew.net
- **Server IP**: 5.189.129.178

Your MailBlew platform is now live with all 10 IP addresses rotating for optimal email delivery! 🚀
