import { getState, setState, subscribe } from './store.js'

export function createToolbar() {
    const el = document.createElement('div')
    Object.assign(el.style, {
        position: 'fixed',
        left: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.6)',
        padding: '6px',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        zIndex: 4000
    })

    function button(label, onClick) {
        const b = document.createElement('button')
        b.textContent = label
        b.onclick = onClick
        return b
    }

    const drawBtn = button('✏ Draw', () => setState({ tool: 'draw' }))
    const eraseBtn = button('🧽 Erase', () => setState({ tool: 'erase' }))
    const gridBtn = button('# Grid', () => setState({ grid: !getState().grid }))
    const snapBtn = button('🧲 Snap', () => setState({ snapping: !getState().snapping }))

    el.append(drawBtn, eraseBtn, gridBtn, snapBtn)

    subscribe(state => {
        drawBtn.style.fontWeight = state.tool === 'draw' ? 'bold' : 'normal'
        eraseBtn.style.fontWeight = state.tool === 'erase' ? 'bold' : 'normal'
        gridBtn.textContent = state.grid ? '# Grid' : '# Grid (off)'
        snapBtn.textContent = state.snapping ? '🧲 Snap' : '🧲 Snap (off)'
    })

    document.body.appendChild(el)
}
