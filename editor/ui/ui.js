import { createPanelContainer } from './panels/panelContainer.js'
import { subscribe, getState } from './store.js'

// импорт модулей (инициализация панелей)
import './modules/toolsPanel.js'
import './modules/usersPanel.js'

function applyGlobalStyles() {
    const styles = document.createElement('style')
    styles.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        button {
            font-family: 'Inter', sans-serif;
        }
        
        /* Стили скроллбара */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #444;
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
}