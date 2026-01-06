# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SVG图标库管理系统 (NAS版)** - A high-performance SVG icon library search and download service deployed on NAS devices via Docker.

- **Tech Stack**: Next.js 14 (App Router) + TypeScript + Prisma 5.22 + PostgreSQL + Redis + BullMQ
- **Scale**: 300K-1M icons with <300ms search response time
- **Deployment**: Single-node Docker Compose on NAS (Linux AMD64/ARM64)
- **Key Features**: Full-text search, AI-powered tagging, color editing, sharded file storage
- **Language**: 中文 (All UI, comments, and documentation in Chinese)

---

## Quick Start

```bash
# 首次启动 - 创建管理员并运行数据库迁移
npm run prisma:migrate
npx tsx scripts/create-admin.ts

# 开发模式 (需要本地 PostgreSQL 和 Redis)
npm run dev

# Docker 完整部署
docker-compose up -d

# 启动 AI 处理 Worker (在另一个终端)
npm run worker
```

---

## Common Development Commands

### Development Server
```bash
npm run dev          # Start Next.js dev server on :3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database (Prisma)
```bash
npm run prisma:generate   # Generate Prisma Client after schema changes
npm run prisma:migrate    # Create and run migrations
npm run prisma:studio     # Open Prisma Studio (database UI)
```

### Docker
```bash
docker-compose up -d        # Start all services (app, postgres, redis)
docker-compose down        # Stop all services
docker-compose logs -f app  # Follow app logs
```

### Worker (AI Processing)
```bash
npm run worker    # Start BullMQ worker for AI analysis tasks
```

### Cache Management
- Redis is **optional but recommended** for production
- If Redis unavailable, cache automatically degrades (see `lib/cache.ts`)
- Cache TTL: Search results (30min), popular icons (1hour)

### Admin Scripts
```bash
npx tsx scripts/create-admin.ts     # Create admin user
npx tsx scripts/process-pending.ts   # Manually process PENDING icons
```

---

## Architecture & Key Patterns

### App Router Structure
```
app/
├── (public)/               # Public routes (no auth required)
│   └── page.tsx           # Homepage with search
├── admin/                  # Protected admin routes
│   ├── layout.tsx         # Auth guard and layout
│   ├── login/             # Admin login page
│   ├── upload/            # Batch/single upload
│   ├── icons/             # Icon management list
│   ├── edit/[id]/         # Icon editing with color editor
│   └── ai-config/         # AI provider configuration
└── api/                   # API routes (Next.js Route Handlers)
    ├── health/            # Health check endpoint
    ├── icons/             # Public icon APIs (search, download, info)
    └── admin/             # Protected admin APIs (upload, login, ai-config)
