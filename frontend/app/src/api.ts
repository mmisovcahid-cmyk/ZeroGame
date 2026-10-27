import type { Game } from './data'

export async function fetchGames(signal?: AbortSignal): Promise<Game[]> {
  const res = await fetch('/api/games', { signal })
  if (!res.ok) throw new Error(`Katalog alınamadı (HTTP ${res.status})`)
  const data: unknown = await res.json()
  if (!Array.isArray(data)) throw new Error('Beklenmeyen katalog yanıtı')
  return data as Game[]
}
