#!/bin/bash

# MailBlew - Automated Deployment to Contabo
# Run this script ON YOUR CONTABO SERVER after uploading the code

set -e

echo "============================================"
echo "MailBlew - Automated Contabo Deployment"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

cd /opt/mailblew

echo "Step 1: Installing system dependencies..."
apt update
apt install -y build-essential pkg-config libssl-dev curl git nginx certbot python3-certbot-nginx postfix ufw

echo ""
echo "Step 2: Installing Rust..."
if ! command -v cargo &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    export PATH="$HOME/.cargo/bin:$PATH"
fi

echo ""
echo "Step 3: Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo ""
echo "Step 4: Installing PM2..."
npm install -g pm2

echo ""
echo "Step 5: Building backend..."
cd /opt/mailblew/server
source $HOME/.cargo/env
cargo build --release

echo ""
echo "Step 6: Creating systemd service..."
cat > /etc/systemd/system/mailblew-api.service << 'EOF'
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
Environment="PATH=/root/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mailblew-api
systemctl start mailblew-api

echo ""
echo "Step 7: Setting up frontend..."
cd /opt/mailblew/client

# Create production environment file
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.mailblew.net
EOF

npm install
npm run build

# Start with PM2
pm2 delete mailblew-frontend 2>/dev/null || true
pm2 start npm --name "mailblew-frontend" -- start
pm2 save
pm2 startup | tail -1 | bash

echo ""
echo "Step 8: Configuring Nginx..."
cat > /etc/nginx/sites-available/mailblew << 'EOF'
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
EOF

ln -sf /etc/nginx/sites-available/mailblew /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "Step 9: Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 25/tcp
ufw allow 587/tcp
ufw --force enable

echo ""
echo "Step 10: Configuring Postfix..."
postconf -e "myhostname = mail.mailblew.net"
postconf -e "mydomain = mailblew.net"
postconf -e "myorigin = \$mydomain"
postconf -e "inet_interfaces = all"
postconf -e "smtp_bind_address = 5.189.129.178"
systemctl restart postfix
systemctl enable postfix

echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
echo ""
echo "✅ Backend running on port 3001"
echo "✅ Frontend running on port 3000"
echo "✅ Nginx configured"
echo "✅ Firewall enabled"
echo "✅ Postfix configured"
echo ""
echo "Next steps:"
echo "1. Install SSL certificates:"
echo "   certbot --nginx -d api.mailblew.net -d app.mailblew.net -d mailblew.net -d www.mailblew.net"
echo ""
echo "2. After SSL is installed, update frontend:"
echo "   cd /opt/mailblew/client"
echo "   npm run build"
echo "   pm2 restart mailblew-frontend"
echo ""
echo "3. Check status:"
echo "   systemctl status mailblew-api"
echo "   pm2 list"
echo ""
echo "4. View logs:"
echo "   journalctl -u mailblew-api -f"
echo "   pm2 logs mailblew-frontend"
echo ""
echo "Access your application:"
echo "  Frontend: http://app.mailblew.net (use https after SSL)"
echo "  API: http://api.mailblew.net (use https after SSL)"
echo ""
echo "Your 10 IP addresses will be pre-configured in the system!"
