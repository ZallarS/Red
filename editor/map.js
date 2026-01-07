export const TILE_SIZE = 32

export const map = {
    tiles: new Map()
}

export function setTile(x, y, id) {
    const key = `${x},${y}`
    if (id === 0) map.tiles.delete(key)
    else map.tiles.set(key, id)
}

export function getTile(x, y) {
    return map.tiles.get(`${x},${y}`) ?? 0
}

export function loadMap(data) {
    map.tiles.clear()
    for (const [k, v] of Object.entries(data)) {
        map.tiles.set(k, v)
    }
}
