#!/bin/bash

# 快速部署到远程 Debian 服务器
#
# 使用前请先配置:
# 1. 编辑此文件，修改 SERVER 变量为你的服务器地址
# 2. 确保已安装 rsync: apt-get install rsync 或 brew install rsync

set -e

# ============ 配置区域 ============
# 请修改以下变量为你的实际配置

SERVER="root@192.168.31.60"
REMOTE_DIR="/opt/iconS"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============ 脚本开始 ============

echo ""
echo "========================================"
echo "IconS 远程部署工具"
echo "========================================"
echo ""
echo "服务器: $SERVER"
echo "项目目录: $PROJECT_DIR"
echo ""

# 检查必要工具
if ! command -v rsync &> /dev/null; then
    echo "[错误] 未找到 rsync 命令"
    echo "请安装: apt-get install rsync (Linux) 或 brew install rsync (Mac)"
    exit 1
fi

echo "按任意键开始部署，或按 Ctrl+C 取消..."
read -n 1 -s

echo ""
echo "[1/6] 清理本地临时文件..."
rm -rf "$PROJECT_DIR/.next"

echo "[2/6] 在远程服务器创建目录..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

echo "[3/6] 同步代码到远程服务器..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'data' \
  --exclude 'logs' \
  --exclude '.env' \
  --exclude '.DS_Store' \
  "$PROJECT_DIR/" $SERVER:$REMOTE_DIR/

echo "[4/6] 检查环境配置..."
ssh $SERVER "cd $REMOTE_DIR && \
  if [ ! -f .env ]; then \
    echo '创建 .env 文件...'; \
    cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons
REDIS_URL=redis://:redis@192.168.31.60:6379/0
ADMIN_PASSWORD=admin123456
BASE_URL=http://192.168.31.60:3000
NODE_ENV=production
STORAGE_BASE_PATH=/app/data
ENVEOF
  fi"

echo "[5/6] 在远程服务器构建 Docker 镜像..."
echo "(这可能需要 3-5 分钟，请耐心等待)"
ssh $SERVER "cd $REMOTE_DIR && docker build -t iconS:latest ."

echo "[6/6] 重启容器..."
ssh $SERVER "docker stop icons-app 2>/dev/null || true && \
             docker rm icons-app 2>/dev/null || true && \
             docker run -d \
               --name icons-app \
               -p 3000:3000 \
               --restart unless-stopped \
               --env-file $REMOTE_DIR/.env \
               -v /opt/iconS-data:/app/data \
               iconS:latest"

echo ""
echo "========================================"
echo "部署成功!"
echo "========================================"
echo ""
echo "访问地址: http://192.168.31.60:3000"
echo ""
echo "常用命令:"
echo "  查看日志: ssh $SERVER 'docker logs -f icons-app'"
echo "  进入容器: ssh $SERVER 'docker exec -it icons-app sh'"
echo "  重启容器: ssh $SERVER 'docker restart icons-app'"
echo ""
