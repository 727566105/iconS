# GitHub Actions CI/CD 配置指南

本项目使用 GitHub Actions 自动构建并发布 Docker 镜像到 **GitHub Container Registry (GHCR)**。

## 📋 工作流说明

### 1. Docker 镜像构建和发布 (`docker-publish.yml`)

**触发条件:**
- 推送到 `master` 或 `main` 分支
- 创建版本标签 (如 `v1.0.0`)
- Pull Request
- 手动触发

**功能:**
- 构建 Docker 镜像
- 支持多架构 (AMD64 和 ARM64)
- 自动推送到 GitHub Container Registry (GHCR)
- 自动生成镜像标签

**镜像地址:**
```
ghcr.io/727566105/icons:latest
ghcr.io/727566105/icons:v1.0.0
ghcr.io/727566105/icons:master
```

### 2. 版本发布 (`release.yml`)

**触发条件:**
- 推送版本标签 (如 `v1.0.0`)
- 手动触发

**功能:**
- 自动生成变更日志
- 创建 GitHub Release

---

## ⚙️ 必需配置

### 启用 GitHub Actions 权限

1. 进入 GitHub 仓库
2. **Settings** → **Actions** → **General**
3. 滚动到 **Workflow permissions**
4. 选择 **Read and write permissions**
5. 点击 **Save**

**重要**: 此步骤必须完成,否则无法推送镜像到 GHCR!

---

## 🏷️ 镜像标签策略

工作流会自动生成以下标签:

| 触发事件 | 生成的标签 | 示例 |
|---------|-----------|------|
| 推送到 master | `master`, `latest` | `ghcr.io/727566105/icons:master` |
| 创建标签 v1.2.3 | `v1.2.3`, `1.2`, `1` | `ghcr.io/727566105/icons:v1.2.3` |
| Pull Request | `pr-123` | `ghcr.io/727566105/icons:pr-123` |

---

## 🚀 使用方法

### 方式 1: 自动发布(推荐)

1. **开发完成后**:
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   git push origin master
   ```
   → 自动构建并推送 `:master` 和 `:latest` 标签到 GHCR

2. **发布新版本**:
   ```bash
   # 创建版本标签
   git tag v1.0.0
   git push origin v1.0.0
   ```
   → 构建 `:v1.0.0`, `:1.0`, `:1` 标签并创建 Release

### 方式 2: 手动触发

1. 进入 GitHub 仓库
2. Actions → "Build and Push Docker Image"
3. 点击 "Run workflow"
4. 选择分支并运行

---

## 📦 在其他服务器使用 GHCR 镜像

### 1. 拉取镜像

**公开镜像** (无需认证):
```bash
# 拉取最新版本
docker pull ghcr.io/727566105/icons:latest

# 拉取指定版本
docker pull ghcr.io/727566105/icons:v1.0.0
```

**私有镜像** (需要认证):
```bash
# 登录 GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 或使用 GitHub Personal Access Token
docker login ghcr.io -u your-github-username -p your-github-token
```

### 2. 创建 .env.docker 文件

```bash
cat > .env.docker << EOF
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons
REDIS_URL=redis://:redis@192.168.31.60:6379/0
ADMIN_PASSWORD=your-admin-password
BASE_URL=http://your-server-ip:3000
EOF
```

### 3. 启动容器

```bash
# 使用 docker-compose(推荐)
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

或使用 docker run:

```bash
docker run -d \
  --name icon-library \
  -p 3000:3000 \
  --env-file .env.docker \
  -v $(pwd)/data/icons:/app/data/icons \
  -v $(pwd)/data/temp:/app/data/temp \
  ghcr.io/727566105/icons:latest
```

---

## 🔍 监控构建状态

### 查看构建日志

1. GitHub 仓库 → **Actions** 标签
2. 选择具体的工作流运行
3. 点击查看详细日志

### 查看 GHCR 镜像

1. 访问: https://github.com/727566105?tab=packages&repo_name=iconS
2. 查看 `icon-library` 包
3. 查看所有标签和镜像大小

---

## 🛠️ 常见问题

### 1. 构建失败: "denied: permission_denied"

**原因**: GitHub Actions 没有写入权限

**解决**:
1. 进入 **Settings** → **Actions** → **General**
2. 启用 **Read and write permissions**
3. 重新运行工作流

### 2. 拉取镜像失败: "unauthorized: authentication required"

**原因**: 镜像设为私有

**解决**:
**方式 1**: 将镜像设为公开
- 进入仓库的 Packages 设置
- 将 `icon-library` 包改为 Public

**方式 2**: 使用令牌登录
```bash
docker login ghcr.io -u your-github-username -p your-github-token
```

### 3. 如何查看镜像大小?

访问 GHCR 页面:
```
https://github.com/727566105?tab=packages&repo_name=iconS
```

或使用命令:
```bash
docker images | grep 727566105/icons
```

### 4. 多架构构建失败

**原因**: QEMU 或 Buildx 配置问题

**解决**: 工作流已包含 `setup-qemu-action`,应该自动支持多架构

---

## 📝 工作流文件说明

### `.github/workflows/docker-publish.yml`

主要步骤:
1. **Checkout**: 拉取代码
2. **QEMU**: 多架构支持
3. **Buildx**: 设置 Docker 构建工具
4. **Login GHCR**: 登录 GitHub Container Registry
5. **Metadata**: 生成镜像标签
6. **Build & Push**: 构建并推送镜像

### `.github/workflows/release.yml`

主要步骤:
1. **Checkout**: 拉取代码
2. **Changelog**: 生成变更日志
3. **Release**: 创建 GitHub Release

---

## 🔄 版本发布最佳实践

### 语义化版本号

```
v主版本号.次版本号.修订号

例如:
- v1.0.0 - 初始发布
- v1.1.0 - 添加新功能(向后兼容)
- v1.1.1 - 修复 bug
- v2.0.0 - 重大变更(不兼容)
```

### 发布流程

```bash
# 1. 确保在 master 分支
git checkout master
git pull origin master

# 2. 更新版本号(如有)
# 在 package.json 中更新 version

# 3. 提交更改
git add .
git commit -m "chore: release v1.0.0"

# 4. 创建标签
git tag v1.0.0 -a -m "Release version 1.0.0"

# 5. 推送代码和标签
git push origin master
git push origin v1.0.0

# 6. GitHub Actions 自动:
#    - 构建并推送 Docker 镜像到 GHCR
#    - 创建 GitHub Release
```

---

## 🔗 相关链接

- **GitHub Actions 文档**: https://docs.github.com/en/actions
- **GitHub Container Registry**: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- **Docker Build Push Action**: https://github.com/docker/build-push-action
- **Docker Metadata Action**: https://github.com/docker/metadata-action
- **你的 GHCR 镜像**: https://github.com/727566105?tab=packages&repo_name=iconS

---

## 💡 与 Docker Hub 的区别

| 特性 | GHCR | Docker Hub |
|------|------|-----------|
| 集成 | 原生集成 GitHub | 需要第三方账号 |
| 权限 | 使用 GitHub 权限 | 需要单独配置 |
| 私有仓库 | 免费/无限 | 有限制 |
| 认证 | 使用 GITHUB_TOKEN | 需要访问令牌 |
| 构建日志 | 直接在 GitHub 查看 | 需要跳转 |
| 推荐使用 | ✅ 推荐 | ⚠️ 备选 |

**我们选择 GHCR 的原因:**
- 无需额外配置 Secrets
- 与 GitHub 无缝集成
- 免费无限的私有镜像
- 更好的安全性
