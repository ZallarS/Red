import { createPanelContainer } from './panels/panelContainer.js'
import { subscribe, getState } from './store.js'

// импорт модулей (инициализация панелей)
import './modules/toolsPanel.js'
import './modules/usersPanel.js'
import './modules/eventsPanel.js'

let uiInitialized = false
let unsubscribeRole = null
let observer = null

function applyGlobalStyles() {
    const styles = document.createElement('style')
    styles.id = 'editor-ui-styles' // 🔥 Добавляем уникальный ID

    styles.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 0;
        }
        
        button {
            font-family: 'Inter', sans-serif;
        }
        
        /* Улучшенные стили скроллбара для панелей */
        .events-list::-webkit-scrollbar {
            width: 6px;
        }
        
        .events-list::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .events-list::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 3px;
        }
        
        .events-list::-webkit-scrollbar-thumb:hover {
            background: #444;
        }
        
        /* Гарантируем, что панели не имеют внутренних отступов, которые могут ломать верстку */
        [class*="panel"] {
            box-sizing: border-box;
        }
        
        /* Единый стиль для всех кнопок */
        button {
            outline: none;
            border: none;
            cursor: pointer;
        }
        
        button:hover {
            opacity: 0.9;
        }
        
        button:active {
            transform: translateY(1px);
        }
        
        /* Стили для кнопки выхода */
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
    `
    document.head.appendChild(styles)
}

function applyRoleToUI(role) {
    const body = document.body

    // Удаляем все ролевые классы
    body.classList.remove('role-admin', 'role-editor', 'role-viewer')

    // Добавляем текущую роль
    if (role === 'admin') {
        body.classList.add('role-admin')
    } else if (role === 'editor') {
        body.classList.add('role-editor')
    } else if (role === 'viewer') {
        body.classList.add('role-viewer')
    }

    console.log(`🎭 Роль пользовательского интерфейса обновлена для: ${role}`)
}

export function initUI() {
    // 🔥 Проверяем, не инициализирован ли уже UI
    if (uiInitialized) {
        console.warn('⚠️ UI уже инициализирован')
        return cleanupUI
    }

    console.log('🔄 Инициализация UI...')

    // Применяем глобальные стили
    applyGlobalStyles()

    // создаём контейнеры панелей
    createPanelContainer('left')
    createPanelContainer('right')

    // применяем роль сразу
    const initialState = getState()
    console.log('📋 Первоначальное состояние :', initialState)
    applyRoleToUI(initialState.role)

    // 🔥 РЕАКТИВНО обновляем UI при смене роли
    unsubscribeRole = subscribe(state => {
        console.log('🔄 Запуск подписки на UI, роль:', state.role)
        applyRoleToUI(state.role)
    })

    console.log('✅ UI инициализирован.')
    console.log('   - Shift+D: переключить дебаг оверлей')
    console.log('   - Escape: выход в лобби')
    console.log('   - Используйте табы в правой панели для переключения между пользователями и событиями')

    // Добавляем возможность перетаскивания дебаг-панели
    let debugPanel = null
    let isDragging = false
    let dragOffset = { x: 0, y: 0 }

    // Находим дебаг-панель через мутацию DOM
    observer = new MutationObserver(() => {
        debugPanel = document.querySelector('[style*="background: rgba(0,0,0,0.9)"]')
        if (debugPanel && !debugPanel.dataset.dragInitialized) {
            debugPanel.id = 'debug-overlay'
            debugPanel.dataset.dragInitialized = 'true'
            debugPanel.style.cursor = 'move'
            debugPanel.style.pointerEvents = 'auto'

            debugPanel.addEventListener('mousedown', (e) => {
                if (e.target === debugPanel || e.target.tagName === 'PRE') {
                    isDragging = true
                    const rect = debugPanel.getBoundingClientRect()
                    dragOffset = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    }
                    debugPanel.style.opacity = '0.8'
                }
            })

            window.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    debugPanel.style.left = (e.clientX - dragOffset.x) + 'px'
                    debugPanel.style.top = (e.clientY - dragOffset.y) + 'px'
                    debugPanel.style.position = 'fixed'
                }
            })

            window.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false
                    debugPanel.style.opacity = '1'

                    // Сохраняем позицию
                    localStorage.setItem('debug-panel-position', JSON.stringify({
                        left: debugPanel.style.left,
                        top: debugPanel.style.top
                    }))
                }
            })

            // Восстанавливаем сохраненную позицию
            const savedPos = localStorage.getItem('debug-panel-position')
            if (savedPos) {
                try {
                    const pos = JSON.parse(savedPos)
                    if (pos.left && pos.top) {
                        debugPanel.style.left = pos.left
                        debugPanel.style.top = pos.top
                        debugPanel.style.position = 'fixed'
                    }
                } catch (e) {
                    console.log('Не удалось восстановить позицию дебаг-панели')
                }
            }
        }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // 🔥 Добавляем обработку Escape для выхода
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            const state = getState()
            // Если есть активный userId, значит мы в комнате
            if (state.userId) {
                console.log('⎋ Нажата Escape, выход в лобби')
                e.preventDefault() // Предотвращаем стандартное поведение Escape
                if (window.CanvasVerse && window.CanvasVerse.exitToLobby) {
                    window.CanvasVerse.exitToLobby()
                }
            }
        }
    }

    window.addEventListener('keydown', escapeHandler)

    // Сохраняем обработчик для очистки
    window.__canvasverse_escapeHandler = escapeHandler

    uiInitialized = true

    // 🔥 Возвращаем функцию очистки
    return cleanupUI
}

// 🔥 Функция очистки UI
export function cleanupUI() {
    if (!uiInitialized) return

    console.log('🧹 Очистка UI...')

    // Удаляем обработчик Escape
    if (window.__canvasverse_escapeHandler) {
        window.removeEventListener('keydown', window.__canvasverse_escapeHandler)
        delete window.__canvasverse_escapeHandler
    }

    // Отписываемся от изменений роли
    if (unsubscribeRole) {
        unsubscribeRole()
        unsubscribeRole = null
    }

    // Останавливаем observer
    if (observer) {
        observer.disconnect()
        observer = null
    }

    // Удаляем кнопку выхода, если она есть
    removeExitButton()

    // Удаляем панели
    removeAllPanels()

    // 🔥 Удаляем ТОЛЬКО стили редактора (не лобби)
    const styleTag = document.getElementById('editor-ui-styles')
    if (styleTag && styleTag.parentNode) {
        styleTag.parentNode.removeChild(styleTag)
    }

    // 🔥 Не удаляем шрифт Inter, он может быть нужен лобби

    // Удаляем классы ролей с body
    document.body.classList.remove('role-admin', 'role-editor', 'role-viewer')

    uiInitialized = false
    console.log('✅ UI очищен')
}

// 🔥 Функция для удаления всех панелей
function removeAllPanels() {
    console.log('🗑️ Удаляем все панели...')

    // Удаляем левую панель и ее переключатель
    const leftPanel = document.querySelector('[style*="left: 0"][style*="position: fixed"]:not([style*="width: 20px"])')
    const leftPanelEdge = document.querySelector('[style*="left: 0"][style*="width: 20px"][style*="height: 60px"]')

    // Удаляем правую панель и ее переключатель
    const rightPanel = document.querySelector('[style*="right: 0"][style*="position: fixed"]:not([style*="width: 20px"])')
    const rightPanelEdge = document.querySelector('[style*="right: 0"][style*="width: 20px"][style*="height: 60px"]')

    const panels = [leftPanel, leftPanelEdge, rightPanel, rightPanelEdge]

    panels.forEach(panel => {
        if (panel && panel.parentNode) {
            try {
                panel.parentNode.removeChild(panel)
                console.log(`🗑️ Удалена панель: ${panel === leftPanel || panel === leftPanelEdge ? 'левая' : 'правая'}`)
            } catch (e) {
                console.warn('⚠️ Не удалось удалить панель:', e)
            }
        }
    })

    // 🔥 Также удаляем все элементы с классами panel
    const allPanels = document.querySelectorAll('[class*="panel"]')
    allPanels.forEach(panel => {
        if (panel.parentNode && !document.body.contains(panel)) {
            // Проверяем, что элемент все еще в DOM
            return
        }

        // Проверяем, что это действительно панель (имеет стили панели)
        const style = window.getComputedStyle(panel)
        if (style.position === 'fixed' && (style.left === '0px' || style.right === '0px')) {
            try {
                panel.parentNode.removeChild(panel)
                console.log('🗑️ Удалена дополнительная панель')
            } catch (e) {
                console.warn('⚠️ Не удалось удалить дополнительную панель:', e)
            }
        }
    })

    console.log('✅ Все панели удалены')
}

// 🔥 Функция для создания кнопки выхода
export function createExitButton() {
    // Удаляем старую кнопку, если есть
    const oldBtn = document.getElementById('exit-room-btn')
    if (oldBtn) {
        oldBtn.parentNode.removeChild(oldBtn)
    }

    // Создаем кнопку выхода
    const exitBtn = document.createElement('button')
    exitBtn.id = 'exit-room-btn'
    exitBtn.innerHTML = '🚪 Выйти в лобби'
    exitBtn.title = 'Вернуться в лобби (или нажмите Escape)'

    // Клик - выход в лобби
    exitBtn.addEventListener('click', () => {
        console.log('🚪 Выход в лобби...')
        if (window.CanvasVerse && window.CanvasVerse.exitToLobby) {
            window.CanvasVerse.exitToLobby()
        }
    })

    document.body.appendChild(exitBtn)
}

// 🔥 Функция удаления кнопки выхода
export function removeExitButton() {
    const exitBtn = document.getElementById('exit-room-btn')
    if (exitBtn && exitBtn.parentNode) {
        try {
            exitBtn.parentNode.removeChild(exitBtn)
            console.log('🗑️ Удалена кнопка выхода')
        } catch (e) {
            console.warn('⚠️ Не удалось удалить кнопку выхода:', e)
        }
    }
}

// 🔥 Функция проверки инициализации UI
export function isUIInitialized() {
    return uiInitialized
}