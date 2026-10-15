import { readdir } from 'node:fs/promises'
import { z } from 'zod'
import { tool } from './definition'
import { hash, readBounded, workspacePath } from './paths'

export const readTool = tool(
  'file_read',
  'Read a UTF-8 file range with current SHA-256. Use the hash for edits. Protected credentials are excluded.',
  'read',
  z.object({
    path: z.string(),
    startLine: z.number().int().positive().default(1),
    lines: z.number().int().min(1).max(300).default(200),
  }),
  async (input, context) => {
    const data = await readBounded(await workspacePath(context.workspace, input.path))
    if (data.includes(0)) throw new Error('Binary file; use an artifact viewer')
    const lines = data.toString('utf8').split('\n')
    return {
      path: input.path,
      sha256: hash(data),
      totalLines: lines.length,
      startLine: input.startLine,
      text: lines
        .slice(input.startLine - 1, input.startLine - 1 + input.lines)
        .join('\n')
        .slice(0, 32000),
    }
  },
)
export const listTool = tool(
  'directory_list',
  'List one workspace directory. Does not follow links.',
  'read',
  z.object({ path: z.string().default('.') }),
  async (input, context) => {
    const entries = await readdir(await workspacePath(context.workspace, input.path), {
      withFileTypes: true,
    })
    return {
      entries: entries
        .filter((entry) => !entry.name.startsWith('.env') && entry.name !== '.git')
        .slice(0, 500)
        .map((entry) => ({
          name: entry.name,
          directory: entry.isDirectory(),
          link: entry.isSymbolicLink(),
        })),
      truncated: entries.length > 500,
    }
  },
)
export const questionTool = tool(
  'task_question',
  'Ask the user for missing information. Never request credentials.',
  'read',
  z.object({
    prompt: z.string().min(1).max(4000),
    options: z.array(z.string().max(200)).max(8).default([]),
  }),
  (input, context) => context.ask(input.prompt, input.options),
)
