import { getTile, setTile } from './map.js'

export function createSetTileAction(x, y, tile) {
    const before = getTile(x, y)
    if (before === tile) return null

    return {
        type: 'setTile',
        x,
        y,
        before,
        after: tile
    }
}

export function applyAction(action) {
    if (!action) return

    switch (action.type) {
        case 'setTile':
            setTile(action.x, action.y, action.after)
            break
    }
}

export function revertAction(action) {
    if (!action) return

    switch (action.type) {
        case 'setTile':
            setTile(action.x, action.y, action.before)
            break
    }
}
