import { setState, getState } from './store.js'
import { createToolbar } from './toolbar.js'
import { wrapUsersPanel } from './usersPanel.js'

const SESSION_KEY = 'editor-session'

export function restoreUI() {
    try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY))
        if (!s) return
        setState({
            tool: s.tool,
            grid: s.grid,
            snapping: s.snapping,
            panels: s.panels
        })
    } catch {}
}

export function saveUI(camera) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        ...getState(),
        camera
    }))
}

export function initUI(usersEl) {
    restoreUI()
    createToolbar()
    wrapUsersPanel(usersEl)
}
