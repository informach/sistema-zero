import { type Plataforma, QuartoSchema } from '@sistemazero/arquipelago-contracts'
import type { LojaDoJogo } from './loja'

/**
 * O quarto nos dois sentidos (§6.28, A10: "mudou no jogo, muda na plataforma, e o contrário").
 * O jogo relê o quarto quando a criança volta para casa, e arrumar o quarto abre o editor do Meu
 * Quarto da plataforma, que grava pela mesma rota de sempre; ao fechar, o jogo relê.
 */
export const RELER_O_QUARTO_A_CADA_MS = 15_000

let ultimaLeitura = new WeakMap<LojaDoJogo, number>()

/** Relê o quarto da plataforma (no máximo uma vez a cada 15 s); um quarto inválido é ignorado. */
export async function relerOQuarto(
  loja: LojaDoJogo,
  plataforma: Plataforma,
  agora = Date.now(),
): Promise<void> {
  const antes = ultimaLeitura.get(loja)
  if (antes !== undefined && agora - antes < RELER_O_QUARTO_A_CADA_MS) return
  ultimaLeitura.set(loja, agora)
  const lido = QuartoSchema.safeParse(await plataforma.lerQuarto())
  if (lido.success) loja.getState().definirQuarto(lido.data)
}

/** Só nos testes: esquecer quando o quarto foi lido. */
export function esquecerLeiturasDoQuarto(): void {
  ultimaLeitura = new WeakMap()
}

export const FALA_DO_QUARTO_FECHADO =
  'O quarto não abriu agora. Ele continua arrumado como estava na plataforma.'

/** Arrumar o quarto no editor da plataforma; ao fechar, o quarto novo aparece na casa. */
export async function arrumarOQuarto(loja: LojaDoJogo, plataforma: Plataforma): Promise<void> {
  const s = loja.getState()
  if (s.ferramentaAberta || s.visita || s.acesso.somenteLeitura) return
  s.definirFerramentaAberta(true)
  try {
    const r = await plataforma.abrirFerramenta({ ferramenta: 'quarto', proposito: 'arrumar' })
    if (r.situacao === 'quarto-pronto') {
      const lido = QuartoSchema.safeParse(r.quarto)
      if (lido.success) loja.getState().definirQuarto(lido.data)
    } else if (r.situacao === 'indisponivel') loja.getState().dizer(FALA_DO_QUARTO_FECHADO)
  } catch (erro) {
    plataforma.relatarErro(erro, 'quarto')
    loja.getState().dizer(FALA_DO_QUARTO_FECHADO)
  } finally {
    loja.getState().definirFerramentaAberta(false)
  }
}
