import { setState, getState, subscribe } from '../store.js'

// Регистрируем модуль в глобальном реестре
if (!window.__canvasverse_panelModules) {
    window.__canvasverse_panelModules = new Map()
}

window.__canvasverse_panelModules.set('tools', {
    title: 'Инструменты',
    // Инструменты доступны редакторам и админам, но не наблюдателям
    requiredRoles: ['admin', 'editor'],

    render(el) {
        console.log('🎨 Рендерим панель инструментов')

        const container = document.createElement('div')
        container.className = 'tools-panel-container'

        // Создаем инструменты
        const tools = [
            { id: 'draw', label: 'Рисовать', icon: '✏', isActive: () => getState().tool === 'draw' },
            { id: 'erase', label: 'Стереть', icon: '🧽', isActive: () => getState().tool === 'erase' },
            { id: 'grid', label: 'Сетка', icon: '⬚', isActive: () => getState().grid },
            { id: 'snapping', label: 'Привязка', icon: '🧲', isActive: () => getState().snapping }
        ]

        tools.forEach(tool => {
            const button = document.createElement('button')
            button.className = 'tool-button'
            button.title = tool.label

            const icon = document.createElement('div')
            icon.className = 'tool-icon'
            icon.textContent = tool.icon

            const label = document.createElement('div')
            label.className = 'tool-label'
            label.textContent = tool.label

            button.appendChild(icon)
            button.appendChild(label)

            // Обработчик клика
            button.addEventListener('click', () => {
                console.log(`🛠️ Выбран инструмент: ${tool.label}`)

                if (tool.id === 'draw' || tool.id === 'erase') {
                    setState({ tool: tool.id })
                } else if (tool.id === 'grid') {
                    setState({ grid: !getState().grid })
                } else if (tool.id === 'snapping') {
                    setState({ snapping: !getState().snapping })
                }
            })

            // Функция обновления состояния
            const updateButtonState = () => {
                const active = tool.isActive()
                button.classList.toggle('active', active)

                if (active) {
                    icon.style.color = '#4a9eff'
                    label.style.color = '#4a9eff'
                    if (tool.id === 'grid' || tool.id === 'snapping') {
                        button.style.background = '#4a9eff'
                        icon.style.color = '#fff'
                        label.style.color = '#fff'
                    }
                } else {
                    icon.style.color = '#888'
                    label.style.color = '#888'
                    button.style.background = '#1a1a1a'
                }
            }

            // Начальное состояние
            updateButtonState()

            // Добавляем в контейнер
            container.appendChild(button)

            // Сохраняем функцию обновления
            button._updateState = updateButtonState
        })

        el.appendChild(container)

        // Подписываемся на изменения состояния
        const unsubscribe = subscribe(() => {
            // Обновляем все кнопки при изменении состояния
            container.querySelectorAll('.tool-button').forEach(btn => {
                if (btn._updateState) {
                    btn._updateState()
                }
            })
        })

        return () => {
            if (unsubscribe) unsubscribe()
        }
    }
})