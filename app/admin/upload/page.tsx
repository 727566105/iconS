'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UploadResult {
  fileName: string
  success: boolean
  icon?: {
    id: string
    name: string
    fileName: string
    status: string
  }
  error?: string
}

interface BatchUploadResponse {
  success: boolean
  results: UploadResult[]
  summary: {
    total: number
    succeeded: number
    failed: number
  }
}

interface FileWithStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  icon?: UploadResult['icon']
}

export default function UploadPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'single' | 'batch'>('single')

  // Single file mode state
  const [singleFile, setSingleFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [singleUploading, setSingleUploading] = useState(false)
  const [singleResult, setSingleResult] = useState<UploadResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Batch mode state
  const [batchFiles, setBatchFiles] = useState<FileWithStatus[]>([])
  const [batchUploading, setBatchUploading] = useState(false)
  const [batchResult, setBatchResult] = useState<BatchUploadResponse | null>(null)
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 })

  // Single file handlers
  const handleSingleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.type.includes('svg') && !selectedFile.name.endsWith('.svg')) {
      setSingleResult({ success: false, fileName: selectedFile.name, error: '请选择SVG文件' })
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setSingleResult({ success: false, fileName: selectedFile.name, error: '文件大小不能超过5MB' })
      return
    }

    setSingleFile(selectedFile)

    if (!name) {
      const fileName = selectedFile.name.replace('.svg', '').replace(/[-_]/g, ' ')
      setName(fileName.charAt(0).toUpperCase() + fileName.slice(1))
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsText(selectedFile)

    setSingleResult(null)
  }, [name])

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!singleFile) {
      setSingleResult({ success: false, fileName: '', error: '请选择文件' })
      return
    }

    if (!name.trim()) {
      setSingleResult({ success: false, fileName: '', error: '请输入图标名称' })
      return
    }

    setSingleUploading(true)
    setSingleResult(null)

    try {
      const formData = new FormData()
      formData.append('file', singleFile)
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
        setSingleResult(data)
        return
      }

      setSingleResult(data)

      setTimeout(() => {
        router.push('/admin')
        router.refresh()
      }, 2000)
    } catch (error) {
      setSingleResult({
        success: false,
        fileName: singleFile.name,
        error: '网络错误,请重试',
      })
    } finally {
      setSingleUploading(false)
    }
  }

  // Batch mode handlers
  const handleBatchFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const newFiles: FileWithStatus[] = Array.from(files)
      .filter(file => {
        if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
          return false
        }
        if (file.size > 5 * 1024 * 1024) {
          return false
        }
        return true
      })
      .map(file => ({
        file,
        status: 'pending' as const,
      }))

    setBatchFiles(prev => [...prev, ...newFiles])
    setBatchResult(null)
  }, [])

  const handleBatchDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFiles = e.dataTransfer.files
    handleBatchFileSelect(droppedFiles)
  }, [handleBatchFileSelect])

  const handleBatchDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const removeFile = useCallback((index: number) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index))
    setBatchResult(null)
  }, [])

  const clearAllFiles = useCallback(() => {
    setBatchFiles([])
    setBatchResult(null)
    setUploadProgress({ completed: 0, total: 0 })
  }, [])

  const handleBatchUpload = async () => {
    if (batchFiles.length === 0) return

    setBatchUploading(true)
    setBatchResult(null)
    setUploadProgress({ completed: 0, total: batchFiles.length })

    try {
      const formData = new FormData()
      batchFiles.forEach(({ file }) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/admin/upload/batch', {
        method: 'POST',
        body: formData,
      })

      const data: BatchUploadResponse = await response.json()

      if (!response.ok) {
        setBatchResult({
          success: false,
          results: [],
          summary: { total: batchFiles.length, succeeded: 0, failed: batchFiles.length },
        })
        return
      }

      // Update file statuses based on results
      setBatchFiles(prev => prev.map((fileWithStatus, index) => {
        const result = data.results.find(r => r.fileName === fileWithStatus.file.name)
        if (result) {
          return {
            ...fileWithStatus,
            status: result.success ? 'success' : 'error',
            error: result.error,
            icon: result.icon,
          }
        }
        return fileWithStatus
      }))

      setBatchResult(data)
      setUploadProgress({ completed: data.results.length, total: data.results.length })

      // Auto-redirect if all succeeded
      if (data.summary.failed === 0) {
        setTimeout(() => {
          router.push('/admin')
          router.refresh()
        }, 2000)
      }
    } catch (error) {
      setBatchResult({
        success: false,
        results: [],
        summary: { total: batchFiles.length, succeeded: 0, failed: batchFiles.length },
      })
    } finally {
      setBatchUploading(false)
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
          {/* 模式切换 */}
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                  mode === 'single'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                单文件上传
              </button>
              <button
                type="button"
                onClick={() => setMode('batch')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                  mode === 'batch'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                批量上传
              </button>
            </div>
          </div>
        </div>

        {/* 单文件上传模式 */}
        {mode === 'single' && (
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSingleSubmit} className="p-6 space-y-6">
              {singleResult && (
                <div
                  className={`p-4 rounded-md ${
                    singleResult.success
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {singleResult.error && <p className="font-medium">{singleResult.error}</p>}
                  {singleResult.icon && <p>上传成功！AI 分析中...</p>}
                </div>
              )}

              {/* 文件上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SVG文件 <span className="text-red-500">*</span>
                </label>
                <div
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                    singleFile
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-500'
                  }`}
                >
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
                        htmlFor="single-file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                      >
                        <span>选择文件</span>
                        <input
                          id="single-file-upload"
                          name="single-file-upload"
                          type="file"
                          accept=".svg,image/svg+xml"
                          onChange={handleSingleFileSelect}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">或拖拽到此处</p>
                    </div>
                    <p className="text-xs text-gray-500">SVG文件,最大5MB</p>
                    {singleFile && (
                      <p className="text-sm text-indigo-600 font-medium">
                        已选择: {singleFile.name}
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
                  disabled={singleUploading || !singleFile}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {singleUploading ? '上传中...' : '上传图标'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 批量上传模式 */}
        {mode === 'batch' && (
          <div className="space-y-6">
            {/* 批量上传区域 */}
            <div className="bg-white shadow rounded-lg p-6">
              <div
                className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                  batchUploading
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 hover:border-indigo-500'
                }`}
                onDragOver={handleBatchDragOver}
                onDrop={handleBatchDrop}
              >
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
                    <button
                      type="button"
                      onClick={() => document.getElementById('batch-file-upload')?.click()}
                      className="relative cursor-pointer bg-transparent font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                      disabled={batchUploading}
                    >
                      <span>选择多个文件</span>
                    </button>
                    <input
                      id="batch-file-upload"
                      name="batch-file-upload"
                      type="file"
                      accept=".svg,image/svg+xml"
                      multiple
                      onChange={(e) => handleBatchFileSelect(e.target.files)}
                      className="sr-only"
                      disabled={batchUploading}
                    />
                    <p className="pl-1">或拖拽多个文件到此处</p>
                  </div>
                  <p className="text-xs text-gray-500">SVG文件,最大5MB,最多50个</p>
                </div>
              </div>
            </div>

            {/* 文件列表 */}
            {batchFiles.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      已选择的文件 ({batchFiles.length})
                    </h3>
                    <button
                      onClick={clearAllFiles}
                      disabled={batchUploading}
                      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      清空列表
                    </button>
                  </div>
                </div>
                <div className="bg-white overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {batchFiles.map((fileWithStatus, index) => (
                      <li key={index} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {fileWithStatus.file.name}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                fileWithStatus.status === 'success'
                                  ? 'bg-green-100 text-green-800'
                                  : fileWithStatus.status === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : fileWithStatus.status === 'uploading'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {fileWithStatus.status === 'success' && '✓ 成功'}
                                {fileWithStatus.status === 'error' && '✗ 失败'}
                                {fileWithStatus.status === 'uploading' && '⏳ 上传中...'}
                                {fileWithStatus.status === 'pending' && '⏸ 待上传'}
                              </span>
                            </div>
                            {fileWithStatus.error && (
                              <p className="mt-1 text-sm text-red-600">{fileWithStatus.error}</p>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <button
                              onClick={() => removeFile(index)}
                              disabled={batchUploading}
                              className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50"
                            >
                              移除
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 上传结果 */}
            {batchResult && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className={`p-4 rounded-md mb-4 ${
                  batchResult.summary.failed === 0
                    ? 'bg-green-50 text-green-800'
                    : 'bg-yellow-50 text-yellow-800'
                }`}>
                  <p className="font-medium">
                    批量上传完成！
                  </p>
                  <p className="mt-1">
                    总计: {batchResult.summary.total} |
                    成功: {batchResult.summary.succeeded} |
                    失败: {batchResult.summary.failed}
                  </p>
                </div>
                {batchResult.summary.failed === 0 && (
                  <p className="text-sm text-gray-600">正在返回管理页面...</p>
                )}
              </div>
            )}

            {/* 上传进度 */}
            {batchUploading && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">上传进度</span>
                  <span className="text-sm text-gray-500">
                    {uploadProgress.completed} / {uploadProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            {batchFiles.length > 0 && !batchResult && (
              <div className="flex justify-end space-x-3">
                <Link
                  href="/admin"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </Link>
                <button
                  onClick={handleBatchUpload}
                  disabled={batchUploading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {batchUploading ? '上传中...' : '开始批量上传'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 上传说明 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">上传说明</h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>仅支持SVG格式的图标文件</li>
            <li>文件大小不能超过5MB</li>
            <li>批量上传最多支持50个文件</li>
            <li>上传后会自动进行AI分析,添加标签和分类</li>
            <li>重复的图标(内容相同)将被拒绝</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
