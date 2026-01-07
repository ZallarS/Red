import { getState, setState, subscribe } from './store.js'

export function wrapUsersPanel(usersEl) {
    const panel = document.createElement('div')
    Object.assign(panel.style, {
        position: 'fixed',
        right: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.6)',
        padding: '6px',
        borderRadius: '6px',
        zIndex: 3000
    })

    const title = document.createElement('div')
    title.textContent = 'Users'
    title.style.cursor = 'pointer'
    title.style.marginBottom = '4px'
    title.onclick = () => {
        setState({ panels: { users: !getState().panels.users } })
    }

    usersEl.parentNode.insertBefore(panel, usersEl)
    panel.append(title, usersEl)

    subscribe(state => {
        usersEl.style.display = state.panels.users ? 'block' : 'none'
    })
}
