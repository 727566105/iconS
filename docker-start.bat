@echo off
REM Docker 快速启动脚本 - 生产模式
REM 使用远程数据库和 Redis

echo ========================================
echo SVG 图标库系统 - Docker 启动脚本
echo ========================================
echo.

REM 检查环境变量文件
if not exist ".env.docker" (
    echo [错误] 未找到 .env.docker 文件
    echo.
    echo 请先配置环境变量:
    echo 1. copy .env.docker.example .env.docker
    echo 2. 编辑 .env.docker 填入数据库和 Redis 连接信息
    echo.
    pause
    exit /b 1
)

REM 检查并创建数据目录
if not exist "data\icons" mkdir data\icons
if not exist "data\temp" mkdir data\temp
if not exist "logs" mkdir logs

echo [信息] 数据目录检查完成
echo.

REM 构建并启动容器
echo [信息] 正在构建 Docker 镜像...
docker-compose -f docker-compose.prod.yml --env-file .env.docker build

if errorlevel 1 (
    echo [错误] Docker 镜像构建失败
    pause
    exit /b 1
)

echo.
echo [信息] 正在启动容器...
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d

if errorlevel 1 (
    echo [错误] 容器启动失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo [成功] 容器已启动!
echo ========================================
echo.
echo 访问地址: http://localhost:3000
echo 管理后台: http://localhost:3000/admin/login
echo.
echo 查看日志: docker-compose -f docker-compose.prod.yml logs -f
echo 停止服务: docker-compose -f docker-compose.prod.yml down
echo.
echo 首次运行需要创建管理员账户:
echo docker exec -it icon-library-app npx tsx scripts/create-admin-quick.ts
echo.
pause
