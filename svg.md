
好的，遵照您的要求，我将所有之前的讨论内容整合成一份完整、结构化的**需求文档与开发规范**。本文档专注于“做什么”和“怎么做”的约定，而不包含具体的代码实现逻辑，可以直接作为项目蓝图交付给开发团队，并可根据需要进行拆分后导入Trae平台。

---

# SVG图标库管理系统 (NAS版) - 需求文档与开发规范

## 1. 项目概述

| 项目信息 | 描述 |
| --- | --- |
| **项目名称** | SVG图标库管理系统 |
| **目标用户** | 前端开发者、UI/UX设计师等需要快速查找和使用图标的用户；系统管理员 |
| **核心价值** | 提供一个免注册、高性能、可自定义颜色的SVG图标搜索、预览和下载服务 |
| **部署环境** | 个人/团队NAS（网络附加存储）设备，以单机Docker容器形式运行 |
| **规模预估** | 支持从30万起，未来可无缝扩容至百万级图标 |
| **特色功能** | 实时搜索、AI辅助标签、在线SVG颜色编辑、本地化高性能存储 |

---

## 2. 技术栈选型

| 领域 | 技术选型 | 选型理由 |
| --- | --- | --- |
| **前端框架** | Next.js 14 (App Router) | 服务端渲染，提升首屏加载速度和SEO |
| **UI库** | React 18 + Tailwind CSS + shadcn/ui | 时效性好，组件化程度高，风格统一 |
| **开发语言** | TypeScript | 保证代码健壮性和可维护性 |
| **数据库** | PostgreSQL 15+ | 强大的全文搜索、JSONB支持、高并发处理能力，远超SQLite |
| **缓存** | Redis 7+ (可选，但强烈推荐) | 缓存热门图标和搜索结果，显著提升性能 |
| **AI服务** | 阿里云百炼 Qwen模型 | 用于上传图标的自动化标签和分类生成 |
| **存储方案** | 本地文件系统 (分片存储) | 适配NAS环境，数据完全自主掌控，降低成本 |
| **部署方案** | Docker + Docker Compose | 简化NAS环境下的部署和管理，保证环境一致性 |

---

## 3. 核心功能需求 (用户故事)

### **史诗一：面向用户的图标搜索与操作**

#### **用户故事 1.1：模糊搜索图标**
- **描述**：用户在首页看到一个醒目的搜索框，输入任意关键词（如“用户”、“设置”、“箭头”），系统能够实时返回相关的SVG图标列表。
- **验收标准**：
    - 页面中心有一个大型搜索输入框，占位符文本为“搜索你需要的图标...”。
    - 输入时应有搜索建议下拉框，展示可能的关键词或直接匹配的图标。
    - 搜索结果以瀑布流或网格形式展示，每个图标以缩略图形式出现。
    - 搜索响应时间在非高并发下应小于300ms。
    - 支持中英文混合搜索。
- **关联API**：`GET /api/icons/search`
- **优先级**：P0
- **预估工时**：3d

#### **用户故事 1.2：无登录使用图标**
- **描述**：用户无需任何注册或登录行为，即可直接使用所有公开功能。
- **验收标准**：
    - 访问主页无任何登录提示或限制。
    - 搜索、预览、复制、下载所有功能在访客模式下均可正常使用。
- **优先级**：P0
- **预估工时**：1d (通过配置实现)

#### **用户故事 1.3：复制SVG代码**
- **描述**：用户搜索到满意的图标后，点击该图标，可以选择“复制SVG代码”，源代码被复制到剪贴板。
- **验收标准**：
    - 点击图标后，应弹出一个操作浮层或模态框。
    - 浮层中需明确提供“复制SVG代码”按钮。
    - 点击后，应有成功提示（如Toast），告知用户“已复制到剪贴板”。
    - 复制的内容是标准的、可用的SVG源码字符串。
- **关联API**：`GET /api/icons/[id]/svg`
- **优先级**：P0
- **预估工时**：1d

#### **用户故事 1.4：下载图标**
- **描述**：用户可以将原始的、未修改的SVG文件下载到本地。
- **验收标准**：
    - 点击图标后，操作浮层中需提供“下载图标”按钮。
    - 点击后，浏览器应自动下载.svg文件，文件名应具有一定描述性（如`icon-user-profile.svg`）。
- **优先级**：P0
- **预估工时**：1d

