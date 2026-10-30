import {
  type CoresConquistadas,
  CoresConquistadasSchema,
  type DesafioNaLista,
  ILHA_IDS,
  QUADROS_POR_ILHA,
} from '@sistemazero/arquipelago-contracts'

/** Só aparência. Nunca usar esta fotografia para acesso, prêmio ou conclusão de desafio. */
export function unirCores(...leituras: readonly CoresConquistadas[]): CoresConquistadas {
  return {
    versao: 1,
    ilhas: ILHA_IDS.map((id) => ({
      id,
      quadros: [
        ...new Set(leituras.flatMap((c) => c.ilhas.find((i) => i.id === id)?.quadros ?? [])),
      ].sort((a, b) => a - b),
    })),
  }
}

export function coresDoCatalogo(desafios: readonly DesafioNaLista[]): CoresConquistadas {
  return {
    versao: 1,
    ilhas: ILHA_IDS.map((id) => ({
      id,
      quadros: [
        ...new Set(
          desafios
            .filter(
              (d) => d.ilha === id && d.tipo === 'quadro-das-cores' && d.situacao === 'concluido',
            )
            .map((d) => d.quadro)
            .filter(
              (q): q is number =>
                q !== null && Number.isInteger(q) && q >= 1 && q <= QUADROS_POR_ILHA,
            ),
        ),
      ].sort((a, b) => a - b),
    })),
  }
}

export function chaveDasCores(publico: string, perfil: string): string {
  return `arquipelago:cores:v1:${publico}:${perfil}`
}

export type ArmazemDasCores = Pick<Storage, 'getItem' | 'setItem'>

function armazenamento(): ArmazemDasCores | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** A resposta completa de oito ilhas e seis posições cabe com folga neste limite. */
const TETO_DA_FOTOGRAFIA = 2048

export function lerCoresGuardadas(chave: string, armazem = armazenamento()): CoresConquistadas {
  try {
    const raw = armazem?.getItem(chave)
    if (raw && raw.length <= TETO_DA_FOTOGRAFIA) {
      const lido = CoresConquistadasSchema.safeParse(JSON.parse(raw))
      if (lido.success) return lido.data
    }
  } catch {
    /* Armazenamento recusado não impede abrir o jogo. */
  }
  return unirCores()
}

export function guardarCores(
  chave: string,
  cores: CoresConquistadas,
  armazem = armazenamento(),
): void {
  try {
    const dados = JSON.stringify(CoresConquistadasSchema.parse(cores))
    if (dados.length <= TETO_DA_FOTOGRAFIA) armazem?.setItem(chave, dados)
  } catch {
    /* A leitura confirmada continua válida nesta montagem. */
  }
}
