import Pusher from 'pusher'

/**
 * Server-side Pusher singleton. Only ever imported from Route Handlers.
 *
 * Returns null when the env vars aren't configured yet (e.g. before the user
 * fills in their Pusher credentials), so the app degrades instead of crashing.
 */
let cachedPusher: Pusher | null = null

export function getPusher(): Pusher | null {
  if (cachedPusher) return cachedPusher

  const appId = process.env.PUSHER_APP_ID
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!appId || !key || !secret || !cluster) {
    console.error(
      '[pusher] Missing configuration. Add PUSHER_APP_ID, PUSHER_SECRET, ' +
        'NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER to your env.'
    )
    return null
  }

  cachedPusher = new Pusher({ appId, key, secret, cluster, useTLS: true })
  return cachedPusher
}

/** Convenience helper: build the presence channel name for a room. */
export function roomChannel(roomId: string): string {
  return `presence-room-${roomId}`
}
