'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import CodeMirrorEditor from '@/components/CodeMirrorEditor'
import RoomHeader from '@/components/RoomHeader'
import RoomStatus from '@/components/RoomStatus'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { RoomResponse } from '@/lib/cloudbase'

const POLL_INTERVAL = 1500
const HEARTBEAT_INTERVAL = 30_000
const PUT_DEBOUNCE = 500 // ms to wait after last keystroke before syncing

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const { t } = useLanguage()

  const [code, setCode] = useState('')
  const [users, setUsers] = useState<RoomResponse['users']>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)

  const nickname = useRef('')
  const localCodeRef = useRef('')
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const putTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingRef = useRef(false) // true while user is actively typing

  // Get nickname
  useEffect(() => {
    const savedName = localStorage.getItem('collaboard-nickname')
    if (!savedName) {
      router.push('/')
      return
    }
    nickname.current = savedName
  }, [router])

  // Polling for room state
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError(t.roomClosed)
          setIsConnected(false)
          return
        }
        throw new Error('Failed to fetch')
      }

      const data: RoomResponse = await res.json()

      setIsConnected(true)
      setError(null)
      setLastSync(Date.now())

      setUsers(data.users)

      // Only update from server if we're NOT currently typing
      if (!typingRef.current && data.code !== localCodeRef.current) {
        setCode(data.code)
        localCodeRef.current = data.code
      }
    } catch {
      setError(t.connectionLost)
      setIsConnected(false)
    }
  }, [roomId, t.connectionLost, t.roomClosed])

  // Start polling
  useEffect(() => {
    if (!nickname.current) return

    fetchRoom()

    pollingTimerRef.current = setInterval(fetchRoom, POLL_INTERVAL)
    heartbeatTimerRef.current = setInterval(() => {
      fetch(`/api/rooms/${roomId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nickname.current }),
      }).catch(() => {})
    }, HEARTBEAT_INTERVAL)

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
      if (putTimerRef.current) clearTimeout(putTimerRef.current)
    }
  }, [roomId, fetchRoom])

  // Leave room on background tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (nickname.current) {
        navigator.sendBeacon(
          `/api/rooms/${roomId}/leave`,
          JSON.stringify({ name: nickname.current })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [roomId])

  const handleCodeChange = useCallback((value: string) => {
    setCode(value)
    localCodeRef.current = value
    typingRef.current = true

    // Debounce: only send PUT after user pauses typing
    if (putTimerRef.current) clearTimeout(putTimerRef.current)
    putTimerRef.current = setTimeout(async () => {
      typingRef.current = false
      try {
        await fetch(`/api/rooms/${roomId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: localCodeRef.current, name: nickname.current }),
        })
      } catch {
        // Silent fail - next poll will sync
      }
    }, PUT_DEBOUNCE)
  }, [roomId])

  const handleLeave = () => {
    if (nickname.current) {
      navigator.sendBeacon(
        `/api/rooms/${roomId}/leave`,
        JSON.stringify({ name: nickname.current })
      )
    }
    router.push('/')
  }

  if (error === t.roomClosed) {
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
          />
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-t border-gray-800">
        <RoomStatus isConnected={isConnected} lastSync={lastSync} />
        <span className="text-gray-500 text-xs">
          {t.editingAs}: {nickname.current}
        </span>
      </div>
    </main>
  )
}
