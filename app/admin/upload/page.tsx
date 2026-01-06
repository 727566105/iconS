'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UploadResult {
  success: boolean
  icon?: {
    id: string
    name: string
    fileName: string
    status: string
  }
  error?: string
  message?: string
}

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Check file type
    if (!selectedFile.type.includes('svg') && !selectedFile.name.endsWith('.svg')) {
      setResult({ success: false, error: '请选择SVG文件' })
      return
    }

    // Check file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setResult({ success: false, error: '文件大小不能超过5MB' })
      return
    }

    setFile(selectedFile)

    // Auto-fill name from filename
    if (!name) {
      const fileName = selectedFile.name.replace('.svg', '').replace(/[-_]/g, ' ')
      setName(fileName.charAt(0).toUpperCase() + fileName.slice(1))
    }

    // Generate preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsText(selectedFile)

    setResult(null)
  }, [name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setResult({ success: false, error: '请选择文件' })
      return
    }

    if (!name.trim()) {
      setResult({ success: false, error: '请输入图标名称' })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', name.trim())
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data: UploadResult = await response.json()

      if (!response.ok) {
        setResult(data)
        return
      }

      setResult(data)

      // Redirect to dashboard after 2 seconds on success
      setTimeout(() => {
        router.push('/admin')
        router.refresh()
      }, 2000)
    } catch (error) {
      setResult({
        success: false,
        error: '网络错误,请重试',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-700 hover:text-gray-900">
                ← 返回仪表板
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              上传图标
            </h2>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 结果提示 */}
            {result && (
              <div
                className={`p-4 rounded-md ${
                  result.success
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {result.error && <p className="font-medium">{result.error}</p>}
                {result.message && <p>{result.message}</p>}
              </div>
            )}

            {/* 文件上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SVG文件 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                    >
                      <span>选择文件</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".svg,image/svg+xml"
                        onChange={handleFileSelect}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">或拖拽到此处</p>
                  </div>
                  <p className="text-xs text-gray-500">SVG文件,最大5MB</p>
                  {file && (
                    <p className="text-sm text-indigo-600 font-medium">
                      已选择: {file.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 预览 */}
            {preview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预览
                </label>
                <div className="border border-gray-300 rounded-md p-4 bg-white">
                  <div
                    className="w-24 h-24 mx-auto"
                    dangerouslySetInnerHTML={{ __html: preview }}
                  />
                </div>
              </div>
            )}

            {/* 图标名称 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                图标名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="例如: Home Icon"
              />
            </div>

            {/* 描述 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="简要描述这个图标的用途..."
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-3">
              <Link
                href="/admin"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={uploading || !file}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? '上传中...' : '上传图标'}
              </button>
            </div>
          </form>
        </div>

        {/* 上传说明 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">上传说明</h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>仅支持SVG格式的图标文件</li>
            <li>文件大小不能超过5MB</li>
            <li>上传后会自动进行AI分析,添加标签和分类</li>
            <li>重复的图标(内容相同)将被拒绝</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
