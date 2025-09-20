# DigiPin Micro-SaaS

Ultra-frugal DigiPin geocoding API service for the Indian market with 93%+ profit margins.

## 🚀 Quick Start with Cursor AI

1. **Import Context**: Load `digipin_cursor_context.json` into Cursor AI for full project understanding
2. **Setup Structure**: Run `bash setup-structure.sh` (Unix) or create directories manually
3. **Install Dependencies**: `npm install`
4. **Environment Setup**: Copy `.env.example` to `.env` and configure
5. **Initialize Database**: `npm run db:migrate`
6. **Start Development**: `npm run dev`

## 📊 Business Model

- **Pricing**: ₹25 per 1,000 requests (60-80% cheaper than competitors)
- **Free Tier**: 50,000 requests/month  
- **Target Market**: Indian e-commerce, logistics, fintech companies
- **Revenue Projection**: ₹7,500-₹150,000/month depending on adoption

## 🏗️ Architecture

- **Framework**: Fastify + TypeScript
- **Database**: SQLite (embedded, zero hosting cost)
- **Cache**: node-cache (in-memory)
- **Hosting**: DigitalOcean 1GB Droplet (₹505/month total cost)
- **CDN**: Cloudflare (free tier)

## 🎯 Key Features

- Address to DigiPin conversion
- DigiPin to coordinates reverse geocoding  
- Batch processing support
- DigiPin validation and formatting
- 99.5% uptime target
- <50ms response time (cached)

## 📡 API Endpoints

### Geocoding
- `POST /v1/geocode` - Convert address to DigiPin
- `POST /v1/reverse` - Convert DigiPin to coordinates
- `POST /v1/batch` - Batch operations
- `GET /v1/validate/:digipin` - Validate DigiPin

### Utility  
- `GET /v1/bounds/:digipin` - Get bounding box
- `GET /v1/neighbors/:digipin` - Get neighboring DigiPins
- `GET /v1/level/:digipin` - Get precision level

### System
- `GET /health` - Health check
- `GET /metrics` - Usage metrics  
- `GET /docs` - API documentation

## 🔧 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run db:migrate   # Run database migrations
npm run deploy       # Deploy to production
```

## 🚀 Deployment

Deploy to DigitalOcean 1GB Droplet with PM2:

```bash
npm run build
pm2 start ecosystem.config.js --env production
```

## 💰 Cost Structure

- **Infrastructure**: ₹340/month (DigitalOcean)
- **Domain**: ₹80/month  
- **Backup**: ₹85/month
- **Total**: ₹505/month
- **Profit Margin**: 93%+ at scale

## 🎯 Competitive Advantage

- **Government Backing**: Official India Post DigiPin system
- **Cost Leadership**: 60-80% cheaper than international providers
- **Data Sovereignty**: All processing in India
- **Open Source**: No licensing fees

## 📈 Revenue Scenarios

- **Conservative**: 300K req/month → ₹7,500 revenue → ₹6,995 profit
- **Moderate**: 1.5M req/month → ₹37,500 revenue → ₹36,995 profit  
- **Growth**: 6M req/month → ₹150,000 revenue → ₹148,660 profit

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with proper tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ for the Indian developer ecosystem
