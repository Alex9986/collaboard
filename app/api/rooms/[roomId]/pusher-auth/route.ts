import { NextRequest, NextResponse } from 'next/server'
import { getPusher, roomChannel } from '@/lib/pusher'

/**
 * Authenticates a client's request to subscribe to the room's presence channel.
 * pusher-js POSTs socket_id, channel_name plus any auth.params (the user's name)
 * as form-encoded data.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params

    const form = await request.formData()
    const socketId = form.get('socket_id')
    const channelName = form.get('channel_name')
    const name = form.get('name')

    if (typeof socketId !== 'string' || typeof channelName !== 'string') {
      return NextResponse.json(
        { error: 'socket_id and channel_name are required' },
        { status: 400 }
      )
    }

    // Only ever authorize this room's own presence channel.
    if (channelName !== roomChannel(roomId)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }

    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName || trimmedName.length > 30) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const pusher = getPusher()
    if (!pusher) {
      return NextResponse.json(
        { error: 'Pusher is not configured' },
        { status: 500 }
      )
    }

    // user_id must be unique per member — nicknames can collide between users,
    // so generate a random id and keep the nickname in user_info for display.
    const auth = pusher.authorizeChannel(socketId, channelName, {
      user_id: crypto.randomUUID(),
      user_info: { name: trimmedName },
    })

    return NextResponse.json(auth)
  } catch (error) {
    console.error('Pusher auth error:', error)
    return NextResponse.json(
      { error: 'Failed to authenticate' },
      { status: 500 }
    )
  }
}
