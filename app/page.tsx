'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export default function Page() {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [2.3488, 48.8534],
      zoom: 12
    })

    // je stocke les ids des bancs signalés en mémoire
    const signaledIds = new Set<number>()

    map.on('load', async () => {
      let allBancs: any[] = []
      let offset = 0
      const limit = 100

      const firstRes = await fetch(
        `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/records?limit=${limit}&offset=0`
      )
      const firstData = await firstRes.json()
      const total = firstData.total_count
      allBancs = [...firstData.results]
      offset = limit

      while (offset < Math.min(total, 9900)) {
        const res = await fetch(
          `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/records?limit=${limit}&offset=${offset}`
        )
        const data = await res.json()
        allBancs = [...allBancs, ...data.results]
        offset += limit
      }

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allBancs
          .filter(b => b.geo_point_2d)
          .map(b => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [b.geo_point_2d.lon, b.geo_point_2d.lat]
            },
            properties: { ...b, signale: false }
          }))
      }

      map.addSource('bancs', { type: 'geojson', data: geojson })

      // couleur verte ou rouge selon si le banc est signalé
      map.addLayer({
        id: 'bancs-layer',
        type: 'circle',
        source: 'bancs',
        paint: {
          'circle-radius': 5,
          'circle-color': [
            'case',
            ['==', ['get', 'signale'], true], '#ef4444', // rouge si signalé
            '#22c55e' // vert sinon
          ],
          'circle-opacity': 0.8
        }
      })

      map.on('click', 'bancs-layer', async (e) => {
        if (!e.features || !e.features[0]) return
        const props = e.features[0].properties
        const objectid = props?.objectid
        const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]
        const estSignale = signaledIds.has(objectid)

        const popup = new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`<div style="font-family: sans-serif; padding: 4px;">🪑 <strong>Banc</strong><br/><span style="color: gray;">Chargement...</span></div>`)
          .addTo(map)

        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&language=fr`
        )
        const data = await res.json()
        const adresse = data.features?.[0]?.place_name || 'Adresse inconnue'

        popup.setHTML(`
          <div style="font-family: sans-serif; padding: 6px; max-width: 200px;">
            <strong>${estSignale ? '🔴 Banc anti-SDF' : '🪑 Banc'}</strong><br/>
            <span style="font-size: 12px;">${adresse}</span><br/><br/>
            ${!estSignale ? `
              <button
                id="btn-signaler-${objectid}"
                style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px; width:100%"
              >
                ⚠️ Signaler comme anti-SDF
              </button>
            ` : `<span style="color:#ef4444; font-size:12px;">⚠️ Déjà signalé</span>`}
          </div>
        `)

        // j'attends que le bouton soit dans le DOM puis j'ajoute le click
        setTimeout(() => {
          const btn = document.getElementById(`btn-signaler-${objectid}`)
          if (!btn) return
          btn.addEventListener('click', () => {
            signaledIds.add(objectid)

            // je mets à jour la couleur du banc sur la carte
            const source = map.getSource('bancs') as mapboxgl.GeoJSONSource
            const currentData = geojson
            currentData.features = currentData.features.map(f =>
              f.properties?.objectid === objectid
                ? { ...f, properties: { ...f.properties, signale: true } }
                : f
            )
            source.setData(currentData)

            popup.setHTML(`
              <div style="font-family: sans-serif; padding: 6px;">
                <strong>🔴 Banc anti-SDF</strong><br/>
                <span style="font-size: 12px;">${adresse}</span><br/><br/>
                <span style="color:#ef4444; font-size:12px;">⚠️ Signalé !</span>
              </div>
            `)
          })
        }, 100)
      })

      map.on('mouseenter', 'bancs-layer', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'bancs-layer', () => {
        map.getCanvas().style.cursor = ''
      })
    })
  }, [])

  return (
    <div className="w-screen h-screen">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}
