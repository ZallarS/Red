import { getRoute, goToLobby } from './router.js'
import { mountLobby, unmountLobby, onRoomCreated } from './lobby.js'
import { getNetworkManager, WS_PROTOCOL } from './network.js'
import { initEditor } from './editorCore.js'
import { createExitButton, removeExitButton, cleanupUI } from './ui/ui.js'

let editorInstance = null
let currentRoomId = null

// Создаем экземпляр сетевого менеджера
const networkManager = getNetworkManager()

function startEditor(snapshot) {
    if (editorInstance) {
        console.log('⚠️ Редактор уже запущен, останавливаем...')
        stopEditor()
    }

    unmountLobby()
    editorInstance = initEditor(snapshot)
    currentRoomId = snapshot.roomId
    createExitButton()
    console.log('🎮 Редактор запущен для комнаты:', currentRoomId)
}

function stopEditor() {
    console.log('🛑 Остановка редактора...')

    if (editorInstance && editorInstance.cleanup) {
        editorInstance.cleanup()
    } else if (window.__canvasverse_uiInitialized && cleanupUI) {
        cleanupUI()
    }

    const canvas = document.getElementById('canvas')
    if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    if (networkManager.getStatus() === 'online' && currentRoomId) {
        console.log(`📤 Отправляем запрос на выход из комнаты ${currentRoomId}`)
        networkManager.send({
            type: WS_PROTOCOL.ROOM_LEAVE,
            roomId: currentRoomId
        })
    }

    editorInstance = null
    currentRoomId = null
    removeExitButton()
    console.log('✅ Редактор остановлен')
}

function handleRoute(event) {
    const route = getRoute()
    console.log('📍 Маршрут изменен:', route)

    if (route.type === 'lobby') {
        if (editorInstance || currentRoomId) {
            console.log('🔄 Переход из комнаты в лобби')
            stopEditor()
        }

        unmountLobby()
        setTimeout(() => mountLobby(), 100)
        return
    }

    if (route.type === 'room') {
        if (currentRoomId === route.roomId) {
            console.log('⚠️ Уже в этой комнате')
            return
        }

        if (currentRoomId && currentRoomId !== route.roomId) {
            console.log(`🔄 Переход из комнаты ${currentRoomId} в ${route.roomId}`)
            stopEditor()
        }

        unmountLobby()
        setTimeout(() => {
            console.log(`🔗 Присоединяемся к комнате: ${route.roomId}`)

            // Проверяем, есть ли пароль в деталях события
            const password = event?.detail?.password || ''

            networkManager.send({
                type: WS_PROTOCOL.ROOM_JOIN,
                roomId: route.roomId,
                password: password
            })
        }, 100)
    }
}

// События
window.addEventListener('routechange', handleRoute)
window.addEventListener('popstate', handleRoute)

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск CanvasVerse...')
    networkManager.connect()

    networkManager.on('message', msg => {
        if (msg.type === WS_PROTOCOL.ROOM_CREATED) onRoomCreated(msg.roomId)
        if (msg.type === WS_PROTOCOL.ROOM_SNAPSHOT) startEditor(msg)
        if (msg.type === WS_PROTOCOL.ERROR) {
            alert(msg.message)
            history.pushState({}, '', '/')
            handleRoute()
        }
    })

    setTimeout(handleRoute, 100)
})

// Глобальный доступ
window.CanvasVerse = {
    exitToLobby: () => {
        console.log('🚪 Выход в лобби')
        stopEditor()
        goToLobby()
    },
    getCurrentRoom: () => currentRoomId,
    getEditorInstance: () => editorInstance,
    getNetworkManager: () => networkManager
}