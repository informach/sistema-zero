import {
  PYTHON_CONSOLE_LIMITS as LIMITS,
  type PythonConsoleBatch,
  type PythonConsoleStream,
} from './protocol'

type Chunk = { stream: PythonConsoleStream; text: string }
const add = (a: number, b: number) => Math.min(Number.MAX_SAFE_INTEGER, a + b)

/** Bounded before line buffering; preserves partial writes, newlines and split UTF-8. */
export function createPythonConsoleBuffer() {
  const ring = new Array<Chunk | undefined>(LIMITS.retainedChunks)
  let decoders = { stdout: new TextDecoder(), stderr: new TextDecoder() }
  let head = 0
  let count = 0
  let chars = 0
  const omitted = {
    stdout: { lines: 0, chars: 0 },
    stderr: { lines: 0, chars: 0 },
  }
  const take = (): Chunk => {
    const chunk = ring[head]!
    ring[head] = undefined
    head = (head + 1) % ring.length
    count--
    chars -= chunk.text.length
    return chunk
  }
  const evict = () => {
    const chunk = take()
    const counter = omitted[chunk.stream]
    counter.chars = add(counter.chars, chunk.text.length)
    for (let i = 0; i < chunk.text.length; i++)
      if (chunk.text.charCodeAt(i) === 10) counter.lines = add(counter.lines, 1)
  }
  const append = (stream: PythonConsoleStream, value: string): void => {
    for (let start = 0; start < value.length; ) {
      let end = Math.min(start + LIMITS.chunkChars, value.length)
      // Do not split a Unicode character between console events.
      const last = value.charCodeAt(end - 1)
      if (end < value.length && last >= 0xd800 && last <= 0xdbff) end--
      const text = value.slice(start, end)
      start = end
      while (count && chars + text.length > LIMITS.retainedChars) evict()
      const tail = count ? ring[(head + count - 1) % ring.length] : undefined
      if (tail?.stream === stream && tail.text.length + text.length <= LIMITS.chunkChars)
        tail.text += text
      else {
        if (count === ring.length) evict()
        ring[(head + count) % ring.length] = { stream, text }
        count++
      }
      chars += text.length
    }
  }
  const snapshot = (): PythonConsoleBatch[] => {
    const batches: PythonConsoleBatch[] = []
    for (const stream of ['stdout', 'stderr'] as const) {
      const counter = omitted[stream]
      if (counter.chars)
        batches.push({ stream, text: '', omittedLines: counter.lines, omittedChars: counter.chars })
    }
    for (let index = 0; index < count; index++) {
      const chunk = ring[(head + index) % ring.length]!
      const last = batches.at(-1)
      if (
        last?.stream === chunk.stream &&
        last.text.length + chunk.text.length <= LIMITS.batchChars
      )
        last.text += chunk.text
      else batches.push({ ...chunk, omittedLines: 0, omittedChars: 0 })
    }
    return batches
  }
  return {
    append,
    appendBatch(batch: PythonConsoleBatch) {
      omitted[batch.stream].chars = add(omitted[batch.stream].chars, batch.omittedChars)
      omitted[batch.stream].lines = add(omitted[batch.stream].lines, batch.omittedLines)
      append(batch.stream, batch.text)
    },
    snapshot,
    /** Suitable for Pyodide's Writer.write; no retained view into WASM memory. */
    write(stream: PythonConsoleStream, bytes: Uint8Array): number {
      for (let start = 0; start < bytes.byteLength; start += LIMITS.decodeBytes)
        append(
          stream,
          decoders[stream].decode(bytes.subarray(start, start + LIMITS.decodeBytes), {
            stream: true,
          }),
        )
      return bytes.byteLength
    },
    drain(): PythonConsoleBatch[] {
      const batches = snapshot()
      for (const stream of ['stdout', 'stderr'] as const) {
        const counter = omitted[stream]
        counter.lines = counter.chars = 0
      }
      ring.fill(undefined)
      head = count = chars = 0
      return batches
    },
    clear(): void {
      ring.fill(undefined)
      head = count = chars = 0
      for (const stream of ['stdout', 'stderr'] as const)
        omitted[stream].lines = omitted[stream].chars = 0
      decoders = { stdout: new TextDecoder(), stderr: new TextDecoder() }
    },
    get pendingChunks() {
      return count
    },
    get pendingChars() {
      return chars
    },
  }
}
