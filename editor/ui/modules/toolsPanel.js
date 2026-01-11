import { setState, getState, subscribe } from '../store.js'
import { registerPanelModule } from '../panels/panelRegistry.js'

registerPanelModule('tools', {
    title: 'Инструменты',

    render(el) {
        const container = document.createElement('div')
        container.style.display = 'grid'
        container.style.gridTemplateColumns = '1fr 1fr'
        container.style.gap = '12px'

        function createToolButton(label, icon, onClick, isActive) {
            const button = document.createElement('button')
            button.className = 'tool-button'

            const iconSpan = document.createElement('span')
            iconSpan.textContent = icon
            iconSpan.style.fontSize = '20px'
            iconSpan.style.marginBottom = '8px'

            const labelSpan = document.createElement('span')
            labelSpan.textContent = label
            labelSpan.style.fontSize = '12px'
            labelSpan.style.color = '#888'

            const content = document.createElement('div')
            content.style.display = 'flex'
            content.style.flexDirection = 'column'
            content.style.alignItems = 'center'
            content.style.justifyContent = 'center'
            content.style.height = '100%'

            content.appendChild(iconSpan)
            content.appendChild(labelSpan)
            button.appendChild(content)

            Object.assign(button.style, {
                background: '#1a1a1a',
                border: '1px solid #222',
                borderRadius: '8px',
                color: '#fff',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                cursor: 'pointer',
                padding: '16px 8px',
                transition: 'all 0.2s ease',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            })

            button.addEventListener('mouseenter', () => {
                button.style.background = '#222'
                button.style.borderColor = '#333'
            })

            button.addEventListener('mouseleave', () => {
                if (!isActive()) {
                    button.style.background = '#1a1a1a'
                    button.style.borderColor = '#222'
                }
            })

            button.onclick = onClick

            // Update active state
            const updateActive = () => {
                if (isActive()) {
                    button.style.background = '#4a9eff'
                    button.style.borderColor = '#4a9eff'
                    button.style.color = '#fff'
                    labelSpan.style.color = '#fff'
                } else {
                    button.style.background = '#1a1a1a'
                    button.style.borderColor = '#222'
                    button.style.color = '#fff'
                    labelSpan.style.color = '#888'
                }
            }

            updateActive()
            return { button, updateActive }
        }

        const drawBtn = createToolButton('Рисовать', '✏', () => setState({ tool: 'draw' }), () => getState().tool === 'draw')
        const eraseBtn = createToolButton('Стереть', '🧽', () => setState({ tool: 'erase' }), () => getState().tool === 'erase')
        const gridBtn = createToolButton('Сетка', '⬚', () => setState({ grid: !getState().grid }), () => getState().grid)
        const snapBtn = createToolButton('Привязка', '🧲', () => setState({ snapping: !getState().snapping }), () => getState().snapping)

        container.appendChild(drawBtn.button)
        container.appendChild(eraseBtn.button)
        container.appendChild(gridBtn.button)
        container.appendChild(snapBtn.button)

        el.appendChild(container)

        // Subscribe to state changes
        const unsubscribe = subscribe(() => {
            drawBtn.updateActive()
            eraseBtn.updateActive()
            gridBtn.updateActive()
            snapBtn.updateActive()
        })

        return unsubscribe
    }
})