#### **用户故事 1.5：在线更改图标颜色并下载**
- **描述**：用户可以在一个颜色编辑器中修改图标的颜色，并实时预览效果，最后下载的是修改过颜色的SVG文件。
- **验收标准**：
    - 点击图标后，操作浮层中需提供“更改颜色”入口（如一个调色板图标）。
    - 进入颜色编辑器后，左侧或中心实时显示图标预览。
    - 提供一个颜色选择器，支持手动输入HEX颜色码和预设颜色板。
    - 颜色修改后，图标预览应立即更新。
    - 编辑器内提供“复制修改后代码”和“下载修改后图标”两个按钮。
    - 下载的文件内容（SVG fill/stroke属性）必须是修改后的颜色。
- **优先级**：P1
- **预估工时**：3d

---

### **史诗二：管理员图标管理**

#### **用户故事 2.1：管理员登录**
- **描述**：系统管理员需要通过密码验证后，才能访问上传和管理界面。
- **验收标准**：
    - 访问 `/admin` 路径，若未登录则跳转到登录页。
    - 登录页仅需一个密码输入框和登录按钮。
    - 密码错误应有明确提示，正确则跳转到管理后台。
    - 登录态应有有效期，过期需重新登录。
- **关联API**：`POST /api/auth/admin/login`
- **优先级**：P0
- **预估工时**：2d

#### **用户故事 2.2：批量上传图标**
- **描述**：管理员可以一次性拖拽或选择多个SVG文件进行批量上传。
- **验收标准**：
    - 提供一个支持拖拽和点击选择的文件上传区域。
    - 能展示待上传文件列表，包括文件名和大小。
    - 点击上传后，应有进度条显示上传进度。
    - 上传过程中，应逐步将文件持久化到本地存储（非临时目录）。
    - 上传完成后，应触发AI自动分析流程。
- **关联API**：`POST /api/admin/icons/upload`
- **优先级**：P1
- **预估工时**：3d

#### **用户故事 2.3：AI辅助生成标签与分类 (后台任务)**
- **描述**：图标上传成功后，系统通过集成的AI服务自动分析图标内容，生成描述性的中文标签和建议分类。
- **验收标准**：
    - 这是一个后台异步任务，不应阻塞用户的上传流程。
    - 任务处理逻辑应调用 `Qwen` API，并将图标SVG内容作为输入。
    - AI返回的标签和建议分类需要保存到数据库。
    - 管理员应在图标列表中看到AI生成的内容，并可以修改。
    - 如果AI调用失败，图标状态应标记为“待处理”，不影响其他功能。
-关联API：`Internal Job Queue`
- **优先级**：P1
- **预估工时**：4d

#### **用户故事 2.4：管理已上传图标**
- **描述**：管理员查看所有图标列表，并能编辑图标信息（名称、分类、标签）、删除图标或修改其状态（草稿/发布）。
- **验收标准**：
    - 管理后台有一个图标列表页，支持分页和搜索。
    - 每个条目显示缩略图、名称、上传时间、状态（已发布/草稿）。
    - 提供编辑入口，打开一个表单可以修改名称、手动选择分类、输入标签。
    - 提供删除按钮，删除时需二次确认，并同时删除数据库记录和本地SVG文件。
    - 提供“发布/取消发布”切换开关。
- **关联API**：`GET /api/admin/icons`, `PUT /api/admin/icons/[id]`, `DELETE /api/admin/icons/[id]`
- **优先级**：P1
- **预估工时**：4d

---

## 4. 系统架构设计规范

### 4.1. 整体架构

本项目采用**单机容器化架构**，专为NAS环境优化，避免集群复杂性。

