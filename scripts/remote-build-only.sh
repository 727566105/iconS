#!/bin/bash

# 远程服务器纯构建脚本
# 假设代码已经通过其他方式(Git/手动)同步到服务器
# 使用方法: ./scripts/remote-build-only.sh [user@host] [branch]

set -e

REMOTE_HOST=${1:-"root@your-server-ip"}
BRANCH=${2:-"master"}
REMOTE_DIR="/opt/icon-library"
DOCKER_IMAGE="icon-library:test"

echo "========================================"
echo "远程服务器构建脚本"
echo "========================================"
echo "远程主机: $REMOTE_HOST"
echo "分支: $BRANCH"
echo ""

# 1. 更新代码
echo "[1/4] 拉取最新代码..."
ssh $REMOTE_HOST "cd $REMOTE_DIR && \
  git fetch origin && \
  git checkout $BRANCH && \
  git pull origin $BRANCH"

echo "✅ 代码更新完成"
echo ""

# 2. 在远程服务器构建 Docker 镜像
echo "[2/4] 构建 Docker 镜像..."
ssh $REMOTE_HOST "cd $REMOTE_DIR && docker build -t $DOCKER_IMAGE ."

echo "✅ 镜像构建完成"
echo ""

# 3. 停止旧容器
echo "[3/4] 停止旧容器..."
ssh $REMOTE_HOST "docker stop icon-library-test 2>/dev/null || true && \
                       docker rm icon-library-test 2>/dev/null || true"

echo "✅ 旧容器已清理"
echo ""

# 4. 启动新容器
echo "[4/4] 启动新容器..."
ssh $REMOTE_HOST "docker run -d \
  --name icon-library-test \
  -p 3000:3000 \
  --restart unless-stopped \
  -e DATABASE_URL=\"$DATABASE_URL\" \
  -e REDIS_URL=\"$REDIS_URL\" \
  -e ADMIN_PASSWORD=admin123456 \
  -e NODE_ENV=production \
  -v /opt/icon-library-data:/app/data \
  $DOCKER_IMAGE"

echo ""
echo "========================================"
echo "✅ 构建和部署完成!"
echo "========================================"
echo ""
echo "访问地址: http://$REMOTE_HOST:3000"
echo ""
echo "查看日志:"
echo "  ssh $REMOTE_HOST 'docker logs -f icon-library-test'"
echo ""
echo "查看容器状态:"
echo "  ssh $REMOTE_HOST 'docker ps | grep icon-library'"
echo ""
