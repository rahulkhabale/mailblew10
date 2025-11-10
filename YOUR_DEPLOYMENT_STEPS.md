# Your MailBlew Deployment - Step by Step

## What You Have

✅ **Contabo Server**: 5.189.129.178 (Ubuntu 22.04)
✅ **10 IP Addresses**: All configured with PTR records
✅ **Domain**: mailblew.net with proper DNS records
✅ **Code**: Fully built and ready to deploy

## Your IP Configuration

| IP Address | PTR Record | Status |
|------------|------------|--------|
| 5.189.129.178 | mail.mailblew.net | ✅ Configured |
| 157.173.122.74 | mail1.mailblew.net | ✅ Configured |
| 157.173.122.75 | mail2.mailblew.net | ✅ Configured |
| 157.173.122.76 | mail3.mailblew.net | ✅ Configured |
| 157.173.122.77 | mail4.mailblew.net | ✅ Configured |
| 157.173.122.78 | mail5.mailblew.net | ✅ Configured |
| 157.173.122.79 | mail6.mailblew.net | ✅ Configured |
| 157.173.122.80 | mail7.mailblew.net | ✅ Configured |
| 157.173.122.81 | mail8.mailblew.net | ✅ Configured |
| 157.173.122.82 | mail9.mailblew.net | ✅ Configured |

## Quick Deployment (Easiest Method)

### Step 1: Upload Your Code to Server

From your Mac terminal:

```bash
cd /Users/rahulkhabale/Desktop/mailblew10

# Upload everything to your server
rsync -avz --exclude 'node_modules' --exclude 'target' --exclude '.next' \
  -e ssh . root@5.189.129.178:/opt/mailblew/
```

Password: `Lk2679UHsDaMx9HJ`

### Step 2: SSH into Your Server

```bash
ssh root@5.189.129.178
# Password: Lk2679UHsDaMx9HJ
```

### Step 3: Run the Automated Deployment Script

```bash
cd /opt/mailblew
chmod +x deploy-to-contabo.sh
./deploy-to-contabo.sh
```

This script will:
- Install all dependencies (Rust, Node.js, Nginx, etc.)
- Build your backend
- Set up systemd service
- Build and start frontend with PM2
- Configure Nginx
- Set up firewall
- Configure Postfix for email sending

### Step 4: Install SSL Certificates

After the script completes:

```bash
certbot --nginx -d api.mailblew.net -d app.mailblew.net -d mailblew.net -d www.mailblew.net
```

Follow the prompts:
- Enter your email address
- Agree to terms
- Choose: Redirect HTTP to HTTPS

### Step 5: Update Frontend to Use HTTPS

```bash
cd /opt/mailblew/client
nano .env.local
# Already set to: NEXT_PUBLIC_API_URL=https://api.mailblew.net

npm run build
pm2 restart mailblew-frontend
```

### Step 6: Verify Everything is Running

```bash
# Check backend
systemctl status mailblew-api

# Check frontend
pm2 list

# Check if services are listening
netstat -tulpn | grep -E ':(3000|3001|80|443)'
```

### Step 7: Access Your Application

Open in your browser:
- **Frontend**: https://app.mailblew.net
- **API**: https://api.mailblew.net/api/stats

## What's Pre-Configured

The deployment script automatically configures all 10 IPs in your system. After deployment, your Dashboard will show all IPs ready to use!

## DNS Records to Add (IMPORTANT!)

Go to your mailblew.net DNS provider and add these records:

### A Records
```
mail.mailblew.net       A    5.189.129.178
app.mailblew.net        A    5.189.129.178
api.mailblew.net        A    5.189.129.178
www.mailblew.net        A    5.189.129.178
```

### SPF Record (for email authentication)
```
Type: TXT
Name: mailblew.net
Value: v=spf1 ip4:5.189.129.178 ip4:157.173.122.74 ip4:157.173.122.75 ip4:157.173.122.76 ip4:157.173.122.77 ip4:157.173.122.78 ip4:157.173.122.79 ip4:157.173.122.80 ip4:157.173.122.81 ip4:157.173.122.82 ~all
```

### DMARC Record (for email reporting)
```
Type: TXT
Name: _dmarc.mailblew.net
Value: v=DMARC1; p=none; rua=mailto:dmarc@mailblew.net
```

## Testing Your Setup

### 1. Check Backend API

```bash
curl https://api.mailblew.net/api/stats
```

Should return JSON with email statistics.

### 2. Access Frontend

Visit: https://app.mailblew.net

