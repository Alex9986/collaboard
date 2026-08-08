import { RangeSet, StateEffect, StateField } from '@codemirror/state'
import type { Extension, Range } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  GutterMarker,
  WidgetType,
  gutter,
} from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'

/**
 * Realtime remote-cursor rendering for CodeMirror 6, Google Docs style.
 *
 * - A StateField holds one entry per remote member (positions, name, color).
 *   Positions are remapped through every document change so they track edits.
 * - Decorations are derived from the field: a translucent highlight over the
 *   character under the caret, a full-height colored caret bar, and a colored
 *   selection highlight.
 * - Each member's name is rendered as a colored chip in a dedicated gutter
 *   (left margin), aligned with the line their cursor is on — so names never
 *   cover the code.
 *
 * Pusher/React code dispatches StateEffects via the helper functions below;
 * no React re-render is needed per cursor move.
 */

export interface RemoteCursor {
  userId: string
  name: string
  color: string
  from: number
  to: number
}

const CURSOR_COLORS = [
  '#3B82F6', // blue-500
  '#22C55E', // green-500
  '#A855F7', // purple-500
  '#EC4899', // pink-500
  '#EAB308', // yellow-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
]

/** Deterministic color per presence member, stable across all clients. */
export function remoteCursorColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

const setCursor = StateEffect.define<RemoteCursor>()
const removeCursor = StateEffect.define<string>()
const clearCursors = StateEffect.define<void>()

/** Full-height colored caret bar. */
class RemoteCursorBar extends WidgetType {
  constructor(readonly color: string) {
    super()
  }

  override toDOM() {
    const bar = document.createElement('span')
    bar.className = 'cm-remote-cursor-caret'
    bar.style.setProperty('--cursor-color', this.color)
    return bar
  }

  override eq(other: RemoteCursorBar) {
    return other.color === this.color
  }
}

/** A colored chip in the left gutter showing a member's name. */
class CursorNameMarker extends GutterMarker {
  constructor(
    readonly name: string,
    readonly color: string
  ) {
    super()
  }

  override toDOM() {
    const chip = document.createElement('span')
    chip.className = 'cm-remote-name-chip'
    chip.textContent = this.name
    chip.style.backgroundColor = this.color
    return chip
  }

  override eq(other: CursorNameMarker) {
    return other.name === this.name && other.color === this.color
  }
}

/** Zero-width spacer so the gutter collapses when no cursors are present. */
class CursorNameSpacer extends GutterMarker {
  override toDOM() {
    return document.createElement('span')
  }
}

const clampPos = (pos: number, max: number) => Math.max(0, Math.min(pos, max))

/**
 * Source of truth for remote cursors. Positions are clamped to the document
 * and remapped through changes in `update`, so the field always holds
 * coordinates valid for the current document.
 */
const cursorField = StateField.define<Map<string, RemoteCursor>>({
  create: () => new Map(),
  update(map, tr) {
    let next = map
    if (tr.docChanged) {
      const oldLen = tr.startState.doc.length
      const newLen = tr.state.doc.length

      // The React wrapper applies external value syncs as a full-document
      // replacement. `mapPos` is meaningless for that (every interior position
      // collapses to 0 or the end), so instead shift positions by the length
      // delta — this holds when the un-synced content sits before the cursor,
      // which is the case while a peer is typing.
      let fullReplace = true
      let ranges = 0
      tr.changes.iterChangedRanges((from, to) => {
        ranges++
        if (from !== 0 || to !== oldLen) fullReplace = false
      })
      if (ranges !== 1) fullReplace = false

      next = new Map()
      for (const [id, c] of map) {
        const from = fullReplace
          ? clampPos(c.from + (newLen - oldLen), newLen)
          : tr.changes.mapPos(c.from)
        const to = fullReplace
          ? clampPos(c.to + (newLen - oldLen), newLen)
          : tr.changes.mapPos(c.to)
        next.set(id, { ...c, from, to })
      }
    }
    for (const effect of tr.effects) {
      if (effect.is(setCursor)) {
        if (next === map) next = new Map(map)
        next.set(effect.value.userId, effect.value)
      } else if (effect.is(removeCursor)) {
        if (next.has(effect.value)) {
          if (next === map) next = new Map(map)
          next.delete(effect.value)
        }
      } else if (effect.is(clearCursors)) {
        next = new Map()
      }
    }
    return next
  },
})

function buildDecorations(
  cursors: ReadonlyMap<string, RemoteCursor>,
  docLength: number
): DecorationSet {
  const ranges: Range<Decoration>[] = []
  for (const c of cursors.values()) {
    const from = Math.min(c.from, docLength)
    const to = Math.min(c.to, docLength)

    if (from === to) {
      // Highlight the character under the caret (Google Docs style).
      if (from < docLength) {
        ranges.push(
          Decoration.mark({
            class: 'cm-remote-cursor-char',
            attributes: { style: `background-color: ${c.color}66` },
          }).range(from, from + 1)
        )
      }
      // Caret bar at the left edge of the highlighted character.
      ranges.push(
        Decoration.widget({
          widget: new RemoteCursorBar(c.color),
          side: -1,
        }).range(from)
      )
    } else {
      ranges.push(
        Decoration.mark({
          class: 'cm-remote-selection',
          attributes: { style: `background-color: ${c.color}40` },
        }).range(from, to),
        Decoration.widget({
          widget: new RemoteCursorBar(c.color),
          side: 1,
        }).range(to)
      )
    }
  }
  return Decoration.set(ranges, true)
}

function buildNameMarkers(view: EditorView) {
  const ranges: Range<GutterMarker>[] = []
  const doc = view.state.doc
  for (const c of view.state.field(cursorField).values()) {
    const pos = Math.min(c.to, doc.length)
    ranges.push(new CursorNameMarker(c.name, c.color).range(doc.lineAt(pos).from))
  }
  return ranges.length ? RangeSet.of(ranges, true) : RangeSet.empty
}

/** Left gutter showing a name chip per remote member, aligned by line. */
const nameGutter = gutter({
  class: 'cm-remote-names',
  markers: (view) => buildNameMarkers(view),
  initialSpacer: () => new CursorNameSpacer(),
})

/** CodeMirror extension enabling remote cursor rendering. */
export const remoteCursorExtension: Extension = [
  cursorField,
  EditorView.decorations.compute([cursorField], (state) =>
    buildDecorations(state.field(cursorField), state.doc.length)
  ),
  nameGutter,
]

/** Update or add one member's cursor. */
export function applyRemoteCursor(view: EditorView | null, cursor: RemoteCursor) {
  if (!view || !view.dom.isConnected) return
  const length = view.state.doc.length
  const from = Math.max(0, Math.min(cursor.from, length))
  const to = Math.max(0, Math.min(cursor.to, length))
  view.dispatch({ effects: setCursor.of({ ...cursor, from, to }) })
}

/** Remove a member's cursor (e.g. they left the presence channel). */
export function removeRemoteCursor(view: EditorView | null, userId: string) {
  if (!view || !view.dom.isConnected) return
  view.dispatch({ effects: removeCursor.of(userId) })
}

/** Clear all remote cursors (e.g. re-subscribed to the presence channel). */
export function clearRemoteCursors(view: EditorView | null) {
  if (!view || !view.dom.isConnected) return
  view.dispatch({ effects: clearCursors.of() })
}
