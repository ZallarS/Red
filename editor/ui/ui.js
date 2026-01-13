import { subscribe, getState, setState } from './store.js'
import { panelManager } from './panelManager.js'
import { PanelFactory } from './panelBase.js'

// Импорт конкретных панелей
import './modules/toolsPanel.js'
import './modules/usersPanel.js'
import './modules/settingsPanel.js'

let uiInitialized = false
let unsubscribeRole = null
let observer = null

// Глобальный реестр модулей панелей
if (!window.__canvasverse_panelModules) {
    window.__canvasverse_panelModules = new Map()
}

function applyGlobalStyles() {
    const styles = document.createElement('style')
    styles.id = 'editor-ui-styles'

    styles.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 0;
        }
        canvas.drawing-active {
            cursor: crosshair !important;
        }
        .role-owner {
            background: rgba(255, 107, 53, 0.1);
            color: #ff6b35;
            border: 1px solid rgba(255, 107, 53, 0.3);
        }

        .role-owner .owner-only {
            display: block !important;
        }

        canvas {
            cursor: default;
        }
        
        button {
            font-family: 'Inter', sans-serif;
            outline: none;
            border: none;
            cursor: pointer;
        }
        
        button:hover { opacity: 0.9; }
        button:active { transform: translateY(1px); }
        
        .users-list::-webkit-scrollbar { width: 6px; }
        .users-list::-webkit-scrollbar-track { background: transparent; }
        .users-list::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .users-list::-webkit-scrollbar-thumb:hover { background: #444; }
        
        [class*="panel"] { box-sizing: border-box; }
        
        #exit-room-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #2a2a2a;
            color: #fff;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            z-index: 10000;
            transition: all 0.2s ease;
        }
        
        #exit-room-btn:hover {
            background: #333;
            border-color: #555;
        }
        
        /* Стили для левой панели (инструменты) */
        .tools-panel-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 8px;
        }
        
        .tool-button {
            background: #1a1a1a;
            border: 2px solid #222;
            border-radius: 8px;
            color: #fff;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            cursor: pointer;
            padding: 16px 8px;
            transition: all 0.2s ease;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            outline: none;
            position: relative;
        }
        
        .tool-button:hover {
            background: #222;
            border-color: #333;
        }
        
        .tool-button.active {
            border-color: #4a9eff;
            background: #1a1a1a;
        }
        
        .tool-icon {
            font-size: 20px;
            margin-bottom: 8px;
            transition: color 0.2s ease;
        }
        
        .tool-label {
            font-size: 12px;
            transition: color 0.2s ease;
        }
        
        /* Стили для правой панели (пользователи) */
        .users-panel {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #0f0f0f;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }
        
        .users-list {
            max-height: calc(100vh - 200px) !important;
            min-height: 200px;
        }
        .user-item {
            min-height: auto !important;
            overflow: visible !important;
        }
    
        .user-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
    
        .user-role-select {
            width: 100% !important;
            box-sizing: border-box !important;
            margin-top: 8px;
        }
        .user-row {
            background: #1a1a1a;
            border: 1px solid #222;
            border-radius: 8px;
            padding: 12px;
            transition: all 0.2s ease;
        }
        
        .user-row:hover {
            background: #222;
            border-color: #333;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        
        .user-color {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #333;
        }
        
        .user-name {
            color: #fff;
            font-size: 14px;
            font-weight: 500;
        }
        
        .user-id {
            color: #888;
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 2px;
        }
        
        .user-role-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .role-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .role-admin {
            background: rgba(224, 180, 0, 0.1);
            color: #e0b400;
            border: 1px solid rgba(224, 180, 0, 0.3);
        }
        
        .role-editor {
            background: rgba(74, 158, 255, 0.1);
            color: #4a9eff;
            border: 1px solid rgba(74, 158, 255, 0.3);
        }
        
        .role-viewer {
            background: rgba(136, 136, 136, 0.1);
            color: #888;
            border: 1px solid rgba(136, 136, 136, 0.3);
        }
        
        .role-select {
            background: #2a2a2a;
            color: #fff;
            border: 1px solid #333;
            border-radius: 4px;
            padding: 6px 10px;
            font-size: 12px;
            font-family: 'Inter', sans-serif;
            cursor: pointer;
            min-width: 90px;
            transition: all 0.2s ease;
        }
        
        .role-select:focus {
            border-color: #4a9eff;
            outline: none;
        }
        
        .you-badge {
            background: rgba(74, 158, 255, 0.2);
            color: #4a9eff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            margin-left: 8px;
        }

        /* ИСПРАВЛЕНО: Табы с горизонтальным скроллом */
        .panel-tabs {
            display: flex;
            background: #1a1a1a;
            border-bottom: 1px solid #222;
            padding: 8px 12px;
            gap: 4px;
            overflow-x: auto;
            overflow-y: hidden;
            white-space: nowrap;
            scrollbar-width: thin;
            scrollbar-color: #444 #1a1a1a;
            -webkit-overflow-scrolling: touch;
        }
        
        .panel-tabs::-webkit-scrollbar {
            height: 4px;
        }
        
        .panel-tabs::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 2px;
        }
        
        .panel-tabs::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 2px;
        }
        
        .panel-tabs::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
        
        .panel-tab {
            padding: 8px 16px;
            background: transparent;
            color: #888;
            border: none;
            border-radius: 6px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
            min-width: fit-content;
        }
        
        .panel-tab:hover {
            background: #222;
            color: #ccc;
        }
        
        .panel-tab.active {
            background: #2a2a2a;
            color: #4a9eff;
        }
        
        .panel-tab-icon {
            font-size: 16px;
            flex-shrink: 0;
        }
        
        .panel-content {
            overflow-y: auto;
            overflow-x: hidden;
        }
         .role-select-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 8px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 6px;
        }
        
        .role-select-label {
            font-size: 12px;
            color: #ccc;
            margin-bottom: 4px;
        }
        
        /* Убираем старые стили для селектора в строке */
        .user-role-container .role-select {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        }
        
        /* Адаптивность для селекторов */
        @media (max-width: 768px) {
            .user-role-container {
                flex-direction: column;
                align-items: stretch;
            }
            
            .role-select {
                min-width: 100%;
                margin-top: 8px;
            }
        }
        /* Гарантируем видимость всех элементов */
        .user-name, .user-id {
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: normal !important;
        }
        
        @media (max-width: 768px) {
            .user-item {
                margin-bottom: 12px;
            }
            
            .user-name {
                font-size: 14px !important;
            }
            
            .user-role-select {
                font-size: 13px !important;
            }
        }
    `
    document.head.appendChild(styles)
}

function applyRoleToUI(role) {
    const body = document.body
    body.classList.remove('role-admin', 'role-editor', 'role-viewer')

    if (role === 'admin') body.classList.add('role-admin')
    else if (role === 'editor') body.classList.add('role-editor')
    else if (role === 'viewer') body.classList.add('role-viewer')

    console.log(`🎭 Роль UI обновлена: ${role}`)
}

// ===== PANEL MANAGEMENT =====
const panelContainers = new Map()

function createPanel(side) {
    const panel = document.createElement('div')
    const edge = document.createElement('div')

    // Основная панель
    Object.assign(panel.style, {
        position: 'fixed',
        top: '0',
        [side]: '0',
        width: '320px', // Увеличиваем ширину для настроек
        height: '100%',
        background: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 3000,
        borderRight: side === 'left' ? '1px solid #222' : 'none',
        borderLeft: side === 'right' ? '1px solid #222' : 'none',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        transition: 'transform 0.2s ease'
    })

    // Переключатель панели
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

    // Заголовок с табами для правой панели
    const header = document.createElement('div')
    header.style.cssText = `
        display: flex;
        flex-direction: column;
        background: #1a1a1a;
        border-bottom: 1px solid #222;
        flex-shrink: 0;
    `

    const titleRow = document.createElement('div')
    titleRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
    `

    const title = document.createElement('div')
    title.style.cssText = `
        font-weight: 600;
        font-size: 16px;
        color: #fff;
    `

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: #888;
        font-size: 20px;
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s ease;
    `

    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#222'
        closeBtn.style.color = '#fff'
    })

    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none'
        closeBtn.style.color = '#888'
    })

    titleRow.append(title, closeBtn)
    header.appendChild(titleRow)

    // Табы для правой панели
    let tabsContainer = null
    if (side === 'right') {
        tabsContainer = document.createElement('div')
        tabsContainer.className = 'panel-tabs'
        header.appendChild(tabsContainer)
    }

    // Контент
    const content = document.createElement('div')
    Object.assign(content.style, {
        flex: '1',
        overflow: 'auto',
        position: 'relative'
    })

    panel.append(header, content)

    // Управление панелью
    function toggle(open) {
        setState({
            panels: {
                [side]: { open }
            }
        })
    }

    closeBtn.onclick = () => toggle(false)
    edge.onclick = () => toggle(true)

    let cleanupFunction = null
    let currentModule = null

    // Функция для переключения между модулями
    function switchModule(moduleId) {
        if (currentModule === moduleId) return

        // Очищаем предыдущий рендер
        if (cleanupFunction) {
            cleanupFunction()
            cleanupFunction = null
        }

        content.innerHTML = ''

        // Получаем модуль из глобального реестра
        const module = window.__canvasverse_panelModules.get(moduleId)

        if (!module) {
            console.error(`❌ Модуль панели не найден: ${moduleId}`)
            return
        }

        // Обновляем заголовок
        title.textContent = module.title || 'Панель'

        // Рендерим модуль
        if (typeof module.render === 'function') {
            cleanupFunction = module.render(content)
        } else {
            console.error(`❌ Модуль ${moduleId} не имеет метода render`)
        }

        currentModule = moduleId

        // Обновляем состояние
        setState({
            panels: {
                [side]: {
                    open: true,
                    active: moduleId
                }
            }
        })
    }

    // НОВАЯ ФУНКЦИЯ: Фильтрация модулей по роли
    function filterModulesByRole(modules, userRole) {
        return modules.filter(moduleKey => {
            const module = window.__canvasverse_panelModules.get(moduleKey)
            if (!module) return false

            // Проверяем доступность модуля для роли
            if (module.requiredRoles && Array.isArray(module.requiredRoles)) {
                return module.requiredRoles.includes(userRole)
            } else if (module.requiredRole) {
                return module.requiredRole === userRole
            }
            return true
        })
    }

    // Рендер панели
    function renderPanel(state) {
        const panelState = state.panels[side]
        const moduleId = panelState.active || (side === 'left' ? 'tools' : 'users')
        const userRole = state.role || 'viewer' // Получаем роль пользователя

        // Видимость панели
        panel.style.display = panelState.open ? 'flex' : 'none'
        edge.style.display = panelState.open ? 'none' : 'flex'

        // Для правой панели рендерим табы с фильтрацией по роли
        if (side === 'right' && tabsContainer) {
            tabsContainer.innerHTML = ''

            // Получаем все модули кроме tools и фильтруем по роли
            const allModules = Array.from(window.__canvasverse_panelModules.keys())
                .filter(key => key !== 'tools') // Исключаем tools, так как он в левой панели

            // Фильтруем модули по роли пользователя
            const availableModules = filterModulesByRole(allModules, userRole)

            // Сортируем модули: пользователи и настройки первые, остальные после
            availableModules.sort((a, b) => {
                const order = ['users', 'settings']
                const indexA = order.indexOf(a)
                const indexB = order.indexOf(b)
                if (indexA !== -1 && indexB !== -1) return indexA - indexB
                if (indexA !== -1) return -1
                if (indexB !== -1) return 1
                return a.localeCompare(b)
            })

            // Если после фильтрации нет доступных модулей
            if (availableModules.length === 0) {
                tabsContainer.style.display = 'none'
                title.textContent = 'Нет доступных панелей'
                content.innerHTML = `
                    <div style="padding: 40px 20px; text-align: center; color: #888;">
                        <div style="font-size: 36px; margin-bottom: 16px; opacity: 0.5">🔒</div>
                        <div>Нет доступных панелей для вашей роли</div>
                        <div style="font-size: 12px; margin-top: 8px; opacity: 0.7">(${userRole})</div>
                    </div>
                `
                return
            }

            // Рендерим табы для доступных модулей
            availableModules.forEach(moduleKey => {
                const module = window.__canvasverse_panelModules.get(moduleKey)
                if (!module) return

                const tab = document.createElement('button')
                tab.className = `panel-tab ${moduleKey === moduleId ? 'active' : ''}`

                // Определяем иконку для модуля
                let icon = '📄'
                if (moduleKey === 'users') icon = '👥'
                else if (moduleKey === 'settings') icon = '⚙️'
                else if (module.icon) icon = module.icon

                tab.innerHTML = `
                    <span class="panel-tab-icon">${icon}</span>
                    <span>${module.title}</span>
                `

                tab.addEventListener('click', () => switchModule(moduleKey))
                tabsContainer.appendChild(tab)
            })

            // Автоматически прокручиваем к активному табу
            setTimeout(() => {
                const activeTab = tabsContainer.querySelector('.panel-tab.active')
                if (activeTab) {
                    activeTab.scrollIntoView({
                        inline: 'center',
                        block: 'nearest',
                        behavior: 'smooth'
                    })
                }
            }, 100)

            // Если текущий модуль недоступен для роли, переключаемся на первый доступный
            if (!availableModules.includes(moduleId) && availableModules.length > 0) {
                const newModuleId = availableModules[0]
                console.log(`🔄 Модуль ${moduleId} недоступен для роли ${userRole}, переключаемся на ${newModuleId}`)
                switchModule(newModuleId)
                return // Прерываем выполнение, так как switchModule вызовет новый рендер
            }
        }

        // Переключаем модуль если нужно
        if (currentModule !== moduleId) {
            switchModule(moduleId)
        }
    }

    // Подписка
    const unsubscribe = subscribe(renderPanel)

    // Функция очистки
    const cleanup = () => {
        if (cleanupFunction) cleanupFunction()
        if (unsubscribe) unsubscribe()

        if (panel.parentNode) panel.parentNode.removeChild(panel)
        if (edge.parentNode) edge.parentNode.removeChild(edge)

        panelContainers.delete(side)
    }

    document.body.appendChild(panel)
    document.body.appendChild(edge)
    panelContainers.set(side, { panel, edge, cleanup })

    return cleanup
}

// ===== MAIN UI INIT =====
export function initUI() {
    if (uiInitialized) {
        console.warn('⚠️ UI уже инициализирован')
        return cleanupUI
    }

    console.log('🔄 Инициализация UI...')
    console.log('📋 Зарегистрированные модули:', Array.from(window.__canvasverse_panelModules.keys()))

    applyGlobalStyles()

    // Создаем панели
    createPanel('left')
    createPanel('right')

    // Применяем роль
    const initialState = getState()
    applyRoleToUI(initialState.role)

    // Подписываемся на изменения роли
    unsubscribeRole = subscribe(state => {
        applyRoleToUI(state.role)
    })

    // Добавляем обработчик Escape для выхода
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && getState().userId) {
            console.log('⎋ Нажата Escape, выход в лобби')
            e.preventDefault()
            if (window.CanvasVerse && window.CanvasVerse.exitToLobby) {
                window.CanvasVerse.exitToLobby()
            }
        }
    }
    window.addEventListener('keydown', escapeHandler)
    window.__canvasverse_escapeHandler = escapeHandler

    uiInitialized = true
    return cleanupUI
}

// ===== CLEANUP =====
export function cleanupUI() {
    if (!uiInitialized) return
    console.log('🧹 Очистка UI...')

    if (window.__canvasverse_escapeHandler) {
        window.removeEventListener('keydown', window.__canvasverse_escapeHandler)
        delete window.__canvasverse_escapeHandler
    }

    if (unsubscribeRole) {
        unsubscribeRole()
        unsubscribeRole = null
    }

    // Очищаем все панели
    panelContainers.forEach((container, side) => {
        if (container.cleanup) container.cleanup()
    })
    panelContainers.clear()

    // Удаляем кнопку выхода
    removeExitButton()

    // Удаляем стили
    const styleTag = document.getElementById('editor-ui-styles')
    if (styleTag && styleTag.parentNode) {
        styleTag.parentNode.removeChild(styleTag)
    }

    // Удаляем стили панели настроек
    const settingsStyleTag = document.getElementById('settings-panel-styles')
    if (settingsStyleTag && settingsStyleTag.parentNode) {
        settingsStyleTag.parentNode.removeChild(settingsStyleTag)
    }

    // Удаляем классы ролей
    document.body.classList.remove('role-admin', 'role-editor', 'role-viewer')

    uiInitialized = false
    console.log('✅ UI очищен')
}

// ===== EXIT BUTTON MANAGEMENT =====
export function createExitButton() {
    // Удаляем старую кнопку
    const oldBtn = document.getElementById('exit-room-btn')
    if (oldBtn) oldBtn.parentNode.removeChild(oldBtn)

    // Создаем новую кнопку
    const exitBtn = document.createElement('button')
    exitBtn.id = 'exit-room-btn'
    exitBtn.innerHTML = '🚪 Выйти в лобби'
    exitBtn.title = 'Вернуться в лобби (или нажмите Escape)'

    exitBtn.addEventListener('click', () => {
        console.log('🚪 Выход в лобби...')
        if (window.CanvasVerse && window.CanvasVerse.exitToLobby) {
            window.CanvasVerse.exitToLobby()
        }
    })

    document.body.appendChild(exitBtn)
}

export function removeExitButton() {
    const exitBtn = document.getElementById('exit-room-btn')
    if (exitBtn && exitBtn.parentNode) {
        exitBtn.parentNode.removeChild(exitBtn)
    }
}

export function isUIInitialized() {
    return uiInitialized
}