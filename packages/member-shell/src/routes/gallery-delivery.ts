import { awaitWithSignal } from '@sistemazero/core/http'
import {
  GalleryCopyGenerationSchema,
  type GalleryDeliveryPlan,
  GalleryStudioSourceSchema,
  type GallerySubmissionItem,
} from '@sistemazero/core/learning'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import { assetFromJson } from '@sistemazero/pinta/assets'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type { CallOpts, GatewayResponse } from '../server/gateway'
import { r2CopyObjectUgc, r2PresignGetUgc, r2ReadCreationJson } from '../server/r2'
import type { SessionModule } from '../server/session'

const Input = z
  .object({
    requestId: z.uuid(),
    revision: z.string().min(1).max(32),
    items: z
      .array(
        z
          .object({
            itemId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
            revision: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    // 1000: o teto da coluna `studio_submissions.message` (acima disso o members dava 500).
    message: z.string().max(1000).optional(),
    // O recado veio da fala transcrita (botão "Falar" do Kids): a equipe vê o chip "falado".
    messageSpoken: z.boolean().optional(),
  })
  .strict()
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export function createGalleryDeliveryRoutes(
  session: Pick<SessionModule, 'getSession'>,
  gateway: {
    gatewayFetch: (path: string, opts: CallOpts) => Promise<GatewayResponse<GalleryDeliveryPlan>>
    gatewayFetchHmac: (path: string, opts: CallOpts) => Promise<GatewayResponse>
  },
  storage: {
    copy: typeof r2CopyObjectUgc
    read: typeof r2ReadCreationJson
    sign?: typeof r2PresignGetUgc
  } = { copy: r2CopyObjectUgc, read: r2ReadCreationJson, sign: r2PresignGetUgc },
) {
  return {
    POST: async (
      request: Request,
      ctx: { params: Promise<{ lessonId: string; blockId: string }> },
    ) => {
      const owned = <Value>(operation: () => Promise<Value>) =>
        awaitWithSignal(operation, request.signal)
      const execute = async () => {
        const user = await owned(() => session.getSession())
        if (!user)
          return NextResponse.json(
            { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada.' } },
            { status: 401 },
          )
        if (user.status !== 'active' || isReadonlyImpersonation(user))
          return NextResponse.json(
            { error: { code: 'FORBIDDEN', message: 'Não é possível enviar nesta sessão.' } },
            { status: 403 },
          )
        if (request.headers.get('x-sz-viewer') !== user.id)
          return NextResponse.json(
            {
              error: {
                code: 'VIEWER_CHANGED',
                message: 'O perfil mudou. Abra esta página de novo.',
              },
            },
            { status: 409 },
          )
        const { lessonId, blockId } = await owned(() => ctx.params)
        const raw = await owned(() => request.text())
        let value: unknown
        try {
          value = raw.length <= 64000 ? JSON.parse(raw) : null
        } catch {
          value = null
        }
        const parsed = Input.safeParse(value)
        if (
          !parsed.success ||
          !z.uuid().safeParse(lessonId).success ||
          !z.uuid().safeParse(blockId).success
        )
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Seleção inválida.' } },
            { status: 400 },
          )
        const path = `/lessons/${lessonId}/blocks/${blockId}`
        const prepared = await owned(() =>
          gateway.gatewayFetch(`/members${path}/gallery-prepare`, {
            method: 'POST',
            body: parsed.data,
            signal: request.signal,
          }),
        )
        if (prepared.status !== 200)
          return NextResponse.json(prepared.body, { status: prepared.status })
        const plan = prepared.body
        if (plan.completed) return NextResponse.json(plan.result)
        try {
          if (!GalleryCopyGenerationSchema.safeParse(plan.copyGeneration).success)
            throw new Error('A tentativa de cópia da galeria é inválida.')
          let cursor = 0
          const copies = plan.copies
          async function worker() {
            while (cursor < copies.length) {
              const copy = copies[cursor++]
              if (copy) await owned(() => storage.copy(copy.source, copy.destination))
            }
          }
          await Promise.all(Array.from({ length: Math.min(4, plan.copies.length) }, worker))
          // Validate the actual cloud file; the browser never supplies project contents or storage keys.
          let program: unknown = null
          let pythonItem: GallerySubmissionItem | undefined
          for (const item of plan.snapshot.items) {
            const source = plan.copies.find((copy) => copy.destination === item.storageKey)
            if (!source) throw new Error('Referência do envio indisponível.')
            const sourceJson = await owned(() => storage.read(item.storageKey))
            if (plan.snapshot.tool === 'pinta') {
              const asset = assetFromJson(JSON.stringify(sourceJson)).asset
              if (!asset || asset.id !== item.itemId)
                throw new Error(
                  'Um desenho não pôde ser aberto. Abra o Pinta, salve novamente e atualize a galeria.',
                )
            } else {
              const full =
                record(sourceJson) &&
                sourceJson.format === 'sz-studio-parts' &&
                sourceJson.version === 1
                  ? sourceJson.program
                  : sourceJson
              if (
                !record(full) ||
                !(record(full.files) || (full.kind === 'pro' && record(full.tree)))
              )
                throw new Error('O projeto não pôde ser aberto. Salve novamente no Estúdio.')
              if (full.programmingLanguage === 'python') {
                const document = StudioProjectDocumentSchema.safeParse(full)
                if (!document.success || document.data.id !== item.itemId)
                  throw new Error(
                    'Este projeto Python é diferente do que foi escolhido. Salve novamente no Estúdio.',
                  )
                pythonItem = item
                continue
              }
              const { assets: _assets, ...withoutAssets } = full
              program = withoutAssets
              if (JSON.stringify(program).length > 1_500_000)
                throw new Error('O programa deste projeto passa do limite do envio.')
            }
          }
          if (pythonItem) {
            const sign = storage.sign
            if (!sign) throw new Error('A leitura da cópia Python está indisponível agora.')
            const item = pythonItem
            program = GalleryStudioSourceSchema.parse({
              format: 'sz-studio-gallery-source',
              version: 1,
              itemId: item.itemId,
              revision: item.revision,
              source: {
                storageKey: item.storageKey,
                url: await owned(() => sign(item.storageKey)),
              },
              parts: await Promise.all(
                item.parts.map(async (part) => ({
                  ...part,
                  url: await owned(() => sign(part.storageKey)),
                })),
              ),
            })
          }
          const committed = await owned(() =>
            gateway.gatewayFetchHmac(`/members/internal${path}/gallery-commit`, {
              method: 'POST',
              signal: request.signal,
              body: {
                actor: {
                  userId: user.id,
                  accountId: user.activeProfile?.accountId ?? user.id,
                  privileged: ['superadmin', 'admin', 'staff'].includes(user.role),
                },
                input: parsed.data,
                copyGeneration: plan.copyGeneration,
                projectForChecks: program,
              },
            }),
          )
          return NextResponse.json(committed.body, {
            status: committed.status,
            headers: { 'Cache-Control': 'private, no-store' },
          })
        } catch (cause) {
          if (request.signal.aborted) throw cause
          // Keep this isolated generation after an uncertain failure: its commit may have succeeded.
          return NextResponse.json(
            {
              error: {
                code: 'GALLERY_DELIVERY_FAILED',
                message:
                  cause instanceof Error
                    ? cause.message
                    : 'Não foi possível enviar. Suas criações continuam na galeria; tente novamente.',
              },
            },
            { status: 503 },
          )
        }
      }
      try {
        return await owned(execute)
      } catch (error) {
        if (request.signal.aborted)
          return NextResponse.json(
            { error: { code: 'REQUEST_CANCELLED', message: 'O envio foi cancelado.' } },
            { status: 499 },
          )
        throw error
      }
    },
  }
}
