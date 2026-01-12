import { subscribe, getState, setState } from './store.js'

// импорт модулей (они сами регистрируются)
import './modules/toolsPanel.js'
import './modules/usersPanel.js'

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
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 6px;
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
        width: '280px',
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

    // Заголовок
    const header = document.createElement('div')
    header.style.cssText = `
        padding: 20px 16px 12px 16px;
        border-bottom: 1px solid #222;
        background: #1a1a1a;
        display: flex;
        flex-direction: column;
        gap: 12px;
    `

    const titleRow = document.createElement('div')
    titleRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
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

    // Контент
    const content = document.createElement('div')
    Object.assign(content.style, {
        flex: '1',
        overflow: 'auto',
        padding: '16px'
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

    // Рендер панели
    function renderPanel(state) {
        const panelState = state.panels[side]
        const moduleId = panelState.active

        // Получаем модуль из глобального реестра
        const module = window.__canvasverse_panelModules.get(moduleId)

        if (!module) {
            console.error(`❌ Модуль панели не найден: ${moduleId}`)
            return
        }

        // Видимость панели
        panel.style.display = panelState.open ? 'flex' : 'none'
        edge.style.display = panelState.open ? 'none' : 'flex'

        title.textContent = side === 'left' ? 'Инструменты' : 'Управление'

        // Очищаем предыдущий рендер
        if (cleanupFunction) {
            cleanupFunction()
            cleanupFunction = null
        }

        content.innerHTML = ''

        // Рендерим модуль
        if (typeof module.render === 'function') {
            cleanupFunction = module.render(content)
        } else {
            console.error(`❌ Модуль ${moduleId} не имеет метода render`)
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