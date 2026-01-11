import { send, on, off } from './ws.js'

let root = null
let input = null
let styleEl = null
let listEl = null
let requested = false
let messageHandler = null

function ensureStyles() {
    // 🔥 Проверяем, не добавлены ли уже стили лобби
    const existingStyles = document.getElementById('lobby-styles')
    if (existingStyles) {
        styleEl = existingStyles
        return
    }

    styleEl = document.createElement('style')
    styleEl.id = 'lobby-styles' // 🔥 Добавляем уникальный ID

    styleEl.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        #lobby {
            position: fixed;
            inset: 0;
            background-color: rgba(10, 10, 10, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            opacity: 0;
            animation: fadeIn 0.2s ease-out forwards;
        }
        
        @keyframes fadeIn {
            to { opacity: 1; }
        }
        
        .lobby-window {
            background: #0f0f0f;
            border-radius: 16px;
            padding: 40px;
            width: 90%;
            max-width: 500px;
            color: #fff;
            border: 1px solid #222;
            transform: translateY(20px);
            animation: slideUp 0.3s ease-out forwards;
        }
        
        @keyframes slideUp {
            to { transform: translateY(0); }
        }
        
        .lobby-title {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #ffffff;
            text-align: center;
            letter-spacing: -0.5px;
        }
        
        .lobby-subtitle {
            text-align: center;
            color: #888;
            font-size: 15px;
            margin-bottom: 32px;
            font-weight: 400;
        }
        
        .lobby-input-container {
            margin-bottom: 24px;
        }
        
        .lobby-input-wrapper {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .lobby-input {
            flex: 1;
            padding: 16px 20px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            color: #fff;
            font-size: 16px;
            font-family: 'Inter', sans-serif;
            transition: all 0.15s ease;
            outline: none;
            min-width: 0;
        }
        
        .lobby-input::placeholder {
            color: #666;
        }
        
        .lobby-input:focus {
            border-color: #4a9eff;
            background: #1c1c1c;
        }
        
        .lobby-input-btn {
            padding: 16px 24px;
            border-radius: 8px;
            border: none;
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #4a9eff;
            color: white;
            white-space: nowrap;
            flex-shrink: 0;
        }
        
        .lobby-input-btn:hover {
            background: #3a8aef;
        }
        
        .lobby-create-btn {
            width: 100%;
            padding: 16px 24px;
            border-radius: 8px;
            border: 1px solid #333;
            background: #1a1a1a;
            color: #e0e0e0;
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 32px;
        }
        
        .lobby-create-btn:hover {
            background: #222;
            border-color: #444;
        }
        
        .lobby-divider {
            display: flex;
            align-items: center;
            margin: 24px 0;
            color: #666;
            font-size: 14px;
        }
        
        .lobby-divider::before,
        .lobby-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #333;
        }
        
        .lobby-divider span {
            padding: 0 16px;
        }
        
        .lobby-rooms {
            margin-top: 8px;
        }
        
        .lobby-rooms-title {
            color: #ccc;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .lobby-rooms-title::before {
            content: '👥';
            font-size: 16px;
        }
        
        .lobby-rooms-list {
            max-height: 320px;
            overflow-y: auto;
            border-radius: 8px;
            background: #0f0f0f;
            border: 1px solid #222;
            padding: 4px;
        }
        
        /* Стили для скроллбара */
        .lobby-rooms-list::-webkit-scrollbar {
            width: 6px;
        }
        
        .lobby-rooms-list::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 3px;
        }
        
        .lobby-rooms-list::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 3px;
        }
        
        .lobby-rooms-list::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
        
        .lobby-room {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #1a1a1a;
            margin-bottom: 4px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 1px solid transparent;
        }
        
        .lobby-room:hover {
            background: #222;
            border-color: #333;
        }
        
        .lobby-room-info {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        
        .lobby-room-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: #2a2a2a;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: white;
            border: 1px solid #333;
        }
        
        .lobby-room-details {
            display: flex;
            flex-direction: column;
        }
        
        .lobby-room-id {
            font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
            font-size: 15px;
            font-weight: 600;
            color: #e0e0e0;
            letter-spacing: -0.3px;
        }
        
        .lobby-room-users {
            font-size: 13px;
            color: #888;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 2px;
        }
        
        .lobby-room-join {
            color: #888;
            font-size: 14px;
            transition: all 0.15s ease;
        }
        
        .lobby-room:hover .lobby-room-join {
            color: #4a9eff;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
        
        .empty-state-icon {
            font-size: 40px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        
        .empty-state-text {
            font-size: 15px;
            line-height: 1.5;
        }
        
        .loading {
            text-align: center;
            padding: 40px 20px;
            color: #888;
        }
        
        .loading-spinner {
            width: 24px;
            height: 24px;
            border: 3px solid #2a2a2a;
            border-top-color: #4a9eff;
            border-radius: 50%;
            margin: 0 auto 16px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Анимация ошибки */
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        /* Адаптивность */
        @media (max-width: 520px) {
            .lobby-window {
                padding: 30px 20px;
                border-radius: 12px;
                width: 95%;
            }
            
            .lobby-input-wrapper {
                flex-direction: column;
            }
            
            .lobby-input-btn {
                width: 100%;
            }
            
            .lobby-room {
                padding: 14px 16px;
            }
            
            .lobby-title {
                font-size: 24px;
            }
        }
    `
    document.head.appendChild(styleEl)
}

// 🔥 Выносим функцию обработки сообщений на уровень модуля
function createMessageHandler() {
    return function(msg) {
        if (msg.type === 'auth-ok' && !requested) {
            requested = true
            send({ type: 'room-list' })
        }

        if (msg.type === 'room-list-response') {
            renderRooms(msg.rooms)
        }
    }
}

function renderRooms(rooms) {
    if (!listEl) return

    listEl.innerHTML = ''

    if (!rooms || rooms.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏠</div>
                <div class="empty-state-text">Нет активных комнат<br>Создайте первую!</div>
            </div>
        `
        return
    }

    // Сортируем комнаты по количеству пользователей (от большего к меньшему)
    rooms.sort((a, b) => b.users - a.users)

    rooms.forEach(room => {
        const el = document.createElement('div')
        el.className = 'lobby-room'

        // Генерируем уникальный цвет для иконки комнаты на основе ID
        const hue = room.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360
        const iconColor = `hsl(${hue}, 50%, 40%)`

        el.innerHTML = `
            <div class="lobby-room-info">
                <div class="lobby-room-icon" style="background: ${iconColor}">
                    ${room.users > 0 ? '👥' : '🏠'}
                </div>
                <div class="lobby-room-details">
                    <div class="lobby-room-id">${room.id}</div>
                    <div class="lobby-room-users">${room.users} пользователь${getUserPlural(room.users)}</div>
                </div>
            </div>
            <div class="lobby-room-join">
                →
            </div>
        `

        el.onclick = () => {
            // Анимация клика
            el.style.transform = 'scale(0.98)'
            setTimeout(() => {
                history.pushState({}, '', `/room/${room.id}`)
                window.dispatchEvent(new Event('routechange'))
            }, 150)
        }

        listEl.appendChild(el)
    })

    // Добавляем анимацию появления комнат
    const roomElements = listEl.querySelectorAll('.lobby-room')
    roomElements.forEach((roomEl, index) => {
        roomEl.style.opacity = '0'
        roomEl.style.transform = 'translateY(10px)'
        setTimeout(() => {
            roomEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
            roomEl.style.opacity = '1'
            roomEl.style.transform = 'translateY(0)'
        }, index * 30)
    })
}

function getUserPlural(count) {
    if (count % 10 === 1 && count % 100 !== 11) return ''
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'а'
    return 'ей'
}

export function unmountLobby() {
    if (!root) return

    console.log('👋 Убираем лобби...')

    // 🔥 Убираем обработчик сообщений
    if (messageHandler) {
        off('message', messageHandler)
        messageHandler = null
    }

    // Анимация закрытия
    root.style.opacity = '1'
    root.style.animation = 'fadeOut 0.2s ease-out forwards'

    // Сохраняем ссылку на root перед очисткой
    const rootElement = root

    setTimeout(() => {
        // Безопасное удаление элемента
        if (rootElement && rootElement.parentNode) {
            rootElement.parentNode.removeChild(rootElement)
        }

        root = null
        input = null
        listEl = null
        requested = false

        // 🔥 НЕ удаляем стили лобби, оставляем их для возможного повторного использования
        // Стили остаются в DOM, но скрыты

        console.log('✅ Лобби убрано')
    }, 200)
}

export function mountLobby() {
    // 🔥 Проверяем, не смонтировано ли уже лобби
    if (root) {
        console.log('⚠️ Лобби уже смонтировано')
        return
    }

    ensureStyles()

    root = document.createElement('div')
    root.id = 'lobby'
    root.innerHTML = `
        <div class="lobby-window">
            <h1 class="lobby-title">CanvasVerse</h1>
            <div class="lobby-subtitle">Выберите комнату для совместного рисования</div>
            
            <div class="lobby-input-container">
                <div class="lobby-input-wrapper">
                    <input
                        id="roomIdInput"
                        class="lobby-input"
                        placeholder="Введите код комнаты"
                        autocomplete="off"
                        spellcheck="false"
                    />
                    <button id="joinBtn" class="lobby-input-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                            <polyline points="10 17 15 12 10 7"></polyline>
                            <line x1="15" y1="12" x2="3" y2="12"></line>
                        </svg>
                        Войти
                    </button>
                </div>
                
                <button id="createBtn" class="lobby-create-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"></path>
                    </svg>
                    Создать новую комнату
                </button>
            </div>
            
            <div class="lobby-divider">
                <span>или выберите из списка</span>
            </div>
            
            <div class="lobby-rooms">
                <div class="lobby-rooms-title">Активные комнаты</div>
                <div class="lobby-rooms-list" id="roomsList">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <div class="empty-state-text">Загрузка комнат...</div>
                    </div>
                </div>
            </div>
        </div>
    `

    document.body.appendChild(root)

    input = root.querySelector('#roomIdInput')
    listEl = root.querySelector('#roomsList')

    // 🔥 Сбрасываем флаг requested, чтобы заново запросить список
    requested = false

    // Фокус на поле ввода при открытии
    setTimeout(() => {
        if (input) {
            input.focus()
            // 🔥 Очищаем поле ввода
            input.value = ''
        }
    }, 100)

    // Обработка клавиши Enter
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinRoom()
            }
        })
    }

    function joinRoom() {
        const id = input.value.trim()
        if (!id) {
            // Анимация ошибки
            input.style.borderColor = '#ff4757'
            input.style.animation = 'shake 0.5s ease'
            setTimeout(() => {
                input.style.borderColor = ''
                input.style.animation = ''
            }, 500)
            return
        }
        history.pushState({}, '', `/room/${id}`)
        window.dispatchEvent(new Event('routechange'))
    }

    const joinBtn = root.querySelector('#joinBtn')
    if (joinBtn) {
        joinBtn.onclick = joinRoom
    }

    const createBtn = root.querySelector('#createBtn')
    if (createBtn) {
        createBtn.onclick = () => {
            send({ type: 'room-create' })
        }
    }

    // ===== WS EVENTS =====
    // 🔥 Создаем новый обработчик сообщений
    messageHandler = createMessageHandler()
    on('message', messageHandler)

    // 🔥 ПРИНУДИТЕЛЬНО ЗАПРАШИВАЕМ СПИСОК КОМНАТ ПРИ МОНТИРОВАНИИ
    console.log('📡 Запрашиваем список комнат...')

    // 🔥 Проверяем соединение перед отправкой
    const checkConnection = () => {
        // Если соединение установлено, отправляем запрос
        if (window.__canvasverse_ws_connected) {
            send({ type: 'room-list' })
        } else {
            // Если соединение еще не установлено, ждем
            console.log('⏳ Ожидаем установки соединения...')
            setTimeout(checkConnection, 100)
        }
    }

    checkConnection()

    console.log('✅ Лобби смонтировано')

    // 🔥 Возвращаем функцию для ручной очистки
    return () => {
        console.log('🧹 Ручная очистка лобби')
        unmountLobby()
    }
}

export function onRoomCreated(roomId) {
    history.pushState({}, '', `/room/${roomId}`)
    window.dispatchEvent(new Event('routechange'))
}

// 🔥 Добавим функцию для проверки состояния лобби
export function isLobbyMounted() {
    return !!root
}