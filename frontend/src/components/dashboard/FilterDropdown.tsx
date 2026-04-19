"use client"

type FilterOption = "all" | "recent" | "alphabetical"

type Props = {
  value: FilterOption
  onChange: (value: FilterOption) => void
}

export function FilterDropdown({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FilterOption)}
      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
    >
      <option value="all">All</option>
      <option value="recent">Recent</option>
      <option value="alphabetical">Alphabetical</option>
    </select>
  )
}

