export const TILE_SIZE = 32

// ❗ ЕДИНСТВЕННОЕ состояние карты
const map = new Map()

export function loadMap(data) {
    map.clear()
    for (const key in data) {
        map.set(key, data[key])
    }
}

export function getTile(x, y) {
    return map.get(`${x},${y}`) || 0
}

export function setTile(x, y, value) {
    if (value) {
        map.set(`${x},${y}`, value)
    } else {
        map.delete(`${x},${y}`)
    }
}

export function clearMap() {
    map.clear()
}
