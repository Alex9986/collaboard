import { NextRequest, NextResponse } from 'next/server'
import { getDb, RoomResponse } from '@/lib/cloudbase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const db = getDb()
    const collection = db.collection('rooms')
    const result = await collection.where({ roomId }).get()

    if (result.data.length === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    const room = result.data[0]

    // Check for stale users (inactive > 60s)
    const now = Date.now()
    const staleTimeout = 60_000
    const activeUsers = (room.users || []).filter(
      (u: { lastActive: number }) => now - u.lastActive < staleTimeout
    )

    // If users changed, update the document
    if (activeUsers.length !== (room.users || []).length) {
      await collection.doc(room._id).update({ users: activeUsers })
    }

    const response: RoomResponse = {
      code: room.code,
      users: activeUsers,
      lastUpdated: room.lastUpdated,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get room error:', error)
    return NextResponse.json(
      { error: 'Failed to get room' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { code, name } = await request.json()

    if (typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      )
    }

    const db = getDb()
    const collection = db.collection('rooms')
    const result = await collection.where({ roomId }).get()

    if (result.data.length === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    const doc = result.data[0]
    const now = Date.now()
    const trimmedName = name?.trim() || 'anonymous'

    // Update code and user's lastActive
    const updatedUsers = (doc.users || []).map(
      (u: { name: string }) =>
        u.name === trimmedName ? { ...u, lastActive: now } : u
    )

    await collection.doc(doc._id).update({
      code,
      users: updatedUsers,
      lastUpdated: now,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update room error:', error)
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    )
  }
}
