import { z } from 'zod'
export const browserOpenSchema = z.object({
  headless: z.boolean().default(true),
  mode: z.enum(['plan', 'build']),
  publicWeb: z.boolean().default(true),
  localOrigins: z.array(z.url()).max(4).default([]),
  width: z.number().int().min(320).max(1920).default(1280),
  height: z.number().int().min(240).max(1080).default(800),
  accountDirectory: z.string().optional(),
})
export const browserTargetSchema = z.discriminatedUnion('by', [
  z.object({ by: z.literal('css'), value: z.string().min(1).max(500) }),
  z.object({ by: z.literal('text'), value: z.string().min(1).max(200) }),
  z.object({ by: z.literal('label'), value: z.string().min(1).max(200) }),
  z.object({ by: z.literal('testId'), value: z.string().min(1).max(200) }),
  z.object({
    by: z.literal('role'),
    role: z.enum([
      'button',
      'link',
      'textbox',
      'checkbox',
      'combobox',
      'option',
      'radio',
      'tab',
      'menuitem',
    ]),
    name: z.string().max(200),
  }),
])
export const browserActionSchema = z.object({
  expectedRevision: z.string(),
  action: z.enum(['click', 'fill', 'select', 'check', 'press', 'upload', 'download']),
  target: browserTargetSchema,
  value: z.string().max(8000).optional(),
  file: z
    .string()
    .regex(/^[a-f0-9-]{36}\.upload$/)
    .optional(),
  checked: z.boolean().optional(),
})
export const browserExtractSchema = z
  .array(
    z.object({
      name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/),
      target: browserTargetSchema,
      attribute: z.enum(['href', 'src', 'title', 'aria-label']).optional(),
    }),
  )
  .min(1)
  .max(20)
export const browserSnapshotSchema = z.object({
  url: z.string(),
  title: z.string(),
  revision: z.string(),
  text: z.string(),
  elements: z.array(
    z.object({
      selector: z.string(),
      tag: z.string(),
      role: z.string(),
      name: z.string(),
      type: z.string(),
    }),
  ),
  truncated: z.boolean(),
  diagnostics: z.array(
    z.object({ kind: z.string(), text: z.string(), url: z.string().optional() }),
  ),
})
export type BrowserSnapshot = z.infer<typeof browserSnapshotSchema>
export function redactUrl(input: string) {
  try {
    const url = new URL(input)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    const segments = url.pathname.split('/')
    let hide = false
    url.pathname = segments
      .map((segment) => {
        const redacted = hide || segment.length > 48 || /^[a-f0-9]{24,}$/i.test(segment)
        hide = /^(token|key|secret|password|auth|code)$/i.test(segment)
        return redacted ? '[redacted]' : segment
      })
      .join('/')
    url.hostname = url.hostname.replace(/[a-z0-9_-]{24,}/gi, 'redacted')
    return url.href
  } catch {
    return '[invalid URL]'
  }
}
export function redactText(input: string, limit = 2000) {
  return input
    .slice(0, limit)
    .replace(/https?:\/\/[^\s"'<>]+/g, (url) => redactUrl(url))
    .replace(/\bBearer\s+\S+|\b(?:sk|pk)-[a-zA-Z0-9_-]{12,}/g, '[credential redacted]')
}