```
┌──────────────────────────────────────────────────────────┐
│                        NAS Host                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │             Docker Compose 环境                      ││
│  │                                                    ││
│  │  ┌─────────────┐    ┌──────────────────────────────┐ ││
│  │  │  Nginx      │───▶│  Next.js App Server         │ ││
│  │  │  (反向代理)  │    │  (API + UI)                 │ ││
│  │  └─────────────┘    └──────────────────────────────┘ ││
│  │          │                         │                  ││
│  │          ▼                         ▼                  ││
│  │  ┌─────────────┐    ┌──────────────────────────────┐ ││
│  │  │  Static     │    │  PostgreSQL + Redis (可选)   │ ││
│  │  │  Files      │    │  (Docker Volumes)            │ ││
│  │  └─────────────┘    └──────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

*   **Next.js 服务**: 处理所有前端页面渲染和后端API逻辑。
*   **PostgreSQL**: 持久化存储所有元数据（图标信息、分类、标签、用户数据）。
*   **Redis**: 作为缓存层，存储热点搜索结果、热门图标列表、会话信息。
*   **本地文件系统**: 存储所有SVG文件和缩略图。
*   **Nginx**: 作为反向代理，处理静态文件请求和负载均衡（如果要多实例）。

### 4.2. 本地存储设计规范

为避免单个目录文件过多导致IO性能下降，SVG文件必须**按分片（Shard）存储**。

*   **分片策略**: 使用 `shardId = hash(iconId) % 16`，将文件分散到16个不同的子目录中。
*   **目录结构**:
    ```
    /data/
    ├── icons/                  # 原始SVG文件
    │   ├── shard-0/
    │   ├── shard-1/
    │   └── ... (shard-15)
    ├── thumbnails/            # 缩略图（可选，优化列表加载）
    │   ├── shard-0/
    │   └── ...
    ├── temp/                  # 上传临时目录
    └── backups/               # 定期备份
    ```

---

## 5. 数据模型设计规范

数据库使用PostgreSQL，主键统一使用 `UUID`，时间为带时区的 `TIMESTAMPTZ`。

### 5.1. 表结构

#### `icons` (图标核心信息表)
| 字段名 | 数据类型 | 约束/索引 | 描述 |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK` | 图标唯一标识 |
| `name` | `VARCHAR(255)` | `GIN(trgm)` | 图标名称 |
| `file_name` | `VARCHAR(255)` | - | 原始文件名 |
| `description` | `TEXT` | - | 图标描述 |
| `category_id` | `UUID` | `FK -> categories.id` | 所属分类ID |
| `content_hash` | `VARCHAR(64)` | `UNIQUE` | SVG内容的MD5哈希，用于去重 |
| `shard_id` | `INTEGER` | `INDEX` | 文件存储分片ID (0-15) |
| `status` | `VARCHAR(20)` | `INDEX` | 状态: `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `ai_tags` | `JSONB` | `GIN` | AI生成的标签数组 `["ui", "user", "profile"]` |
| `ai_category` | `VARCHAR(100)` | - | AI生成的分类建议 |
| `search_vector` | `TSVECTOR` | `GIN` | PostgreSQL全文搜索向量 |
| `view_count` | `INTEGER` | `INDEX (DESC)` | 浏览次数 |
| `download_count` | `INTEGER` | `INDEX (DESC)` | 下载次数 |
| `created_at` | `TIMESTAMPTZ` | `INDEX` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | - | 更新时间 |

**触发器**: 必须创建一个触发器，在 `INSERT` 或 `UPDATE` 时，自动从 `name`, `description`, `ai_tags` 更新 `search_vector` 字段。

#### `categories` (分类表)
| 字段名 | 数据类型 | 约束/索引 | 描述 |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK` | 分类唯一标识 |
| `name` | `VARCHAR(100)` | `UNIQUE` | 分类名称 |
| `slug` | `VARCHAR(100)` | `UNIQUE, INDEX` | URL友好的名称 |
| `description` | `TEXT` | - | 分类描述 |
| `icon_count` | `INTEGER` | - | 该分类下的图标数量（可由trigger维护） |
| `parent_id` | `UUID` | `FK -> categories.id` | 父分类ID，支持多级分类 |
| `sort_order` | `INTEGER` | `INDEX` | 排序权重 |
| `created_at` | `TIMESTAMPTZ` | - | 创建时间 |

#### `tags` (标签表)
| 字段名 | 数据类型 | 约束/索引 | 描述 |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK` | 标签唯一标识 |
| `name` | `VARCHAR(50)` | `UNIQUE, INDEX` | 标签名称，如"箭头" |
| `usage_count` | `INTEGER` | `INDEX (DESC)` | 使用次数，用于热门标签排序 |
| `created_at` | `TIMESTAMPTZ` | - | 创建时间 |

#### `icon_tags` (图标与标签多对多关联表)
| 字段名 | 数据类型 | 约束/索引 | 描述 |
| --- | --- | --- | --- |
| `icon_id` | `UUID` | `PK, FK` | 图标ID |
| `tag_id` | `UUID` | `PK, FK` | 标签ID |
| `created_at` | `TIMESTAMPTZ` | - | 关联创建时间 |

#### `search_history` (搜索历史表，用于热门搜索词)
| 字段名 | 数据类型 | 约束/索引 | 描述 |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK` | 唯一标识 |
| `query` | `VARCHAR(255)` | - | 搜索词 |
| `query_hash` | `VARCHAR(64)` | `UNIQUE, INDEX` | 搜索词MD5，用于去重 |
| `count` | `INTEGER` | - | 被搜索的次数 |
| `last_searched` | `TIMESTAMPTZ` | - | 最后一次搜索时间 |
| `updated_at` | `TIMESTAMPTZ` | - | 更新时间 |

