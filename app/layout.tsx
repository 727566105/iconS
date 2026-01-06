import './globals.css'

export const metadata = {
  title: 'SVG Icon Library',
  description: 'High-performance SVG icon search and download service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
