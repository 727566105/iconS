@echo off
REM 远程服务器构建和部署脚本 (Windows 版本)
REM 使用方法: scripts\remote-build.bat [user@host]

set REMOTE_HOST=%1
if "%REMOTE_HOST%"=="" set REMOTE_HOST=root@your-server-ip

set REMOTE_DIR=/opt/icon-library
set DOCKER_IMAGE=icon-library:test

echo ========================================
echo 远程构建和部署脚本
echo ========================================
echo 远程主机: %REMOTE_HOST%
echo.

REM 检查是否安装了 pscp 和 plink (PuTTY 工具)
where pscp >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 pscp 命令
    echo.
    echo 请安装 PuTTY 或使用 WSL:
    echo 1. 下载 PuTTY: https://www.putty.org/
    echo 2. 或使用 Git Bash / WSL 运行 shell 脚本
    pause
    exit /b 1
)

REM 1. 在远程服务器创建目录
echo [1/5] 在远程服务器创建项目目录...
plink %REMOTE_HOST% "mkdir -p %REMOTE_DIR%"

REM 2. 同步代码到远程服务器
echo [2/5] 同步代码到远程服务器...
echo 排除文件:
echo   - node_modules
echo   - .next
echo   - .git
echo   - data/
echo   - logs/
echo.

pscp -r -batch ^
  -P 22 ^
  ^.^node_modules ^
  ^.^next ^
  ^.^git ^
  data ^
  logs ^
  .env ^
  .env.docker ^
  *.*
REM 注意: 上面的排除列表需要手动调整

echo ✅ 代码同步完成
echo.

REM 3. 在远程服务器构建 Docker 镜像
echo [3/5] 在远程服务器构建 Docker 镜像...
plink %REMOTE_HOST% "cd %REMOTE_DIR% && docker build -t %DOCKER_IMAGE% ."

echo ✅ 镜像构建完成
echo.

REM 4. 停止旧容器
echo [4/5] 停止旧容器...
plink %REMOTE_HOST% "docker stop icon-library-test 2^>^/dev/null ^|^| true ^&^& docker rm icon-library-test 2^>^/dev/null ^|^| true"

echo ✅ 旧容器已清理
echo.

REM 5. 启动新容器
echo [5/5] 启动新容器...
plink %REMOTE_HOST% "docker run -d --name icon-library-test -p 3000:3000 -e DATABASE_URL=%DATABASE_URL% -e REDIS_URL=%REDIS_URL% -e ADMIN_PASSWORD=admin123456 -e NODE_ENV=production -v /opt/icon-library-data:/app/data %DOCKER_IMAGE%"

echo.
echo ========================================
echo ✅ 部署完成!
echo ========================================
echo.
echo 访问地址: http://%REMOTE_HOST%:3000
echo.
echo 查看日志:
echo   plink %REMOTE_HOST% "docker logs -f icon-library-test"
echo.
echo 进入容器:
echo   plink %REMOTE_HOST% "docker exec -it icon-library-test sh"
echo.
echo 停止容器:
echo   plink %REMOTE_HOST% "docker stop icon-library-test"
echo.
pause
