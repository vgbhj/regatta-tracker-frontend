import http from 'node:http'

const port = Number(process.env.PORT ?? 3000)
const startedAt = '2026-05-04T09:00:00.000Z'
const durationMs = 42 * 60 * 1000
const stepSec = 30

const marks = [
  { id: 'start-pin', name: 'Start pin', type: 'start', lat: 43.5562, lon: 39.7068 },
  { id: 'start-committee', name: 'Committee boat', type: 'start', lat: 43.5552, lon: 39.7084 },
  { id: 'windward', name: 'Windward mark', type: 'turning', lat: 43.5734, lon: 39.7278 },
  { id: 'offset', name: 'Offset mark', type: 'turning', lat: 43.5716, lon: 39.7321 },
  { id: 'leeward-gate-left', name: 'Leeward gate L', type: 'turning', lat: 43.551, lon: 39.7153 },
  { id: 'leeward-gate-right', name: 'Leeward gate R', type: 'turning', lat: 43.5524, lon: 39.7182 },
  { id: 'finish', name: 'Finish line', type: 'finish', lat: 43.5641, lon: 39.7196 },
]

const yachts = [
  { id: 'r49-01', name: '49er Alpha', sailNumber: 'RUS 49', className: '49er' },
  { id: 'r49-02', name: 'Melges Delta', sailNumber: 'RUS 704', className: 'Melges 20' },
  { id: 'r49-03', name: 'J70 Bora', sailNumber: 'RUS 1170', className: 'J/70' },
  { id: 'r49-04', name: 'SB20 Vega', sailNumber: 'RUS 220', className: 'SB20' },
]

const course = [
  { lat: 43.5558, lon: 39.7076 },
  { lat: 43.5628, lon: 39.7157 },
  { lat: 43.5734, lon: 39.7278 },
  { lat: 43.5716, lon: 39.7321 },
  { lat: 43.5524, lon: 39.7182 },
  { lat: 43.551, lon: 39.7153 },
  { lat: 43.5641, lon: 39.7196 },
]

const race = {
  id: 'sochi-olympic-waters-demo',
  name: 'Sochi Olympic waters demo regatta',
  startedAt,
  durationMs,
  yachts: yachts.map((yacht) => yacht.id),
  marks,
}

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'access-control-allow-origin': '*',
  })
  res.end(payload)
}

function text(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': '*',
  })
  res.end(body)
}

function notFound(res) {
  json(res, 404, { error: 'Not found' })
}

function interpolatePoint(points, progress) {
  const scaled = progress * (points.length - 1)
  const index = Math.min(Math.floor(scaled), points.length - 2)
  const local = scaled - index
  const a = points[index]
  const b = points[index + 1]

  return {
    lat: a.lat + (b.lat - a.lat) * local,
    lon: a.lon + (b.lon - a.lon) * local,
  }
}

function buildTrackPoint(progress, yachtIndex) {
  const base = interpolatePoint(course, progress)
  const tackPhase = progress * Math.PI * 13 + yachtIndex * 0.8
  const fleetPhase = progress * Math.PI * 4 + yachtIndex
  const lateralOffset = Math.sin(tackPhase) * (0.00042 + yachtIndex * 0.00005)
  const fleetOffset = (yachtIndex - 1.5) * 0.00018
  const gustOffset = Math.sin(fleetPhase) * 0.00014

  return {
    lat: base.lat + lateralOffset + fleetOffset,
    lon: base.lon + gustOffset - fleetOffset * 0.7,
  }
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function buildGpx() {
  const startMs = Date.parse(startedAt)
  const pointCount = Math.floor(durationMs / (stepSec * 1000)) + 1
  const tracks = yachts
    .map((yacht, yachtIndex) => {
      const points = Array.from({ length: pointCount }, (_, pointIndex) => {
        const progress = pointIndex / (pointCount - 1)
        const point = buildTrackPoint(progress, yachtIndex)
        const time = new Date(startMs + pointIndex * stepSec * 1000).toISOString()

        return [
          `      <trkpt lat="${point.lat.toFixed(7)}" lon="${point.lon.toFixed(7)}">`,
          `        <time>${time}</time>`,
          '      </trkpt>',
        ].join('\n')
      }).join('\n')

      return [
        '  <trk>',
        `    <name>${xmlEscape(yacht.name)}</name>`,
        '    <trkseg>',
        points,
        '    </trkseg>',
        '  </trk>',
      ].join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="RegattaTracker demo backend" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <metadata>',
    `    <name>${xmlEscape(race.name)}</name>`,
    `    <time>${startedAt}</time>`,
    '  </metadata>',
    tracks,
    '</gpx>',
    '',
  ].join('\n')
}

function raceMeta() {
  return {
    id: race.id,
    name: race.name,
    startedAt: race.startedAt,
    durationMs: race.durationMs,
    yachtCount: race.yachts.length,
  }
}

function analytics() {
  return {
    raceId: race.id,
    yachts: yachts.map((yacht, index) => ({
      yachtId: yacht.id,
      avgSpeedKnots: Number((6.2 + index * 0.3).toFixed(1)),
      maxSpeedKnots: Number((10.4 + index * 0.5).toFixed(1)),
      distanceNm: Number((4.6 + index * 0.15).toFixed(2)),
      tackCount: 11 + index,
    })),
  }
}

function liveTelemetry() {
  const now = Date.now()
  const progress = ((now / 1000) % (durationMs / 1000)) / (durationMs / 1000)

  return {
    raceId: race.id,
    timestamp: new Date(now).toISOString(),
    yachts: yachts.map((yacht, index) => {
      const point = buildTrackPoint(progress, index)
      return {
        yachtId: yacht.id,
        lat: point.lat,
        lon: point.lon,
        speed: 6.5 + index * 0.25,
        heading: (45 + progress * 270 + index * 11) % 360,
        updatedAt: new Date(now - index * 1400).toISOString(),
      }
    }),
  }
}

function handleRequest(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    res.end()
    return
  }

  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  if (url.pathname === '/health') {
    json(res, 200, { status: 'ok' })
    return
  }

  if (url.pathname === '/api/races') {
    json(res, 200, [raceMeta()])
    return
  }

  if (url.pathname === `/api/races/${race.id}`) {
    json(res, 200, race)
    return
  }

  if (url.pathname === `/api/races/${race.id}/track`) {
    text(res, 200, buildGpx(), 'application/gpx+xml; charset=utf-8')
    return
  }

  if (url.pathname === `/api/races/${race.id}/analytics`) {
    json(res, 200, analytics())
    return
  }

  if (url.pathname === `/api/races/${race.id}/live`) {
    json(res, 200, liveTelemetry())
    return
  }

  notFound(res)
}

const server = http.createServer(handleRequest)

server.listen(port, '0.0.0.0', () => {
  console.log(`Demo regatta backend is listening on http://0.0.0.0:${port}`)
})
