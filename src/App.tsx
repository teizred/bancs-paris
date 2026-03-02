import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // si le container existe pas on return direct
    if (!mapContainer.current) return

    // je crée la map avec les coordonnées de Paris
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [2.3488, 48.8534], // coordonnées de Paris
      zoom: 12
    })

    // quand la map est chargé je fetch les bancs
    map.on('load', async () => {
      let allBancs: any[] = [] // je stock tout les bancs ici
      let offset = 0
      const limit = 100 // l'api me donne que 100 resultats a la fois

      // premier fetch pour avoir le total
      const firstRes = await fetch(
        `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/records?limit=${limit}&offset=0`
      )
      const firstData = await firstRes.json()
      const total = firstData.total_count // le nombre total de bancs
      allBancs = [...firstData.results]
      offset = limit

      // je boucle pour recuperer tout les bancs (max 9900 sinon l'api bug)
      while (offset < Math.min(total, 9900)) {
        const res = await fetch(
          `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/plan-de-voirie-mobiliers-urbains-jardinieres-bancs-corbeilles-de-rue/records?limit=${limit}&offset=${offset}`
        )
        const data = await res.json()
        allBancs = [...allBancs, ...data.results] // j'ajoute les nouveaux bancs au tableau
        offset += limit
      }

      // je transforme les données en geojson pour que mapbox comprend
      // (GeoJSON c'est un format de données (basé sur JSON) qui sert à représenter des éléments géographiques sur une carte.)
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: allBancs
          .filter(b => b.geo_point_2d) // je garde que ceux qui ont des coordonnées
          .map(b => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [b.geo_point_2d.lon, b.geo_point_2d.lat]
            },
            properties: b
          }))
      }

      // j'ajoute les bancs comme source sur la map
      map.addSource('bancs', { type: 'geojson', data: geojson })

      // je les affiche en cercles vert
      map.addLayer({
        id: 'bancs-layer',
        type: 'circle',
        source: 'bancs',
        paint: {
          'circle-radius': 5,
          'circle-color': '#22c55e',
          'circle-opacity': 0.8
        }
      })
    })
  }, []) // le tableau vide c'est pour que ça se lance qu'une seule fois

  return (
    <div className="w-screen h-screen">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}