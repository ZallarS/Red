// editor/actions.js

import { getTile, setTile } from './map.js'
import { ACTION, WS } from './protocol.js'
import { send } from './ws.js'

/* ============================================================
   ===============  MAP / DRAW ACTIONS (OLD) ==================
   ============================================================ */

export function createSetTileAction(x, y, tile) {
    const before = getTile(x, y)
    if (before === tile) return null

    return {
        type: ACTION.SET_TILE,
        x,
        y,
        before,
        after: tile
    }
}

export function applyAction(action) {
    if (!action) return

    switch (action.type) {
        case ACTION.BRUSH:
            for (const a of action.actions) {
                applyAction(a)
            }
            break

        case ACTION.SET_TILE:
            setTile(action.x, action.y, action.after)
            break
    }
}

export function revertAction(action) {
    if (!action) return

    switch (action.type) {
        case ACTION.BRUSH:
            for (let i = action.actions.length - 1; i >= 0; i--) {
                revertAction(action.actions[i])
            }
            break

        case ACTION.SET_TILE:
            setTile(action.x, action.y, action.before)
            break
    }
}

/* ============================================================
   ===================  USER / ROLE ACTIONS  ==================
   ============================================================ */

/**
 * Отправка запроса на смену роли пользователя
 * Вызывается ТОЛЬКО из UI (usersPanel)
 * Реальная проверка прав — на сервере
 */
export function setUserRole(targetUserId, role) {
    send({
        type: WS.ROLE_SET,
        targetUserId,
        role
    })
}
