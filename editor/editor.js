// editor/editor.js

import { getRoute, goToLobby } from './router.js'
import { mountLobby, unmountLobby, onRoomCreated } from './lobby.js'
import { connect, on, send, getStatus } from './ws.js'
import { initEditor } from './editorCore.js'
import { createExitButton, removeExitButton } from './ui/ui.js'

let editorInstance = null
let currentRoomId = null
let isEditorInitialized = false // 🔥 Добавляем флаг инициализации редактора

function startEditor(snapshot) {
    if (editorInstance) {
        console.log('⚠️ Редактор уже запущен, останавливаем...')
        stopEditor()
    }

    // 🔥 ВАЖНО: Убираем лобби перед запуском редактора
    unmountLobby()

    editorInstance = initEditor(snapshot)
    currentRoomId = snapshot.roomId
    isEditorInitialized = true // 🔥 Устанавливаем флаг

    // 🔥 Используем функцию из ui.js для создания кнопки выхода
    createExitButton()

    console.log('🎮 Редактор запущен для комнаты:', currentRoomId)
}

// 🔥 УЛУЧШЕННАЯ ФУНКЦИЯ: остановка редактора
function stopEditor() {
    console.log('🛑 Остановка редактора...')

    // 🔥 Останавливаем редактор, если есть экземпляр
    if (editorInstance && editorInstance.cleanup) {
        console.log('🧹 Вызываем cleanup редактора')
        editorInstance.cleanup()
    } else {
        // 🔥 Если нет экземпляра, но UI мог быть инициализирован
        console.log('⚠️ Экземпляра редактора нет, но делаем принудительную очистку')
        // Принудительная очистка UI
        if (window.__canvasverse_uiInitialized) {
            import('./ui.js').then(module => {
                if (module.cleanupUI) {
                    module.cleanupUI()
                }
            }).catch(() => {
                console.warn('⚠️ Не удалось импортировать cleanupUI')
            })
        }

        // Очищаем canvas
        const canvas = document.getElementById('canvas')
        if (canvas) {
            const ctx = canvas.getContext('2d')
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
    }

    // Отправляем сообщение о выходе из комнаты, если соединение активно
    if (getStatus() === 'online' && currentRoomId) {
        console.log(`📤 Отправляем запрос на выход из комнаты ${currentRoomId}`)
        send({ type: 'room-leave', roomId: currentRoomId })
    }

    editorInstance = null
    currentRoomId = null
    isEditorInitialized = false

    console.log('✅ Редактор полностью остановлен')
}

function handleRoute() {
    const route = getRoute()
    console.log('📍 Маршрут изменен:', route)

    if (route.type === 'lobby') {
        // Если мы были в комнате - останавливаем редактор
        if (editorInstance || currentRoomId || isEditorInitialized) {
            console.log('🔄 Переход из комнаты в лобби')
            stopEditor()
        }

        // Убираем старое лобби
        unmountLobby()

        // 🔥 Проверяем, загружены ли стили лобби
        setTimeout(() => {
            const lobbyStyles = document.getElementById('lobby-styles')
            if (!lobbyStyles) {
                console.log('🎨 Стили лобби не найдены, возможно нужно перезагрузить страницу')
            }

            console.log('🎪 Монтируем лобби...')
            mountLobby()
        }, 100) // 🔥 Увеличиваем задержку для гарантии очистки
        return
    }

    if (route.type === 'room') {
        // Если уже находимся в этой комнате - игнорируем
        if (currentRoomId === route.roomId && isEditorInitialized) {
            console.log('⚠️ Уже в этой комнате')
            return
        }

        // Если в другой комнате - останавливаем текущую
        if (currentRoomId && currentRoomId !== route.roomId) {
            console.log(`🔄 Переход из комнаты ${currentRoomId} в ${route.roomId}`)
            stopEditor()
        } else if (isEditorInitialized) {
            console.log('🔄 Перезапуск редактора')
            stopEditor()
        }

        // Убираем лобби
        unmountLobby()

        // 🔥 Добавляем задержку для гарантии очистки лобби
        setTimeout(() => {
            console.log(`🔗 Присоединяемся к комнате: ${route.roomId}`)
            send({ type: 'room-join', roomId: route.roomId })
        }, 100)
    }
}

window.addEventListener('routechange', handleRoute)
window.addEventListener('popstate', handleRoute)

// 🔥 ОБРАБОТКА СОБЫТИЯ ПЕРЕЗАГРУЗКИ СТРАНИЦЫ
window.addEventListener('beforeunload', () => {
    if (isEditorInitialized) {
        console.log('📝 Сохранение состояния перед перезагрузкой...')
        // Отправляем сообщение о выходе при закрытии вкладки
        if (getStatus() === 'online' && currentRoomId) {
            // Используем sendBeacon для надежной отправки при закрытии
            const data = JSON.stringify({ type: 'room-leave', roomId: currentRoomId })
            navigator.sendBeacon('wss://lib31.ru/ws', data)
        }
    }
})

// 🔥 ОБРАБОТКА КЛАВИШИ ESCAPE ГЛОБАЛЬНО
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Проверяем, находимся ли мы в комнате
        if (isEditorInitialized || currentRoomId) {
            console.log('⎋ Нажата Escape, выход в лобби')
            e.preventDefault()
            stopEditor()
            goToLobby()
        }
    }
})

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск CanvasVerse...')
    connect()

    on('message', msg => {
        if (msg.type === 'room-created') {
            onRoomCreated(msg.roomId)
        }

        if (msg.type === 'room-snapshot') {
            startEditor(msg)
        }

        if (msg.type === 'error') {
            alert(msg.message)
            history.pushState({}, '', '/')
            handleRoute()
        }

        // 🔥 ОБРАБОТКА ОТВЕТА НА ВЫХОД ИЗ КОМНАТЫ
        if (msg.type === 'room-left') {
            console.log('✅ Успешно вышел из комнаты:', msg.roomId)
        }

        // 🔥 ОБРАБОТКА СОБЫТИЯ ОТКЛЮЧЕНИЯ ПОЛЬЗОВАТЕЛЯ ОТ СЕРВЕРА
        if (msg.type === 'user-left') {
            console.log('👋 Пользователь покинул комнату:', msg.userId)
        }
    })

    // 🔥 Запускаем начальную обработку маршрута
    // Используем setTimeout, чтобы гарантировать, что DOM полностью загружен
    setTimeout(() => {
        handleRoute()
    }, 100)
})

