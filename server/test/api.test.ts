import { describe, expect, it } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildServer } from '../src/app.js'

// Gerçek Games klasörünü kullan (zeroshoot manifest'i orada)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const gamesDir = path.join(repoRoot, 'Games')

function makeApp() {
  const dbPath = path.join(mkdtempSync(path.join(tmpdir(), 'zerogame-test-')), 'test.db')
  // siteDist: '' → testte statik site mount atlanır
  return buildServer({ dbPath, gamesDir, siteDist: '', logger: false })
}

describe('GET /api/health', () => {
  it('ok:true ve oyun sayısını döner', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, games: 1 })
    await app.close()
  })
})

describe('GET /api/games', () => {
  it('zeroshoot manifestini döner', async () => {
    const app = await makeApp()
    const res = await app.inject({ method: 'GET', url: '/api/games' })
    expect(res.statusCode).toBe(200)
    const games = res.json()
    expect(games).toHaveLength(1)
    expect(games[0]).toMatchObject({ id: 'zeroshoot', title: 'ZeroShoot', featured: true })
    expect(games[0].controls.length).toBeGreaterThan(0)
    await app.close()
  })

  it('id ile tek oyun döner; bilinmeyen id 404', async () => {
    const app = await makeApp()
    const ok = await app.inject({ method: 'GET', url: '/api/games/zeroshoot' })
    expect(ok.statusCode).toBe(200)
    expect(ok.json().id).toBe('zeroshoot')
    const missing = await app.inject({ method: 'GET', url: '/api/games/yok-boyle-oyun' })
    expect(missing.statusCode).toBe(404)
    await app.close()
  })
})

describe('scores API', () => {
  it('skor ekler, sıralama ve rank döner', async () => {
    const app = await makeApp()
    const first = await app.inject({
      method: 'POST', url: '/api/games/zeroshoot/scores',
      payload: { player: 'Zeroci', score: 5000, dist: 4200 },
    })
    expect(first.statusCode).toBe(201)
    expect(first.json()).toMatchObject({ ok: true, rank: 1 })

    const second = await app.inject({
      method: 'POST', url: '/api/games/zeroshoot/scores',
      payload: { player: 'Rakip', score: 1500 },
    })
    expect(second.json()).toMatchObject({ ok: true, rank: 2 })

    const top = await app.inject({ method: 'GET', url: '/api/games/zeroshoot/scores?limit=2' })
    expect(top.statusCode).toBe(200)
    const rows = top.json()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ player: 'Zeroci', score: 5000 })
    expect(rows[1]).toMatchObject({ player: 'Rakip', score: 1500 })
    await app.close()
  })

  it('geçersiz payload 400 döner', async () => {
    const app = await makeApp()
    const bad = await app.inject({
      method: 'POST', url: '/api/games/zeroshoot/scores',
      payload: { player: '', score: -5 },
    })
    expect(bad.statusCode).toBe(400)
    const huge = await app.inject({
      method: 'POST', url: '/api/games/zeroshoot/scores',
      payload: { player: 'X'.repeat(40), score: 10 },
    })
    expect(huge.statusCode).toBe(400)
    await app.close()
  })

  it('bilinmeyen oyuna skor 404 döner', async () => {
    const app = await makeApp()
    const res = await app.inject({
      method: 'POST', url: '/api/games/yok/scores',
      payload: { player: 'A', score: 10 },
    })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})
