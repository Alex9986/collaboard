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
      return NextResponse.json({ success: true })
    }

    const doc = result.data[0]
    const trimmedName = name?.trim() || 'anonymous'

    const remainingUsers = (doc.users || []).filter(
      (u: { name: string }) => u.name !== trimmedName
    )

    if (remainingUsers.length === 0) {
      // Room is empty, delete it
      await collection.doc(doc._id).remove()
    } else {
      await collection.doc(doc._id).update({ users: remainingUsers })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave room error:', error)
    return NextResponse.json(
      { error: 'Failed to leave room' },
      { status: 500 }
    )
  }
}
