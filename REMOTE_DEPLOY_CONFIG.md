# 远程服务器部署配置

## 快速开始

### Windows 用户

1. **配置远程服务器地址**

编辑 `scripts/deploy-to-server.bat`，修改第 11 行：
```batch
set "REMOTE_HOST=root@你的服务器IP"
```

或者直接在命令行传入参数：
```cmd
scripts\deploy-to-server.bat root@192.168.1.100
```

2. **一键部署**
```cmd
scripts\deploy-to-server.bat
```

### Linux/Mac 用户

1. **配置远程服务器地址**

编辑 `scripts/deploy-to-server.sh`，修改第 10 行：
```bash
REMOTE_HOST="root@你的服务器IP"
```

或者直接在命令行传入参数：
```bash
./scripts/deploy-to-server.sh root@192.168.1.100
```

2. **一键部署**
```bash
./scripts/deploy-to-server.sh
```

## 脚本功能

自动化完成以下步骤：

1. ✅ 在远程服务器创建项目目录 `/opt/iconS`
2. ✅ 同步本地代码到远程服务器（排除 node_modules、.git 等）
3. ✅ 检查/创建环境配置文件 `.env`
4. ✅ 在远程服务器构建 Docker 镜像
5. ✅ 停止并删除旧容器
6. ✅ 启动新容器

## 环境配置

脚本会自动在远程服务器创建 `.env` 文件，包含以下配置：

```bash
# 远程数据库（根据你的实际配置修改）
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons
REDIS_URL=redis://:redis@192.168.31.60:6379/0

# 管理员密码（建议修改）
ADMIN_PASSWORD=admin123456

# 应用配置
BASE_URL=http://服务器IP:3000
NODE_ENV=production
STORAGE_BASE_PATH=/app/data
```

⚠️ **重要**：首次部署后请 SSH 登录服务器修改 `.env` 文件中的敏感配置！

## 常用操作

### 查看应用日志
```bash
# Windows
ssh root@服务器IP "docker logs -f icons-app"

# Linux/Mac
ssh root@服务器IP 'docker logs -f icons-app'
```

### 进入容器调试
```bash
ssh root@服务器IP "docker exec -it icons-app sh"
```

### 重启容器
```bash
ssh root@服务器IP "docker restart icons-app"
```

### 停止容器
```bash
ssh root@服务器IP "docker stop icons-app"
```

### 查看容器状态
```bash
ssh root@服务器IP "docker ps | grep icons"
```

## 故障排查

### 问题 1: SSH 连接失败

```bash
# 测试 SSH 连接
ssh root@你的服务器IP

# 如果提示权限拒绝，检查:
# 1. 用户名是否正确（root 或其他用户）
# 2. 密码是否正确
# 3. SSH 服务是否运行（端口 22）
```

### 问题 2: Docker 构建失败

```bash
# SSH 登录服务器手动构建
ssh root@你的服务器IP
cd /opt/iconS
docker build -t iconS:latest .

# 查看详细错误信息
```

常见原因：
- 网络问题，无法下载依赖
- 磁盘空间不足
- Docker 版本过低

### 问题 3: 容器启动失败

```bash
# 查看容器日志
ssh root@你的服务器IP "docker logs icons-app"

# 检查环境变量
ssh root@你的服务器IP "cat /opt/iconS/.env"

# 手动运行容器（不后台运行）
ssh root@你的服务器IP "docker run --rm -it --name icons-test \
  -p 3000:3000 \
  --env-file /opt/iconS/.env \
  -v /opt/iconS-data:/app/data \
  iconS:latest"
```

### 问题 4: 无法访问应用

检查清单：

```bash
# 1. 容器是否运行
ssh root@你的服务器IP "docker ps | grep icons"

# 2. 端口是否监听
ssh root@你的服务器IP "netstat -tlnp | grep 3000"

# 3. 防火墙是否开放
ssh root@你的服务器IP "iptables -L -n | grep 3000"
# 或
ssh root@你的服务器IP "ufw status"

# 4. 应用是否健康
curl http://服务器IP:3000/api/health
```

## 工作流程

### 日常开发流程

1. **本地开发**
   ```bash
   # 修改代码
   git add .
   git commit -m "feat: 新功能"
   ```

2. **部署到远程服务器**
   ```bash
   # Windows
   scripts\deploy-to-server.bat

   # Linux/Mac
   ./scripts/deploy-to-server.sh
   ```

3. **验证部署**
   - 浏览器访问: `http://服务器IP:3000`
   - 查看日志: `ssh root@服务器IP "docker logs -f icons-app"`

### 首次部署流程

1. **确保远程服务器已安装 Docker**
   ```bash
   ssh root@你的服务器IP
   docker --version
   ```

2. **运行部署脚本**
   ```bash
   ./scripts/deploy-to-server.sh root@你的服务器IP
   ```

3. **首次运行数据库迁移**（如果需要）
   ```bash
   ssh root@你的服务器IP "docker exec -it icons-app npx prisma migrate deploy"
   ```

4. **创建管理员账户**（如果需要）
   ```bash
   ssh root@你的服务器IP "docker exec -it icons-app node scripts/create-admin.js"
   ```

## 数据持久化

容器使用以下数据卷：

- `/opt/iconS-data` - 所有应用数据（图标文件、临时文件等）

数据会持久化在服务器上，删除容器不会丢失数据。

## 性能优化

### 构建 Docker 镜像时使用缓存

第二次构建会利用 Docker 缓存，速度会快很多。

### 减小传输文件大小

脚本已自动排除：
- `node_modules` - 依赖包（会在服务器重新安装）
- `.next` - 构建产物（会在服务器重新构建）
- `.git` - Git 历史
- `data/` - 本地数据
- `logs/` - 日志文件

## 安全建议

1. **修改管理员密码**
   ```bash
   ssh root@服务器IP
   nano /opt/iconS/.env
   # 修改 ADMIN_PASSWORD
   docker restart icons-app
   ```

2. **使用 SSH 密钥认证**（推荐）
   ```bash
   # 在本地生成 SSH 密钥
   ssh-keygen -t rsa -b 4096

   # 复制公钥到服务器
   ssh-copy-id root@你的服务器IP
   ```

3. **配置防火墙**
   ```bash
   # 只开放必要端口
   ssh root@你的服务器IP
   ufw allow 22    # SSH
   ufw allow 3000  # 应用端口
   ufw enable
   ```

4. **定期更新**
   ```bash
   # 定期更新依赖
   npm update
   npm audit fix

   # 重新部署
   ./scripts/deploy-to-server.sh
   ```
