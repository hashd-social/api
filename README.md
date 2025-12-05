# Hashd Management API

Optional backend service for HASHD admin frontend instances. Provides MongoDB storage and wallet-based authentication for waitlist management, email verification, and analytics. Not required for core protocol functionality—HASHD runs entirely on-chain without a backend.

## Getting Started

### Install Dependencies
```bash
yarn install
```

### Environment Variables
Create a `.env` file:
```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=hashd-production
ADMIN_WALLET_ADDRESS=0x...
FRONTEND_URL=https://hashd.social
RESEND_API_KEY=re_...
```

### Start Server
```bash
# Production
yarn start

# Development (auto-reload)
yarn dev

# Run tests
yarn test
```

## API Endpoints

### Public Endpoints

#### `GET /`
Root endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Hashd Management API v1.0.0"
}
```

#### `GET /health`
Health check with endpoint information.

**Response:**
```json
{
  "success": true,
  "message": "Hashd Management API is running",
  "endpoints": {
    "health": "/health",
    "waitlist": "/api/waitlist",
    "admin": "/api/admin"
  },
  "timestamp": "2024-12-01T16:00:00.000Z"
}
```

#### `POST /api/waitlist`
Submit a new waitlist entry.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", // optional
  "roles": ["developer", "early_adopter"],
  "note": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined the waitlist",
  "id": "507f1f77bcf86cd799439011"
}
```

### Protected Endpoints (Admin Only)

All protected endpoints require wallet signature authentication:

**Authentication Headers:**
```json
{
  "walletAddress": "0xf39...2266",
  "signature": "0x...",
  "message": "Hashd Admin Authentication\nWallet: 0xf39...\nTimestamp: 1234567890"
}
```

#### `POST /api/admin/waitlist`
Get all waitlist entries with pagination and filtering.

**Request Body:**
```json
{
  "walletAddress": "0xf39...2266",
  "signature": "0x...",
  "message": "...",
  "page": 1,
  "limit": 50,
  "status": "pending",
  "search": "john"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    },
    "stats": {
      "byStatus": {
        "pending": 100,
        "approved": 40,
        "rejected": 10
      },
      "byRole": {
        "developer": 50,
        "investor": 30,
        ...
      },
      "total": 150
    }
  }
}
```

#### `POST /api/admin/waitlist/:id/status`
Update the status of a waitlist entry.

**Request Body:**
```json
{
  "walletAddress": "0xf39...2266",
  "signature": "0x...",
  "message": "...",
  "status": "approved"
}
```

#### `POST /api/admin/waitlist/:id/delete`
Delete a waitlist entry.

**Request Body:**
```json
{
  "walletAddress": "0xf39...2266",
  "signature": "0x...",
  "message": "..."
}
```

#### `POST /api/admin/waitlist/export`
Export all waitlist entries as CSV.

**Request Body:**
```json
{
  "walletAddress": "0xf39...2266",
  "signature": "0x...",
  "message": "..."
}
```

**Response:** CSV file download

## Authentication

Admin endpoints require wallet signature authentication:

```json
{
  "walletAddress": "0xf39...2266",
  "signature": "0x...",
  "message": "Hashd Admin Authentication\nWallet: 0xf39...\nTimestamp: 1234567890"
}
```

## Security Features

### MongoDB Credentials Protection
- MongoDB URI credentials are automatically sanitized in logs
- Connection strings with usernames/passwords are masked as `***`
- Prevents accidental credential exposure in application logs

### HTTPS Enforcement (Production)
- Automatic HTTP to HTTPS redirect in production environment
- Uses `x-forwarded-proto` header for proxy compatibility
- Works with Heroku, AWS, and other cloud platforms

### Rate Limiting
- **Waitlist submissions**: 5 requests per 15 minutes per IP
- **Email verification**: 10 attempts per hour per IP
- **Admin endpoints**: 100 requests per minute

### Authentication
- Wallet signature verification for all admin endpoints
- Admin wallet address validated against `ADMIN_WALLET_ADDRESS` env variable
- CORS restricted to `FRONTEND_URL` only

## Database Backups

### Automated Backup Script

Create automated backups of your MongoDB database:

```bash
# Make scripts executable
chmod +x scripts/backup-mongodb.sh
chmod +x scripts/restore-mongodb.sh

# Run manual backup
./scripts/backup-mongodb.sh
```

### Setup Automated Daily Backups (Cron)

Add to your crontab (`crontab -e`):

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/hashd/api && ./scripts/backup-mongodb.sh >> logs/backup.log 2>&1
```

### Backup Configuration

Set retention period in `.env`:

```env
BACKUP_RETENTION_DAYS=30  # Keep backups for 30 days
```

### Restore from Backup

```bash
# List available backups
ls -lh backups/

# Restore specific backup
./scripts/restore-mongodb.sh backups/hashd_backup_20231203_120000.tar.gz
```

**⚠️ Warning**: Restore will overwrite existing database data!

## License

MIT
