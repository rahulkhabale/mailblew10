# Deploy MailBlew to Contabo Using Git

## Quick Deployment Steps

### Step 1: SSH into Your Contabo Server

```bash
ssh root@5.189.129.178
# Password: Lk2679UHsDaMx9HJ
```

### Step 2: Clone the Repository

```bash
# Install git if not already installed
apt update && apt install -y git

# Clone your repository
cd /opt
git clone https://github.com/rahulkhabale/mailblew10.git mailblew

# Navigate to the project
cd mailblew
```

### Step 3: Run the Automated Deployment Script

```bash
chmod +x deploy-to-contabo.sh
./deploy-to-contabo.sh
```

This will:
- Install all dependencies (Rust, Node.js, Nginx, Postfix)
- Build the backend
- Set up systemd service
- Build and start frontend with PM2
- Configure Nginx
- Set up firewall

### Step 4: Install SSL Certificates

```bash
certbot --nginx -d api.mailblew.net -d app.mailblew.net -d mailblew.net -d www.mailblew.net
```

### Step 5: Rebuild Frontend with HTTPS

```bash
cd /opt/mailblew/client
npm run build
pm2 restart mailblew-frontend
```

## Updating Your Deployment

When you make changes to your code:

### From Your Mac (push changes)

```bash
cd /Users/rahulkhabale/Desktop/mailblew10

# Stage your changes
git add .

# Commit
git commit -m "Your commit message"

# Push to GitHub
git push origin main
```

### On Your Server (pull and deploy updates)

```bash
# SSH into server
ssh root@5.189.129.178

# Navigate to project
cd /opt/mailblew

# Pull latest changes
git pull origin main

# Rebuild backend
cd server
cargo build --release
systemctl restart mailblew-api

# Rebuild frontend
cd ../client
npm install  # Only if package.json changed
npm run build
pm2 restart mailblew-frontend
```

## Quick Update Script

Create a file `/opt/mailblew/update.sh`:

```bash
#!/bin/bash
cd /opt/mailblew

echo "Pulling latest changes..."
git pull origin main

echo "Rebuilding backend..."
cd server
cargo build --release
systemctl restart mailblew-api

echo "Rebuilding frontend..."
cd ../client
npm install
npm run build
pm2 restart mailblew-frontend

echo "Update complete!"
systemctl status mailblew-api
pm2 list
```

Make it executable:
```bash
chmod +x /opt/mailblew/update.sh
```

Then update with a single command:
```bash
cd /opt/mailblew && ./update.sh
```

## Verify Deployment

### Check Services
```bash
# Backend status
systemctl status mailblew-api

# Frontend status
pm2 list

# Nginx status
systemctl status nginx
```

### View Logs
```bash
# Backend logs
journalctl -u mailblew-api -f

# Frontend logs
pm2 logs mailblew-frontend

# Email logs
tail -f /var/log/mail.log
```

### Test API
```bash
curl https://api.mailblew.net/api/stats
```

### Access Frontend
Open: https://app.mailblew.net

## Troubleshooting

### If git pull fails due to local changes

```bash
cd /opt/mailblew

# Stash local changes
git stash

# Pull updates
git pull origin main

# Reapply your local changes if needed
git stash pop
```

### Reset to latest version (destructive)

```bash
cd /opt/mailblew
git fetch origin
git reset --hard origin/main
./update.sh
```

## Repository Structure

Your GitHub repository at `https://github.com/rahulkhabale/mailblew10` contains:

```
mailblew10/
├── server/              # Rust backend
├── client/              # Next.js frontend
├── deploy-to-contabo.sh # Automated deployment
├── README.md            # Documentation
├── CONTABO_DEPLOY.md    # Deployment guide
├── YOUR_DEPLOYMENT_STEPS.md  # Quick start
└── ... other files
```

## Deployment Workflow

1. **Develop locally** on your Mac
2. **Test** with `./start-backend.sh` and `./start-frontend.sh`
3. **Commit and push** to GitHub
4. **SSH to server** and pull latest changes
5. **Rebuild and restart** services
6. **Verify** deployment is working

## Benefits of Using Git

✅ **Version control** - Track all changes
✅ **Easy rollback** - Revert to previous versions
✅ **Collaboration** - Multiple developers can contribute
✅ **Deployment history** - See what changed when
✅ **Automated updates** - Simple pull and rebuild

## First Time Deployment Commands (Summary)

```bash
# On your server
ssh root@5.189.129.178
cd /opt
git clone https://github.com/rahulkhabale/mailblew10.git mailblew
cd mailblew
./deploy-to-contabo.sh
certbot --nginx -d api.mailblew.net -d app.mailblew.net -d mailblew.net
cd client && npm run build && pm2 restart mailblew-frontend
```

## Update Deployment Commands (Summary)

```bash
# On your server
ssh root@5.189.129.178
cd /opt/mailblew
git pull origin main
cd server && cargo build --release && systemctl restart mailblew-api
cd ../client && npm run build && pm2 restart mailblew-frontend
```

Your MailBlew platform is now version controlled and easily deployable! 🚀
