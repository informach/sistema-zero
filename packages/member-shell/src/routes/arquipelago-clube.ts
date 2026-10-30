import 'server-only'
import { randomUUID } from 'node:crypto'
import {
  type EnvioAoClube,
  FotosNoClubeDoJogadorSchema,
  type SituacaoDoClube,
} from '@sistemazero/arquipelago-contracts'
import { NextResponse } from 'next/server'
import { isReadonlyImpersonation } from '../lib/act'
import { HUB_ATTACHMENT_LIMITS } from '../lib/hub-attachments'
import type { HubChannelView } from '../lib/types'
import type { HubClient, MembersAudience } from '../server/clients'
import type { GatewayModule } from '../server/gateway'
import { optimizeUgcImage, UnsupportedImageError } from '../server/image-optimizer'
import { type MediaModule, rejectOversizedRequest } from '../server/media'
import { r2PutObjectUgc } from '../server/r2'
import type { SessionModule } from '../server/session'

/** O servidor do Clube no hub e o canal das fotos do jogo (criado pela equipe, com aprovação). */
export const CLUBE_DAS_FOTOS = 'clube-dos-criadores'
export const CANAL_DAS_FOTOS = 'fotos-do-arquipelago'

const TITULO_DA_FOTO = 'Foto do Arquipélago'
const CORPO_DA_FOTO = 'Uma foto do meu Arquipélago Vagalume.'

/**
 * O canal das fotos só serve aberto a membros e com aprovação prévia: a foto nunca entra no Clube
 * sem um adulto da equipe olhar. Canal sem aprovação é tratado como inexistente.
 */
export function canalDasFotos(canais: readonly HubChannelView[]): HubChannelView | null {
  return (
    canais.find(
      (c) => c.slug === CANAL_DAS_FOTOS && c.postingPolicy === 'members' && c.requiresApproval,
    ) ?? null
  )
}

function resposta(situacao: SituacaoDoClube | EnvioAoClube, status: number) {
  const r = NextResponse.json({ situacao }, { status })
  r.headers.set('cache-control', 'private, no-store')
  return r
}

/**
 * Fotos no Clube (N08b, 30/10/2026): o modo foto do Arquipélago manda uma foto para o Clube dos
 * Criadores. Só no Kids, só com "Fotos no Clube" ligado pelos responsáveis e com o canal das
 * fotos no Clube que a criança vê. A imagem segue o caminho das imagens do Clube (reencodada,
 * sem metadados, no R2 de UGC) e o tópico entra na moderação do canal.
 * Plano: `docs/superpowers/plans/2026-10-30-arquipelago-fotos-no-clube.md`.
 */
export function createArquipelagoClubeRoutes(deps: {
  gateway: Pick<GatewayModule, 'gatewayFetch'>
  hub: Pick<HubClient, 'listChannels' | 'registerAttachment' | 'createThread'>
  media: Pick<MediaModule, 'requireUploadSession'>
  session: Pick<SessionModule, 'getSession'>
  audience: MembersAudience
  storage?: { put: typeof r2PutObjectUgc }
  otimizar?: typeof optimizeUgcImage
}) {
  const { gateway, hub, media, session, audience } = deps
  const put = deps.storage?.put ?? r2PutObjectUgc
  const otimizar = deps.otimizar ?? optimizeUgcImage

  /** A permissão dos responsáveis e o canal: o mesmo exame antes de oferecer e antes de mandar. */
  async function examinar(): Promise<
    { situacao: 'ligado'; canal: HubChannelView } | { situacao: Exclude<SituacaoDoClube, 'ligado'> }
  > {
    if (audience !== 'kids') return { situacao: 'sem-clube' }
    const permissao = await gateway.gatewayFetch('/arquipelago/clube', { method: 'GET' })
    if (permissao.status !== 200) return { situacao: 'fora-do-ar' }
    const lida = FotosNoClubeDoJogadorSchema.safeParse(permissao.body)
    if (!lida.success) return { situacao: 'fora-do-ar' }
    if (!lida.data.fotosNoClube) return { situacao: 'desligado' }
    const canais = await hub.listChannels(CLUBE_DAS_FOTOS)
    // Sem o Clube (produto à parte) o hub recusa ou esconde o servidor: o botão não aparece.
    if (canais.status === 403 || canais.status === 404) return { situacao: 'sem-clube' }
    if (canais.status !== 200 || !Array.isArray(canais.body?.items))
      return { situacao: 'fora-do-ar' }
    const canal = canalDasFotos(canais.body.items)
    return canal ? { situacao: 'ligado', canal } : { situacao: 'sem-clube' }
  }

  const arquipelagoClube = {
    GET: async () => {
      try {
        return resposta((await examinar()).situacao, 200)
      } catch {
        return resposta('fora-do-ar', 200)
      }
    },
  }

  const arquipelagoFotoNoClube = {
    POST: async (req: Request) => {
      const user = await media.requireUploadSession(req)
      if (user instanceof NextResponse) return user
      if (isReadonlyImpersonation(await session.getSession())) return resposta('falhou', 403)

      const maxBytes = HUB_ATTACHMENT_LIMITS.maxBytesByKind.image
      const grande = rejectOversizedRequest(req, maxBytes)
      if (grande) return grande

      try {
        const exame = await examinar()
        if (exame.situacao === 'desligado') return resposta('desligado', 403)
        if (exame.situacao === 'sem-clube') return resposta('sem-clube', 404)
        if (exame.situacao !== 'ligado') return resposta('falhou', 502)

        const form = await req.formData()
        const arquivo = form.get('file')
        // O jogo manda o PNG do canvas; qualquer outra coisa não é foto do jogo.
        if (
          !(arquivo instanceof File) ||
          arquivo.size === 0 ||
          arquivo.size > maxBytes ||
          arquivo.type !== 'image/png'
        )
          return resposta('falhou', 400)

        let otimizada: Awaited<ReturnType<typeof optimizeUgcImage>>
        try {
          otimizada = await otimizar(await arquivo.arrayBuffer(), 'image/png')
        } catch (erro) {
          if (erro instanceof UnsupportedImageError) return resposta('falhou', 400)
          throw erro
        }
        const key = `hub/${user.id}/${randomUUID()}.${otimizada.extension}`
        await put({ key, body: otimizada.buffer, contentType: otimizada.contentType })
        const anexo = await hub.registerAttachment({
          kind: 'image',
          mime: otimizada.contentType,
          sizeBytes: otimizada.sizeBytes,
          originalName: `arquipelago.${otimizada.extension}`,
          storageRef: `r2ugc:${key}`,
        })
        if (anexo.status !== 201 || !anexo.body?.id) return resposta('falhou', 502)
        const topico = await hub.createThread(exame.canal.id, {
          title: TITULO_DA_FOTO,
          body: CORPO_DA_FOTO,
          attachmentIds: [anexo.body.id],
        })
        if (topico.status !== 201 || !topico.body) return resposta('falhou', 502)
        return resposta(topico.body.status === 'visible' ? 'publicada' : 'em-moderacao', 201)
      } catch {
        return resposta('falhou', 502)
      }
    },
  }

  return { arquipelagoClube, arquipelagoFotoNoClube }
}