```

**Important**: `app/admin/` (NOT `app/(auth)/admin/`) is the admin route structure. No route groups are currently used.

### Sharded File Storage (Critical Architecture)
Icons are distributed across **16 shard directories** using `hash(iconId) % 16`:
```
/data/icons/
├── shard-0/
├── shard-1/
└── ... (shard-15)
```

**Why**: Prevents single-directory performance bottlenecks at 100K+ files.

**Implementation**: See `lib/storage.ts` - `getShardId()` calculates shard, `getIconPath()` returns full path.

### Authentication Flow
- **Mechanism**: HTTP-Only Cookie + Redis Session (7-day expiry)
- **No JWT**: Sessions can be revoked; simpler for single-admin use case
- **Middleware**: `middleware.ts` checks `/admin/*` routes for valid session
- **Service**: `lib/auth.ts` - `createSession()`, `validateSession()`, `destroySession()`

### Rate Limiting Strategy
- **Algorithm**: Token Bucket (see `lib/rate-limiter.ts`)
- **Scope**: Write operations ONLY (upload, delete, manage) - 20 req/min/IP
- **Read operations**: Unrestricted (search, browse, download)
- **Storage**: Redis-backed; if Redis unavailable, requests allowed (fail-open)

### Async AI Processing (BullMQ)
Upload → Save file → Add to BullMQ queue → Worker processes → Updates DB

**Key Files**:
- `lib/ai-queue.ts` - Queue definition and worker setup
- `lib/ai.ts` - Multi-provider AI client (OpenAI, Qwen, DeepSeek, etc.)
- `lib/ai-config.ts` - Database-backed AI provider configuration
- `scripts/worker.ts` - Worker entry point (run with `npm run worker`)
- Flow is **non-blocking**: User gets "upload started" response immediately

**AI Providers Supported**:
- `openai` - OpenAI API
- `openai-response` - OpenAI with structured responses
- `qwen` - Alibaba Qwen (通义千问)
- `deepseek` - DeepSeek API

**Important**: Only ONE AI provider can be enabled at a time (enforced in `lib/ai-config.ts:84-89`)

### Full-Text Search (PostgreSQL)
- **TSVECTOR** for primary search (Chinese/English text)
- **pg_trgm** extension for fuzzy matching and search suggestions
- **GIN indexes** on `searchVector` and `name` columns
- Service: `lib/search.ts` - Implements search with popular icons and query tracking

**Search Endpoints**:
- `GET /api/icons/search` - Full-text search with pagination
- `GET /api/icons/suggest` - Search suggestions based on history
- `GET /api/icons/popular` - Most viewed/downloaded icons

### Caching Strategy
**Cache Keys** (see `lib/cache.ts`):
- `search:{query}:{limit}:{offset}` - Search results
- `icon:popular` - Homepage popular icons
- `icon:{id}` - Individual icon details

**Degradation**: If Redis down, queries hit DB directly (no cache = functional, just slower)

### Prisma Schema Highlights
- **Icon model**: Includes `contentHash` (MD5) for deduplication, `shardId` for file location, `originalIconId` for duplicate tracking
- **Unsupported("tsvector")**: Manually added in migration (trigger updates search vector)
- **Relations**: Icon ↔ Category (many-to-one), Icon ↔ Tag (many-to-many via IconTag)

---

## Service Layer Locations

| Service | File | Purpose |
|---------|------|---------|
| Database | `lib/db.ts` | Prisma Client singleton |
| Storage | `lib/storage.ts` | Sharded file I/O (read/write/hash) |
| Auth | `lib/auth.ts` | Session management (login/validate/destroy) |
| Cache | `lib/cache.ts` | Redis wrapper with automatic fallback |
| Rate Limit | `lib/rate-limiter.ts` | Token Bucket algorithm (write ops only) |
| Logger | `lib/logger.ts` | pino structured JSON logging |
| AI Queue | `lib/ai-queue.ts` | BullMQ queue and worker setup |
| AI Client | `lib/ai.ts` | Multi-provider AI API integration |
| AI Config | `lib/ai-config.ts` | Database-backed AI provider management |
| Search | `lib/search.ts` | Full-text search with suggestions |
| Init | `lib/init.ts` | Service initialization (called at startup) |

---

## Environment Configuration

**Required in `.env`** (see `.env.example`):
```bash
# Application
NODE_ENV=development
ADMIN_PASSWORD=your-very-strong-admin-password-here
BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:your-db-password@postgres:5432/iconlibrary

# Redis (Optional but recommended)
REDIS_URL=redis://redis:6379

# AI Service (One of the following)
QWEN_API_KEY=your-qwen-api-key
QWEN_API_SECRET=your-qwen-api-secret
QWEN_ENDPOINT=https://dashscope.aliyuncs.com

# Storage
STORAGE_BASE_PATH=/app/data

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs

# Rate Limiting
RATE_LIMIT_WRITE_REQUESTS=20
RATE_LIMIT_WRITE_WINDOW=60
```

**Note**: AI provider credentials can also be configured via the admin UI (`/admin/ai-config`) at runtime, stored in the `ai_providers` table.

**Critical**: Never commit `.env` files. Use `.env.example` as template.

---

## Performance Requirements

- **Search response**: <300ms (non-concurrent)
- **Icon scale**: 300K-1M icons
- **Concurrent users**: <100 simultaneous
- **File size limit**: 5MB per SVG
- **Session duration**: 7 days

---

## Key Implementation Constraints

1. **No user registration required** - Public access for all features
2. **Single admin** - System designed for individual/team NAS use
3. **AI is optional** - If Qwen API fails, icon marked as "PENDING", doesn't block uploads
4. **Storage is local** - All SVG files on NAS filesystem (not S3/cloud)
5. **Read operations unlimited** - Only write operations (upload/modify/delete) rate-limited

---

## Docker Architecture

**Services** (`docker-compose.yml`):
- `app` - Next.js application
- `postgres` - PostgreSQL 15
- `redis` - Redis 7 (optional)

**Volumes** (mounted to NAS host):
- `./data/icons` - SVG files (sharded)
- `./data/temp` - Upload staging area
- `postgres_data` - Database persistence
- `redis_data` - Cache persistence

**Multi-arch**: Dockerfile supports AMD64 and ARM64 (for diverse NAS hardware)

---

## Development Workflow

### Making Database Schema Changes
1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:generate`
3. Run `npm run prisma:migrate` (creates migration in `prisma/migrations/`)
4. Commit migration files with schema changes

### Adding New API Routes
- Place in `app/api/{resource}/route.ts`
- Use `export async function GET/POST/PUT/DELETE()`
- For authenticated routes, import `authService.validateSession()` first
- For write operations, call `rateLimitWrite(identifier)` before processing

### Adding New Pages
- Public pages: `app/{page}/page.tsx`
- Admin pages: `app/admin/{page}/page.tsx`
- Use Server Components by default (default in Next.js 14)
- Use Client Components (`'use client'`) only when interactivity needed (forms, search input, color editor)

### File Upload Flow
1. User selects files → Admin upload page (`app/admin/upload/page.tsx`)
2. Upload to `/api/admin/upload` (single) or `/api/admin/upload/batch` (multiple)
3. Validates size (<5MB) and type (SVG)
4. Calculate MD5 hash (`storage.calculateContentHash()`)
5. Check for duplicates by `contentHash`
6. Save to sharded path (`storage.saveIcon()`)
7. Create DB record with status "PENDING"
8. Add to AI queue (`aiQueue.add()`)
9. Return immediate response (non-blocking)

**Batch Upload**: Special endpoint supports uploading multiple files in one request with progress tracking.

---

## Known Limitations & TODOs

1. **PostgreSQL Triggers** - `searchVector` trigger needs manual SQL in migration (not auto-generated by Prisma)
2. **Tests** - No test suite yet
3. **Thumbnail Generation** - Storage service has `getThumbnailPath()` but thumbnail generation not implemented
4. **Color Editor** - Frontend component exists (`components/admin/ColorEditor.tsx`) but needs SVG color manipulation logic

---

## Design Decisions Record

### Why Prisma 5 not 7?
Prisma 7 changed datasource configuration syntax significantly. Project uses Prisma 5.22.0 for stability and documentation alignment. Upgrade to Prisma 7 would require `prisma.config.ts` migration.

### Why Cookie Sessions over JWT?
- Single-admin scenario (no token revocation complexity)
- Sessions stored in Redis (can force logout)
- 7-day expiry aligns with NAS use pattern
- CSRF protection via SameSite cookie attribute
- Password hashing: SHA-256 (see `lib/auth.ts:26-28`)

### Why BullMQ for AI?
- Async processing prevents upload blocking
- Built-in retry logic (3 attempts, exponential backoff)
- Task persistence (survives container restarts)
- Rate limiting through queue configuration

### Why Database-Backed AI Config?
Instead of environment variables, AI providers are stored in `ai_providers` table:
- Runtime configuration changes via admin UI
- Support for multiple providers with easy switching
- Testing connections before deployment
- Per-provider model configurations

### Why Sharded Storage?
- Filesystem performance degrades with >10K files per directory
- 30K-1M icons would overwhelm single directory
- Hash-based sharding ensures even distribution (UUID modulo 16)
- Hotspots avoided without manual reorganization

### Authentication Implementation Details
- **Middleware**: `middleware.ts:9-37` - Checks session cookie existence, redirects `/admin/*` to login
- **Session Validation**: Full validation happens in API routes, not middleware (see `lib/auth.ts:84-105`)
- **Password Hashing**: SHA-256 (not bcrypt) - acceptable for single-admin NAS use case
- **Cookie Duration**: 7 days with explicit expiration date (see `lib/auth.ts:133`)

---

## Project-Specific Patterns

### Service Initialization
Services must be initialized at app startup (see `lib/init.ts`):
```typescript
import { ensureServicesInitialized } from '@/lib/init'

// Call in app/layout.tsx or API route setup
await ensureServicesInitialized()
```

### Error Handling in API Routes
- Use `NextResponse.json()` with appropriate status codes
- Rate limit errors: Return 429 with `error: 'RATE_LIMIT_EXCEEDED'`
- Auth errors: Return 401 with `error: 'UNAUTHORIZED'`
- Validation errors: Return 400 with `error: 'VALIDATION_ERROR'`

### TypeScript Path Aliases
- `@/*` maps to project root (see `tsconfig.json:22`)
- Use: `import { foo } from '@/lib/bar'` instead of relative paths
