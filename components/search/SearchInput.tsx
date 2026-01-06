'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  onSearch: (query: string) => void
  placeholder?: string
  defaultValue?: string
  autoFocus?: boolean
}

export function SearchInput({
  onSearch,
  placeholder = '搜索图标...',
  defaultValue = '',
  autoFocus = false,
}: SearchInputProps) {
  const [query, setQuery] = useState(defaultValue)
  const [isTyping, setIsTyping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  useEffect(() => {
    // 清理定时器
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setIsTyping(true)

    // 防抖:用户停止输入 300ms 后执行搜索
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }

    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false)
      onSearch(value.trim())
    }, 300)
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsTyping(false)
    onSearch(query.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full p-4 pl-10 pr-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      {isTyping && (
        <div className="absolute mt-1 text-xs text-gray-500">正在搜索...</div>
      )}
    </form>
  )
}
