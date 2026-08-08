import cloudbase from '@cloudbase/node-sdk'
import type { CloudBase } from '@cloudbase/node-sdk'

export interface UserInfo {
  name: string
  lastActive: number
}

export interface RoomDocument {
  _id: string
  roomId: string
  code: string
  /** Kept for backward compatibility; presence is now handled by Pusher. */
  users?: UserInfo[]
  createdAt: number
  lastUpdated: number
}

export interface RoomResponse {
  code: string
  lastUpdated: number
}

/** A member currently present in a room, sourced from the Pusher presence channel. */
export interface RoomMember {
  /** Unique Pusher presence member id (user_id). */
  id: string
  /** Display name, from user_info.name. */
  name: string
}

let cachedApp: CloudBase | null = null

function getApp(): CloudBase {
  if (cachedApp) return cachedApp

  cachedApp = cloudbase.init({
    env: process.env.CLOUDBASE_ENV_ID!,
    accessKey: process.env.CLOUDBASE_API_KEY!,
  })

  return cachedApp
}

export function getDb() {
  return getApp().database()
}