#### `admin_users` (管理员表)
| 字段名 | 数据类型 | 约束/索引 | 描述 |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK` | 唯一标识 |
| `username` | `VARCHAR(100)` | `UNIQUE, INDEX` | 用户名 |
| `password_hash` | `VARCHAR(255)` | - | bcrypt加密后的密码 |
| `last_login` | `TIMESTAMPTZ` | - | 最后登录时间 |
| `created_at` | `TIMESTAMPTZ` | - | 创建时间 |

### 5.2. 索引策略

*   **icons表**:
    *   `search_vector`: `GIN` 索引，用于高性能全文搜索。
    *   `name`: `pg_trgm` 扩展的 `GIN` 索引，用于模糊匹配。
    *   `status, shard_id`: 复合索引，过滤已发布图标并快速定位文件。
    *   `view_count, download_count`: B-tree 索引，用于热门图标排序。
*   **tags表**:
    *   `name`: `pg_trgm` 扩展的 `GIN` 索引，便于按标签名搜索。
*   **search_history表**:
    *   `query_hash`: `UNIQUE` 索引，用于`UPSERT`操作去重。
    *   `count`: `DESC` 索引，用于快速获取热门搜索词。

---

## 6. API 接口规范

所有API返回格式统一为 `Content-Type: application/json`。

### 6.1. 公共API

#### `GET /api/icons/search`
**功能**: 搜索图标。
- **Query Parameters**:
    - `q` (string, required): 搜索关键词。
    - `limit` (int, optional): 每页数量，默认60。
    - `offset` (int, optional): 偏移量，默认0。
    - `category` (string, optional): 按分类slug过滤。
    - `tags` (string, optional): 按标签名过滤，多个用逗号分隔。
    - `sort` (string, optional): 排序方式，可选值: `relevance`(默认), `popular`, `latest`。
- **Success Response (200)**:
    ```json
    {
      "icons": [
        { "id": "...", "name": "用户", "iconUrl": "/api/icons/.../svg" }
      ],
      "total": 123,
      "took": 25
    }
    ```
- **Error Response (500)**:
    ```json
    { "error": "Internal Server Error", "message": "..." }
    ```

#### `GET /api/icons/[id]/svg`
**功能**: 获取指定图标的原始SVG代码。
- **URL Parameters**:
    - `id` (string, required): 图标的UUID。
- **Success Response (200)**:
    - `Content-Type: image/svg+xml`
    - Body为SVG字符串。
- **Error Response (404)**:
    ```json
    { "error": "Not Found" }
    ```

#### `GET /api/icons/popular`
**功能**: 获取首页热门图标列表。
- **Success Response (200)**:
    ```json
    {
      "icons": [
        { "id": "...", "name": "设置", "iconUrl": "...", "popularityScore": 99.5 }
      ]
    }
    ```

---

### 6.2. 管理员API (需认证)

#### `POST /api/auth/admin/login`
**功能**: 管理员登录，获取token或设置cookie。
- **Request Body**:
    ```json
    { "password": "your-admin-password" }
    ```
- **Success Response (200)**:
    ```json
    { "success": true, "token": "..." } // 或设置 cookie
    ```
- **Error Response (401)**:
    ```json
    { "error": "Invalid credentials" }
    ```

#### `POST /api/admin/icons/upload`
**功能**: 批量上传SVG文件。
- **Request Body**: `multipart/form-data`
    - `files`: 一个或多个SVG文件。
- **Success Response (201)**:
    ```json
    {
      "message": "Upload started",
      "taskId": "..." // 返回一个任务ID，可用于跟踪后台任务进度
    }
    ```

#### `GET /api/admin/icons`
**功能**: 获取所有图标列表（管理员视角）。
- **Query Parameters**: 同搜索API，但不过滤`status`。
- **Success Response (200)**:
    ```json
    {
      "icons": [
        { "id", "name", "status", "createdAt", ... }
      ],
      "total": 456
    }
    ```

#### `PUT /api/admin/icons/[id]`
**功能**: 更新图标信息。
- **URL Parameters**: `id` (UUID)
- **Request Body**:
    ```json
    { "name": "新名称", "categoryId": "...", "aiTags": ["tag1", "tag2"] }
    ```
- **Success Response (200)**: 返回更新后的图标对象。

#### `DELETE /api/admin/icons/[id]`
**功能**: 删除图标（包括数据库记录和文件）。
- **Success Response (204)**: No Content。

---

## 7. 前端开发规范

### 7.1. 组件化与目录结构

遵循 **Feature-first** 或 **Atomic Design** 原则组织组件。

```
/app/
  - (auth)/login/page.tsx       // 路由页
  - page.tsx                    // 首页
  - search/page.tsx             // 搜索结果页
  - admin牛/
    - layout.tsx               // Admin布局，含路由守卫
    - icons/page.tsx           // 图标管理页
    - upload/page.tsx          // 上传页