// 🔥 Экспортируем функции для глобального доступа
window.CanvasVerse = {
    exitToLobby: () => {
        console.log('🚪 Выход в лобби через CanvasVerse.exitToLobby')
        stopEditor()
        goToLobby()
    },
    getCurrentRoom: () => currentRoomId,
    getEditorInstance: () => editorInstance,
    isEditorInitialized: () => isEditorInitialized,
    restartEditor: () => {
        if (currentRoomId) {
            console.log('🔄 Перезапуск редактора для комнаты:', currentRoomId)
            stopEditor()
            setTimeout(() => {
                send({ type: 'room-join', roomId: currentRoomId })
            }, 100)
        }
    },
    // 🔥 Функция для отладки
    debug: {
        getState: () => ({
            editorInstance: !!editorInstance,
            currentRoomId,
            isEditorInitialized,
            wsStatus: getStatus()
        }),
        forceExit: () => {
            console.log('🔧 Принудительный выход из комнаты')
            stopEditor()
            goToLobby()
        },
        forceMountLobby: () => {
            console.log('🔧 Принудительное монтирование лобби')
            unmountLobby()
            setTimeout(() => mountLobby(), 50)
        },
        forceUnmountLobby: () => {
            console.log('🔧 Принудительное удаление лобби')
            unmountLobby()
        },
        cleanupAll: () => {
            console.log('🧹 Принудительная очистка всего')
            stopEditor()
            unmountLobby()
        }
    }
}