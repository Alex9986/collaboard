import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/cloudbase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { name } = await request.json()

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

    const updatedUsers = (doc.users || []).map(
      (u: { name: string }) =>
        u.name === trimmedName ? { ...u, lastActive: now } : u
    )

    await collection.doc(doc._id).update({ users: updatedUsers })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json(
      { error: 'Failed to send heartbeat' },
      { status: 500 }
    )
  }
}