/components/
  /ui/                         // shadcn/ui 基础组件
    - button.tsx
    - input.tsx
    /search/
      - SearchInput.tsx       // 带搜索建议的输入框
      - SearchResultsGrid.tsx // 搜索结果网格
      - IconCard.tsx          // 单个图标卡片
    /editor/
      - IconColorEditor.tsx   // 图标颜色编辑器
      - ColorPicker.tsx       // 颜色选择器
/lib/
  /db.ts                      // 数据库连接实例
  /storage.ts                 // 本地文件操作服务
  /auth.ts                    // JWT/Cookie 认证逻辑
  /ai.ts                      // AI API 调用封装
/types/
  /icon.ts                    // Icon相关的TypeScript类型
```

### 7.2. 状态管理

*   **服务端状态**: 使用 `SWR` 或 `TanStack Query (React Query)` 管理从API获取的数据。能自动处理缓存、重试、失效等。
*   **组件状态**: 优先使用 `useState`, `useReducer` 等 React Hooks。
*   **全局状态**: 如用户认证信息，可使用 `Context API` + `useReducer`。

### 7.3. UI/UX 设计规范

*   **设计系统**: 严格遵循 `shadcn/ui` 和 `Tailwind CSS` 的设计令牌。
*   **响应式**: 移动优先，确保所有页面在桌面和移动端都有良好体验。
*   **交互反馈**: 所有异步操作（搜索、上传、下载）都必须有加载状态指示器和成功/失败的Toast提示。

---

## 8. 部署与运维规范

### 8.1. Docker化

必须为 `app`, `postgres`, `redis` (可选), `nginx` (可选) 服务分别编写 `Dockerfile` 和统一的 `docker-compose.yml`。
*   **数据持久化**: 所有容器内产生的数据（数据库、文件、日志）都必须通过 Docker Volumes 或 Bind Mounts 挂载到宿主机（NAS）的指定目录。
*   **环境变量**: 所有敏感信息（数据库密码、API密钥）必须通过 `.env` 文件注入到容器中，不得硬编码在代码或镜像里。

### 8.2. 环境配置 (`.env` 示例)

```bash
# 应用配置
NODE_ENV=production
ADMIN_PASSWORD=your-very-strong-admin-password
BASE_URL=http://your-nas-ip:3000

# 数据库配置
POSTGRES_PASSWORD=your-db-password
DATABASE_URL=postgresql://postgres:your-db-password@postgres:5432/iconlibrary

# Redis配置 (可选)
REDIS_URL=redis://redis:6379

# AI服务配置
QWEN_API_KEY=your-qwen-api-key
QWEN_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

# 存储配置
STORAGE_BASE_PATH=/app/data
```

### 8.3. 定期维护任务

需设置系统级或应用内的 `cron job`，定期执行：
*   **数据库备份**: 每天使用 `pg_dump` 备份数据库到 `/data/backups`。
*   **文件备份**: 每周对 `/data/icons` 目录进行归档压缩备份。
*   **清理临时文件**: 定期清理 `/data/temp` 和无用的搜索历史。
*   **更新统计数据**: 定期运行脚本更新图标的“热度评分”。

---

## 9. 性能与安全规范

### 9.1. 性能

*   **数据库优化**:
    *   确保API中使用的所有查询字段都已建立索引。
    *   复杂查询使用 `EXPLAIN ANALYZE` 进行性能分析和优化。
*   **缓存策略**:
    *   Redis缓存热门搜索结果和首页图标列表，TTL设置30分钟。
    *   使用HTTP缓存头 (`Cache-Control`, `ETag`) 缓存静态SVG文件。
*   **前端优化**:
    *   图标列表页使用虚拟滚动技术，避免一次性渲染过多DOM。
    *   SVG图标采用懒加载，只在进入视口时加载。
*   **文件读取**: 读取SVG文件时，使用流式读取，避免大文件占用过多内存。

### 9.2. 安全

*   **输入验证**: 所有用户输入在API层必须进行严格校验，防止XSS和SQL注入。
*   **认证与授权**: 所有管理API必须进行认证。JWT或Session要有合理的有效期。
*   **权限最小化**: Nginx和进程运行在非root用户下。
*   **CSP**: 配置严格的内容安全策略。
*   **保密**: API密钥、数据库密码等不得提交到版本控制系统。

---