# ClipIQ Backend Deployment Guide

## Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- MinIO Server
- Docker & Docker Compose (optional)

## Local Development

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start PostgreSQL & MinIO**
```bash
docker-compose up -d postgres minio
```

4. **Run migrations**
```bash
npm run migrate
```

5. **Seed data**
```bash
npm run seed
```

6. **Start development server**
```bash
npm run dev
```

## Docker Deployment

```bash
docker-compose up -d
```

## Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start src/server.js --name clipiq-backend
pm2 save
```

### Environment Variables
Ensure all production environment variables are set:
- NODE_ENV=production
- Strong JWT secrets
- Production database credentials
- MinIO production configuration

### Security Checklist
- [ ] Change all default passwords
- [ ] Configure CORS properly
- [ ] Enable HTTPS
- [ ] Set strong JWT secrets
- [ ] Configure rate limiting
- [ ] Enable helmet security headers
- [ ] Setup database backups
- [ ] Configure MinIO access policies

### Monitoring
- Setup logging (Winston)
- Configure error tracking (Sentry, etc)
- Monitor performance metrics
- Database query optimization
