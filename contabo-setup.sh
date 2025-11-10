#!/bin/bash

# MailBlew Contabo Server Setup Script
# Server IP: 5.189.129.178
# Additional IPs: 157.173.122.74-82 (9 IPs)

set -e

echo "============================================"
echo "MailBlew - Contabo Server Setup"
echo "============================================"
echo ""

# Configuration
PRIMARY_IP="5.189.129.178"
ADDITIONAL_IPS=(
    "157.173.122.74"
    "157.173.122.75"
    "157.173.122.76"
    "157.173.122.77"
    "157.173.122.78"
    "157.173.122.79"
    "157.173.122.80"
    "157.173.122.81"
    "157.173.122.82"
)

echo "Step 1: Updating system..."
apt update && apt upgrade -y

echo ""
echo "Step 2: Installing dependencies..."
apt install -y build-essential pkg-config libssl-dev curl git nginx certbot python3-certbot-nginx ufw

echo ""
echo "Step 3: Installing Rust..."
if ! command -v cargo &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
else
    echo "Rust already installed"
fi

echo ""
echo "Step 4: Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo "Node.js already installed"
fi

echo ""
echo "Step 5: Installing PM2..."
npm install -g pm2

echo ""
echo "Step 6: Configuring network interfaces..."

# Backup existing netplan config
cp /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.backup

# Create new netplan configuration
cat > /etc/netplan/50-cloud-init.yaml << 'EOF'
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
EOF

echo "Applying network configuration..."
netplan apply

echo ""
echo "Step 7: Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 25/tcp
ufw allow 587/tcp
ufw allow 2525/tcp
ufw --force enable

echo ""
echo "Step 8: Creating application directory..."
mkdir -p /opt/mailblew
cd /opt/mailblew

echo ""
echo "============================================"
echo "Initial Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Upload your MailBlew code to /opt/mailblew/"
echo "   From your local machine, run:"
echo "   rsync -avz /Users/rahulkhabale/Desktop/mailblew10/ root@5.189.129.178:/opt/mailblew/"
echo ""
echo "2. After uploading, run the second setup script:"
echo "   bash /opt/mailblew/contabo-deploy.sh"
echo ""
echo "Your IP addresses:"
echo "  Primary: 5.189.129.178"
for ip in "${ADDITIONAL_IPS[@]}"; do
    echo "  Additional: $ip"
done
echo ""
echo "Network configuration applied. Verify with: ip addr show"
