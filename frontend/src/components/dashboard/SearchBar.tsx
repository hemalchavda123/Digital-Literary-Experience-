"use client"

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder }: Props) {
  return (
    <div className="w-full max-w-xl">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search projects"}
        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>
  )
}

