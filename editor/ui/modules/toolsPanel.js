import { setState, getState, subscribe } from '../store.js'
import { registerPanelModule } from '../panels/panelRegistry.js'

registerPanelModule('tools', {
    title: 'Инструменты',

    render(el) {
        const container = document.createElement('div')
        container.style.display = 'grid'
        container.style.gridTemplateColumns = '1fr 1fr'
        container.style.gap = '12px'
        container.style.padding = '8px'

        function createToolButton(label, icon, onClick, isActive) {
            const button = document.createElement('button')
            button.className = 'tool-button'
            button.setAttribute('aria-label', label)

            const iconSpan = document.createElement('span')
            iconSpan.textContent = icon
            iconSpan.style.fontSize = '20px'
            iconSpan.style.marginBottom = '8px'
            iconSpan.style.display = 'block'
            iconSpan.style.transition = 'color 0.2s ease'
            iconSpan.dataset.role = 'icon'

            const labelSpan = document.createElement('span')
            labelSpan.textContent = label
            labelSpan.style.fontSize = '12px'
            labelSpan.style.transition = 'color 0.2s ease'
            labelSpan.dataset.role = 'label'

            const content = document.createElement('div')
            content.style.display = 'flex'
            content.style.flexDirection = 'column'
            content.style.alignItems = 'center'
            content.style.justifyContent = 'center'
            content.style.height = '100%'
            content.style.gap = '4px'

            content.appendChild(iconSpan)
            content.appendChild(labelSpan)
            button.appendChild(content)

            // Базовые стили
            Object.assign(button.style, {
                background: '#1a1a1a',
                border: '2px solid #222',
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
                justifyContent: 'center',
                outline: 'none',
                position: 'relative'
            })

            // Функция обновления активного состояния
            const updateActive = () => {
                const active = isActive()
                const isDrawOrErase = label === 'Рисовать' || label === 'Стереть'

                if (active) {
                    // АКТИВНОЕ состояние
                    if (isDrawOrErase) {
                        // Для инструментов рисования - синий контур
                        button.style.background = '#1a1a1a'
                        button.style.borderColor = '#4a9eff'
                        button.style.boxShadow = '0 0 0 1px #4a9eff inset'
                        iconSpan.style.color = '#4a9eff'
                        labelSpan.style.color = '#4a9eff'
                    } else {
                        // Для переключателей (сетка/привязка) - синяя заливка
                        button.style.background = '#4a9eff'
                        button.style.borderColor = '#4a9eff'
                        button.style.boxShadow = 'none'
                        iconSpan.style.color = '#fff'
                        labelSpan.style.color = '#fff'
                    }
                } else {
                    // НЕАКТИВНОЕ состояние
                    button.style.background = '#1a1a1a'
                    button.style.borderColor = '#222'
                    button.style.boxShadow = 'none'
                    iconSpan.style.color = '#888'
                    labelSpan.style.color = '#888'
                }
            }

            // Hover эффекты
            button.addEventListener('mouseenter', () => {
                if (!isActive()) {
                    button.style.background = '#222'
                    button.style.borderColor = '#333'
                    iconSpan.style.color = '#ccc'
                    labelSpan.style.color = '#ccc'
                }
            })

            button.addEventListener('mouseleave', () => {
                if (!isActive()) {
                    button.style.background = '#1a1a1a'
                    button.style.borderColor = '#222'
                    iconSpan.style.color = '#888'
                    labelSpan.style.color = '#888'
                }
            })

            // Click эффект
            button.addEventListener('mousedown', () => {
                if (!isActive()) {
                    button.style.transform = 'scale(0.98)'
                }
            })

            button.addEventListener('mouseup', () => {
                button.style.transform = 'scale(1)'
            })

            button.addEventListener('click', (e) => {
                e.stopPropagation()
                onClick()
                // Немедленное обновление стилей после клика
                setTimeout(updateActive, 10)
            })

            // Начальное состояние
            updateActive()

            return {
                button,
                updateActive,
                getState: () => ({
                    isActive: isActive(),
                    label,
                    icon
                })
            }
        }

        // Создаем кнопки с улучшенной логикой определения активного состояния
        const drawBtn = createToolButton('Рисовать', '✏',
            () => setState({ tool: 'draw' }),
            () => getState().tool === 'draw'
        )

        const eraseBtn = createToolButton('Стереть', '🧽',
            () => setState({ tool: 'erase' }),
            () => getState().tool === 'erase'
        )

        const gridBtn = createToolButton('Сетка', '⬚',
            () => setState({ grid: !getState().grid }),
            () => getState().grid
        )

        const snapBtn = createToolButton('Привязка', '🧲',
            () => setState({ snapping: !getState().snapping }),
            () => getState().snapping
        )

        container.appendChild(drawBtn.button)
        container.appendChild(eraseBtn.button)
        container.appendChild(gridBtn.button)
        container.appendChild(snapBtn.button)

        el.appendChild(container)

        // Подписка на изменения состояния с дебаунсингом
        let updateTimeout = null
        const updateAllButtons = () => {
            if (updateTimeout) clearTimeout(updateTimeout)
            updateTimeout = setTimeout(() => {
                drawBtn.updateActive()
                eraseBtn.updateActive()
                gridBtn.updateActive()
                snapBtn.updateActive()
                updateTimeout = null
            }, 10)
        }

        const unsubscribe = subscribe(updateAllButtons)

        // Возвращаем функцию очистки
        return () => {
            if (updateTimeout) clearTimeout(updateTimeout)
            if (unsubscribe) unsubscribe()
        }
    }
})