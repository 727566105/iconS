# GitHub Actions 配置指南

本项目使用 GitHub Actions 自动构建和发布 Docker 镜像。

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
- 推送到 Docker Hub 或 GitHub Container Registry
- 自动生成镜像标签

### 2. 版本发布 (`release.yml`)

**触发条件:**
- 推送版本标签 (如 `v1.0.0`)
- 手动触发

**功能:**
- 自动生成变更日志
- 创建 GitHub Release
- 附加文档文件

---

## ⚙️ 必需配置

### 步骤 1: 配置 Docker Hub (推荐)

#### 1.1 创建 Docker Hub 账号
访问 https://hub.docker.com/ 并注册账号

#### 1.2 创建访问令牌
1. 登录 Docker Hub
2. 点击右上角头像 → Account Settings → Security
3. 点击 "New Access Token"
4. 输入描述(如 `github-actions`)
5. 权限选择 "Read & Write"
6. 复制生成的令牌

#### 1.3 在 GitHub 配置 Secrets
1. 进入 GitHub 仓库
2. Settings → Secrets and variables → Actions
3. 点击 "New repository secret"
4. 添加以下两个密钥:

   | 名称 | 值 |
   |------|-----|
   | `DOCKER_USERNAME` | 你的 Docker Hub 用户名 |
   | `DOCKER_PASSWORD` | 刚才创建的访问令牌 |

### 步骤 2: 使用 GitHub Container Registry (可选)

如果不使用 Docker Hub,可以使用 GitHub 自带的容器注册表:

1. 在 GitHub 仓库中启用:
   - Settings → Actions → General → Workflow permissions
   - 选择 "Read and write permissions"

2. 修改 `.github/workflows/docker-publish.yml`:
   - 注释掉 Docker Hub 登录步骤
   - 取消注释 GitHub Container Registry 登录步骤
   - 修改 `images` 为 `ghcr.io/${{ github.repository }}`

---

## 🏷️ 镜像标签策略

工作流会自动生成以下标签:

| 触发事件 | 生成的标签 | 示例 |
|---------|-----------|------|
| 推送到 master | `master`, `latest` | `username/icon-library:master` |
| 创建标签 v1.2.3 | `v1.2.3`, `1.2`, `1` | `username/icon-library:v1.2.3` |
| Pull Request | `pr-123` | `username/icon-library:pr-123` |

---

## 🚀 使用方法

### 方式 1: 自动发布(推荐)

1. **开发完成后**:
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   git push origin master
   ```
   → 自动构建并推送 `:master` 和 `:latest` 标签

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

## 📦 在其他服务器使用镜像

配置完成后,其他服务器可以直接拉取镜像:

### 1. 拉取镜像

```bash
# 拉取最新版本
docker pull your-dockerhub-username/icon-library:latest

# 拉取指定版本
docker pull your-dockerhub-username/icon-library:v1.0.0
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
# 使用远程镜像启动
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

或者修改 `docker-compose.prod.yml`,将本地构建改为使用远程镜像:

```yaml
services:
  app:
    image: your-dockerhub-username/icon-library:latest  # 使用远程镜像
    # build:  # 注释掉本地构建
    #   context: .
    #   dockerfile: Dockerfile
    # ... 其他配置不变
```

---

## 🔍 监控构建状态

### 查看构建日志

1. GitHub 仓库 → Actions 标签
2. 选择具体的工作流运行
3. 点击查看详细日志

### 查看镜像

**Docker Hub:**
- 访问: https://hub.docker.com/r/your-username/icon-library
- 查看所有标签和镜像大小

**GitHub Container Registry:**
- 访问: https://github.com/your-username/your-repo/pkgs/container/icon-library

---

## 🛠️ 常见问题

### 1. 构建失败: "unauthorized: authentication required"

**原因:** Docker Hub 凭据配置错误

**解决:**
- 检查 GitHub Secrets 中的 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD`
- 确认访问令牌有 "Read & Write" 权限

### 2. 多架构构建失败

**原因:** QEMU 或 Buildx 配置问题

**解决:** 工作流已包含 `setup-qemu-action`,应该自动支持多架构

### 3. 镜像推送成功但拉取不到

**原因:** 镜像名称或标签错误

**解决:**
- 检查 `IMAGE_NAME` 是否正确
- 确认 `DOCKER_USERNAME` 变量配置正确
- 在 Docker Hub 验证镜像是否存在

### 4. 如何切换到 GitHub Container Registry

修改 `.github/workflows/docker-publish.yml`:

```yaml
env:
  REGISTRY: ghcr.io  # 改为 GHCR
  IMAGE_NAME: icon-library

# 注释掉 Docker Hub 登录
# - name: 登录到 Docker Hub
#   if: github.event_name != 'pull_request'
#   uses: docker/login-action@v3
#   with:
#     registry: ${{ env.REGISTRY }}
#     username: ${{ secrets.DOCKER_USERNAME }}
#     password: ${{ secrets.DOCKER_PASSWORD }}

# 取消注释 GHCR 登录
- name: 登录到 GitHub Container Registry
  if: github.event_name != 'pull_request'
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📝 工作流文件说明

### `.github/workflows/docker-publish.yml`

主要步骤:
1. **Checkout**: 拉取代码
2. **QEMU**: 多架构支持
3. **Buildx**: 设置 Docker 构建工具
4. **Login**: 登录容器注册表
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
#    - 构建并推送 Docker 镜像
#    - 创建 GitHub Release
```

---

## 🔗 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Docker Metadata Action](https://github.com/docker/metadata-action)
- [Docker Hub](https://hub.docker.com/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
