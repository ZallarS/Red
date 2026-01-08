import { setState, getState, subscribe } from '../store.js'
import { registerPanelModule } from '../panels/panelRegistry.js'

registerPanelModule('tools', {
    title: 'Tools',

    render(el) {
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
    }
})
