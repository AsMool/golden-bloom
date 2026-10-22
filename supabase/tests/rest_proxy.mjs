// Serves /rest/v1/* from the local PostgREST, like the Supabase API gateway does.
import http from 'node:http'

const target = { host: '127.0.0.1', port: 54330 }
const port = Number(process.env.PROXY_PORT ?? 54331)

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      })
      return res.end()
    }
    if (!req.url?.startsWith('/rest/v1')) {
      res.writeHead(404)
      return res.end()
    }
    const upstream = http.request(
      { ...target, method: req.method, path: req.url.slice('/rest/v1'.length) || '/', headers: { ...req.headers, host: `${target.host}:${target.port}`, 'x-forwarded-for': req.headers['x-test-ip'] ?? req.socket.remoteAddress } },
      (up) => {
        res.writeHead(up.statusCode ?? 502, { ...up.headers, 'access-control-allow-origin': '*' })
        up.pipe(res)
      },
    )
    upstream.on('error', () => {
      res.writeHead(502)
      res.end()
    })
    req.pipe(upstream)
  })
  .listen(port, () => console.log(`rest proxy on http://127.0.0.1:${port}`))
