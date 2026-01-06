# 快速部署指南

## 最简单的部署方式（推荐）

### Windows 用户

1. **编辑 `deploy.bat` 文件**（第 10 行）
   ```batch
   set "SERVER=root@你的服务器IP"
   ```

2. **双击运行** `deploy.bat` 文件

就这么简单！脚本会自动完成：
- ✅ 同步代码到服务器
- ✅ 构建 Docker 镜像
- ✅ 启动容器

### Linux/Mac 用户

1. **编辑 `deploy.sh` 文件**（第 10 行）
   ```bash
   SERVER="root@你的服务器IP"
   ```

2. **运行脚本**
   ```bash
   ./deploy.sh
   ```

## 前提条件

### 远程服务器

- ✅ Debian/Ubuntu Linux
- ✅ 已安装 Docker
- ✅ 可以访问远程 PostgreSQL (192.168.31.60:54321)
- ✅ 可以访问远程 Redis (192.168.31.60:6379)

### 本地 Windows

- ✅ Git for Windows (包含 SSH 工具)
  - 下载: https://git-scm.com/download/win
- **或** Windows 10/11 自带 OpenSSH 客户端

### 本地 Linux/Mac

- ✅ rsync 工具 (通常已预装)

## 首次使用

### 1. 测试 SSH 连接

```bash
# Windows (CMD 或 PowerShell)
ssh root@你的服务器IP

# Linux/Mac
ssh root@你的服务器IP
```

如果连接成功，说明 SSH 配置正确。

### 2. 首次部署

```bash
# Windows
deploy.bat

# Linux/Mac
./deploy.sh
```

首次运行会：
- 在服务器创建目录 `/opt/iconS`
- 生成 `.env` 配置文件
- 构建并启动容器

**预计时间**: 5-10 分钟（取决于网络速度）

### 3. 验证部署

浏览器访问: `http://服务器IP:3000`

## 日常开发流程

每次修改代码后：

```bash
# 1. 修改代码并保存

# 2. 双击运行 deploy.bat (或 ./deploy.sh)

# 3. 等待 3-5 分钟

# 4. 刷新浏览器验证
```

## 常用命令

### 查看应用日志

```bash
ssh root@服务器IP "docker logs -f icons-app"
```

### 重启应用

```bash
ssh root@服务器IP "docker restart icons-app"
```

### 进入容器调试

```bash
ssh root@服务器IP "docker exec -it icons-app sh"
```

### 查看容器状态

```bash
ssh root@服务器IP "docker ps | grep icons"
```

### 修改配置

```bash
# SSH 登录服务器
ssh root@服务器IP

# 编辑配置文件
nano /opt/iconS/.env

# 重启容器使配置生效
docker restart icons-app
```

## 环境配置说明

默认的 `.env` 配置（自动生成）：

```bash
# 数据库连接
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons

# Redis 连接
REDIS_URL=redis://:redis@192.168.31.60:6379/0

# 管理员密码（登录时使用）
ADMIN_PASSWORD=admin123456

# 应用访问地址
BASE_URL=http://192.168.31.60:3000

# 运行环境
NODE_ENV=production

# 存储路径
STORAGE_BASE_PATH=/app/data
```

⚠️ **重要**：生产环境请修改 `ADMIN_PASSWORD`！

## 数据持久化

所有数据存储在服务器的 `/opt/iconS-data` 目录：

- 图标文件
- 临时上传文件
- 其他应用数据

删除容器不会丢失数据。

## 故障排查

### 问题: SSH 连接失败

```bash
# 检查网络
ping 服务器IP

# 检查 SSH 服务
ssh -v root@服务器IP
```

### 问题: Docker 构建失败

```bash
# 手动 SSH 到服务器查看详细错误
ssh root@服务器IP
cd /opt/iconS
docker build -t iconS:latest .
```

常见原因：
- 网络问题，无法下载 Node.js 依赖
- 磁盘空间不足：`df -h`
- Docker 版本过低：`docker --version` (建议 20.10+)

### 问题: 容器启动失败

```bash
# 查看详细日志
ssh root@服务器IP "docker logs icons-app"

# 检查配置
ssh root@服务器IP "cat /opt/iconS/.env"

# 测试数据库连接
ssh root@服务器IP "psql -h 192.168.31.60 -p 54321 -U postgres -d icons"
```

### 问题: 无法访问应用

检查清单：

1. 容器是否运行：`ssh root@服务器IP "docker ps | grep icons"`
2. 端口是否开放：`ssh root@服务器IP "netstat -tlnp | grep 3000"`
3. 防火墙：`ssh root@服务器IP "ufw status"` 或 `iptables -L -n`

## 高级配置

### 使用 SSH 密钥（免密登录）

```bash
# 1. 在本地生成 SSH 密钥
ssh-keygen -t rsa -b 4096

# 2. 复制公钥到服务器
ssh-copy-id root@服务器IP

# 3. 测试免密登录
ssh root@服务器IP
```

配置后，部署脚本运行时不需要输入密码。

### 自定义端口

如果 SSH 端口不是默认的 22：

```bash
# 修改 deploy.bat/deploy.sh
# 在 ssh 命令中添加 -p 参数
ssh -p 2222 root@服务器IP "..."
```

### 多环境部署

复制脚本创建多个环境的部署脚本：

- `deploy-dev.bat` - 开发环境
- `deploy-prod.bat` - 生产环境
- `deploy-test.bat` - 测试环境

每个脚本配置不同的服务器地址。

## 更新日志

- **2025-01-07**: 创建快速部署脚本
  - Windows: `deploy.bat`
  - Linux/Mac: `deploy.sh`
  - 支持一键同步代码、构建镜像、部署容器

## 相关文档

- [完整部署文档](REMOTE_DEPLOY_CONFIG.md) - 详细的配置和故障排查
- [Docker 部署](DOCKER_DEPLOYMENT.md) - Docker 部署指南
- [GitHub Actions](.github/GITHUB_ACTIONS_SETUP.md) - CI/CD 配置

## 技术支持

如遇问题，请查看：
1. 容器日志：`ssh root@服务器IP "docker logs icons-app"`
2. 构建日志：在服务器上手动运行 `docker build`
3. 完整文档：[REMOTE_DEPLOY_CONFIG.md](REMOTE_DEPLOY_CONFIG.md)
