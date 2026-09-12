import type { GalleryDeliveryPlan } from '@sistemazero/core/learning'
import { assetFromJson } from '@sistemazero/pinta/assets'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type { CallOpts, GatewayResponse } from '../server/gateway'
import { r2CopyObjectUgc, r2ReadCreationJson } from '../server/r2'
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
    message: z.string().max(2000).optional(),
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
  storage = { copy: r2CopyObjectUgc, read: r2ReadCreationJson },
) {
  return {
    POST: async (
      request: Request,
      ctx: { params: Promise<{ lessonId: string; blockId: string }> },
    ) => {
      const user = await session.getSession()
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
          { error: { code: 'VIEWER_CHANGED', message: 'O perfil mudou. Abra a aula novamente.' } },
          { status: 409 },
        )
      const { lessonId, blockId } = await ctx.params
      const raw = await request.text()
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
      const prepared = await gateway.gatewayFetch(`/members${path}/gallery-prepare`, {
        method: 'POST',
        body: parsed.data,
      })
      if (prepared.status !== 200)
        return NextResponse.json(prepared.body, { status: prepared.status })
      const plan = prepared.body
      if (plan.completed) return NextResponse.json(plan.result)
      try {
        // Validate the actual cloud file; the browser never supplies project contents or storage keys.
        let program: unknown = null
        for (const item of plan.snapshot.items) {
          const source = plan.copies.find((copy) => copy.destination === item.storageKey)
          if (!source) throw new Error('Referência de entrega indisponível.')
          const sourceJson = await storage.read(source.source)
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
            if (!record(full) || !record(full.files))
              throw new Error('O projeto não pôde ser aberto. Salve novamente no Estúdio.')
            const { assets: _assets, ...withoutAssets } = full
            program = withoutAssets
            if (JSON.stringify(program).length > 1_500_000)
              throw new Error('O programa deste projeto excede o limite da entrega.')
          }
        }
        let cursor = 0
        const copies = plan.copies
        async function worker() {
          while (cursor < copies.length) {
            const copy = copies[cursor++]
            if (copy) await storage.copy(copy.source, copy.destination)
          }
        }
        await Promise.all(Array.from({ length: Math.min(4, plan.copies.length) }, worker))
        const committed = await gateway.gatewayFetchHmac(
          `/members/internal${path}/gallery-commit`,
          {
            method: 'POST',
            body: {
              actor: {
                userId: user.id,
                accountId: user.activeProfile?.accountId ?? user.id,
                privileged: ['superadmin', 'admin', 'staff'].includes(user.role),
              },
              input: parsed.data,
              projectForChecks: program,
            },
          },
        )
        return NextResponse.json(committed.body, {
          status: committed.status,
          headers: { 'Cache-Control': 'private, no-store' },
        })
      } catch (cause) {
        // Keep deterministic copies after uncertain failures: a successful commit may have lost its response.
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
    },
  }
}
