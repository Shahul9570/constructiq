# ConstructIQ - AI-Powered Construction Site Management Platform

Enterprise-grade SaaS platform for managing construction projects with AI-powered analytics, real-time tracking, and multi-user collaboration.

## Architecture

```
construct-iq/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/v1/         # REST API endpoints (14 modules)
│   │   ├── core/           # Config, security, database
│   │   ├── models/         # SQLAlchemy models (15+ tables)
│   │   ├── schemas/        # Pydantic validation schemas
│   │   └── services/       # Business logic (AI, Reports, Storage)
│   ├── scripts/            # Database seeding
│   └── alembic/            # Database migrations
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # UI components (shadcn)
│   │   ├── pages/          # Page components (15+ pages)
│   │   ├── services/       # API service layer (11 modules)
│   │   ├── hooks/          # Custom React hooks
│   │   └── types/          # TypeScript type definitions
├── docker-compose.yml      # Multi-service Docker setup
└── .github/workflows/      # CI/CD pipeline
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Shadcn UI |
| State | React Query, React Context |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| Auth | JWT, OAuth2, bcrypt, RBAC |
| AI | OpenAI API, LangChain, RAG |
| Storage | AWS S3 / MinIO |
| Async | Celery, Redis |
| Reports | ReportLab (PDF), OpenPyXL (Excel) |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### 1. Clone and Setup

```bash
git clone <repo-url> construct-iq
cd construct-iq
cp .env.example .env
# Edit .env with your settings
```

### 2. Start with Docker (Recommended)

```bash
docker-compose up -d
```

This starts:
- Backend API at http://localhost:8000
- Frontend at http://localhost:5173
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO (S3) on port 9000
- Celery worker for async tasks

### 3. Seed Database

```bash
docker-compose exec backend python scripts/seed.py
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | admin | Admin@123 |
| Company Owner | owner | Owner@123 |
| Project Manager | manager | Manager@123 |
| Site Engineer | engineer | Engineer@123 |
| Accountant | accountant | Account@123 |

## Features

### Module 1: Project Management
- Create/edit/delete/archive projects
- Project structure (blocks, sub-structures)
- Progress tracking with % completion
- Budget monitoring
- Status workflow (planning → in_progress → completed)

### Module 2: Workforce Management
- Worker registration with unique IDs
- Trade classification (mason, carpenter, electrician, etc.)
- Daily attendance with 5 status types
- Wage calculation (regular, half-day, overtime)
- Attendance reports and summaries

### Module 3: Contractor Management
- Contractor profiles and team tracking
- Contract amount management
- Payment tracking with history
- Performance rating

### Module 4: Material Management
- Inventory tracking for all material types
- Stock in/out recording
- Reorder level alerts
- Low stock notifications
- Supplier management

### Module 5: Equipment Management
- Equipment registry with type classification
- Usage hours and fuel tracking
- Maintenance scheduling
- Status tracking (available, in-use, maintenance)

### Module 6: Daily Progress
- Work logs with planned vs completed quantities
- Progress percentage calculation
- Daily summaries
- Area and activity tracking

### Module 7: Financial Management
- Cost tracking by category (labour, material, equipment, etc.)
- Budget vs actual analysis
- Cost overrun detection
- Invoice management
- Daily/weekly/monthly cost summaries

### Module 8: Document Management
- File upload with version control
- Category tagging
- Search functionality
- S3/MinIO storage

### Module 9: Photo Management
- Photo gallery with thumbnails
- Area and activity tagging
- Video support
- Visual history timeline

### Module 10: Dashboards
- **Site Engineer**: Daily attendance, material usage, progress
- **Project Manager**: Delays, costs, progress, team overview
- **Company Owner**: Portfolio overview, budget health, completion rates

### Module 11: Reports
- Daily/Weekly/Monthly reports
- Labour, Material, Cost reports
- PDF and Excel export
- Professional formatting

