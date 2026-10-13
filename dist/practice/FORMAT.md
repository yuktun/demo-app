# Editable score formats

All positions are finite numbers. All visible strings are rendered as text, never HTML. Unknown formats or invalid events reject the entire import before changing the current score. Unknown JSON fields within supported formats are preserved at root, page, bar and event levels. The 2 MB limit applies to UTF-8 bytes of the actual indented backup output, not JavaScript character count.

## Native format

```json
{
  "format": "letter-score",
  "version": 1,
  "title": "Original example",
  "referenceKey": "C",
  "selectedKey": "C",
  "annotation": "",
  "pages": [{
    "id": "page-1", "label": "1",
    "measures": [{
      "id": "bar-1", "label": "1", "beats": 4, "subdivision": 2,
      "annotation": "",
      "events": [{
        "id": "event-1", "type": "note", "letter": "F", "accidental": "",
        "octave": 1, "positionMode": "source-grid", "at": 1.5,
        "duration": null, "uncertain": true, "annotation": "Check source position"
      }]
    }]
  }]
}
```

IDs are unique within the document. Missing native-format IDs can be generated on import; source-transcription IDs must be supplied and stable. Event types: `note`, `chord` (field `chord`), `rest`, `symbol` (fields `symbol` and `lane: melody|chord`). Notes use `letter: A..G`, explicit accidental string (including original Unicode sharp/flat characters), and `octave: -3..3`, meaning literal lower-line/upper-dot counts, not a scientific octave or MIDI pitch. A nonnegative duration is not invented; `null` means unconfirmed. Numeric durations must be positive and fit in the bar when the position is beat-based.

Position modes:

- `beat`: zero-based beat onset. The UI shows one-based positions.
- `source-grid`: zero-based printed grid index; fractional indices are retained exactly. This does not assert rhythmic timing.
- `relative`: 0..1 horizontal coordinate; the UI shows a percentage.

`beats` is 1..12; `subdivision` is 1, 2 or 4. Imported transcription counts describe printed layout, not an inferred conventional time signature. Source-backed native storage additionally contains `sourceDocument`; export projects corrections back into the source schema.

## Manual transcription schema

Accepted discriminator: `documentType: editable-letter-note-chord-score`, `schemaVersion: 1.0.0`.

Required structural fields:

- `title` string; `referenceKey.label` and `selectedKey.label` strings.
- `beatGrid.countsPerMeasure` and `beatGrid.printedColumns[]`.
- `measures[]` with stable `id`, `order`, `source.page`, `events[]`, `chords[]`.
- Note event: `type: note`, `position.gridIndex`, `note.letter`, nullable `note.accidental`, `note.sourceSpelling`, `note.octaveMark: {dotsAbove, linesBelow}`, and nullable `duration`.
- Chord event: `type: chord`, exact `label`, `position`, nullable `duration`.
- Uninterpreted mark: `type: uninterpreted_mark`, literal `label`, `position`, nullable `duration`. Its collection determines melody/chord lane.

The original object is retained privately in local state. Both `events` and `chords` arrays and stable measure/event IDs are required. Melody collections accept notes, explicit rests and uninterpreted marks; chord collections accept chord labels and uninterpreted marks. Wrong-lane types, missing IDs/collections and malformed embedded sources reject before replacement. No implicit migration is performed.

Unchanged imports export structurally equal JSON, preserving unknown fields, nulls, source provenance, encoding, uncertainties and verification. Editing creates `editor` metadata and sets affected measure/root verification to `edited_needs_review`. Original `note.sourceSpelling` remains literal provenance even when current note fields are corrected; annotation/position/uncertainty changes do not rewrite it or normalize accidentals. Deleting events/bars removes them from the exported current score; unrelated metadata remains. New events receive stable IDs. Explicit editor positions override source layout on subsequent import; source-relative positions remain non-rhythmic. Every accepted source-backed state is checked for safe export and backup byte size.

Limitations: simultaneous upper dots and lower lines on the same note are rejected because the current control cannot represent them without loss. Unsupported event types reject rather than disappearing. The editor does not infer durations, rests, absolute pitches, chord meanings or transcription accuracy.
