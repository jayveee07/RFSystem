import React, { useEffect, useState } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounce?: number
}

export function SearchInput({ value, onChange, placeholder = 'Search...', debounce = 300 }: SearchInputProps) {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])
  useEffect(() => {
    const t = setTimeout(() => { if (local !== value) onChange(local) }, debounce)
    return () => clearTimeout(t)
  }, [local, debounce, onChange, value])

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  )
}
