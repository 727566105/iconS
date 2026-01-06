#!/bin/bash

# 从本地同步代码到远程 Debian 服务器并构建部署
# 使用方法: ./scripts/deploy-to-server.sh [user@host]

set -e

# 配置
REMOTE_HOST=${1:-"root@your-server-ip"}
REMOTE_DIR="/opt/iconS"
DOCKER_IMAGE="iconS:latest"
CONTAINER_NAME="icons-app"

echo "========================================"
echo "远程部署脚本"
echo "========================================"
echo "远程主机: $REMOTE_HOST"
echo "项目目录: $REMOTE_DIR"
echo "Docker 镜像: $DOCKER_IMAGE"
echo "容器名称: $CONTAINER_NAME"
echo ""

# 检查必要工具
if ! command -v rsync &> /dev/null; then
    echo "[错误] 未找到 rsync 命令"
    echo "请安装: apt-get install rsync (Linux) 或 brew install rsync (Mac)"
    exit 1
fi

# 1. 在远程服务器创建目录
echo "[1/6] 在远程服务器创建项目目录..."
ssh $REMOTE_HOST "mkdir -p $REMOTE_DIR"

echo "✅ 目录创建完成"
echo ""

# 2. 同步代码到远程服务器
echo "[2/6] 同步代码到远程服务器..."
echo "排除文件:"
echo "  - node_modules"
echo "  - .next"
echo "  - .git"
echo "  - data/"
echo "  - logs/"
echo "  - .env"
echo ""

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'data' \
  --exclude 'logs' \
  --exclude '.env' \
  --exclude '.env.docker' \
  --exclude '.DS_Store' \
  ./ $REMOTE_HOST:$REMOTE_DIR/

echo "✅ 代码同步完成"
echo ""

# 3. 在远程服务器创建 .env 文件（如果不存在）
echo "[3/6] 检查环境配置..."
ssh $REMOTE_HOST "cd $REMOTE_DIR && \
  if [ ! -f .env ]; then \
    echo '创建 .env 文件...'; \
    cat > .env << 'ENVEOF'
# 远程数据库配置
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons
REDIS_URL=redis://:redis@192.168.31.60:6379/0

# 管理员密码
ADMIN_PASSWORD=admin123456

# 应用配置
BASE_URL=http://$(hostname -I | awk '{print $1}'):3000
NODE_ENV=production

# 存储路径
STORAGE_BASE_PATH=/app/data
ENVEOF
  fi"

echo "✅ 环境配置完成"
echo ""

# 4. 在远程服务器构建 Docker 镜像
echo "[4/6] 在远程服务器构建 Docker 镜像..."
echo "这可能需要几分钟，请耐心等待..."
echo ""

ssh $REMOTE_HOST "cd $REMOTE_DIR && docker build -t $DOCKER_IMAGE ."

echo "✅ 镜像构建完成"
echo ""

# 5. 停止并删除旧容器
echo "[5/6] 停止旧容器..."
ssh $REMOTE_HOST "docker stop $CONTAINER_NAME 2>/dev/null || true && \
                       docker rm $CONTAINER_NAME 2>/dev/null || true"

echo "✅ 旧容器已清理"
echo ""

# 6. 启动新容器
echo "[6/6] 启动新容器..."
ssh $REMOTE_HOST "docker run -d \
  --name $CONTAINER_NAME \
  -p 3000:3000 \
  --restart unless-stopped \
  --env-file $REMOTE_DIR/.env \
  -v /opt/iconS-data:/app/data \
  $DOCKER_IMAGE"

echo ""
echo "========================================"
echo "✅ 部署完成!"
echo "========================================"
echo ""
echo "访问地址: http://$REMOTE_HOST:3000"
echo ""
echo "常用命令:"
echo "  查看日志: ssh $REMOTE_HOST 'docker logs -f $CONTAINER_NAME'"
echo "  进入容器: ssh $REMOTE_HOST 'docker exec -it $CONTAINER_NAME sh'"
echo "  停止容器: ssh $REMOTE_HOST 'docker stop $CONTAINER_NAME'"
echo "  重启容器: ssh $REMOTE_HOST 'docker restart $CONTAINER_NAME'"
echo "  查看状态: ssh $REMOTE_HOST 'docker ps'"
echo ""
