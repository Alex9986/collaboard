'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { remoteCursorExtension } from '@/lib/remoteCursors'

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  /** Called with the underlying EditorView when it's created/destroyed. */
  onCreateView?: (view: EditorView | null) => void
  /** Fired (throttled) when the local cursor/selection moves. */
  onCursorChange?: (from: number, to: number, docLength: number) => void
}

// Pusher limits client-event rate per socket; this keeps us comfortably under it.
const CURSOR_REPORT_INTERVAL = 150 // ms

export default function CodeMirrorEditor({
  value,
  onChange,
  onCreateView,
  onCursorChange,
}: CodeMirrorEditorProps) {
  const viewRef = useRef<EditorView | null>(null)
  const onCursorChangeRef = useRef(onCursorChange)
  const onCreateViewRef = useRef(onCreateView)

  // Keep the refs pointing at the latest prop values (read by stable callbacks).
  useEffect(() => {
    onCursorChangeRef.current = onCursorChange
    onCreateViewRef.current = onCreateView
  })

  // Throttle cursor reporting: send immediately when idle, else coalesce into
  // a trailing send.
  const lastSentRef = useRef(0)
  const pendingRef = useRef<{ from: number; to: number; docLength: number } | null>(null)
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const extensions = useMemo(
    () => [javascript({ typescript: true }), remoteCursorExtension],
    []
  )

  const reportCursor = useCallback(
    (from: number, to: number, docLength: number) => {
      onCursorChangeRef.current?.(from, to, docLength)
      lastSentRef.current = Date.now()
    },
    []
  )

  const handleCreateEditor = useCallback((view: EditorView) => {
    viewRef.current = view
    onCreateViewRef.current?.(view)
    // Let the room know where our cursor is as soon as we connect.
    const sel = view.state.selection.main
    onCursorChangeRef.current?.(sel.from, sel.to, view.state.doc.length)
  }, [])

  const handleUpdate = useCallback(
    (vu: ViewUpdate) => {
      if (!vu.selectionSet) return
      const { from, to } = vu.state.selection.main
      const now = Date.now()

      if (now - lastSentRef.current >= CURSOR_REPORT_INTERVAL) {
        if (cursorTimerRef.current) {
          clearTimeout(cursorTimerRef.current)
          cursorTimerRef.current = null
        }
        reportCursor(from, to, vu.state.doc.length)
      } else {
        pendingRef.current = { from, to, docLength: vu.state.doc.length }
        if (!cursorTimerRef.current) {
          cursorTimerRef.current = setTimeout(() => {
            cursorTimerRef.current = null
            if (pendingRef.current) {
              reportCursor(
                pendingRef.current.from,
                pendingRef.current.to,
                pendingRef.current.docLength
              )
              pendingRef.current = null
            }
          }, CURSOR_REPORT_INTERVAL - (now - lastSentRef.current))
        }
      }
    },
    [reportCursor]
  )

  useEffect(
    () => () => {
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
      if (viewRef.current) {
        onCreateViewRef.current?.(null)
        viewRef.current = null
      }
    },
    []
  )

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      onCreateEditor={handleCreateEditor}
      onUpdate={handleUpdate}
      extensions={extensions}
      theme={oneDark}
      height="100%"
      className="flex-1 h-full overflow-hidden rounded-md border border-gray-700"
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        highlightSelectionMatches: true,
        tabSize: 2,
      }}
    />
  )
}
