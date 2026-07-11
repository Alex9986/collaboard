'use client'

import { UserInfo } from '@/lib/cloudbase'

interface UserAvatarsProps {
  users: UserInfo[]
}

export default function UserAvatars({ users }: UserAvatarsProps) {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-pink-500', 'bg-yellow-500', 'bg-teal-500',
    'bg-orange-500', 'bg-indigo-500',
  ]

  const getColor = (name: string, index: number) => {
    // Use index for consistent color per position
    return colors[index % colors.length]
  }

  return (
    <div className="flex items-center gap-1.5">
      {users.map((user, index) => (
        <div
          key={user.name}
          className={`w-7 h-7 rounded-full ${getColor(user.name, index)} flex items-center justify-center text-xs font-semibold text-white`}
          title={`${user.name} (active)`}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  )
}
