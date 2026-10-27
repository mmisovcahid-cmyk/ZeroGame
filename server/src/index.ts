import { buildServer } from './app.js'

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '0.0.0.0'

await buildServer().then((app) => app.listen({ port, host }))
