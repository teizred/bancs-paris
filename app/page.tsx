// app/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useBancs } from '@/hooks/useBancs'
import SearchBar from '@/components/SearchBar'
import BancPanel from '@/components/BancPanel'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export default function Page() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const mapLoaded = useRef(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [selectedBanc, setSelectedBanc] = useState<{
    id: string
    lat: number
    lon: number
  } | null>(null)

  const { bancs, loading } = useBancs()

  // 1. Géolocalisation
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      () => {
        setLocationError(true)
        setUserLocation([2.3488, 48.8534])
      }
    )
  }, [])

  // 2. Init carte
  useEffect(() => {
    if (!mapContainer.current || !userLocation) return
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: userLocation,
      zoom: 14
    })

    if (!locationError) {
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(userLocation)
        .addTo(map.current)
    }

    map.current.on('load', () => {
      mapLoaded.current = true
    })

  }, [userLocation])

  // 3. Ajout des bancs
  useEffect(() => {
    if (!map.current || loading || bancs.length === 0) return

    function addBancsToMap() {
      if (!map.current) return

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: bancs.map(b => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [b.geo_point_2d.lon, b.geo_point_2d.lat]
          },
          properties: { objectid: b.objectid }
        }))
      }

      map.current.addSource('bancs', { type: 'geojson', data: geojson })

      map.current.addLayer({
        id: 'bancs-layer',
        type: 'circle',
        source: 'bancs',
        paint: {
          'circle-radius': 6,
          'circle-color': '#f97316',
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      })

      map.current.on('mouseenter', 'bancs-layer', () => {
        map.current!.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'bancs-layer', () => {
        map.current!.getCanvas().style.cursor = ''
      })

      map.current.on('click', 'bancs-layer', (e) => {
        if (!e.features?.[0]) return
        const props = e.features[0].properties
        if (!props) return
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]

        setSelectedBanc({
          id: String(props.objectid),
          lat: coords[1],
          lon: coords[0]
        })
      })
    }

    if (mapLoaded.current) {
      addBancsToMap()
    } else {
      map.current.on('load', addBancsToMap)
    }

  }, [bancs, loading])

  return (
    <div className="relative w-screen h-screen">

      <SearchBar
        onSelect={(coords) => {
          map.current?.flyTo({
            center: coords,
            zoom: 15,
            duration: 1500
          })
        }}
      />

      {loading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-full shadow text-sm text-gray-500">
          ⏳ Chargement des bancs...
        </div>
      )}

      {locationError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-full shadow text-sm text-gray-500">
          📍 Géolocalisation non disponible — Paris par défaut
        </div>
      )}

      <div ref={mapContainer} className="w-full h-full" />

      <BancPanel
        bancId={selectedBanc?.id ?? null}
        bancLat={selectedBanc?.lat ?? null}
        bancLon={selectedBanc?.lon ?? null}
        onClose={() => setSelectedBanc(null)}
      />

    </div>
  )
}