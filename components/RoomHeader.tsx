'use client'

import { useState } from 'react'
import { UserInfo } from '@/lib/cloudbase'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageToggle from './LanguageToggle'
import UserAvatars from './UserAvatars'

interface RoomHeaderProps {
  roomId: string
  users: UserInfo[]
  onLeave: () => void
}

export default function RoomHeader({ roomId, users, onLeave }: RoomHeaderProps) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = roomId
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const generateNewRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8)
    window.location.href = `/room/${newRoomId}`
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white">Collaboard</h1>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-md">
          <span className="text-gray-400 text-sm">{t.room}:</span>
          <span className="text-cyan-400 font-mono font-semibold">{roomId}</span>
          <button
            onClick={copyLink}
            className="text-gray-400 hover:text-white transition-colors text-sm ml-1"
            title="Copy room ID"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <UserAvatars users={users} />
        <span className="text-gray-400 text-sm">{users.length} {t.online}</span>
        <button
          onClick={generateNewRoom}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
        >
          {t.newRoom}
        </button>
        <LanguageToggle />
        <button
          onClick={onLeave}
          className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          {t.leave}
        </button>
      </div>
    </header>
  )
}
