import type { PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import { gerarGlbUnico, type OpcoesDoGlbUnico } from '@sistemazero/molda-cenarios-motor/compilar'

export async function exportarGlbUnico(
  pacote: PacoteCompilado,
  sinal: AbortSignal,
  opcoes?: OpcoesDoGlbUnico,
) {
  const r = await gerarGlbUnico(pacote, sinal, opcoes)
  return {
    blob: new Blob([r.bytes.slice().buffer], { type: 'model/gltf-binary' }),
    avisos: r.avisos,
    medidas: r.medidas,
  }
}
