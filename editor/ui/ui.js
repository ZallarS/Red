import { createPanelContainer } from './panels/panelContainer.js'
import { subscribe, getState } from './store.js'

// импорт модулей (инициализация панелей)
import './modules/toolsPanel.js'
import './modules/usersPanel.js'
import './modules/eventsPanel.js'

function applyGlobalStyles() {
    const styles = document.createElement('style')
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
    subscribe(state => {
        console.log('🔄 Запуск подписки на UI, роль:', state.role)
        applyRoleToUI(state.role)
    })

    console.log('✅ UI инициализирован.')
    console.log('   - Shift+D: переключить дебаг оверлей')
    console.log('   - Используйте табы в правой панели для переключения между пользователями и событиями')

    // Добавляем возможность перетаскивания дебаг-панели
    let debugPanel = null
    let isDragging = false
    let dragOffset = { x: 0, y: 0 }

    // Находим дебаг-панель через мутацию DOM
    const observer = new MutationObserver(() => {
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
}