@echo off
REM 从本地 Windows 同步代码到远程 Debian 服务器并构建部署
REM 使用方法: scripts\deploy-to-server.bat [user@host]

setlocal enabledelayedexpansion

REM 配置参数
set "REMOTE_HOST=%~1"
if "%REMOTE_HOST%"=="" (
    echo 用法: scripts\deploy-to-server.bat [user@host]
    echo 示例: scripts\deploy-to-server.bat root@192.168.1.100
    echo.
    echo 或者修改此脚本设置默认主机:
    set "REMOTE_HOST=root@your-server-ip"
    pause
    exit /b 1
)

set "REMOTE_DIR=/opt/iconS"
set "DOCKER_IMAGE=iconS:latest"
set "CONTAINER_NAME=icons-app"

echo ========================================
echo 远程部署脚本 - Windows 版本
echo ========================================
echo 远程主机: %REMOTE_HOST%
echo 项目目录: %REMOTE_DIR%
echo Docker 镜像: %DOCKER_IMAGE%
echo 容器名称: %CONTAINER_NAME%
echo.

REM 检查必要工具
where ssh >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 ssh 命令
    echo.
    echo 请安装以下工具之一:
    echo 1. Git for Windows ^(推荐^) - https://git-scm.com/download/win
    echo 2. OpenSSH 客户端 ^(Windows 10+ 已内置^)
    echo.
    pause
    exit /b 1
)

where scp >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 scp 命令
    echo 请安装 Git for Windows 或启用 OpenSSH 客户端
    pause
    exit /b 1
)

REM 1. 在远程服务器创建目录
echo [1/6] 在远程服务器创建项目目录...
ssh %REMOTE_HOST% "mkdir -p %REMOTE_DIR%"

echo ✅ 目录创建完成
echo.

REM 2. 同步代码到远程服务器
echo [2/6] 同步代码到远程服务器...
echo 排除文件:
echo   - node_modules
echo   - .next
echo   - .git
echo   - data
echo   - logs
echo   - .env
echo.

REM 使用 scp 同步文件 (Windows 版本)
echo 正在同步文件...
ssh %REMOTE_HOST% "cd %REMOTE_DIR% && git init && git config core.excludesFile ~/.gitignore_global"

REM 创建临时排除文件
echo node_modules > %TEMP%\rsync-exclude.txt
echo .next >> %TEMP%\rsync-exclude.txt
echo .git >> %TEMP%\rsync-exclude.txt
echo data >> %TEMP%\rsync-exclude.txt
echo logs >> %TEMP%\rsync-exclude.txt
echo .env >> %TEMP%\rsync-exclude.txt
echo .env.docker >> %TEMP%\rsync-exclude.txt
echo node_modules >> %TEMP%\rsync-exclude.txt
echo *.md >> %TEMP%\rsync-exclude.txt

REM 使用 tar + ssh 传输 (Windows 上 rsync 可能不可用)
echo 正在打包并传输文件...
tar -czf - --exclude-from=%TEMP%\rsync-exclude.txt . | ssh %REMOTE_HOST% "cd %REMOTE_DIR% && tar -xzf -"

del %TEMP%\rsync-exclude.txt

echo ✅ 代码同步完成
echo.

REM 3. 检查 .env 文件是否存在
echo [3/6] 检查环境配置...
ssh %REMOTE_HOST% "if [ ! -f %REMOTE_DIR%/.env ]; then echo '警告: .env 文件不存在，使用默认配置'; fi"

echo ✅ 环境检查完成
echo.

REM 4. 在远程服务器构建 Docker 镜像
echo [4/6] 在远程服务器构建 Docker 镜像...
echo 这可能需要几分钟，请耐心等待...
echo.

ssh %REMOTE_HOST% "cd %REMOTE_DIR% && docker build -t %DOCKER_IMAGE% ."

if errorlevel 1 (
    echo.
    echo [错误] Docker 镜像构建失败
    pause
    exit /b 1
)

echo ✅ 镜像构建完成
echo.

REM 5. 停止并删除旧容器
echo [5/6] 停止旧容器...
ssh %REMOTE_HOST% "docker stop %CONTAINER_NAME% 2^>/dev/null ^|^| true && docker rm %CONTAINER_NAME% 2^>/dev/null ^|^| true"

echo ✅ 旧容器已清理
echo.

REM 6. 启动新容器
echo [6/6] 启动新容器...
ssh %REMOTE_HOST% "docker run -d \
  --name %CONTAINER_NAME% \
  -p 3000:3000 \
  --restart unless-stopped \
  --env-file %REMOTE_DIR%/.env \
  -v /opt/iconS-data:/app/data \
  %DOCKER_IMAGE%"

if errorlevel 1 (
    echo.
    echo [错误] 容器启动失败
    echo 查看日志: ssh %REMOTE_HOST% 'docker logs %CONTAINER_NAME%'
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 部署完成!
echo ========================================
echo.
echo 访问地址: http://%REMOTE_HOST%:3000
echo.
echo 常用命令:
echo   查看日志: ssh %REMOTE_HOST% "docker logs -f %CONTAINER_NAME%"
echo   进入容器: ssh %REMOTE_HOST% "docker exec -it %CONTAINER_NAME% sh"
echo   停止容器: ssh %REMOTE_HOST% "docker stop %CONTAINER_NAME%"
echo   重启容器: ssh %REMOTE_HOST% "docker restart %CONTAINER_NAME%"
echo   查看状态: ssh %REMOTE_HOST% "docker ps"
echo.

pause
