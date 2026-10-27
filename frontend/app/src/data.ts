export interface Game {
  id: string
  title: string
  category: string
  description: string
  controls: string[]
  duration?: string
  players?: string
  buildUrl: string
  thumbnailUrl?: string
  featured?: boolean
  isNew?: boolean
}

export type SortMode = 'alpha' | 'new'

export const DEFAULT_SORT: SortMode = 'alpha'
