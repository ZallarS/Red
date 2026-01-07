import { setTile, getTile } from './map.js'

export function createSetTileAction(x, y, after) {
    const before = getTile(x, y)
    if (before === after) return null

    return { type: 'setTile', x, y, before, after }
}

export function applyAction(action) {
    if (!action) return

    if (action.type === 'brush') {
        action.actions.forEach(applyAction)
        return
    }

    if (action.type === 'setTile') {
        setTile(action.x, action.y, action.after)
    }
}

export function revertAction(action) {
    if (!action) return

    if (action.type === 'brush') {
        [...action.actions].reverse().forEach(revertAction)
        return
    }

    if (action.type === 'setTile') {
        setTile(action.x, action.y, action.before)
    }
}
