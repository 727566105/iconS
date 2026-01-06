# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SVG图标库管理系统 (NAS版)** - A high-performance SVG icon library search and download service deployed on NAS devices via Docker.

- **Tech Stack**: Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + Redis
- **Scale**: 300K-1M icons with <300ms search response time
- **Deployment**: Single-node Docker Compose on NAS (Linux AMD64/ARM64)
- **Key Features**: Full-text search, AI-powered tagging, color editing, sharded file storage

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

### Cache Management
- Redis is **optional but recommended** for production
- If Redis unavailable, cache automatically degrades (see `lib/cache.ts`)
- Cache TTL: Search results (30min), popular icons (1hour)

---

## Architecture & Key Patterns

### App Router Structure
```
app/
├── (public)/          # Public routes (no auth required)
│   ├── page.tsx       # Homepage with search
│   └── search/        # Search results
├── (auth)/
│   └── admin/        # Protected admin routes
│       ├── layout.tsx # Includes auth guard middleware
│       └── login/     # Admin login page
└── api/              # API routes (Next.js Route Handlers)
```

**Route Groups** `(public)` and `(auth)` are purely organizational - they don't affect URLs.

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
- `lib/ai.ts` - Qwen API client (mocked, needs real implementation)
- Flow is **non-blocking**: User gets "upload started" response immediately

### Full-Text Search (PostgreSQL)
- **TSVECTOR** for primary search (Chinese/English text)
- **pg_trgm** extension for fuzzy matching and search suggestions
- **GIN indexes** on `searchVector` and `name` columns
- Service: `lib/search.ts` (to be implemented)

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
| Cache | `lib/cache.ts` | Redis wrapper with fallback |
| Rate Limit | `lib/rate-limiter.ts` | Token Bucket algorithm |
| Logger | `lib/logger.ts` | pino structured JSON logging |
| AI Queue | `lib/ai-queue.ts` | BullMQ worker setup |
| AI Client | `lib/ai.ts` | Qwen API integration (⚠️ mock) |

---

## Environment Configuration

**Required in `.env`** (see `.env.example`):
```bash
DATABASE_URL=postgresql://postgres:password@postgres:5432/iconlibrary
REDIS_URL=redis://redis:6379  # Optional but recommended
ADMIN_PASSWORD=strong-password-here
QWEN_API_KEY=your-qwen-key
QWEN_API_SECRET=your-qwen-secret
STORAGE_BASE_PATH=/app/data
```

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
- Admin pages: `app/(auth)/admin/{page}/page.tsx`
- Use Server Components by default (default in Next.js 14)
- Use Client Components (`'use client'`) only when interactivity needed (forms, search input, color editor)

### File Upload Flow
1. User selects files → `components/admin/UploadDropzone.tsx`
2. Upload to `/api/admin/upload` → Validates size (<5MB) and type (SVG)
3. Calculate MD5 hash (`storage.calculateContentHash()`)
4. Save to sharded path (`storage.saveIcon()`)
5. Create DB record with status "PENDING"
6. Add to AI queue (`aiQueue.add()`)
7. Return "Upload started" response

---

## Known Limitations & TODOs

1. **AI Service** (`lib/ai.ts`) - Currently mocked, needs real Qwen API integration
2. **Search Service** (`lib/search.ts`) - Not yet implemented
3. **Middleware** (`middleware.ts`) - Auth guard not yet created
4. **Admin init script** (`scripts/create-admin.ts`) - Not yet created
5. **Triggers** - PostgreSQL `searchVector` trigger needs manual SQL in migration
6. **Tests** - No test suite yet (see `tests/` directory structure)

---

## Design Decisions Record

### Why Prisma 5 not 7?
Prisma 7 changed datasource configuration syntax significantly. Project uses Prisma 5.22.0 for stability and documentation alignment. Upgrade to Prisma 7 would require `prisma.config.ts` migration.

### Why Cookie Sessions over JWT?
- Single-admin scenario (no token revocation complexity)
- Sessions stored in Redis (can force logout)
- 7-day expiry aligns with NAS use pattern
- CSRF protection via SameSite cookie attribute

### Why BullMQ for AI?
- Async processing prevents upload blocking
- Built-in rate limiting (Qwen API quota: 10 req/s)
- Retry logic (3 attempts, exponential backoff)
- Task persistence (survives container restarts)

### Why Sharded Storage?
- Filesystem performance degrades with >10K files per directory
- 30K-1M icons would overwhelm single directory
- Hash-based sharding ensures even distribution
- Hotspots avoided without manual reorganization
