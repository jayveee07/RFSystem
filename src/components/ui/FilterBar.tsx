import React from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterDefinition {
  key: string
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface FilterBarProps {
  filters: FilterDefinition[]
}

export function FilterBar({ filters }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((f) => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="block rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
