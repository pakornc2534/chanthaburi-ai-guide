import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import handler from './dist/server/index.js'

const port = Number(process.env.PORT) || 3000
const host = process.env.HOST || '0.0.0.0'

const app = new Hono()

app.use(
  '/assets/*',
  serveStatic({
    root: './dist/client',
    onFound: (_path, c) => {
      c.header('Cache-Control', 'public, max-age=31536000, immutable')
    },
  }),
)

app.all('*', (c) => handler.fetch(c.req.raw))

serve({ fetch: app.fetch, port, hostname: host }, (info) => {
  console.log(`TripChan listening on http://${host}:${info.port}`)
})
