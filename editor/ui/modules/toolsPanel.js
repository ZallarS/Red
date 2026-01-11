import { setState, getState, subscribe } from '../store.js'
import { registerPanelModule } from '../panels/panelRegistry.js'

registerPanelModule('tools', {
    title: 'Инстурменты',

    render(el) {
        function button(label, onClick) {
            const b = document.createElement('button')
            b.textContent = label
            b.onclick = onClick
            return b
        }

        const drawBtn = button('✏', () => setState({ tool: 'draw' }))
        const eraseBtn = button('🧽', () => setState({ tool: 'erase' }))
        const gridBtn = button('᎒᎒᎒', () => setState({ grid: !getState().grid }))
        const snapBtn = button('🧲', () => setState({ snapping: !getState().snapping }))

        el.append(drawBtn, eraseBtn, gridBtn, snapBtn)

        subscribe(state => {
            drawBtn.style.fontWeight = state.tool === '' ? 'bold' : 'normal'
            eraseBtn.style.fontWeight = state.tool === '' ? 'bold' : 'normal'
            gridBtn.textContent = state.grid ? '᎒᎒᎒' : '᎒᎒᎒(выкл.)'
            snapBtn.textContent = state.snapping ? '🧲' : '🧲(выкл.)'
        })
    }
})
