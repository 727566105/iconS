/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions are enabled by default in Next.js 14
  output: 'standalone', // 启用 standalone 输出模式用于 Docker 部署

  // 禁用 ESLint 在构建时运行
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 禁用 TypeScript 类型检查在构建时运行
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
