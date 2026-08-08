import { NextRequest, NextResponse } from 'next/server'
import { getDb, RoomResponse } from '@/lib/cloudbase'
import { getPusher, roomChannel } from '@/lib/pusher'

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

    const response: RoomResponse = {
      code: room.code,
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
    const { code } = await request.json()

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

    // Optimistic concurrency: only update if lastUpdated hasn't changed since we read it
    const updateResult = await collection
      .where({ roomId, lastUpdated: doc.lastUpdated })
      .update({
        code,
        lastUpdated: now,
      })

    // If 0 documents matched, someone else wrote in between — reject so client retries
    if (updateResult.updated === 0) {
      return NextResponse.json(
        { error: 'Conflict — document was modified since last read. Retry.' },
        { status: 409 }
      )
    }

    // Push the new code to everyone in the room. If this fails the DB write is
    // still the source of truth — clients resync via GET on reconnect.
    const pusher = getPusher()
    if (pusher) {
      await pusher.trigger(roomChannel(roomId), 'code-updated', {
        code,
        lastUpdated: now,
      })
    }

    return NextResponse.json({ success: true, lastUpdated: now })
  } catch (error) {
    console.error('Update room error:', error)
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    )
  }
}