You should see the MailBlew dashboard with 4 tabs:
- Dashboard
- Compose Email
- Email Deliveries
- IP Management

### 3. Verify IP Configuration

In the frontend:
1. Click "IP Management" tab
2. You should see all 10 IPs listed and enabled

### 4. Send Test Email

1. Click "Compose Email" tab
2. Fill in:
   - From: noreply@mailblew.net
   - To: your-personal-email@gmail.com
   - Subject: Test from MailBlew
   - Body: This is my first email!
3. Click "Send Email"
4. Check "Email Deliveries" tab to see status

## Monitoring & Logs

### View Backend Logs
```bash
journalctl -u mailblew-api -f
```

### View Frontend Logs
```bash
pm2 logs mailblew-frontend
```

### View Email Sending Logs
```bash
tail -f /var/log/mail.log
```

### Check Server Resources
```bash
htop
# or
top
```

## Troubleshooting

### If Backend Won't Start

```bash
# Check logs
journalctl -u mailblew-api -n 50

# Try running manually to see errors
cd /opt/mailblew/server
./target/release/server
```

### If Frontend Won't Load

```bash
# Check PM2 status
pm2 list

# View logs
pm2 logs mailblew-frontend

# Restart
pm2 restart mailblew-frontend
```

### If Emails Not Sending

```bash
# Check Postfix
systemctl status postfix

# Check mail queue
mailq

# View mail logs
tail -f /var/log/mail.log

# Test SMTP
telnet localhost 25
```

### If IPs Not Working

```bash
# Verify all IPs are configured
ip addr show

# Check network configuration
cat /etc/netplan/50-cloud-init.yaml

# Test binding to specific IP
curl --interface 157.173.122.74 https://api.ipify.org
```

## Important Security Steps

### 1. Change Root Password
```bash
passwd
```

### 2. Create Non-Root User (Optional but Recommended)
```bash
adduser mailblew
usermod -aG sudo mailblew
```

### 3. Set Up Fail2ban
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 4. Configure Automatic Updates
```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## Useful Commands

### Restart Services
```bash
# Restart backend
systemctl restart mailblew-api

# Restart frontend
pm2 restart mailblew-frontend

# Restart Nginx
systemctl restart nginx

# Restart Postfix
systemctl restart postfix
```

### Update Code
```bash
# From your Mac, upload new code:
rsync -avz --exclude 'node_modules' --exclude 'target' --exclude '.next' \
  -e ssh /Users/rahulkhabale/Desktop/mailblew10/ root@5.189.129.178:/opt/mailblew/

# On server, rebuild:
cd /opt/mailblew/server && cargo build --release
systemctl restart mailblew-api

cd /opt/mailblew/client && npm run build
pm2 restart mailblew-frontend
```

### Check Status
```bash
# All services
systemctl status mailblew-api
pm2 list
systemctl status nginx
systemctl status postfix

# Disk usage
df -h

# Memory usage
free -h
```

## Next Steps After Deployment

1. ✅ Deploy code (you'll do this now)
2. ✅ Install SSL
3. ✅ Add DNS records
4. ⬜ Send test emails
5. ⬜ Monitor IP reputation
6. ⬜ Set up monitoring (optional: Netdata, Grafana)
7. ⬜ Configure backups
8. ⬜ Scale as needed

## Support & Documentation

- **Full Deployment Guide**: See `CONTABO_DEPLOY.md`
- **Quick Start**: See `QUICKSTART.md`
- **Main README**: See `README.md`
- **Project Overview**: See `PROJECT_SUMMARY.md`

## Your Credentials

**Server SSH:**
- IP: 5.189.129.178
- User: root
- Password: Lk2679UHsDaMx9HJ (Change this!)

**Access URLs (after deployment):**
- Frontend: https://app.mailblew.net
- API: https://api.mailblew.net
- Primary: https://mailblew.net

---

**Ready to deploy!** 🚀

Just run these commands:

```bash
# From your Mac:
cd /Users/rahulkhabale/Desktop/mailblew10
rsync -avz --exclude 'node_modules' --exclude 'target' --exclude '.next' \
  -e ssh . root@5.189.129.178:/opt/mailblew/

# Then SSH in:
ssh root@5.189.129.178

# Run deployment:
cd /opt/mailblew
./deploy-to-contabo.sh

# Install SSL:
certbot --nginx -d api.mailblew.net -d app.mailblew.net -d mailblew.net -d www.mailblew.net

# Done! Access https://app.mailblew.net
```
