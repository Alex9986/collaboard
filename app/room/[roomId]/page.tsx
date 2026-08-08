'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import CodeMirrorEditor from '@/components/CodeMirrorEditor'
import RoomHeader from '@/components/RoomHeader'
import RoomStatus from '@/components/RoomStatus'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { RoomMember } from '@/lib/cloudbase'
import type { PresenceChannel } from 'pusher-js'
import {
  applyRemoteCursor,
  clearRemoteCursors,
  remoteCursorColor,
  removeRemoteCursor,
} from '@/lib/remoteCursors'
import type { EditorView } from '@codemirror/view'

const PUT_DEBOUNCE = 500 // ms to wait after last keystroke before syncing
const CURSOR_REPORT_INTERVAL = 150 // ms; Pusher client-event rate limit

type ErrorKind = 'room-closed' | 'connection-lost'

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const { t } = useLanguage()

  const [code, setCode] = useState('')
  const [users, setUsers] = useState<RoomMember[]>([])
  const [isConnected, setIsConnected] = useState(false)
  // If Pusher isn't configured yet, show the disconnected state from the start.
  const [error, setError] = useState<ErrorKind | null>(() =>
    process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER
      ? null
      : 'connection-lost'
  )
  const [lastSync, setLastSync] = useState<number | null>(null)

  const nickname = useRef('')
  const localCodeRef = useRef('')
  const putTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingRef = useRef(false) // true while user is actively typing
  const putGenRef = useRef(0) // generation counter to prevent stale PUT callbacks

  // Remote cursor plumbing. Cursor updates go straight to the editor view,
  // bypassing React state so they don't re-render the whole page.
  const editorViewRef = useRef<EditorView | null>(null)
  const channelRef = useRef<PresenceChannel | null>(null) // current Pusher presence channel
  const lastCursorSentRef = useRef(0)
  const pendingCursorRef = useRef<{ from: number; to: number; docLength: number } | null>(null)
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get nickname
  useEffect(() => {
    const savedName = localStorage.getItem('collaboard-nickname')
    if (!savedName) {
      router.push('/')
      return
    }
    nickname.current = savedName
  }, [router])

  // Initial / resync load of room state (source of truth after reconnect)
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('room-closed')
          setIsConnected(false)
          return
        }
        throw new Error('Failed to fetch')
      }

      const data: { code: string; lastUpdated: number } = await res.json()

      setError(null)
      setLastSync(Date.now())

      // Only update from server if we're NOT currently typing
      if (!typingRef.current && data.code !== localCodeRef.current) {
        setCode(data.code)
        localCodeRef.current = data.code
      }
    } catch {
      setError('connection-lost')
    }
  }, [roomId])

  // Report our cursor position to the room, throttled to stay under Pusher's
  // client-event rate limit. docLength is the sender's document length at send
  // time; receivers use it to correct for the sync lag between peers.
  const handleCursorChange = useCallback(
    (from: number, to: number, docLength: number) => {
      const channel = channelRef.current
      if (!channel) return

      const send = (f: number, t: number) => {
        channel.trigger('client-cursor', {
          from: f,
          to: t,
          name: nickname.current,
          docLen: docLength,
        })
        lastCursorSentRef.current = Date.now()
      }

      const now = Date.now()
      if (now - lastCursorSentRef.current >= CURSOR_REPORT_INTERVAL) {
        if (cursorTimerRef.current) {
          clearTimeout(cursorTimerRef.current)
          cursorTimerRef.current = null
        }
        send(from, to)
      } else {
        pendingCursorRef.current = { from, to, docLength }
        if (!cursorTimerRef.current) {
          cursorTimerRef.current = setTimeout(() => {
            cursorTimerRef.current = null
            if (pendingCursorRef.current) {
              const pending = pendingCursorRef.current
              send(pending.from, pending.to)
              pendingCursorRef.current = null
            }
          }, CURSOR_REPORT_INTERVAL - (now - lastCursorSentRef.current))
        }
      }
    },
    []
  )

  // Connect to Pusher: presence (who's online) + code-updated broadcasts.
  // Replaces the old 1.5s polling + 30s heartbeat + visibilitychange logic.
  useEffect(() => {
    if (!nickname.current) return

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!pusherKey || !pusherCluster) return

    let disposed = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pusher: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    const connect = async () => {
      const { default: Pusher } = await import('pusher-js')
      if (disposed) return

      pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
        authEndpoint: `/api/rooms/${roomId}/pusher-auth`,
        auth: { params: { name: nickname.current } },
      })

      pusher.connection.bind('connected', () => {
        setIsConnected(true)
        setError(null)
      })
      pusher.connection.bind('disconnected', () => setIsConnected(false))
      pusher.connection.bind('reconnecting', () => setIsConnected(false))
      pusher.connection.bind('reconnected', () => {
        setIsConnected(true)
        setError(null)
        fetchRoom() // resync anything we missed while offline
      })

      channel = pusher.subscribe(`presence-room-${roomId}`)
      channelRef.current = channel

      channel.bind(
        'pusher:subscription_succeeded',
        (members: {
          members: Record<string, { name?: string } | undefined>
        }) => {
          if (disposed) return
          // members.members maps user_id -> user_info (not { id, info }).
          setUsers(
            Object.entries(members.members).map(([id, info]) => ({
              id,
              name: info?.name ?? id,
            }))
          )
          // Re-subscribed: drop cursors whose senders may be gone; they
          // re-appear as those members move their cursors again.
          clearRemoteCursors(editorViewRef.current)
        }
      )
      channel.bind(
        'pusher:member_added',
        (member: { id: string; info?: { name?: string } }) => {
          setUsers((prev) =>
            prev.some((u) => u.id === member.id)
              ? prev
              : [...prev, { id: member.id, name: member.info?.name ?? member.id }]
          )
        }
      )
      channel.bind(
        'pusher:member_removed',
        (member: { id: string; info?: { name?: string } }) => {
          setUsers((prev) => prev.filter((u) => u.id !== member.id))
          removeRemoteCursor(editorViewRef.current, member.id)
        }
      )

      // Remote cursor/selection updates. On presence channels Pusher passes
      // the sender's user_id as the event's second argument (metadata).
      channel.bind(
        'client-cursor',
        (
          data: { from?: number; to?: number; name?: string; docLen?: number },
          metadata: { user_id?: string }
        ) => {
          if (disposed) return
          const userId = metadata.user_id
          if (!userId || typeof data.from !== 'number' || typeof data.to !== 'number') {
            return
          }
          const view = editorViewRef.current
          if (!view) return

          // If the sender's document is longer than ours, they have edits we
          // haven't received yet. Those edits sit right before their cursor
          // (they're typing), so shift the cursor left by the delta to land on
          // the correct spot in our document.
          const docLen = view.state.doc.length
          const senderLen = typeof data.docLen === 'number' ? data.docLen : docLen
          const delta = Math.max(0, senderLen - docLen)

          applyRemoteCursor(view, {
            userId,
            name: data.name || userId,
            color: remoteCursorColor(userId),
            from: data.from - delta,
            to: data.to - delta,
          })
        }
      )

      channel.bind(
        'code-updated',
        (data: { code: string; lastUpdated: number }) => {
          setLastSync(Date.now())
          // Only update from the broadcast if we're NOT currently typing
          if (!typingRef.current && data.code !== localCodeRef.current) {
            setCode(data.code)
            localCodeRef.current = data.code
          }
        }
      )
    }

    // Initial fetch of room state. fetchRoom is async and only calls setState
    // after awaiting the response — this is a false positive from the lint rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRoom()
    connect()

    return () => {
      disposed = true
      if (channel) channel.unbind_all()
      if (pusher) pusher.disconnect()
      channelRef.current = null
      clearRemoteCursors(editorViewRef.current)
    }
  }, [roomId, fetchRoom])

  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value)
      localCodeRef.current = value
      typingRef.current = true

      // Bump the generation counter so stale PUT callbacks won't reset typingRef
      const gen = ++putGenRef.current

      // Debounce: only send PUT after user pauses typing
      if (putTimerRef.current) clearTimeout(putTimerRef.current)
      putTimerRef.current = setTimeout(async () => {
        // Retry up to 3 times on 409 conflict from concurrent writes
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(`/api/rooms/${roomId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: localCodeRef.current }),
            })
            if (res.status === 409) {
              // Conflict — brief backoff then retry with current local code
              await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
              continue
            }
            setLastSync(Date.now())
            break
          } catch {
            // Network error — retry
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
              continue
            }
          }
        }
        // Only reset typing guard if no new keystroke happened during PUT
        if (putGenRef.current === gen) {
          typingRef.current = false
        }
      }, PUT_DEBOUNCE)
    },
    [roomId]
  )

  const handleLeave = () => {
    // Pusher presence removes the member automatically on disconnect.
    router.push('/')
  }

  // Clear the pending cursor send timer on unmount.
  useEffect(
    () => () => {
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
    },
    []
  )

  if (error === 'room-closed') {
    return (
      <main className="flex flex-1 items-center justify-center bg-gray-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-2">{t.roomClosed}</h2>
          <p className="text-gray-400 mb-6">{t.roomClosedDesc}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            {t.goHome}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col flex-1 bg-gray-950">
      <RoomHeader
        roomId={roomId}
        users={users}
        onLeave={handleLeave}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {nickname.current && (
          <CodeMirrorEditor
            value={code}
            onChange={handleCodeChange}
            onCreateView={(view) => {
              editorViewRef.current = view
            }}
            onCursorChange={handleCursorChange}
          />
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-t border-gray-800">
        <RoomStatus isConnected={isConnected} lastSync={lastSync} />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">{t.supportedLanguages}:</span>
          <span className="px-2 py-0.5 bg-gray-800 text-yellow-400 rounded font-mono">JS</span>
          <span className="px-2 py-0.5 bg-gray-800 text-blue-400 rounded font-mono">TS</span>
        </div>
        <span className="text-gray-500 text-xs">
          {t.editingAs}: {nickname.current}
        </span>
      </div>
    </main>
  )
}
