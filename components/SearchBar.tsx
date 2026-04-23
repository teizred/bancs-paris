// components/SearchBar.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Suggestion = {
  id: string
  place_name: string
  center: [number, number]
}

type Props = {
  onSelect: (coords: [number, number]) => void
}

export default function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    // On attend 400ms après la dernière frappe avant d'appeler l'API
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&language=fr&country=fr&limit=5`
      )
      const data = await res.json()
      setSuggestions(data.features || [])
      setOpen(true)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleSelect(suggestion: Suggestion) {
    setQuery(suggestion.place_name)
    setSuggestions([])
    setOpen(false)
    onSelect(suggestion.center)
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-80">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Rechercher une adresse..."
        className="w-full px-4 py-2 rounded-full shadow-lg border border-gray-200 bg-white text-sm outline-none"
      />

      {open && suggestions.length > 0 && (
        <ul className="mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {suggestions.map((s) => (
            <li
              key={s.id}
              onClick={() => handleSelect(s)}
              className="px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
            >
              📍 {s.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}