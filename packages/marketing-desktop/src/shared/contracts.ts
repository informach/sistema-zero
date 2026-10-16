import type { StoryProps } from '@sistemazero/marketing-production'
import { z } from 'zod'

export const providerSchema = z.enum(['codex', 'claude'])
export type Provider = z.infer<typeof providerSchema>
export const runRequestSchema = z
  .object({
    provider: providerSchema,
    prompt: z.string().trim().min(1).max(12000),
    kind: z.enum(['copy', 'image', 'edit-image', 'video']),
    sourceAssetId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (['image', 'edit-image'].includes(value.kind) && value.provider !== 'codex') {
      context.addIssue({ code: 'custom', message: 'Imagem usa o Codex neste fluxo.' })
    }
    if (value.kind === 'edit-image' && !value.sourceAssetId) {
      context.addIssue({ code: 'custom', message: 'Escolha a imagem de origem.' })
    }
  })
export type RunRequest = z.infer<typeof runRequestSchema>
export type ProviderStatus = {
  provider: Provider
  available: boolean
  mode: string
  image: boolean
  reason?: string
}
export type Asset = {
  id: string
  name: string
  url: string
  mime: string
  sha256: string
  size: number
}
export type RunResult = {
  text: string
  assets: Asset[]
  provider: Provider
  mode: string
  durationMs: number
}
export type Progress = { stage: string; progress?: number }
export type DesktopBridge = {
  status: () => Promise<ProviderStatus[]>
  login: (provider: Provider) => Promise<void>
  run: (request: RunRequest) => Promise<RunResult>
  cancel: () => Promise<void>
  chooseMedia: () => Promise<Asset | null>
  render: (props: StoryProps) => Promise<Asset>
  exportAsset: (id: string) => Promise<boolean>
  onProgress: (listener: (progress: Progress) => void) => () => void
}
