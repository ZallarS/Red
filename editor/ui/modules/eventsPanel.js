import { getState, subscribe, clearEvents, setEventsFilter } from '../store.js'
import { registerPanelModule } from '../panels/panelRegistry.js'

registerPanelModule('events', {
    title: 'События',

    render(container) {
        // Полностью очищаем контейнер
        container.innerHTML = ''

        // Создаем основные элементы
        const panel = document.createElement('div')
        panel.className = 'events-panel'

        // Добавляем стили непосредственно в элемент
        panel.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #0f0f0f;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        `

        // Хедер
        const header = document.createElement('div')
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid #222;
            background: #1a1a1a;
            flex-shrink: 0;
        `

        // Заголовок и счетчик
        const titleRow = document.createElement('div')
        titleRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        `

        const title = document.createElement('div')
        title.textContent = 'События'
        title.style.cssText = `
            color: #fff;
            font-size: 14px;
            font-weight: 600;
        `

        const counter = document.createElement('div')
        counter.className = 'events-counter'
        counter.textContent = '0/50'
        counter.style.cssText = `
            color: #888;
            font-size: 12px;
            font-family: monospace;
            background: #2a2a2a;
            padding: 2px 8px;
            border-radius: 4px;
        `

        titleRow.appendChild(title)
        titleRow.appendChild(counter)

        // Фильтры
        const filters = document.createElement('div')
        filters.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 12px;
        `

        const filterButtons = [
            { id: 'all', label: 'Все', emoji: '📋' },
            { id: 'actions', label: 'Действия', emoji: '🖌️' },
            { id: 'users', label: 'Пользователи', emoji: '👤' },
            { id: 'network', label: 'Сеть', emoji: '🌐' },
            { id: 'system', label: 'Система', emoji: '⚙️' },
            { id: 'error', label: 'Ошибки', emoji: '❌' }
        ]

        filterButtons.forEach(filter => {
            const btn = document.createElement('button')
            btn.dataset.filter = filter.id

            btn.style.cssText = `
                display: flex;
                align-items: center;
                gap: 4px;
                background: #2a2a2a;
                border: 1px solid #333;
                border-radius: 4px;
                color: #aaa;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                white-space: nowrap;
                flex-shrink: 0;
                font-family: 'Inter', sans-serif;
            `

            btn.innerHTML = `<span style="font-size: 12px">${filter.emoji}</span> ${filter.label}`

            btn.onclick = () => setEventsFilter(filter.id)
            filters.appendChild(btn)
        })

        // Кнопка очистки
        const clearBtn = document.createElement('button')
        clearBtn.style.cssText = `
            margin-left: auto;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 4px;
            color: #aaa;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
            flex-shrink: 0;
            font-family: 'Inter', sans-serif;
        `

        clearBtn.innerHTML = '🗑️ Очистить'
        clearBtn.onclick = clearEvents

        const clearContainer = document.createElement('div')
        clearContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
        `
        clearContainer.appendChild(clearBtn)

        header.appendChild(titleRow)
        header.appendChild(filters)
        header.appendChild(clearContainer)

        // Контейнер для списка событий
        const listContainer = document.createElement('div')
        listContainer.style.cssText = `
            flex: 1;
            overflow: hidden;
            position: relative;
        `

        // Список событий
        const eventsList = document.createElement('div')
        eventsList.className = 'events-list'
        eventsList.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow-y: auto;
            padding: 12px;
        `

        listContainer.appendChild(eventsList)

        panel.appendChild(header)
        panel.appendChild(listContainer)
        container.appendChild(panel)

        // Утилиты
        function formatTime(timestamp) {
            const date = new Date(timestamp)
            return date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        }

        function truncateText(text, maxLength = 120) {
            if (!text) return ''
            if (text.length <= maxLength) return text
            return text.substring(0, maxLength) + '...'
        }

        // Основная функция рендеринга
        let lastEventId = 0

        function renderEvents() {
            const state = getState()
            const { events, eventsFilter } = state.debug

            // Обновляем счетчик
            counter.textContent = `${events.length}/${state.debug.maxEvents}`

            // Фильтруем события
            const filteredEvents = eventsFilter === 'all'
                ? events
                : events.filter(event => event.category === eventsFilter)

            // Очищаем список
            eventsList.innerHTML = ''

            // Если событий нет
            if (filteredEvents.length === 0) {
                const emptyDiv = document.createElement('div')
                emptyDiv.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #666;
                    text-align: center;
                    padding: 40px 20px;
                `

                emptyDiv.innerHTML = `
                    <div style="font-size: 32px; margin-bottom: 12px; opacity: 0.5">📝</div>
                    <div style="font-size: 13px; margin-bottom: 4px">Нет событий</div>
                    <div style="font-size: 11px; color: #444">
                        ${eventsFilter !== 'all' ? 'Попробуйте другой фильтр' : 'События появятся здесь'}
                    </div>
                `

                eventsList.appendChild(emptyDiv)
                return
            }

            // Рендерим события
            filteredEvents.forEach(event => {
                const card = document.createElement('div')
                card.style.cssText = `
                    background: #1a1a1a;
                    border: 1px solid #222;
                    border-radius: 4px;
                    padding: 8px;
                    margin-bottom: 6px;
                    transition: all 0.15s ease;
                    cursor: pointer;
                    overflow: hidden;
                `

                // Шапка события
                const header = document.createElement('div')
                header.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                `

                const time = document.createElement('div')
                time.style.cssText = `
                    color: #666;
                    font-size: 11px;
                    font-family: monospace;
                    flex-shrink: 0;
                `
                time.textContent = formatTime(event.timestamp)

                const category = document.createElement('div')
                category.style.cssText = `
                    font-size: 10px;
                    font-weight: 600;
                    padding: 2px 6px;
                    border-radius: 3px;
                    text-transform: uppercase;
                    flex-shrink: 0;
                `

                // Цвет категории
                const categoryColors = {
                    action: 'background: rgba(74, 158, 255, 0.15); color: #4a9eff; border: 1px solid rgba(74, 158, 255, 0.3)',
                    user: 'background: rgba(32, 201, 151, 0.15); color: #20c997; border: 1px solid rgba(32, 201, 151, 0.3)',
                    network: 'background: rgba(255, 193, 7, 0.15); color: #ffc107; border: 1px solid rgba(255, 193, 7, 0.3)',
                    system: 'background: rgba(108, 117, 125, 0.15); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.3)',
                    error: 'background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3)'
                }

                category.style.cssText += `; ${categoryColors[event.category] || 'background: #2a2a2a; color: #aaa; border: 1px solid #333'}`
                category.textContent = event.category

                header.appendChild(time)
                header.appendChild(category)

                // Сообщение
                const message = document.createElement('div')
                message.style.cssText = `
                    color: #fff;
                    font-size: 12px;
                    line-height: 1.4;
                    word-wrap: break-word;
                    word-break: break-word;
                `
                message.textContent = truncateText(event.message)

                card.appendChild(header)
                card.appendChild(message)

                // Данные события (если есть)
                if (event.data) {
                    const dataDiv = document.createElement('div')
                    dataDiv.style.cssText = `
                        color: #888;
                        font-size: 11px;
                        font-family: monospace;
                        margin-top: 6px;
                        padding-top: 6px;
                        border-top: 1px solid #2a2a2a;
                        white-space: pre-wrap;
                        word-break: break-all;
                        max-height: 0;
                        overflow: hidden;
                        opacity: 0;
                        transition: all 0.2s ease;
                    `

                    try {
                        dataDiv.textContent = typeof event.data === 'object'
                            ? JSON.stringify(event.data, null, 2).substring(0, 200) + (JSON.stringify(event.data, null, 2).length > 200 ? '...' : '')
                            : String(event.data).substring(0, 200) + (String(event.data).length > 200 ? '...' : '')
                    } catch {
                        dataDiv.textContent = '[Не удалось отобразить данные]'
                    }

                    card.appendChild(dataDiv)

                    // Клик для развертывания
                    card.onclick = () => {
                        const isExpanded = card.dataset.expanded === 'true'
                        if (isExpanded) {
                            card.dataset.expanded = 'false'
                            dataDiv.style.maxHeight = '0'
                            dataDiv.style.opacity = '0'
                            card.style.background = '#1a1a1a'
                        } else {
                            card.dataset.expanded = 'true'
                            dataDiv.style.maxHeight = '200px'
                            dataDiv.style.opacity = '1'
                            card.style.background = '#222'
                        }
                    }
                }

                eventsList.appendChild(card)
            })

            // Обновляем последний ID
            if (filteredEvents.length > 0) {
                lastEventId = filteredEvents[0].id
            }

            // Обновляем активные кнопки фильтров
            filters.querySelectorAll('button').forEach(btn => {
                if (btn.dataset.filter === eventsFilter) {
                    btn.style.background = '#4a9eff'
                    btn.style.borderColor = '#4a9eff'
                    btn.style.color = '#fff'
                } else {
                    btn.style.background = '#2a2a2a'
                    btn.style.borderColor = '#333'
                    btn.style.color = '#aaa'
                }
            })
        }

        // Начальный рендер
        renderEvents()

        // Подписка на изменения
        const unsubscribe = subscribe(() => {
            requestAnimationFrame(renderEvents)
        })

        // Функция очистки
        return () => {
            if (unsubscribe) unsubscribe()
        }
    }
})