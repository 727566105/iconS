/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions are enabled by default in Next.js 14
  output: 'standalone', // 启用 standalone 输出模式用于 Docker 部署
}

module.exports = nextConfig
