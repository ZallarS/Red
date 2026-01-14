// editor/map.js

export const TILE_SIZE = 32
export const CHUNK_SIZE = 16

export const LOD_LEVELS = {
    FULL: 0,
    SIMPLE: 1,
    DOT: 2
}

// ===== TILE STORAGE =====
const tiles = new Map()

// ===== CHUNKS =====
// key → {
//   cx, cy,
//   canvases: Map<lod, { canvas, ctx }>,
//   dirtyLOD: Set<lod>
// }
const chunks = new Map()

function tileKey(x, y) {
    return `${x},${y}`
}

function chunkKey(cx, cy) {
    return `${cx},${cy}`
}

function createLODCanvas() {
    const canvas = document.createElement('canvas')
    canvas.width = CHUNK_SIZE * TILE_SIZE
    canvas.height = CHUNK_SIZE * TILE_SIZE
    return {
        canvas,
        ctx: canvas.getContext('2d')
    }
}

function getChunk(cx, cy) {
    const key = chunkKey(cx, cy)
    let c = chunks.get(key)

    if (!c) {
        c = {
            cx,
            cy,
            canvases: new Map(),
            dirtyLOD: new Set([
                LOD_LEVELS.FULL,
                LOD_LEVELS.SIMPLE,
                LOD_LEVELS.DOT
            ])
        }
        chunks.set(key, c)
    }
    return c
}

function markChunkDirtyAllLOD(x, y) {
    const cx = Math.floor(x / CHUNK_SIZE)
    const cy = Math.floor(y / CHUNK_SIZE)
    const chunk = getChunk(cx, cy)

    chunk.dirtyLOD.add(LOD_LEVELS.FULL)
    chunk.dirtyLOD.add(LOD_LEVELS.SIMPLE)
    chunk.dirtyLOD.add(LOD_LEVELS.DOT)
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

    if (value) tiles.set(key, value)
    else tiles.delete(key)

    markChunkDirtyAllLOD(x, y)
}

export function clearMap() {
    tiles.clear()
    chunks.clear()
}

// ===== VISIBILITY =====

export function getVisibleChunks(camera, canvas) {
    const startX = Math.floor(camera.x / TILE_SIZE)
    const startY = Math.floor(camera.y / TILE_SIZE)

    const endX = Math.ceil((camera.x + canvas.width / camera.zoom) / TILE_SIZE)
    const endY = Math.ceil((camera.y + canvas.height / camera.zoom) / TILE_SIZE)

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

// ===== CHUNK REDRAW (FIXED GEOMETRY FOR ALL LODs) =====

export function redrawChunkLOD(chunk, lod) {
    if (!chunk.dirtyLOD.has(lod)) return

    let entry = chunk.canvases.get(lod)
    if (!entry) {
        entry = createLODCanvas()
        chunk.canvases.set(lod, entry)
    }

    const { ctx, canvas } = entry
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const baseX = chunk.cx * CHUNK_SIZE
    const baseY = chunk.cy * CHUNK_SIZE

    // ВАЖНО: Цвет тайлов всегда одинаковый для всех ролей
    // Это гарантирует, что карта будет выглядеть одинаково для всех пользователей
    const TILE_COLOR = '#444' // Тёмно-серый цвет для тайлов

    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const tile = getTile(baseX + x, baseY + y)
            if (!tile) continue

            const px = x * TILE_SIZE
            const py = y * TILE_SIZE

            if (lod === LOD_LEVELS.FULL) {
                ctx.fillStyle = TILE_COLOR
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
            }

            else if (lod === LOD_LEVELS.SIMPLE) {
                ctx.fillStyle = 'rgba(68,68,68,0.6)' // TILE_COLOR с прозрачностью 0.6
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
            }

            else if (lod === LOD_LEVELS.DOT) {
                ctx.fillStyle = 'rgba(68,68,68,0.25)' // TILE_COLOR с прозрачностью 0.25
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
            }
        }
    }

    chunk.dirtyLOD.delete(lod)
}