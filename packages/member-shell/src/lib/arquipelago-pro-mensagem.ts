import { z } from 'zod'

/**
 * O modo Código (Pro, com o WebContainer) fora da página do jogo (lacunas, 01/11/2026). Para a
 * página do jogo dispensar o `unsafe-eval`, o Pro abre na rota isolada `/estudio/pro/...` dentro de
 * um quadro, com `?embed=arquipelago`; quando a pessoa sai ou termina o desafio, a rota avisa o
 * jogo por `postMessage`, só para a mesma origem.
 */
export const EMBED_DO_ARQUIPELAGO = 'arquipelago'

export const MensagemDoProSchema = z.discriminatedUnion('evento', [
  /** Saiu do editor Pro (o projeto já subiu para a nuvem). */
  z.strictObject({ tipo: z.literal('arquipelago-pro'), evento: z.literal('saiu') }),
  /** Terminou o desafio Pro: `concluido` diz se ele foi aprovado nesta abertura. */
  z.strictObject({
    tipo: z.literal('arquipelago-pro'),
    evento: z.literal('desafio'),
    desafioId: z.uuid(),
    concluido: z.boolean(),
  }),
])
export type MensagemDoPro = z.infer<typeof MensagemDoProSchema>

/** A rota isolada avisa o jogo que a abriu (só quando está num quadro da mesma origem). */
export function avisarOJogo(mensagem: MensagemDoPro, janela: Window = window): boolean {
  if (janela.parent === janela) return false
  janela.parent.postMessage(MensagemDoProSchema.parse(mensagem), janela.location.origin)
  return true
}

/**
 * Lê uma mensagem do quadro do Pro: só da mesma origem e da janela do próprio quadro, e só no
 * formato combinado. Qualquer outra coisa é `null`.
 */
export function lerMensagemDoPro(
  evento: Pick<MessageEvent, 'origin' | 'source' | 'data'>,
  quadro: Window | null,
  origem: string,
): MensagemDoPro | null {
  if (!quadro || evento.origin !== origem || evento.source !== quadro) return null
  const lida = MensagemDoProSchema.safeParse(evento.data)
  return lida.success ? lida.data : null
}

/** O endereço da rota isolada para um projeto Pro ou para um desafio Pro. */
export function enderecoDoPro(
  alvo: { projetoId: string } | { desafioId: string; revisao: number },
): string {
  const consulta = `embed=${EMBED_DO_ARQUIPELAGO}`
  if ('projetoId' in alvo) return `/estudio/pro/${encodeURIComponent(alvo.projetoId)}?${consulta}`
  return `/estudio/pro/desafio/${encodeURIComponent(alvo.desafioId)}?revisao=${alvo.revisao}&${consulta}`
}
