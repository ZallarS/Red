import { getNetworkManager, WS_PROTOCOL } from './network.js'
import { ROOM_SETTINGS_META, ROOM_SETTINGS } from './roomSettings.js'

let root = null
let input = null
let styleEl = null
let listEl = null
let requested = false
let messageHandler = null
let createPopup = null

// Создаем экземпляр сетевого менеджера
const networkManager = getNetworkManager()

function ensureStyles() {
    // Проверяем, не добавлены ли уже стили лобби
    const existingStyles = document.getElementById('lobby-styles')
    if (existingStyles) {
        styleEl = existingStyles
        return
    }

    const linkEl = document.createElement('link')
    linkEl.id = 'lobby-styles'
    linkEl.rel = 'stylesheet'
    linkEl.href = '/editor/ui/styles/lobby.css'
    document.head.appendChild(linkEl)
    styleEl = linkEl
}

// 🔥 Функция для создания попапа
function createRoomPopup() {
    if (createPopup) {
        showCreatePopup()
        return
    }

    createPopup = document.createElement('div')
    createPopup.className = 'create-room-popup'
    createPopup.innerHTML = `
        <div class="create-room-popup-content">
            <div class="create-room-popup-header">
                <div class="create-room-popup-title">
                    <span class="create-room-popup-title-icon">✨</span>
                    <span>Создание комнаты</span>
                </div>
                <button type="button" class="create-room-popup-close" id="createRoomPopupClose">
                    ×
                </button>
            </div>
            
            <div class="create-room-popup-body">
                <form class="create-room-form" id="createRoomForm">
                    <div class="create-room-form-section">
                        <div class="create-room-form-section-title">
                            <span class="create-room-form-section-title-icon">📝</span>
                            Основные настройки
                        </div>
                        
                        <div class="create-room-form-field">
                            <label for="create-room-name" class="create-room-form-label">
                                Название комнаты
                            </label>
                            <input 
                                type="text" 
                                id="create-room-name" 
                                class="create-room-form-input"
                                placeholder="Моя креативная комната"
                                autocomplete="off"
                                spellcheck="false"
                                required
                            />
                            <div class="create-room-form-hint">
                                Отображается в списке комнат. Минимум 3 символа.
                            </div>
                        </div>
                        
                        <div class="create-room-form-field">
                            <label for="create-room-description" class="create-room-form-label">
                                Описание (необязательно)
                            </label>
                            <textarea 
                                id="create-room-description" 
                                class="create-room-form-textarea"
                                placeholder="Опишите назначение комнаты или тему рисования..."
                                rows="3"
                                spellcheck="false"
                            ></textarea>
                            <div class="create-room-form-hint">
                                Максимум 200 символа.
                            </div>
                        </div>
                    </div>
                    
                    <div class="create-room-form-section">
                        <div class="create-room-form-section-title">
                            <span class="create-room-form-section-title-icon">👥</span>
                            Пользователи и доступ
                        </div>
                        
                        <div class="create-room-form-field">
                            <label class="create-room-form-label">
                                Видимость комнаты
                            </label>
                            <div class="create-room-form-radio-group">
                                ${Object.entries(ROOM_SETTINGS_META).map(([key, meta]) => `
                                    <label class="create-room-form-radio">
                                        <input 
                                            type="radio" 
                                            name="visibility" 
                                            value="${key}" 
                                            ${key === ROOM_SETTINGS.PUBLIC ? 'checked' : ''}
                                        />
                                        <span class="create-room-form-radio-icon">${meta.icon}</span>
                                        <span class="create-room-form-radio-text">
                                            <strong>${meta.label}</strong>
                                            <small>${meta.description}</small>
                                        </span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="create-room-form-field" id="password-field" style="display: none;">
                            <label for="create-room-password" class="create-room-form-label">
                                Пароль комнаты
                            </label>
                            <input 
                                type="password" 
                                id="create-room-password" 
                                class="create-room-form-input"
                                placeholder="Введите пароль для комнаты"
                                autocomplete="new-password"
                            />
                            <div class="create-room-form-hint">
                                Будет требоваться для входа в комнату. Минимум 4 символа.
                            </div>
                        </div>
                        
                        <div class="create-room-form-field">
                            <label for="create-room-max-users" class="create-room-form-label">
                                Максимальное количество пользователей
                            </label>
                            <div class="create-room-form-range">
                                <input 
                                    type="range" 
                                    id="create-room-max-users" 
                                    min="1" 
                                    max="50" 
                                    value="20"
                                />
                                <span class="create-room-form-range-value" id="max-users-value">20</span>
                            </div>
                            <div class="create-room-form-hint">
                                Рекомендуется: 5-10 для небольших групп, 20-30 для больших проектов
                            </div>
                        </div>
                        
                        <div class="create-room-form-field">
                            <label for="create-room-default-role" class="create-room-form-label">
                                Роль по умолчанию для новых пользователей
                            </label>
                            <select id="create-room-default-role" class="create-room-form-input">
                                <option value="viewer">Наблюдатель (только просмотр)</option>
                                <option value="editor" selected>Редактор (может рисовать)</option>
                                <option value="admin">Администратор (полные права)</option>
                            </select>
                            <div class="create-room-form-hint">
                                Вы всегда будете администратором созданной комнаты.
                            </div>
                        </div>
                    </div>
                    
                    <div class="create-room-form-section">
                        <div class="create-room-form-section-title">
                            <span class="create-room-form-section-title-icon">🎨</span>
                            Настройки редактора
                        </div>
                        
                        <div class="create-room-form-field">
                            <label class="create-room-form-label" style="display: flex; align-items: center; gap: 12px;">
                                <input 
                                    type="checkbox" 
                                    id="create-room-grid-enabled" 
                                    checked
                                    style="margin: 0;"
                                />
                                <span>Включить сетку по умолчанию</span>
                            </label>
                        </div>
                        
                        <div class="create-room-form-field">
                            <label class="create-room-form-label" style="display: flex; align-items: center; gap: 12px;">
                                <input 
                                    type="checkbox" 
                                    id="create-room-snap-enabled" 
                                    checked
                                    style="margin: 0;"
                                />
                                <span>Включить привязку по умолчанию</span>
                            </label>
                            <div class="create-room-form-hint">
                                Эти настройки можно изменить позже в комнате.
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div class="create-room-popup-footer">
                <button type="button" class="create-room-popup-btn create-room-popup-btn-cancel" id="cancelCreateRoom">
                    <span class="create-room-popup-btn-icon">←</span>
                    Отмена
                </button>
                <button type="button" class="create-room-popup-btn create-room-popup-btn-create" id="confirmCreateRoom">
                    <span class="create-room-popup-btn-icon">✨</span>
                    Создать комнату
                </button>
            </div>
        </div>
    `

    document.body.appendChild(createPopup)

    // Обработчики событий
    const closeBtn = createPopup.querySelector('#createRoomPopupClose')
    const cancelBtn = createPopup.querySelector('#cancelCreateRoom')
    const createBtn = createPopup.querySelector('#confirmCreateRoom')
    const visibilityRadios = createPopup.querySelectorAll('input[name="visibility"]')
    const passwordField = createPopup.querySelector('#password-field')
    const maxUsersRange = createPopup.querySelector('#create-room-max-users')
    const maxUsersValue = createPopup.querySelector('#max-users-value')

    // Обработчик закрытия попапа
    function closePopup() {
        createPopup.classList.remove('active')
        setTimeout(() => {
            createPopup.style.display = 'none'
        }, 300)
    }

    // Показать/скрыть поле пароля в зависимости от выбранной видимости
    function updatePasswordField() {
        const selectedVisibility = createPopup.querySelector('input[name="visibility"]:checked').value
        if (selectedVisibility === ROOM_SETTINGS.PASSWORD) {
            passwordField.style.display = 'block'
        } else {
            passwordField.style.display = 'none'
        }
    }

    // Обновление значения максимального количества пользователей
    function updateMaxUsersValue() {
        maxUsersValue.textContent = maxUsersRange.value
    }

    // Обработчики событий
    if (closeBtn) closeBtn.addEventListener('click', closePopup)
    if (cancelBtn) cancelBtn.addEventListener('click', closePopup)

    // Закрытие по клику вне попапа
    createPopup.addEventListener('click', (e) => {
        if (e.target === createPopup) {
            closePopup()
        }
    })

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && createPopup.classList.contains('active')) {
            closePopup()
        }
    })

    // Обработчики видимости
    visibilityRadios.forEach(radio => {
        radio.addEventListener('change', updatePasswordField)
    })

    // Обработчик ползунка максимального количества пользователей
    if (maxUsersRange) {
        maxUsersRange.addEventListener('input', updateMaxUsersValue)
    }

    // Обработчик создания комнаты
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            const name = createPopup.querySelector('#create-room-name').value.trim()
            const description = createPopup.querySelector('#create-room-description').value.trim()
            const visibility = createPopup.querySelector('input[name="visibility"]:checked').value
            const password = createPopup.querySelector('#create-room-password').value
            const maxUsers = parseInt(createPopup.querySelector('#create-room-max-users').value) || 20
            const defaultRole = createPopup.querySelector('#create-room-default-role').value
            const gridEnabled = createPopup.querySelector('#create-room-grid-enabled').checked
            const snapEnabled = createPopup.querySelector('#create-room-snap-enabled').checked

            // Валидация
            if (!name || name.length < 3) {
                alert('Название комнаты должно быть не менее 3 символов')
                createPopup.querySelector('#create-room-name').focus()
                return
            }

            if (name.length > 50) {
                alert('Название комнаты не должно превышать 50 символов')
                return
            }

            if (description.length > 200) {
                alert('Описание не должно превышать 200 символов')
                return
            }

            if (visibility === ROOM_SETTINGS.PASSWORD) {
                if (!password || password.length < 4) {
                    alert('Для комнаты с паролем требуется пароль не менее 4 символов')
                    createPopup.querySelector('#create-room-password').focus()
                    return
                }
            }

            // Создаем комнату
            const settings = {
                name,
                description,
                visibility,
                maxUsers,
                defaultRole,
                gridEnabled,
                snapEnabled
            }

            if (visibility === ROOM_SETTINGS.PASSWORD && password) {
                settings.password = password
            }

            console.log('📤 Создание комнаты с настройками:', settings)

            networkManager.send({
                type: WS_PROTOCOL.ROOM_CREATE,
                settings: settings
            })

            closePopup()
            resetForm()
        })
    }

    // Инициализация
    updatePasswordField()
    updateMaxUsersValue()

    return createPopup
}

// 🔥 Показать попап
function showCreatePopup() {
    if (!createPopup) {
        createRoomPopup()
    }

    createPopup.style.display = 'flex'
    setTimeout(() => {
        createPopup.classList.add('active')
        createPopup.querySelector('#create-room-name').focus()
    }, 10)
}

// 🔥 Сброс формы
function resetForm() {
    if (!createPopup) return

    createPopup.querySelector('#create-room-name').value = ''
    createPopup.querySelector('#create-room-description').value = ''
    createPopup.querySelector('input[value="public"]').checked = true
    createPopup.querySelector('#create-room-password').value = ''
    createPopup.querySelector('#create-room-max-users').value = 20
    createPopup.querySelector('#create-room-default-role').value = 'editor'
    createPopup.querySelector('#create-room-grid-enabled').checked = true
    createPopup.querySelector('#create-room-snap-enabled').checked = true

    const passwordField = createPopup.querySelector('#password-field')
    if (passwordField) passwordField.style.display = 'none'

    const maxUsersValue = createPopup.querySelector('#max-users-value')
    if (maxUsersValue) maxUsersValue.textContent = '20'
}

// 🔥 Выносим функцию обработки сообщений на уровень модуля
function createMessageHandler() {
    return function(msg) {
        if (msg.type === WS_PROTOCOL.AUTH_OK && !requested) {
            requested = true
            networkManager.send({ type: WS_PROTOCOL.ROOM_LIST })
        }

        if (msg.type === WS_PROTOCOL.ROOM_LIST_RESPONSE) {
            renderRooms(msg.rooms)
        }

        if (msg.type === WS_PROTOCOL.ROOM_CREATED) {
            console.log('✅ Комната создана:', msg.roomId)
            // Показываем уведомление
            if (root) {
                const notification = document.createElement('div')
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(32, 201, 151, 0.9);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    z-index: 2001;
                    animation: slideIn 0.3s ease-out;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                `
                notification.innerHTML = `
                    <span style="font-size: 18px">✅</span>
                    <span>Комната создана! Перенаправление...</span>
                `
                document.body.appendChild(notification)

                setTimeout(() => {
                    notification.style.animation = 'slideOut 0.3s ease-out forwards'
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification)
                        }
                    }, 300)
                }, 2000)
            }
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

    // Сортируем комнаты: сначала с пользователями, потом по дате создания
    rooms.sort((a, b) => {
        if (b.users !== a.users) return b.users - a.users
        return (b.settings?.createdAt || 0) - (a.settings?.createdAt || 0)
    })

    rooms.forEach(room => {
        const el = document.createElement('div')
        el.className = 'lobby-room'
        el.title = `ID: ${room.id}\n${room.settings?.description || 'Без описания'}`

        // Получаем настройки комнаты
        const settings = room.settings || {}
        const roomName = settings.name || `Комната ${room.id.substring(0, 6)}`
        const roomDescription = settings.description || 'Без описания'
        const visibility = settings.visibility || 'public'
        const maxUsers = settings.maxUsers || 20
        const isFull = room.users >= maxUsers
        const isPrivate = visibility === 'private'
        const isPasswordProtected = visibility === 'password-protected'

        // Генерируем уникальный цвет для иконки комнаты на основе ID
        const hue = room.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360
        const iconColor = `hsl(${hue}, 50%, 40%)`

        // Иконка в зависимости от статуса
        let roomIcon = '🏠'
        if (isFull) roomIcon = '🔴'
        else if (room.users > 0) roomIcon = '👥'
        if (isPasswordProtected) roomIcon = '🔑'
        if (isPrivate) roomIcon = '🔒'

        // Мета информация о видимости
        const visibilityMeta = ROOM_SETTINGS_META[visibility] || ROOM_SETTINGS_META.public

        el.innerHTML = `
            <div class="lobby-room-info">
                <div class="lobby-room-icon" style="background: ${iconColor}">
                    ${roomIcon}
                </div>
                <div class="lobby-room-details">
                    <div class="lobby-room-name">${roomName}</div>
                    ${roomDescription ? `<div class="lobby-room-description">${roomDescription}</div>` : ''}
                    <div class="lobby-room-meta">
                        <div class="lobby-room-meta-item">
                            <span class="lobby-room-meta-icon">${visibilityMeta.icon}</span>
                            <span>${visibilityMeta.label}</span>
                        </div>
                        <div class="lobby-room-meta-item">
                            <span class="lobby-room-meta-icon">👁</span>
                            <span>${settings.defaultRole === 'viewer' ? 'Только просмотр' : 'Редактирование'}</span>
                        </div>
                        ${settings.gridEnabled ? `
                            <div class="lobby-room-meta-item">
                                <span class="lobby-room-meta-icon">⬚</span>
                                <span>Сетка</span>
                            </div>
                        ` : ''}
                        ${settings.snapEnabled ? `
                            <div class="lobby-room-meta-item">
                                <span class="lobby-room-meta-icon">🧲</span>
                                <span>Привязка</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="lobby-room-id">ID: ${room.id}</div>
                </div>
            </div>
            <div class="lobby-room-status">
                <div class="lobby-room-users">
                    <span>${room.users}</span>
                    <span>/</span>
                    <span>${maxUsers}</span>
                </div>
                ${isFull ? '<div class="room-privacy-badge full">Полная</div>' : ''}
                ${isPasswordProtected ? '<div class="room-privacy-badge password">🔒 Пароль</div>' : ''}
                ${isPrivate ? '<div class="room-privacy-badge private">Приватная</div>' : ''}
            </div>
            <div class="lobby-room-join">
                →
            </div>
        `

        el.onclick = () => {
            if (isFull) {
                alert('Комната заполнена')
                return
            }

            if (isPasswordProtected) {
                const password = prompt('Введите пароль для входа в комнату:')
                if (!password) return

                // Анимация клика
                el.style.transform = 'scale(0.98)'
                setTimeout(() => {
                    history.pushState({}, '', `/room/${room.id}`)
                    window.dispatchEvent(new CustomEvent('routechange', {
                        detail: { password }
                    }))
                }, 150)
            } else {
                // Анимация клика
                el.style.transform = 'scale(0.98)'
                setTimeout(() => {
                    history.pushState({}, '', `/room/${room.id}`)
                    window.dispatchEvent(new Event('routechange'))
                }, 150)
            }
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

export function unmountLobby() {
    if (!root) return

    console.log('👋 Убираем лобби...')

    // 🔥 Убираем обработчик сообщений
    if (messageHandler) {
        networkManager.off('message', messageHandler)
        messageHandler = null
    }

    // Убираем попап создания комнаты
    if (createPopup && createPopup.parentNode) {
        createPopup.parentNode.removeChild(createPopup)
        createPopup = null
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
            showCreatePopup()
        }
    }

    // ===== WS EVENTS =====
    // 🔥 Создаем новый обработчик сообщений
    messageHandler = createMessageHandler()
    networkManager.on('message', messageHandler)

    // 🔥 ПРИНУДИТЕЛЬНО ЗАПРАШИВАЕМ СПИСОК КОМНАТ ПРИ МОНТИРОВАНИИ
    console.log('📡 Запрашиваем список комнат...')

    // 🔥 Проверяем соединение перед отправкой
    const checkConnection = () => {
        // Если соединение установлено, отправляем запрос
        if (networkManager.getStatus() === 'online') {
            networkManager.send({ type: WS_PROTOCOL.ROOM_LIST })
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