// hooks/usePosts.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Post = {
  id: string
  created_at: string
  banc_id: string
  description: string | null
  photo_url: string | null
  author_name: string | null
}

export function usePosts(bancId: string | null) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!bancId) return

    async function fetchPosts() {
      setLoading(true)
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('banc_id', bancId)
        .order('created_at', { ascending: false })

      setPosts(data || [])
      setLoading(false)
    }

    fetchPosts()
  }, [bancId])

  return { posts, loading, setPosts }
}