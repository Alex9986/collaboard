export type Language = 'zh' | 'en'

export interface Translations {
  title: string
  description: string
  yourName: string
  namePlaceholder: string
  roomId: string
  roomIdPlaceholder: string
  joinRoom: string
  copying: string
  copied: string
  room: string
  online: string
  leave: string
  connected: string
  disconnected: string
  synced: string
  ago: string
  editingAs: string
  roomClosed: string
  roomClosedDesc: string
  goHome: string
  connectionLost: string
  invalidName: string
  invalidRoomId: string
  startCoding: string
  language: string
  supportedLanguages: string
}

export const translations: Record<Language, Translations> = {
  zh: {
    title: 'Collaboard - 协同代码编辑',
    description: '多人实时协同代码编辑器',
    yourName: '你的名字',
    namePlaceholder: '输入你的昵称...',
    roomId: '房间号',
    roomIdPlaceholder: '输入房间号...',
    joinRoom: '加入房间',
    copying: '复制中...',
    copied: '已复制',
    room: '房间',
    online: '在线',
    leave: '离开',
    connected: '已连接',
    disconnected: '已断开',
    synced: '同步',
    ago: '前',
    editingAs: '编辑者',
    roomClosed: '房间已关闭',
    roomClosedDesc: '所有用户已离开此房间。',
    goHome: '返回首页',
    connectionLost: '连接丢失，正在重试...',
    invalidName: '名称需为1-30个字符',
    invalidRoomId: '房间号需为3-20位字母或数字',
    startCoding: '// 开始编码...',
    language: '语言',
    supportedLanguages: '支持语言',
  },
  en: {
    title: 'Collaboard - Collaborative Code Editor',
    description: 'Real-time collaborative code editor',
    yourName: 'Your Name',
    namePlaceholder: 'Enter your nickname...',
    roomId: 'Room ID',
    roomIdPlaceholder: 'Enter room ID...',
    joinRoom: 'Join Room',
    copying: 'Copying...',
    copied: 'Copied',
    room: 'Room',
    online: 'online',
    leave: 'Leave',
    connected: 'Connected',
    disconnected: 'Disconnected',
    synced: 'synced',
    ago: 'ago',
    editingAs: 'Editing as',
    roomClosed: 'Room Closed',
    roomClosedDesc: 'Everyone has left this room.',
    goHome: 'Go Home',
    connectionLost: 'Connection lost. Retrying...',
    invalidName: 'Name must be 1-30 characters',
    invalidRoomId: 'Room ID must be 3-20 alphanumeric characters',
    startCoding: '// Start coding...',
    language: 'Language',
    supportedLanguages: 'Supported',
  },
}
