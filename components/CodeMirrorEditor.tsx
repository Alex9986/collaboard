'use client'

import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function CodeMirrorEditor({ value, onChange }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={[javascript({ typescript: true })]}
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
