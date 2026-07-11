'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('collaboard-nickname')
    if (savedName) {
      setName(savedName)
    }
  }, [])

  const handleJoin = async () => {
    setError('')

    const trimmedName = name.trim()
    const trimmedRoom = roomId.trim()

    if (!trimmedName || trimmedName.length > 30) {
      setError(t.invalidName)
      return
    }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(trimmedRoom)) {
      setError(t.invalidRoomId)
      return
    }

    setLoading(true)

    try {
      localStorage.setItem('collaboard-nickname', trimmedName)

      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: trimmedRoom, name: trimmedName }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to join room')
        return
      }

      router.push(`/room/${trimmedRoom}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin()
    }
  }

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8)
    setRoomId(id)
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gray-950">
      <div className="w-full max-w-md px-6">
        {/* Lang toggle */}
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>

        {/* Logo / Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Collaboard
          </h1>
          <p className="text-gray-400 text-lg">
            {t.description}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          {/* Name Input */}
          <div className="mb-5">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              {t.yourName}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.namePlaceholder}
              maxLength={30}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Room ID Input */}
          <div className="mb-6">
            <label
              htmlFor="roomId"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              {t.roomId}
            </label>
            <div className="flex gap-2">
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.roomIdPlaceholder}
                maxLength={20}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="px-3 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Generate random room ID"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? '...' : t.joinRoom}
          </button>
        </div>
      </div>
    </main>
  )
}
