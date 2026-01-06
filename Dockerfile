# 使用 Debian 官方镜像而不是 Alpine,解决 OpenSSL 兼容性问题
FROM node:20-bookworm-slim AS builder

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --cache /tmp/npm-cache

# 复制 Prisma schema
COPY prisma ./prisma/

# 生成 Prisma Client
RUN npx prisma generate

# 复制应用代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN npm run build

# 生产镜像
FROM node:20-bookworm-slim AS runner

# 安装必要的运行时依赖
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

# 设置工作目录
WORKDIR /app

# 复制公共文件
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 复制构建输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制所有 node_modules（包含完整的 Prisma 工具）
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# 复制 Prisma schema 和迁移文件
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# 创建数据目录
RUN mkdir -p /app/data/icons /app/data/temp && \
    chown -R nextjs:nodejs /app/data

# 创建启动脚本
RUN echo '#!/bin/sh\n\
set -e\n\
echo "========================================="\n\
echo "启动 IconS 应用"\n\
echo "========================================="\n\
echo "检查数据库连接..."\n\
if [ -n "$DATABASE_URL" ]; then\n\
  echo "运行数据库迁移..."\n\
  npx prisma migrate deploy --skip-generate || {\n\
    echo "警告: 数据库迁移失败，尝试继续启动..."\n\
    echo "如果遇到数据库错误，请检查 DATABASE_URL 配置"\n\
  }\n\
else\n\
  echo "警告: DATABASE_URL 未设置，跳过数据库迁移"\n\
fi\n\
echo "启动服务器..."\n\
echo "========================================="\n\
exec node server.js\n' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    chown nextjs:nodejs /app/entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV STORAGE_BASE_PATH=/app/data

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["/app/entrypoint.sh"]
