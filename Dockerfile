# 使用 Debian 官方镜像而不是 Alpine,解决 OpenSSL 兼容性问题
FROM node:20-bookworm-slim AS base

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

# 创建非 root 用户
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

# 复制公共文件
COPY --from=chown=nextjs:nodejs /app/public ./public

# 复制构建输出
COPY --from=chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制 Prisma 文件
COPY --from=chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=chown=nextjs:nodejs /app/prisma ./prisma

# 创建数据目录
RUN mkdir -p /app/data/icons /app/data/temp && \
    chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV STORAGE_BASE_PATH=/app/data

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
