import type { ModelMessage } from '../models/openrouter'
import { Artifacts } from '../store/artifacts'
export async function compact(messages: ModelMessage[], directory: string, budget: number) {
  const artifacts = new Artifacts(directory)
  const result = messages.map((message) => ({ ...message }))
  const references = []
  for (let index = 0; index < result.length - 2; index++) {
    if (Buffer.byteLength(JSON.stringify(result)) <= budget) break
    const message = result[index]
    if (
      !message?.content ||
      message.role === 'system' ||
      message.role === 'user' ||
      message.content.length < 3000
    )
      continue
    const reference = await artifacts.put(JSON.stringify(message), 'application/json')
    references.push(reference)
    message.content = `Archived ${message.role} content; retrieve with artifact_read. Reference: ${JSON.stringify(reference)}\nBeginning:\n${message.content.slice(0, 1000)}\nEnd:\n${message.content.slice(-1000)}`
  }
  return { messages: result, references, bytes: Buffer.byteLength(JSON.stringify(result)) }
}
