/// <reference lib="webworker" />
import { z } from 'zod'
import { Journal } from './database'
import { storeCommand } from './schema'

let journal: Journal | undefined
const envelope = z.object({
  id: z.string(),
  file: z.string().optional(),
  command: storeCommand.optional(),
})
self.onmessage = ({ data }: MessageEvent<unknown>) => {
  const message = envelope.parse(data)
  try {
    if (message.file) {
      if (journal) throw new Error('Store already initialized')
      journal = new Journal(message.file)
      self.postMessage({ id: message.id, ok: true, value: null })
      return
    }
    if (!journal || !message.command) throw new Error('Store not initialized')
    if (message.command.op === 'close') {
      journal.close()
      self.postMessage({ id: message.id, ok: true, value: null })
      self.close()
      return
    }
    self.postMessage({ id: message.id, ok: true, value: journal.execute(message.command) })
  } catch (error) {
    self.postMessage({
      id: message.id,
      ok: false,
      error: `${message.command?.op ?? 'initialize'}: ${error instanceof Error ? error.message : 'Store error'}`,
    })
  }
}
