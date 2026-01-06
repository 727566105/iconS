@echo off
REM 快速部署到远程 Debian 服务器
REM
REM 使用前请先配置:
REM 1. 编辑此文件，修改 SERVER 变量为你的服务器地址
REM 2. 确保 Windows 已安装 Git for Windows 或启用 OpenSSH

setlocal

REM ============ 配置区域 ============
REM 请修改以下变量为你的实际配置

set "SERVER=root@192.168.31.60"
set "REMOTE_DIR=/opt/iconS"
set "PROJECT_DIR=%~dp0"

REM ============ 脚本开始 ============

echo.
echo ========================================
echo IconS 远程部署工具
echo ========================================
echo.
echo 服务器: %SERVER%
echo 项目目录: %PROJECT_DIR%
echo.

REM 检查 SSH 工具
where ssh >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 SSH 命令
    echo.
    echo 请安装 Git for Windows: https://git-scm.com/download/win
    echo 或在 Windows 设置中启用 "OpenSSH 客户端"
    pause
    exit /b 1
)

echo 按任意键开始部署，或关闭窗口取消...
pause >nul

echo.
echo [1/6] 清理本地临时文件...
if exist "%PROJECT_DIR%.next" rmdir /s /q "%PROJECT_DIR%.next"

echo [2/6] 在远程服务器创建目录...
ssh %SERVER% "mkdir -p %REMOTE_DIR%"

echo [3/6] 同步代码到远程服务器...
tar -czf - --exclude=node_modules --exclude=.next --exclude=.git --exclude=data --exclude=logs --exclude=.env -C "%PROJECT_DIR%" . | ssh %SERVER% "tar -xzf - -C %REMOTE_DIR%"

echo [4/6] 检查环境配置...
ssh %SERVER% "cd %REMOTE_DIR% && if [ ! -f .env ]; then cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:postgres@192.168.31.60:54321/icons
REDIS_URL=redis://:redis@192.168.31.60:6379/0
ADMIN_PASSWORD=admin123456
BASE_URL=http://192.168.31.60:3000
NODE_ENV=production
STORAGE_BASE_PATH=/app/data
ENVEOF
fi"

echo [5/6] 在远程服务器构建 Docker 镜像...
echo (这可能需要 3-5 分钟，请耐心等待)
ssh %SERVER% "cd %REMOTE_DIR% && docker build -t iconS:latest ."

if errorlevel 1 (
    echo.
    echo [错误] Docker 构建失败
    pause
    exit /b 1
)

echo [6/6] 重启容器...
ssh %SERVER% "docker stop icons-app 2>nul || true & docker rm icons-app 2>nul || true & docker run -d --name icons-app -p 3000:3000 --restart unless-stopped --env-file %REMOTE_DIR%/.env -v /opt/iconS-data:/app/data iconS:latest"

if errorlevel 1 (
    echo.
    echo [错误] 容器启动失败
    echo 查看日志: ssh %SERVER% "docker logs icons-app"
    pause
    exit /b 1
)

echo.
echo ========================================
echo 部署成功!
echo ========================================
echo.
echo 访问地址: http://192.168.31.60:3000
echo.
echo 常用命令:
echo   查看日志: ssh %SERVER% "docker logs -f icons-app"
echo   进入容器: ssh %SERVER% "docker exec -it icons-app sh"
echo   重启容器: ssh %SERVER% "docker restart icons-app"
echo.

pause
