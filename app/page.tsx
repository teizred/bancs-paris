// app/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export default function Page() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState(false)

  // 1. Géolocalisation au chargement
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude])
      },
      () => {
        // L'user a refusé ou la géoloc a échoué → on fallback sur Paris
        setLocationError(true)
        setUserLocation([2.3488, 48.8534])
      }
    )
  }, [])

  // 2. Init de la carte — on attend d'avoir la position
  useEffect(() => {
    if (!mapContainer.current || !userLocation) return
    if (map.current) return // évite de recréer la carte si déjà initialisée

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: userLocation,
      zoom: 14 // plus zoomé que avant, t'es centré sur toi
    })

    // Marqueur bleu "tu es ici"
    if (!locationError) {
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(userLocation)
        .addTo(map.current)
    }

    map.current.on('load', () => {
      // ici on ajoutera les bancs et la search bar
    })

  }, [userLocation]) // se déclenche quand la géoloc est prête

  return (
    <div className="relative w-screen h-screen">

      {/* Barre de recherche — on la codera après */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-80">
        <input
          type="text"
          placeholder="🔍 Rechercher une adresse..."
          className="w-full px-4 py-2 rounded-full shadow-lg border border-gray-200 bg-white text-sm outline-none"
        />
      </div>

      {/* Message si géoloc refusée */}
      {locationError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-full shadow text-sm text-gray-500">
          📍 Géolocalisation non disponible — Paris par défaut
        </div>
      )}

      {/* La carte */}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}