### Module 12: AI Features
- **Report Generator**: AI-powered professional reports from raw data
- **Construction Assistant**: Natural language Q&A about projects
- **Completion Prediction**: ML-based completion date estimation
- **Material Forecasting**: Predict future material requirements
- **Cost Forecasting**: Estimate final project cost
- **Risk Detection**: Identify labour/material/schedule risks

## API Endpoints

### Authentication
```
POST /api/v1/auth/register    - Register new user
POST /api/v1/auth/login       - Login
POST /api/v1/auth/refresh     - Refresh token
GET  /api/v1/auth/me          - Get current user
POST /api/v1/auth/change-password - Change password
```

### Projects
```
GET    /api/v1/projects           - List projects
POST   /api/v1/projects           - Create project
GET    /api/v1/projects/:id       - Get project
PATCH  /api/v1/projects/:id       - Update project
DELETE /api/v1/projects/:id       - Delete project
POST   /api/v1/projects/:id/archive - Archive project
```

### Workforce
```
GET    /api/v1/workforce/workers         - List workers
POST   /api/v1/workforce/workers         - Create worker
GET    /api/v1/workforce/attendance      - List attendance
POST   /api/v1/workforce/attendance      - Mark attendance
GET    /api/v1/workforce/attendance/summary - Attendance summary
```

### Financial
```
POST /api/v1/financial/costs           - Add cost record
GET  /api/v1/financial/costs           - List cost records
GET  /api/v1/financial/summary         - Cost summary
GET  /api/v1/financial/budget-tracking - Budget tracking
POST /api/v1/financial/invoices        - Create invoice
```

### AI Features
```
POST /api/v1/ai/generate-report     - Generate AI report
POST /api/v1/ai/ask                  - Ask AI assistant
GET  /api/v1/ai/predict-completion   - Predict completion date
GET  /api/v1/ai/forecast-materials   - Forecast material needs
GET  /api/v1/ai/forecast-cost        - Forecast final cost
GET  /api/v1/ai/detect-risks        - Detect project risks
```

## Database Schema

The platform uses PostgreSQL with 15+ tables:

- **users** - User accounts with role-based access
- **projects** - Project management
- **project_blocks** - Project sub-divisions
- **project_structures** - Hierarchical project structure
- **workers** - Workforce management
- **attendance** - Daily attendance records
- **contractors** - Contractor profiles
- **contractor_payments** - Payment history
- **materials** - Material inventory
- **material_arrivals** - Stock-in records
- **material_consumptions** - Stock-out records
- **equipment** - Equipment registry
- **equipment_usage** - Usage logs
- **daily_work_logs** - Daily progress
- **cost_records** - Financial tracking
- **invoices** - Invoice management
- **documents** - Document storage
- **photos** - Photo gallery

## Deployment

### Production Docker

```bash
# Build and start all services
docker-compose -f docker-compose.yml up -d

# Initialize database
docker-compose exec backend alembic upgrade head

# Seed data (optional)
docker-compose exec backend python scripts/seed.py
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://constructiq:constructiq123@postgres:5432/constructiq` |
| `SECRET_KEY` | JWT signing key | (change in production) |
| `OPENAI_API_KEY` | OpenAI API key for AI features | (optional) |
| `S3_ENDPOINT` | S3-compatible storage endpoint | `http://minio:9000` |
| `S3_ACCESS_KEY` | Storage access key | `constructiq-access` |
| `S3_SECRET_KEY` | Storage secret key | `constructiq-secret` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `ENVIRONMENT` | Runtime environment | `development` |

## Role-Based Access Control

| Feature | Super Admin | Company Owner | Project Manager | Site Engineer | Contractor | Accountant |
|---------|------------|---------------|-----------------|---------------|------------|------------|
| User Management | ✅ | ✅ | - | - | - | - |
| Projects CRUD | ✅ | ✅ | ✅ | ✅ | - | - |
| Workforce | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Attendance | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Materials | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Equipment | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Financial | ✅ | ✅ | ✅ | - | - | ✅ |
| Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Features | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## License

MIT License - see LICENSE file for details.
