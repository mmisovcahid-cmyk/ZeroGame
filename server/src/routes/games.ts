import type { FastifyInstance } from 'fastify'
import { sortManifests, type GameManifest } from '../manifest.js'

export function gameRoutes(app: FastifyInstance, getManifests: () => GameManifest[]) {
  app.get('/api/games', async () => sortManifests(getManifests()))

  app.get('/api/games/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const found = getManifests().find((game) => game.id === id)
    if (!found) {
      return reply.status(404).send({ error: 'Oyun bulunamadı' })
    }
    return found
  })

  app.get('/api/health', async () => ({
    ok: true,
    uptime: Number(process.uptime().toFixed(1)),
    games: getManifests().length,
  }))
}
