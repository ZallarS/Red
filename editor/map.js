export const TILE_SIZE = 32
export const CHUNK_SIZE = 16 // 16x16 tiles

// ===== TILE STORAGE =====
const tiles = new Map()

// ===== CHUNKS =====
const chunks = new Map()
// key: "cx,cy" → { dirty, canvas, ctx }

function tileKey(x, y) {
    return `${x},${y}`
}

function chunkKey(cx, cy) {
    return `${cx},${cy}`
}

function getChunk(cx, cy) {
    const key = chunkKey(cx, cy)
    let c = chunks.get(key)
    if (!c) {
        const canvas = document.createElement('canvas')
        canvas.width = CHUNK_SIZE * TILE_SIZE
        canvas.height = CHUNK_SIZE * TILE_SIZE
        c = {
            cx,
            cy,
            dirty: true,
            canvas,
            ctx: canvas.getContext('2d')
        }
        chunks.set(key, c)
    }
    return c
}

function markChunkDirty(x, y) {
    const cx = Math.floor(x / CHUNK_SIZE)
    const cy = Math.floor(y / CHUNK_SIZE)
    getChunk(cx, cy).dirty = true
}

// ===== PUBLIC API =====

export function loadMap(data) {
    tiles.clear()
    chunks.clear()

    for (const k in data) {
        tiles.set(k, data[k])
    }
}

export function getTile(x, y) {
    return tiles.get(tileKey(x, y)) || 0
}

export function setTile(x, y, value) {
    const key = tileKey(x, y)

    if (value) {
        tiles.set(key, value)
    } else {
        tiles.delete(key)
    }

    markChunkDirty(x, y)
}

export function clearMap() {
    tiles.clear()
    chunks.clear()
}

// ===== CHUNK RENDERING =====

export function getVisibleChunks(camera, canvas) {
    const startX = Math.floor(camera.x / TILE_SIZE)
    const startY = Math.floor(camera.y / TILE_SIZE)

    const endX = Math.ceil(
        (camera.x + canvas.width / camera.zoom) / TILE_SIZE
    )
    const endY = Math.ceil(
        (camera.y + canvas.height / camera.zoom) / TILE_SIZE
    )

    const startCX = Math.floor(startX / CHUNK_SIZE)
    const startCY = Math.floor(startY / CHUNK_SIZE)
    const endCX = Math.floor(endX / CHUNK_SIZE)
    const endCY = Math.floor(endY / CHUNK_SIZE)

    const result = []

    for (let cy = startCY; cy <= endCY; cy++) {
        for (let cx = startCX; cx <= endCX; cx++) {
            result.push(getChunk(cx, cy))
        }
    }

    return result
}

export function redrawChunk(chunk) {
    if (!chunk.dirty) return

    const { cx, cy, ctx } = chunk
    ctx.clearRect(0, 0, chunk.canvas.width, chunk.canvas.height)
    ctx.fillStyle = '#444'

    const baseX = cx * CHUNK_SIZE
    const baseY = cy * CHUNK_SIZE

    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const tile = getTile(baseX + x, baseY + y)
            if (!tile) continue

            ctx.fillRect(
                x * TILE_SIZE,
                y * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
            )
        }
    }

    chunk.dirty = false
}
