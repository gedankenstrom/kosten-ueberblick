import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.join(__dirname, 'dist')
const dataDir = path.join(__dirname, 'data')
const dataFile = path.join(dataDir, 'shared-state.json')
const host = '0.0.0.0'
const port = Number(process.env.PORT || 9302)

const defaultState = {
  entries: [
    {
      id: crypto.randomUUID(),
      category: 'Wohnung',
      name: 'Kaltmiete',
      amount: 950,
      interval: 'monthly',
      partner: 'Vermieter',
      website: 'https://example.com',
      startDate: '2025-01-01',
      endDate: '',
      noticeMonths: 3,
      notes: 'Monatlich zum 1. fällig',
      entryType: 'shared',
    },
    {
      id: crypto.randomUUID(),
      category: 'Nebenkosten',
      name: 'Nebenkosten',
      amount: 220,
      interval: 'monthly',
      partner: 'Hausverwaltung',
      website: 'https://example.com',
      startDate: '2025-01-01',
      endDate: '',
      noticeMonths: 0,
      notes: 'Vorauszahlung',
      entryType: 'shared',
    },
    {
      id: crypto.randomUUID(),
      category: 'Energie',
      name: 'Strom',
      amount: 89,
      interval: 'monthly',
      partner: 'Stromanbieter',
      website: 'https://example.com',
      startDate: '2025-02-01',
      endDate: '2027-01-31',
      noticeMonths: 1,
      notes: '',
      entryType: 'shared',
    },
    {
      id: crypto.randomUUID(),
      category: 'Energie',
      name: 'Gas',
      amount: 76,
      interval: 'monthly',
      partner: 'Gasanbieter',
      website: 'https://example.com',
      startDate: '2025-02-01',
      endDate: '2026-12-31',
      noticeMonths: 1,
      notes: '',
      entryType: 'shared',
    },
    {
      id: crypto.randomUUID(),
      category: 'Telekommunikation',
      name: 'Internet',
      amount: 44.99,
      interval: 'monthly',
      partner: 'Provider',
      website: 'https://example.com',
      startDate: '2025-03-01',
      endDate: '2027-02-28',
      noticeMonths: 3,
      notes: 'Glasfaser 250 Mbit',
      entryType: 'shared',
    },
  ],
  categories: ['Wohnung', 'Nebenkosten', 'Energie', 'Telekommunikation'],
  personCount: 1,
}

function ensureState() {
  fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(defaultState, null, 2))
  }
}

function readState() {
  ensureState()
  try {
    const raw = fs.readFileSync(dataFile, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : defaultState.entries,
      categories: Array.isArray(parsed.categories) ? parsed.categories : defaultState.categories,
      personCount: typeof parsed.personCount === 'number' ? parsed.personCount : defaultState.personCount,
    }
  } catch {
    return defaultState
  }
}

function writeState(state) {
  ensureState()
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2))
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath)
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' })
    res.end(data)
  })
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/api/state' && req.method === 'GET') {
    return sendJson(res, 200, readState())
  }

  if (url.pathname === '/api/state' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}')
        const nextState = {
          entries: Array.isArray(parsed.entries) ? parsed.entries : [],
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          personCount: typeof parsed.personCount === 'number' ? parsed.personCount : 1,
        }
        writeState(nextState)
        sendJson(res, 200, { ok: true })
      } catch {
        sendJson(res, 400, { ok: false, error: 'invalid_json' })
      }
    })
    return
  }

  let requestedPath = url.pathname === '/' ? '/index.html' : url.pathname
  const filePath = path.join(distDir, requestedPath)

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return sendFile(res, filePath)
  }

  return sendFile(res, path.join(distDir, 'index.html'))
})

server.listen(port, host, () => {
  console.log(`Kosten-Überblick läuft auf http://${host}:${port}`)
})
