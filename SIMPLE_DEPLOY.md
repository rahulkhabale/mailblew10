# MailBlew - Simple 5-Step Deployment

## Your Setup
- **GitHub**: https://github.com/rahulkhabale/mailblew10 ✅
- **Server**: 5.189.129.178 (Contabo)
- **Domain**: mailblew.net
- **10 IPs**: All configured with PTR records ✅

## Deploy in 5 Simple Steps

### Step 1: SSH to Your Server

```bash
ssh root@5.189.129.178
```
Password: `Lk2679UHsDaMx9HJ`

**Important:** Change password immediately:
```bash
passwd
```

### Step 2: Clone and Deploy

```bash
# Install git
apt update && apt install -y git

# Clone your repository
cd /opt
git clone https://github.com/rahulkhabale/mailblew10.git mailblew

# Run automated deployment
cd mailblew
chmod +x deploy-to-contabo.sh
./deploy-to-contabo.sh
```

⏱️ **Wait 10-15 minutes** for installation and build to complete.

### Step 3: Install SSL

```bash
certbot --nginx -d api.mailblew.net -d app.mailblew.net -d mailblew.net -d www.mailblew.net
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose: Redirect HTTP to HTTPS

### Step 4: Update Frontend for HTTPS

```bash
cd /opt/mailblew/client
npm run build
pm2 restart mailblew-frontend
```

### Step 5: Access Your Platform

Open in browser: **https://app.mailblew.net**

You should see:
- Dashboard with statistics
- Email Composer
- IP Management (all 10 IPs listed)
- Email Deliveries

## Test Email Sending

1. Go to **Compose Email** tab
2. Fill in:
   - **From**: noreply@mailblew.net
   - **To**: your-email@gmail.com
   - **Subject**: Test Email
   - **Body**: Testing MailBlew!
3. Click **Send Email**
4. Check **Email Deliveries** tab to see status

## Verify Everything Works

```bash
# Check backend
systemctl status mailblew-api

# Check frontend
pm2 list

# Test API
curl https://api.mailblew.net/api/stats

# View logs
journalctl -u mailblew-api -f
```

## Update Your Code (Future)

### On Your Mac
```bash
cd /Users/rahulkhabale/Desktop/mailblew10
git add .
git commit -m "Your changes"
git push origin main
```

### On Your Server
```bash
ssh root@5.189.129.178
cd /opt/mailblew
git pull origin main

# Rebuild backend
cd server && cargo build --release
systemctl restart mailblew-api

# Rebuild frontend
cd ../client && npm run build
pm2 restart mailblew-frontend
```

## Quick Commands

```bash
# View backend logs
journalctl -u mailblew-api -f

# View frontend logs
pm2 logs mailblew-frontend

# Restart backend
systemctl restart mailblew-api

# Restart frontend
pm2 restart mailblew-frontend

# Check all services
systemctl status mailblew-api && pm2 list
```

## DNS Records to Add

Add these to your mailblew.net DNS:

```
app.mailblew.net     A    5.189.129.178
api.mailblew.net     A    5.189.129.178
mail.mailblew.net    A    5.189.129.178
```

**SPF Record:**
```
mailblew.net  TXT  "v=spf1 ip4:5.189.129.178 ip4:157.173.122.74 ip4:157.173.122.75 ip4:157.173.122.76 ip4:157.173.122.77 ip4:157.173.122.78 ip4:157.173.122.79 ip4:157.173.122.80 ip4:157.173.122.81 ip4:157.173.122.82 ~all"
```

## Troubleshooting

### Backend won't start
```bash
journalctl -u mailblew-api -n 50
cd /opt/mailblew/server && ./target/release/server
```

### Frontend won't load
```bash
pm2 logs mailblew-frontend
pm2 restart mailblew-frontend
```

### Can't access website
```bash
systemctl status nginx
nginx -t
```

## Need Help?

- **Full Guide**: See `DEPLOY_WITH_GIT.md`
- **Technical Details**: See `CONTABO_DEPLOY.md`
- **GitHub**: https://github.com/rahulkhabale/mailblew10

---

## Summary

✅ Code is on GitHub: https://github.com/rahulkhabale/mailblew10
✅ Ready to clone and deploy
✅ Automated deployment script included
✅ All 10 IPs pre-configured
✅ SSL setup included

**Just run:**
```bash
ssh root@5.189.129.178
cd /opt && git clone https://github.com/rahulkhabale/mailblew10.git mailblew
cd mailblew && ./deploy-to-contabo.sh
certbot --nginx -d api.mailblew.net -d app.mailblew.net -d mailblew.net
cd client && npm run build && pm2 restart mailblew-frontend
```

**Then open:** https://app.mailblew.net 🚀
