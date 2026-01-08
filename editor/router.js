export function getRoute() {
    const parts = window.location.pathname.split('/').filter(Boolean)

    if (parts.length === 0) {
        return { type: 'lobby' }
    }

    if (parts[0] === 'room' && parts[1]) {
        return { type: 'room', roomId: parts[1] }
    }

    return { type: 'lobby' }
}

export function goToRoom(roomId) {
    history.pushState({}, '', `/room/${roomId}`)
    window.dispatchEvent(new Event('routechange'))
}

export function goToLobby() {
    history.pushState({}, '', '/')
    window.dispatchEvent(new Event('routechange'))
}
