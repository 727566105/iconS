# 远程服务器部署指南

本文档说明如何在远程 Linux 服务器上构建和运行 Docker 镜像进行测试。

## 📋 前提条件

### 远程服务器要求
- ✅ Linux 服务器 (Ubuntu/Debian/CentOS/Alpine 等)
- ✅ 已安装 Docker
- ✅ SSH 访问权限
- ✅ 可以访问远程 PostgreSQL 和 Redis

### 本地开发机要求
- ✅ SSH 客户端 (Linux/Mac 自带,Windows 需要 PuTTY 或 Git Bash)
- ✅ rsync 工具 (可选,用于同步代码)

---

## 🚀 方案 1: 使用 Git 同步 + 远程构建 (推荐)

### 步骤 1: 在远程服务器克隆代码

```bash
# SSH 登录到远程服务器
ssh root@your-server-ip

# 克隆仓库
cd /opt
git clone https://github.com/727566105/iconS.git
cd iconS
```

### 步骤 2: 配置环境变量

```bash
# 在服务器上创建 .env 文件
cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons
REDIS_URL=redis://:redis@192.168.31.60:6379/0
ADMIN_PASSWORD=admin123456
BASE_URL=http://your-server-ip:3000
NODE_ENV=production
STORAGE_BASE_PATH=/app/data
EOF
```

### 步骤 3: 本地开发并推送

```bash
# 在本地开发机
git add .
git commit -m "feat: 新功能"
git push origin master
```

### 步骤 4: 在远程服务器构建

```bash
# 方式 A: 手动执行 (推荐首次使用)
ssh root@your-server-ip
cd /opt/iconS
git pull origin master
docker build -t icon-library:test .
docker run -d --name icon-library-test -p 3000:3000 \
  --env-file .env \
  -v /opt/icon-data:/app/data \
  icon-library:test

# 方式 B: 使用自动化脚本
chmod +x scripts/remote-build-only.sh
./scripts/remote-build-only.sh root@your-server-ip
```

### 步骤 5: 访问和测试

```bash
# 访问应用
浏览器打开: http://your-server-ip:3000

# 查看日志
ssh root@your-server-ip 'docker logs -f icon-library-test'

# 进入容器调试
ssh root@your-server-ip 'docker exec -it icon-library-test sh'
```

---

## 🚀 方案 2: 使用 rsync 同步代码

### 优势
- ✅ 无需在服务器配置 Git
- ✅ 测试未提交的代码
- ✅ 快速迭代

### 步骤 1: 配置 SSH 免密登录 (可选但推荐)

```bash
# 在本地生成 SSH 密钥(如果还没有)
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id root@your-server-ip
```

### 步骤 2: 使用脚本同步和构建

```bash
# Linux/Mac
chmod +x scripts/remote-build.sh
./scripts/remote-build.sh root@your-server-ip

# Windows Git Bash
bash scripts/remote-build.sh root@your-server-ip
```

### 步骤 3: 脚本会自动完成
1. 在服务器创建目录
2. 使用 rsync 同步代码(排除 node_modules 等)
3. 在服务器构建 Docker 镜像
4. 停止旧容器
5. 启动新容器

---

## 🚀 方案 3: 使用 GitHub Actions 自动部署

### 配置服务器拉取镜像

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 创建 .env.docker 文件
cat > .env.docker << EOF
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons
REDIS_URL=redis://:redis@192.168.31.60:6379/0
ADMIN_PASSWORD=admin123456
BASE_URL=http://your-server-ip:3000
EOF

# 创建 docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  app:
    image: ghcr.io/727566105/icons:latest
    container_name: icon-library-app
    ports:
      - "3000:3000"
    env_file:
      - .env.docker
    volumes:
      - ./data/icons:/app/data/icons
      - ./data/temp:/app/data/temp
    restart: unless-stopped

EOF

# 创建数据目录
mkdir -p data/icons data/temp

# 拉取并启动
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 更新流程

```bash
# 1. 本地开发并推送
git push origin master

# 2. 等待 GitHub Actions 构建(约 5-10 分钟)

# 3. 在服务器拉取新镜像并重启
ssh root@your-server-ip
cd /opt/icon-deploy
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🛠️ 常用远程操作命令

### 查看容器状态

```bash
ssh root@your-server-ip 'docker ps | grep icon-library'
```

### 查看日志

```bash
# 实时日志
ssh root@your-server-ip 'docker logs -f icon-library-test'

