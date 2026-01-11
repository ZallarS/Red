import { subscribe, setState } from '../store.js'
import { getPanelModule, getAllModules } from './panelRegistry.js'

// 🔥 Объявляем panelContainers на уровне модуля, ПЕРЕД функциями
const panelContainers = new Map()

export function createPanelContainer(side) {
    const root = document.createElement('div')
    const edge = document.createElement('div')

    // ===== PANEL ROOT =====
    Object.assign(root.style, {
        position: 'fixed',
        top: '0',
        [side]: '0',
        width: '280px',
        height: '100%',
        background: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 3000,
        borderRight: side === 'left' ? '1px solid #222' : 'none',
        borderLeft: side === 'right' ? '1px solid #222' : 'none',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        transition: 'transform 0.2s ease' // Анимация открытия/закрытия
    })

    // ===== EDGE TOGGLE =====
    Object.assign(edge.style, {
        position: 'fixed',
        top: '50%',
        [side]: '0',
        transform: 'translateY(-50%)',
        width: '20px',
        height: '60px',
        background: '#1a1a1a',
        color: '#888',
        cursor: 'pointer',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3001,
        fontSize: '12px',
        userSelect: 'none',
        border: '1px solid #222',
        borderRadius: side === 'left' ? '0 4px 4px 0' : '4px 0 0 4px',
        transition: 'all 0.2s ease'
    })

    edge.textContent = side === 'left' ? '▶' : '◀'

    edge.addEventListener('mouseenter', () => {
        edge.style.background = '#222'
        edge.style.color = '#fff'
    })

    edge.addEventListener('mouseleave', () => {
        edge.style.background = '#1a1a1a'
        edge.style.color = '#888'
    })

    // ===== HEADER =====
    const header = document.createElement('div')
    Object.assign(header.style, {
        padding: '20px 16px 12px 16px',
        borderBottom: '1px solid #222',
        background: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    })

    const titleRow = document.createElement('div')
    titleRow.style.display = 'flex'
    titleRow.style.justifyContent = 'space-between'
    titleRow.style.alignItems = 'center'

    const title = document.createElement('div')
    title.style.fontWeight = '600'
    title.style.fontSize = '16px'
    title.style.color = '#fff'

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.background = 'none'
    closeBtn.style.border = 'none'
    closeBtn.style.color = '#888'
    closeBtn.style.fontSize = '20px'
    closeBtn.style.cursor = 'pointer'
    closeBtn.style.width = '24px'
    closeBtn.style.height = '24px'
    closeBtn.style.display = 'flex'
    closeBtn.style.alignItems = 'center'
    closeBtn.style.justifyContent = 'center'
    closeBtn.style.borderRadius = '4px'
    closeBtn.style.transition = 'all 0.2s ease'

    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#222'
        closeBtn.style.color = '#fff'
    })

    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none'
        closeBtn.style.color = '#888'
    })

    titleRow.append(title, closeBtn)

    // ===== TABS CONTAINER =====
    const tabsContainer = document.createElement('div')
    tabsContainer.style.display = 'flex'
    tabsContainer.style.gap = '4px'
    tabsContainer.style.overflowX = 'auto'
    tabsContainer.style.paddingBottom = '2px'

    header.appendChild(titleRow)
    header.appendChild(tabsContainer)

    // ===== CONTENT =====
    const content = document.createElement('div')
    Object.assign(content.style, {
        flex: '1',
        overflow: 'auto',
        padding: '16px'
    })

    root.append(header, content)

    function toggle(open) {
        setState({
            panels: {
                [side]: { open }
            }
        })

        // При открытии/закрытии панели запускаем событие для обновления позиции дебага
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('panel-state-change', {
                detail: { side, open }
            }))
        }, 10)
    }

    closeBtn.onclick = () => toggle(false)
    edge.onclick = () => toggle(true)

    let cleanupFunction = null

    // Функция для создания табов
    function createTabs(panelState) {
        // Очищаем старые табы
        tabsContainer.innerHTML = ''

        // Получаем все модули и создаем табы только для правой панели
        if (side === 'right') {
            const modules = getAllModules()
            const rightPanelModules = ['users', 'events'] // Список модулей для правой панели

            rightPanelModules.forEach(moduleId => {
                const module = modules.get(moduleId)
                if (!module) return

                const tab = document.createElement('button')
                tab.className = 'panel-tab'
                tab.dataset.tabId = moduleId

                // Иконка для таба
                const icon = document.createElement('span')
                icon.style.marginRight = '6px'
                icon.style.fontSize = '14px'

                if (moduleId === 'users') {
                    icon.textContent = '👥'
                    tab.textContent = 'Пользователи'
                } else if (moduleId === 'events') {
                    icon.textContent = '📝'
                    tab.textContent = 'События'
                }

                tab.prepend(icon)

                // Стили таба
                Object.assign(tab.style, {
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: panelState.active === moduleId ? '#fff' : '#888',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: panelState.active === moduleId ? '600' : '400',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    flexShrink: '0',
                    display: 'flex',
                    alignItems: 'center'
                })

                tab.addEventListener('mouseenter', () => {
                    if (panelState.active !== moduleId) {
                        tab.style.background = '#222'
                        tab.style.color = '#ccc'
                    }
                })

                tab.addEventListener('mouseleave', () => {
                    if (panelState.active !== moduleId) {
                        tab.style.background = 'transparent'
                        tab.style.color = '#888'
                    }
                })

                // Активный таб
                if (panelState.active === moduleId) {
                    tab.style.background = '#4a9eff'
                    tab.style.color = '#fff'
                }

                // Обработчик клика
                tab.onclick = () => {
                    setState({
                        panels: {
                            [side]: {
                                ...panelState,
                                active: moduleId
                            }
                        }
                    })
                }

                tabsContainer.appendChild(tab)
            })
        }

        // Для левой панели показываем только заголовок
        if (side === 'left') {
            tabsContainer.style.display = 'none'
        }
    }

    function render(state) {
        const panelState = state.panels[side]
        const module = getPanelModule(panelState.active)

        // panel visibility
        root.style.display = panelState.open ? 'flex' : 'none'
        edge.style.display = panelState.open ? 'none' : 'flex'

        if (!module) return

        title.textContent = side === 'left' ? module.title : 'Управление'

        // Обновляем табы
        createTabs(panelState)

        // 🔥 ОЧИЩАЕМ ПРЕДЫДУЩИЙ РЕНДЕР
        if (cleanupFunction) {
            console.log(`🧹 Очистка предыдущих ${side} панелей рендера`)
            cleanupFunction()
            cleanupFunction = null
        }

        content.innerHTML = ''

        // 🔥 РЕНДЕРИМ И СОХРАНЯЕМ ФУНКЦИЮ ОЧИСТКИ
        const cleanup = module.render(content)
        if (typeof cleanup === 'function') {
            cleanupFunction = cleanup
        }
    }

    // 🔥 ВЕШАЕМ ПОДПИСКУ
    const unsubscribeStore = subscribe(render)

    // 🔥 ОЧИСТКА ПРИ УДАЛЕНИИ КОНТЕЙНЕРА
    const cleanupContainer = () => {
        console.log(`🧹 Очистка ${side} контейнера панелей`)
        if (cleanupFunction) {
            cleanupFunction()
            cleanupFunction = null
        }
        if (unsubscribeStore) {
            unsubscribeStore()
        }

        // 🔥 Удаляем панели из DOM
        if (root.parentNode) {
            root.parentNode.removeChild(root)
        }
        if (edge.parentNode) {
            edge.parentNode.removeChild(edge)
        }

        // 🔥 Удаляем из Map
        panelContainers.delete(side)
    }

    document.body.appendChild(root)
    document.body.appendChild(edge)

    // 🔥 Сохраняем ссылки на элементы в Map
    panelContainers.set(side, { root, edge, cleanupContainer })

    // 🔥 ВОЗВРАЩАЕМ ФУНКЦИЮ ДЛЯ ОЧИСТКИ
    return cleanupContainer
}

// 🔥 Экспортируем функцию для удаления всех панелей
export function cleanupAllPanels() {
    console.log('🗑️ Удаляем все панели...')

    // Создаем копию массива, так как мы будем удалять элементы
    const sides = [...panelContainers.keys()]

    sides.forEach(side => {
        const container = panelContainers.get(side)
        if (container && container.cleanupContainer) {
            try {
                container.cleanupContainer()
                console.log(`✅ Удалена панель: ${side}`)
            } catch (e) {
                console.error(`❌ Ошибка при удалении панели ${side}:`, e)
            }
        }
    })

    // Очищаем Map после удаления всех панелей
    panelContainers.clear()

    console.log('✅ Все панели удалены')
}

// 🔥 Функция для проверки существования панели
export function hasPanel(side) {
    return panelContainers.has(side)
}

// 🔥 Функция для получения количества панелей
export function getPanelCount() {
    return panelContainers.size
}