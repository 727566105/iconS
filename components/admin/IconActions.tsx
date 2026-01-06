'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface IconActionsProps {
  iconId: string
  iconName: string
}

export function IconActions({ iconId, iconName }: IconActionsProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`确定要删除图标 "${iconName}" 吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/icons/${iconId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('删除失败，请重试')
      }
    } catch (error) {
      console.error('Failed to delete icon:', error)
      alert('删除失败，请重试')
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Link
        href={`/admin/edit/${iconId}`}
        className="text-indigo-600 hover:text-indigo-900"
      >
        编辑
      </Link>
      <span className="text-gray-300">|</span>
      <button
        onClick={handleDelete}
        className="text-red-600 hover:text-red-900"
      >
        删除
      </button>
    </div>
  )
}
