'use client'

import { useState, useEffect, useMemo } from 'react'

interface ColorEditorProps {
  svgContent: string
  onSvgChange: (newSvg: string) => void
}

interface ColorInfo {
  value: string
  count: number
  type: 'fill' | 'stroke'
}

export default function ColorEditor({ svgContent, onSvgChange }: ColorEditorProps) {
  const [colors, setColors] = useState<ColorInfo[]>([])
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [newColor, setNewColor] = useState<string>('#000000')
  const [previewSvg, setPreviewSvg] = useState<string>(svgContent)

  // 解析SVG中的颜色
  useEffect(() => {
    const colorMap = new Map<string, ColorInfo>()

    // 提取fill颜色
    const fillMatches = svgContent.matchAll(/fill="([^"]+)"/g)
    for (const match of fillMatches) {
      const color = match[1]
      if (color && color !== 'none' && !color.startsWith('url(')) {
        const key = `fill-${color}`
        const existing = colorMap.get(key)
        colorMap.set(key, {
          value: color,
          count: (existing?.count || 0) + 1,
          type: 'fill',
        })
      }
    }

    // 提取stroke颜色
    const strokeMatches = svgContent.matchAll(/stroke="([^"]+)"/g)
    for (const match of strokeMatches) {
      const color = match[1]
      if (color && color !== 'none' && !color.startsWith('url(')) {
        const key = `stroke-${color}`
        const existing = colorMap.get(key)
        colorMap.set(key, {
          value: color,
          count: (existing?.count || 0) + 1,
          type: 'stroke',
        })
      }
    }

    const uniqueColors = Array.from(colorMap.values()).sort((a, b) => b.count - a.count)
    setColors(uniqueColors)
    setPreviewSvg(svgContent)
  }, [svgContent])

  // 替换颜色
  const replaceColor = (oldColor: string, newColor: string) => {
    let newSvg = svgContent

    if (selectedColor?.startsWith('fill')) {
      const regex = new RegExp(`fill="${oldColor}"`, 'g')
      newSvg = newSvg.replace(regex, `fill="${newColor}"`)
    } else if (selectedColor?.startsWith('stroke')) {
      const regex = new RegExp(`stroke="${oldColor}"`, 'g')
      newSvg = newSvg.replace(regex, `stroke="${newColor}"`)
    }

    setPreviewSvg(newSvg)
    onSvgChange(newSvg)
  }

  // 应用颜色更改
  const handleApplyColor = () => {
    if (!selectedColor || !newColor) return

    const colorInfo = colors.find((c) => `${c.type}-${c.value}` === selectedColor)
    if (!colorInfo) return

    replaceColor(colorInfo.value, newColor)
    setSelectedColor(null)
  }

  // 重置
  const handleReset = () => {
    setPreviewSvg(svgContent)
    onSvgChange(svgContent)
    setSelectedColor(null)
  }

  // 下载编辑后的SVG
  const handleDownload = () => {
    const blob = new Blob([previewSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'edited-icon.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* 颜色列表 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">检测到的颜色</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {colors.map((colorInfo) => {
            const key = `${colorInfo.type}-${colorInfo.value}`
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedColor(key)
                  setNewColor(colorInfo.value)
                }}
                className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors ${
                  selectedColor === key
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div
                  className="w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: colorInfo.value }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {colorInfo.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {colorInfo.type} ({colorInfo.count})
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 颜色编辑器 */}
      {selectedColor && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">编辑颜色</h3>
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="color-picker" className="block text-sm font-medium text-gray-700 mb-1">
                新颜色
              </label>
              <input
                id="color-picker"
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-20 h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="color-input" className="block text-sm font-medium text-gray-700 mb-1">
                颜色代码
              </label>
              <input
                id="color-input"
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleApplyColor}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              应用颜色
            </button>
            <button
              onClick={() => setSelectedColor(null)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          重置
        </button>
        <button
          onClick={handleDownload}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          下载SVG
        </button>
      </div>
    </div>
  )
}
