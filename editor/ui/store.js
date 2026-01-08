const listeners = new Set()

const state = {
    tool: 'draw',
    grid: true,
    snapping: true,

    panels: {
        left: {
            open: true,
            active: 'tools'
        },
        right: {
            open: true,
            active: 'users'
        }
    }
}

export function getState() {
    return state
}

export function setState(patch) {
    if (patch.panels) {
        state.panels = {
            ...state.panels,
            ...patch.panels
        }
        delete patch.panels
    }

    Object.assign(state, patch)
    listeners.forEach(fn => fn(state))
}

export function subscribe(fn) {
    listeners.add(fn)
    fn(state)
    return () => listeners.delete(fn)
}