# 最近 100 行
ssh root@your-server-ip 'docker logs --tail=100 icon-library-test'
```

### 进入容器

```bash
ssh root@your-server-ip 'docker exec -it icon-library-test sh'
```

### 停止和删除容器

```bash
ssh root@your-server-ip 'docker stop icon-library-test && docker rm icon-library-test'
```

### 重启容器

```bash
ssh root@your-server-ip 'docker restart icon-library-test'
```

### 查看容器资源占用

```bash
ssh root@your-server-ip 'docker stats icon-library-test'
```

---

## 🔄 完整的开发工作流

### 方案 A: 使用 Git (推荐用于团队协作)

```bash
# 1. 本地开发
git add .
git commit -m "feat: 新功能"
git push origin master

# 2. 在服务器更新并构建
ssh root@your-server-ip
cd /opt/iconS
git pull origin master
docker build -t icon-library:test .
docker stop icon-library-test && docker rm icon-library-test
docker run -d --name icon-library-test -p 3000:3000 \
  --env-file .env \
  -v /opt/icon-data:/app/data \
  icon-library:test

# 3. 测试
# 浏览器访问 http://your-server-ip:3000

# 4. 查看日志
ssh root@your-server-ip 'docker logs -f icon-library-test'
```

### 方案 B: 使用 rsync (推荐用于快速测试)

```bash
# 1. 一键同步和构建
./scripts/remote-build.sh root@your-server-ip

# 2. 脚本自动完成所有步骤

# 3. 测试和调试
ssh root@your-server-ip 'docker logs -f icon-library-test'
```

---

## 🐛 故障排查

### 问题 1: SSH 连接失败

```bash
# 测试 SSH 连接
ssh -v root@your-server-ip

# 常见原因:
# - 密码错误
# - SSH 服务未启动
# - 防火墙阻止 22 端口
```

### 问题 2: rsync 找不到命令

```bash
# Windows: 安装 Git Bash 或 WSL
# Linux/Mac: 通常已预装

# 检查 rsync
which rsync
```

### 问题 3: Docker 构建失败

```bash
# SSH 到服务器查看详细错误
ssh root@your-server-ip
cd /opt/iconS
docker build -t icon-library:test .

# 常见原因:
# - 缺少依赖
# - 网络问题
# - 磁盘空间不足
```

### 问题 4: 容器启动失败

```bash
# 查看容器日志
ssh root@your-server-ip 'docker logs icon-library-test'

# 常见原因:
# - 环境变量配置错误
# - 数据库/Redis 连接失败
# - 端口被占用
```

### 问题 5: 无法访问应用

```bash
# 检查容器状态
ssh root@your-server-ip 'docker ps | grep icon-library'

# 检查端口监听
ssh root@your-server-ip 'netstat -tlnp | grep 3000'

# 检查防火墙
ssh root@your-server-ip 'iptables -L -n | grep 3000'

# 或
ssh root@your-server-ip 'ufw status'
```

---

## 📊 性能监控

### 查看容器资源使用

```bash
ssh root@your-server-ip 'docker stats'
```

### 查看磁盘使用

```bash
ssh root@your-server-ip 'df -h'
ssh root@your-server-ip 'du -sh /opt/icon-data'
```

### 查看日志文件大小

```bash
ssh root@your-server-ip 'du -sh /var/lib/docker/containers'
```

---

## 💡 最佳实践

### 1. 定期清理未使用的镜像和容器

```bash
ssh root@your-server-ip
docker system prune -a
```

### 2. 使用数据卷持久化数据

```bash
docker run -v /opt/icon-data:/app/data ...
```

### 3. 配置自动重启

```bash
docker run --restart unless-stopped ...
```

### 4. 设置日志轮转

```bash
# 在 docker run 中添加
--log-opt max-size=10m \
--log-opt max-file=3
```

### 5. 使用健康检查

```bash
# 查看容器健康状态
ssh root@your-server-ip 'docker inspect icon-library-test | grep -A 10 Health'
```

---

## 🔗 相关文档

- [Docker 部署指南](DOCKER_DEPLOYMENT.md)
- [GitHub Actions 配置](.github/GITHUB_ACTIONS_SETUP.md)
- [项目 CLAUDE.md](CLAUDE.md)
