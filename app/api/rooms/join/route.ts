import { NextRequest, NextResponse } from 'next/server'
import { getDb, RoomResponse } from '@/lib/cloudbase'

export async function POST(request: NextRequest) {
  try {
    const { roomId, name } = await request.json()

    // Validate inputs
    if (!roomId || !/^[a-zA-Z0-9_-]{3,20}$/.test(roomId)) {
      return NextResponse.json(
        { error: 'Room ID must be 3-20 alphanumeric characters' },
        { status: 400 }
      )
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 30) {
      return NextResponse.json(
        { error: 'Name must be 1-30 characters' },
        { status: 400 }
      )
    }

    const db = getDb()
    const collection = db.collection('rooms')

    // Query existing room
    const result = await collection.where({ roomId }).get()

    let room: { code: string; lastUpdated: number }

    if (result.data.length === 0) {
      // Create new room
      const now = Date.now()
      await collection.add({
        roomId,
        code: '// Start coding...',
        createdAt: now,
        lastUpdated: now,
      })
      room = { code: '// Start coding...', lastUpdated: now }
    } else {
      room = result.data[0]
    }

    const response: RoomResponse = {
      code: room.code,
      lastUpdated: room.lastUpdated,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Join room error:', error)
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    )
  }
}
