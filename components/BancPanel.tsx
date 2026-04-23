// components/BancPanel.tsx
'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePosts } from '@/hooks/usePosts'

type Props = {
  bancId: string | null
  bancLat: number | null
  bancLon: number | null
  onClose: () => void
}

export default function BancPanel({ bancId, bancLat, bancLon, onClose }: Props) {
  const { posts, loading, setPosts } = usePosts(bancId)
  const [description, setDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!bancId) return null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  async function handleSubmit() {
    if (!file || !bancId || !bancLat || !bancLon) return
    setUploading(true)

    // 1. Upload la photo dans Supabase Storage
    const fileName = `${bancId}-${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file)

    if (uploadError) {
      console.error(uploadError)
      setUploading(false)
      return
    }

    // 2. Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    // 3. Insérer le post en DB
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        banc_id: bancId,
        banc_lat: bancLat,
        banc_lon: bancLon,
        description,
        photo_url: urlData.publicUrl,
        author_name: authorName || 'Anonyme'
      })
      .select()
      .single()

    if (!insertError && newPost) {
      setPosts(prev => [newPost, ...prev])
    }

    // Reset le formulaire
    setDescription('')
    setAuthorName('')
    setFile(null)
    setPreview(null)
    setUploading(false)
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">🪑 Ce banc</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>

      <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

        {/* Formulaire ajout */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">📸 Partager un moment</p>

          {/* Preview photo */}
          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full h-48 object-cover rounded-2xl" />
              <button
                onClick={() => { setFile(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-500 text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-orange-200 rounded-2xl flex flex-col items-center justify-center text-orange-400 hover:bg-orange-50 transition"
            >
              <span className="text-2xl">📷</span>
              <span className="text-sm mt-1">Ajouter une photo</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <input
            type="text"
            placeholder="Ton prénom (optionnel)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-300"
          />

          <textarea
            placeholder="Décris le moment... ☀️"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-300 resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="w-full py-3 bg-orange-400 hover:bg-orange-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium rounded-2xl transition text-sm"
          >
            {uploading ? '⏳ Envoi en cours...' : '✨ Partager ce moment'}
          </button>
        </div>

        {/* Posts existants */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">
            {loading ? 'Chargement...' : `${posts.length} moment${posts.length > 1 ? 's' : ''} partagé${posts.length > 1 ? 's' : ''}`}
          </p>

          {posts.map(post => (
            <div key={post.id} className="rounded-2xl overflow-hidden border border-gray-100">
              {post.photo_url && (
                <img src={post.photo_url} alt="moment" className="w-full h-48 object-cover" />
              )}
              <div className="p-3 space-y-1">
                {post.description && (
                  <p className="text-sm text-gray-700">{post.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {post.author_name} · {new Date(post.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}