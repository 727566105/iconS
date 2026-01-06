import { redirect } from 'next/navigation'
import { authService } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 验证管理员会话
  const session = await authService.validateSession()

  if (!session) {
    redirect('/admin/login')
  }

  return <>{children}</>
}
