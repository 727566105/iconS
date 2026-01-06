# Docker 部署指南

本文档说明如何使用 Docker 部署 SVG 图标库管理系统。

## 📦 部署模式

项目提供三种 Docker Compose 配置文件:

### 1. 完整部署模式 (`docker-compose.yml`)
- **适用场景**: 在 NAS 或服务器上完整部署所有服务
- **包含服务**: 应用 + PostgreSQL + Redis
- **使用方法**:
  ```bash
  docker-compose up -d
  ```

### 2. 生产部署模式 (`docker-compose.prod.yml`) ⭐ 推荐
- **适用场景**: 使用 GHCR 镜像,远程数据库和 Redis
- **镜像来源**: `ghcr.io/727566105/icons:latest`
- **优势**: 更轻量,复用现有数据库服务,无需本地构建
- **使用方法**:
  ```bash
  docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
  ```

### 3. 开发部署模式 (`docker-compose.dev.yml`)
- **适用场景**: 使用 GHCR 镜像进行开发测试
- **特性**: 使用远程数据库,快速启动
- **使用方法**:
  ```bash
  docker-compose -f docker-compose.dev.yml --env-file .env.docker up
  ```

---

## 🚀 快速开始(使用 GHCR 镜像 + 远程数据库)

### 步骤 1: 配置环境变量

复制环境变量模板并根据实际情况修改:

```bash
# Windows
copy .env.docker.example .env.docker

# Linux/Mac
cp .env.docker.example .env.docker
```

编辑 `.env.docker` 文件,填入你的远程数据库信息:

```env
# Database Configuration (远程数据库)
DATABASE_URL=postgresql://postgres:your-password@192.168.31.60:54321/icons

# Redis Configuration (远程 Redis)
REDIS_URL=redis://:your-redis-password@192.168.31.60:6379/0

# Application Configuration
NODE_ENV=production
ADMIN_PASSWORD=your-very-strong-admin-password-here
BASE_URL=http://your-server-ip:3000
```

### 步骤 2: 创建数据目录

```bash
# 创建 SVG 文件存储目录
mkdir -p data/icons
mkdir -p data/temp
mkdir -p logs
```

### 步骤 3: 拉取并启动容器

```bash
# 拉取最新镜像
docker pull ghcr.io/727566105/icons:latest

# 加载环境变量并启动
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

### 步骤 4: 查看日志

```bash
# 查看应用日志
docker-compose -f docker-compose.prod.yml logs -f app

# 或使用 docker 命令
docker logs -f icon-library-app
```

### 步骤 5: 初始化数据库

首次启动需要创建管理员账户:

```bash
# 进入容器
docker exec -it icon-library-app sh

# 创建管理员
npx tsx scripts/create-admin-quick.ts

# 退出容器
exit
```

---

## 🛠️ 常用命令

### 启动服务
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

### 停止服务
```bash
docker-compose -f docker-compose.prod.yml down
```

### 重启服务
```bash
docker-compose -f docker-compose.prod.yml restart
```

### 查看日志
```bash
# 实时日志
docker-compose -f docker-compose.prod.yml logs -f

# 最近 100 行日志
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### 更新镜像
```bash
# 拉取最新镜像
docker pull ghcr.io/727566105/icons:latest

# 重启服务使用新镜像
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

### 进入容器
```bash
docker exec -it icon-library-app sh
```

### 查看镜像信息
```bash
# 查看本地镜像
docker images | grep 727566105/icons

# 查看镜像标签
docker inspect ghcr.io/727566105/icons:latest
```

---

## 🔧 配置说明

### 环境变量

所有环境变量通过 `.env.docker` 文件配置,主要变量:

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:password@192.168.31.60:54321/icons` |
| `REDIS_URL` | Redis 连接字符串 | `redis://:password@192.168.31.60:6379/0` |
| `ADMIN_PASSWORD` | 管理员密码 | `strong-password-here` |
| `BASE_URL` | 应用访问地址 | `http://192.168.31.100:3000` |
| `STORAGE_BASE_PATH` | 文件存储路径 | `/app/data` |
| `NODE_ENV` | 运行环境 | `production` |

### 数据卷挂载

生产模式挂载以下目录:

- `./data/icons` → `/app/data/icons` (SVG 文件存储)
- `./data/temp` → `/app/data/temp` (临时上传目录)
- `./logs` → `/app/logs` (应用日志)

### 端口映射

- 容器端口: `3000`
- 主机端口: `3000`
- 访问地址: `http://localhost:3000` 或 `http://服务器IP:3000`

---

## 🐛 故障排查

### 容器无法启动

1. 检查端口是否被占用:
   ```bash
   netstat -ano | findstr :3000
   ```

2. 查看容器日志:
   ```bash
   docker logs icon-library-app
   ```

### 数据库连接失败

1. 检查 DATABASE_URL 格式是否正确
2. 确认数据库服务器可访问:
   ```bash
   docker exec icon-library-app ping 192.168.31.60
   ```
3. 检查数据库防火墙设置

### Redis 连接失败

1. 检查 REDIS_URL 格式
2. 确认 Redis 服务器可访问:
   ```bash
   docker exec icon-library-app sh -c "nc -zv 192.168.31.60 6379"
   ```

### 文件上传失败

检查数据目录权限:
```bash
# 确保目录存在且有写权限
ls -la data/icons
ls -la data/temp
```

---

## 📊 性能优化

### 生产环境建议

1. **资源限制**: 在 `docker-compose.prod.yml` 中添加资源限制
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

2. **日志轮转**: 配置日志轮转避免磁盘占满
   ```bash
   # 在宿主机设置 logrotate
   ```

3. **健康检查**: 已配置健康检查,监控应用状态
   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```

---

## 🔐 安全建议

1. **不要提交 `.env.docker` 文件到 Git**
2. **使用强密码作为 ADMIN_PASSWORD**
3. **限制数据库和 Redis 的访问 IP**
4. **定期更新镜像**: `docker-compose build --no-cache`
5. **配置反向代理**(如 Nginx)用于生产环境

---

## 📝 注意事项

1. **首次部署**需要运行数据库迁移和创建管理员账户
2. **AI 功能**需要配置 Qwen API 密钥才能使用自动标签
3. **备份重要数据**:
   - 数据库备份: 使用 pg_dump
   - SVG 文件备份: 备份 `data/icons` 目录
4. **监控磁盘空间**: SVG 文件会持续增长

---

## 🆚 与本地开发的区别

| 特性 | Docker 部署 | 本地开发 |
|------|------------|---------|
| 环境一致性 | ✅ 完全一致 | ❌ 可能差异 |
| 启动速度 | 🐢 较慢 | ⚡ 快速 |
| 调试便利性 | 📝 需查看日志 | 🔍 可断点调试 |
| 资源占用 | 💔 较高 | ✅ 较低 |
| 生产部署 | ✅ 推荐 | ❌ 不推荐 |

---

## 📚 相关文档

- [项目架构说明](CLAUDE.md)
- [环境变量模板](.env.docker.example)
- [Docker 官方文档](https://docs.docker.com/)
