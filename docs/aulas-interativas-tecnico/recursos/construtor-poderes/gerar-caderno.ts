/**
 * O HTML do Passo a passo de um Poder do Construtor, com o `gerarCaderno` comum do Construtor: os
 * projetos de cada etapa saem do gerador do Poder (as etapas chegam como "2d:item"). Cada Poder tem
 * o seu `recursos/<poder>/gerar-caderno.ts` (é ele que o `gerar-materiais.py` chama).
 *
 *   bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-caderno.ts escudo
 */
import type { PoderDimensaoConstrutor } from '../../qa/construtor-poderes-base'
import { gerarCaderno } from '../construtor-base/gerar-caderno'
import { PODERES_DO_CADERNO } from './poderes'

export function gerarCadernoDoPoder(poder: string) {
  const p = PODERES_DO_CADERNO[poder]
  if (!p) throw Error(`Poder desconhecido: ${poder}`)
  gerarCaderno(poder, {
    projeto: (stage) => {
      const [d, etapa] = stage.split(':') as [PoderDimensaoConstrutor, string]
      return p.montar(d, etapa)
    },
    inicial: p.montar('2d', p.etapas[0]!) as { assets: unknown[] },
  })
}

if (import.meta.main) gerarCadernoDoPoder(process.argv[2] ?? '')
