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

        // Массив для хранения всех кнопок
        const buttons = []

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
                button.style.transform = 'scale(0.98)'
            })

            button.addEventListener('mouseup', () => {
                button.style.transform = 'scale(1)'
            })

            button.addEventListener('click', (e) => {
                e.stopPropagation()
                onClick()
                // Немедленное обновление всех кнопок
                setTimeout(updateAllButtons, 0)
            })

            // Начальное состояние
            updateActive()

            // Сохраняем кнопку в массив
            buttons.push({ button, updateActive, label })

            return button
        }

        // Создаем кнопки
        container.appendChild(createToolButton('Рисовать', '✏',
            () => setState({ tool: 'draw' }),
            () => getState().tool === 'draw'
        ))

        container.appendChild(createToolButton('Стереть', '🧽',
            () => setState({ tool: 'erase' }),
            () => getState().tool === 'erase'
        ))

        container.appendChild(createToolButton('Сетка', '⬚',
            () => setState({ grid: !getState().grid }),
            () => getState().grid
        ))

        container.appendChild(createToolButton('Привязка', '🧲',
            () => setState({ snapping: !getState().snapping }),
            () => getState().snapping
        ))

        el.appendChild(container)

        // Функция для обновления всех кнопок
        function updateAllButtons() {
            buttons.forEach(btn => {
                btn.updateActive()
            })
        }

        // Подписка на изменения состояния
        const unsubscribe = subscribe(() => {
            requestAnimationFrame(updateAllButtons)
        })

        // Возвращаем функцию очистки
        return () => {
            if (unsubscribe) unsubscribe()
        }
    }
})