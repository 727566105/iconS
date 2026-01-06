# Docker 部署快速指南

## 📦 部署方式

### 使用 GHCR 镜像部署(推荐) ⭐
适用场景: 快速部署到任何服务器,使用远程数据库和 Redis

**镜像地址**: `ghcr.io/727566105/icons:latest`

```bash
# 1. 配置环境变量
copy .env.docker.example .env.docker
# 编辑 .env.docker 填入数据库信息

# 2. 拉取镜像并启动
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

### 本地构建部署
适用场景: 需要自定义修改镜像

```bash
docker-compose up -d
```

## 🚀 快速开始(使用 GHCR 镜像)

### 1. 创建环境变量文件
```bash
copy .env.docker.example .env.docker
```

### 2. 编辑 `.env.docker`,填入以下信息:
```env
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons
REDIS_URL=redis://:redis@192.168.31.60:6379/0
ADMIN_PASSWORD=admin123456
BASE_URL=http://localhost:3000
```

### 3. 启动容器
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

### 4. 创建管理员账户
```bash
docker exec -it icon-library-app npx tsx scripts/create-admin-quick.ts
```

### 5. 访问应用
- 主页: http://localhost:3000
- 管理后台: http://localhost:3000/admin/login

## 🛠️ 常用命令

```bash
# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 拉取最新镜像
docker pull ghcr.io/727566105/icons:latest

# 进入容器
docker exec -it icon-library-app sh
```

## 📦 镜像版本

| 镜像标签 | 说明 | 使用场景 |
|---------|------|---------|
| `ghcr.io/727566105/icons:latest` | 最新版本 | 生产环境 |
| `ghcr.io/727566105/icons:v1.0.0` | 特定版本 | 需要固定版本 |
| `ghcr.io/727566105/icons:master` | 最新开发版本 | 测试新功能 |

## 📚 详细文档

查看 [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) 获取完整部署文档

## 🔐 安全提示

- ✅ `.env.docker` 文件已在 `.gitignore` 中,不会被提交到 Git
- ✅ 所有敏感信息仅存储在你的本地环境变量文件中
- ✅ 生产环境请使用强密码
- ✅ 镜像托管在 GitHub Container Registry,安全可靠

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/727566105/iconS
- **GHCR 镜像**: https://github.com/727566105?tab=packages&repo_name=iconS
- **CI/CD 配置**: [.github/GITHUB_ACTIONS_SETUP.md](.github/GITHUB_ACTIONS_SETUP.md)
