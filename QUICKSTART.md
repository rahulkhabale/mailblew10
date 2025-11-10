# MailBlew - Quick Start Guide

## What You've Built

You now have a complete email SaaS platform with:

1. **Rust Backend API** - Custom SMTP server with IP rotation on port 3001
2. **Next.js Frontend** - Modern web interface on port 3000
3. **10 IP Rotation** - Automatically rotates through configured IPs for each email

## Starting the Application

### Option 1: Using the Start Scripts

**Terminal 1 - Start Backend:**
```bash
cd /Users/rahulkhabale/Desktop/mailblew10
./start-backend.sh
```

**Terminal 2 - Start Frontend:**
```bash
cd /Users/rahulkhabale/Desktop/mailblew10
./start-frontend.sh
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd /Users/rahulkhabale/Desktop/mailblew10/server
cargo run --release
```

**Terminal 2 - Frontend:**
```bash
cd /Users/rahulkhabale/Desktop/mailblew10/client
npm run dev
```

## Accessing the Application

Once both servers are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## First Steps

### 1. Configure SMTP Settings (IMPORTANT!)

Before sending emails, update the SMTP configuration:

```bash
nano /Users/rahulkhabale/Desktop/mailblew10/server/src/main.rs
```

Lines 32-39, update with your SMTP server details:
```rust
let smtp_config = SmtpConfig {
    host: "smtp.gmail.com".to_string(),  // Your SMTP server
    port: 587,
    username: Some("your-email@gmail.com".to_string()),
    password: Some("your-app-password".to_string()),
    use_tls: false,
    helo_domain: "yourdomain.com".to_string(),
};
```

**For Gmail:**
- Use an App Password (not your regular password)
- Enable 2FA and generate app password at: https://myaccount.google.com/apppasswords

**Rebuild after changes:**
```bash
cd server
cargo build --release
```

### 2. Add Your IP Addresses

1. Open http://localhost:3000
2. Click "IP Management" tab
3. Click "Add IP Address"
4. Add each of your 10 Contabo IPv4 addresses

For local testing, you can use:
- IP: 127.0.0.1
- Interface: lo0

### 3. Send Your First Email

1. Click "Compose Email" tab
2. Fill in the form:
   - **From**: noreply@yourdomain.com
   - **To**: your-email@gmail.com
   - **Subject**: Test Email
   - **Body**: This is my first test email!
3. Click "Send Email"

### 4. Track Delivery

1. Click "Email Deliveries" tab
2. See your email with status (pending → sending → sent/failed)
3. Click on any email to see full details

## Understanding the Dashboard

### Dashboard Tab
- **Total Emails**: All emails sent through the system
- **Sent**: Successfully delivered emails
- **Failed**: Emails that couldn't be delivered
- **Pending**: Emails queued for sending
- **IP Statistics**: Performance metrics for each IP

### IP Management Tab
- Add/remove IP addresses
- Enable/disable IPs
- See which IPs are active

### Compose Email Tab
- Send individual emails
- Support for CC, BCC, Reply-To
- Plain text or HTML email bodies

### Email Deliveries Tab
- Real-time email tracking
- Detailed delivery information
- Error messages for failed deliveries

## Testing Locally

For local testing without real SMTP:

1. **Use Mailtrap or Mailhog** (email testing tools)

   For Mailtrap:
   ```rust
   host: "smtp.mailtrap.io".to_string(),
   port: 2525,
   username: Some("your-mailtrap-username".to_string()),
   password: Some("your-mailtrap-password".to_string()),
   ```

2. **Use Gmail with App Password** (easiest for testing)

## Deploying to Contabo

When you're ready to deploy to your Contabo server with real IPv4 addresses:

1. Follow the complete guide in `DEPLOYMENT.md`
2. Configure all 10 IPv4 addresses on your server
3. Set up DNS records (SPF, DKIM, PTR)
4. Use systemd and PM2 for process management
5. Set up Nginx reverse proxy with SSL

## Common Issues

### Backend won't start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill the process if needed
kill -9 <PID>
```

### Frontend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Or change the port
PORT=3002 npm run dev
```

### Emails not sending
1. Check SMTP credentials in `server/src/main.rs`
2. Check backend logs for errors
3. Verify IP addresses are enabled in IP Management
4. For Gmail, make sure you're using an App Password

### Can't connect to API
1. Make sure backend is running on port 3001
2. Check `.env.local` in client folder:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
3. Restart frontend after changing .env.local

## API Endpoints

You can also interact with the API directly:

### Send Email
```bash
curl -X POST http://localhost:3001/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": ["recipient@example.com"],
    "subject": "Test",
    "body_text": "Hello World"
  }'
```

### Get All Deliveries
```bash
curl http://localhost:3001/api/emails
```

### Get Statistics
```bash
curl http://localhost:3001/api/stats
```

### Add IP Address
```bash
curl -X POST http://localhost:3001/api/ips \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.100",
    "interface_name": "eth0"
  }'
```

## Next Steps

1. **Test locally** with your Gmail/Mailtrap credentials
2. **Review the code** to understand how IP rotation works
3. **Deploy to Contabo** following DEPLOYMENT.md
4. **Configure DNS records** for production email delivery
5. **Monitor IP reputation** regularly

## Getting Help

- Check `README.md` for full documentation
- See `DEPLOYMENT.md` for production deployment
- Review `server/README.md` for backend details

## Architecture

```
┌─────────────────┐
│  Browser :3000  │
└────────┬────────┘
         │
┌────────▼────────┐
│ Next.js Frontend│
└────────┬────────┘
         │ REST API
┌────────▼────────┐
│  Rust Backend   │
│  API Server     │
│    :3001        │
└────────┬────────┘
         │
┌────────▼────────┐
│   IP Rotation   │
│   (10 IPs)      │
└────────┬────────┘
         │
┌────────▼────────┐
│  SMTP Server    │
│  (Gmail/etc)    │
└─────────────────┘
```

---

**Ready to send emails!** 🚀

Open http://localhost:3000 and start using MailBlew!
