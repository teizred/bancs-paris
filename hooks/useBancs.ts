// hooks/useBancs.ts
import { useEffect, useState } from 'react'

export type Banc = {
  objectid: number
  geo_point_2d: {
    lon: number
    lat: number
  }
}

export function useBancs() {
  const [bancs, setBancs] = useState<Banc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAllBancs() {
      let allBancs: Banc[] = []
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

      setBancs(allBancs.filter(b => b.geo_point_2d))
      setLoading(false)
    }

    fetchAllBancs()
  }, [])

  return { bancs, loading }
}