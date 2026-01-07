import { revertAction, applyAction } from './actions.js'

const undoStack = []
const redoStack = []

export function push(action) {
    undoStack.push(action)
    redoStack.length = 0
}

export function undo() {
    const a = undoStack.pop()
    if (!a) return null
    revertAction(a)
    redoStack.push(a)
    return a
}

export function redo() {
    const a = redoStack.pop()
    if (!a) return null
    applyAction(a)
    undoStack.push(a)
    return a
}
