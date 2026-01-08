import { setState, getState } from './store.js'
import { createToolbar } from './toolbar.js'
import { wrapUsersPanel } from './usersPanel.js'

const UI_KEY = 'editor-ui-state'

export function restoreUI() {
    try {
        const s = JSON.parse(localStorage.getItem(UI_KEY))
        if (!s) return
        setState(s)
    } catch {}
}

export function saveUI() {
    localStorage.setItem(UI_KEY, JSON.stringify(getState()))
}

export function initUI(usersEl) {
    restoreUI()
    createToolbar()
    wrapUsersPanel(usersEl)
}
