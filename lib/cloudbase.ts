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
  users: UserInfo[]
  createdAt: number
  lastUpdated: number
}

export interface RoomResponse {
  code: string
  users: UserInfo[]
  lastUpdated: number
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
