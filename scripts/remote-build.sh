#!/bin/bash

# 远程服务器构建和部署脚本
# 使用方法: ./scripts/remote-build.sh [user@host]

set -e

# 配置
REMOTE_HOST=${1:-"root@your-server-ip"}
REMOTE_DIR="/opt/icon-library"
DOCKER_IMAGE="icon-library:test"

echo "========================================"
echo "远程构建和部署脚本"
echo "========================================"
echo "远程主机: $REMOTE_HOST"
echo ""

# 1. 在远程服务器创建目录
echo "[1/5] 在远程服务器创建项目目录..."
ssh $REMOTE_HOST "mkdir -p $REMOTE_DIR"

# 2. 同步代码到远程服务器
echo "[2/5] 同步代码到远程服务器..."
echo "排除文件:"
echo "  - node_modules"
echo "  - .next"
echo "  - .git"
echo "  - data/"
echo "  - logs/"
echo ""

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'data' \
  --exclude 'logs' \
  --exclude '.env' \
  --exclude '.env.docker' \
  ./ $REMOTE_HOST:$REMOTE_DIR/

echo "✅ 代码同步完成"
echo ""

# 3. 在远程服务器构建 Docker 镜像
echo "[3/5] 在远程服务器构建 Docker 镜像..."
ssh $REMOTE_HOST "cd $REMOTE_DIR && docker build -t $DOCKER_IMAGE ."

echo "✅ 镜像构建完成"
echo ""

# 4. 停止旧容器(如果存在)
echo "[4/5] 停止旧容器..."
ssh $REMOTE_HOST "docker stop icon-library-test 2>/dev/null || true && \
                       docker rm icon-library-test 2>/dev/null || true"

echo "✅ 旧容器已清理"
echo ""

# 5. 启动新容器
echo "[5/5] 启动新容器..."
ssh $REMOTE_HOST "docker run -d \
  --name icon-library-test \
  -p 3000:3000 \
  -e DATABASE_URL=\"$DATABASE_URL\" \
  -e REDIS_URL=\"$REDIS_URL\" \
  -e ADMIN_PASSWORD=admin123456 \
  -e NODE_ENV=production \
  -v /opt/icon-library-data:/app/data \
  $DOCKER_IMAGE"

echo ""
echo "========================================"
echo "✅ 部署完成!"
echo "========================================"
echo ""
echo "访问地址: http://$REMOTE_HOST:3000"
echo ""
echo "查看日志:"
echo "  ssh $REMOTE_HOST 'docker logs -f icon-library-test'"
echo ""
echo "进入容器:"
echo "  ssh $REMOTE_HOST 'docker exec -it icon-library-test sh'"
echo ""
echo "停止容器:"
echo "  ssh $REMOTE_HOST 'docker stop icon-library-test'"
echo ""
