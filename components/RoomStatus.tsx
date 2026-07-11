'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

interface RoomStatusProps {
  isConnected: boolean
  lastSync: number | null
}

export default function RoomStatus({ isConnected, lastSync }: RoomStatusProps) {
  const { t } = useLanguage()

  const timeAgo = lastSync ? Math.round((Date.now() - lastSync) / 1000) : null

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
        {isConnected ? t.connected : t.disconnected}
      </span>
      {timeAgo !== null && (
        <span className="text-gray-500">
          ({t.synced} {timeAgo}s {t.ago})
        </span>
      )}
    </div>
  )
}
