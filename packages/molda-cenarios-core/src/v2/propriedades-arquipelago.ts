import type { Propriedades } from './documento'
import { PREFIXO_ARQUIPELAGO } from './migrar'

/**
 * Os campos que só o Arquipélago lê nas propriedades de um objeto (`arquipelago.*`).
 *
 * A régua é a do leitor do jogo (`packages/arquipelago/src/sistemas/perfil-de-cenario.ts`):
 * mesmos nomes, mesmos tipos, mesmos limites. Um campo que este módulo aceita, o jogo aceita;
 * um campo que este módulo recusa com a regra `perfil`, o jogo recusa ao abrir o cenário
 * publicado. A regra `fisica-nativa` vem de `fisica-nativa-do-cenario.ts`: o perfil aceita,
 * mas a física do jogo recusa ao montar a ilha. O contrato fica em
 * `packages/arquipelago/tests/propriedades-do-cenario-contrato.test.ts`.
 */

export const TIPOS_DE_FISICA_DO_ARQUIPELAGO = [
  'nenhuma',
  'caixa',
  'tronco',
  'ponte',
  'escada',
  'malha',
  'solo',
] as const
export type TipoDeFisicaDoArquipelago = (typeof TIPOS_DE_FISICA_DO_ARQUIPELAGO)[number]
export const ATORES_DO_ARQUIPELAGO = ['iris'] as const
export type AtorDoArquipelago = (typeof ATORES_DO_ARQUIPELAGO)[number]

/** Limites do leitor do jogo. */
export const LIMITES_DO_ARQUIPELAGO = {
  textoDaPlaca: 24,
  destinoDaPlaca: 240,
  /** O raio precisa ser maior que zero e no máximo este valor. */
  raioDoTronco: 100,
} as const

export type GrupoDoArquipelago = 'fisica' | 'enterrada' | 'fundacao' | 'placa' | 'ator'
export const GRUPOS_DO_ARQUIPELAGO: readonly {
  id: GrupoDoArquipelago
  rotulo: string
  ajuda: string
}[] = [
  { id: 'fisica', rotulo: 'Física', ajuda: 'Como o corpo do jogador encosta neste objeto.' },
  {
    id: 'enterrada',
    rotulo: 'Enterrada',
    ajuda: 'Quanto da altura fica de propósito abaixo do chão.',
  },
  { id: 'fundacao', rotulo: 'Fundação', ajuda: 'Uma caixa sólida embaixo do objeto, em metros.' },
  { id: 'placa', rotulo: 'Placa', ajuda: 'Uma placa que mostra o caminho até outro lugar.' },
  { id: 'ator', rotulo: 'Ator', ajuda: 'Uma personagem que anda e conversa no jogo.' },
]

type CampoBase = {
  /** Chave gravada nas propriedades do objeto. */
  chave: string
  grupo: GrupoDoArquipelago
  rotulo: string
  ajuda: string
  /** Com o grupo presente, o jogo exige este campo. */
  obrigatorio: boolean
}
export type CampoDoArquipelago = CampoBase &
  (
    | { tipo: 'escolha'; valores: readonly { valor: string; rotulo: string }[] }
    | { tipo: 'numero'; min?: number; max?: number; minExclusivo?: boolean }
    | { tipo: 'texto'; maxCaracteres: number }
  )

const k = (nome: string) => `${PREFIXO_ARQUIPELAGO}${nome}`
const EIXOS = ['x', 'y', 'z'] as const
const CANTOS = ['min', 'max'] as const
const PREFIXO_DA_FUNDACAO = k('fundacao.')
const CHAVES = {
  fisica: k('fisica'),
  raioDoTronco: k('raioDoTronco'),
  enterrada: k('enterrada'),
  texto: k('sinal.texto'),
  destino: k('sinal.destino'),
  viaX: k('sinal.via.x'),
  viaZ: k('sinal.via.z'),
  ator: k('ator'),
} as const
const chaveDaFundacao = (canto: 'min' | 'max', eixo: 'x' | 'y' | 'z') =>
  k(`fundacao.${canto}.${eixo}`)

const ROTULOS_DA_FISICA: Record<TipoDeFisicaDoArquipelago, string> = {
  nenhuma: 'Sem colisão',
  caixa: 'Caixa',
  tronco: 'Tronco de árvore',
  ponte: 'Ponte',
  escada: 'Escada',
  malha: 'Forma exata',
  solo: 'Chão',
}

/** A lista única dos campos, na ordem em que o editor os mostra. */
export const CAMPOS_DO_ARQUIPELAGO: readonly CampoDoArquipelago[] = [
  {
    chave: CHAVES.fisica,
    grupo: 'fisica',
    rotulo: 'Física no jogo',
    ajuda: 'O tipo de colisão que o jogo monta para este objeto.',
    obrigatorio: false,
    tipo: 'escolha',
    valores: TIPOS_DE_FISICA_DO_ARQUIPELAGO.map((valor) => ({
      valor,
      rotulo: ROTULOS_DA_FISICA[valor],
    })),
  },
  {
    chave: CHAVES.raioDoTronco,
    grupo: 'fisica',
    rotulo: 'Raio do tronco (m)',
    ajuda: 'A grossura do tronco que segura o jogador, antes da escala do objeto.',
    obrigatorio: false,
    tipo: 'numero',
    min: 0,
    minExclusivo: true,
    max: LIMITES_DO_ARQUIPELAGO.raioDoTronco,
  },
  {
    chave: CHAVES.enterrada,
    grupo: 'enterrada',
    rotulo: 'Parte enterrada',
    ajuda: 'De 0 (nada) a 1 (a altura inteira) abaixo do chão.',
    obrigatorio: true,
    tipo: 'numero',
    min: 0,
    max: 1,
  },
  ...CANTOS.flatMap((canto) =>
    EIXOS.map(
      (eixo): CampoDoArquipelago => ({
        chave: chaveDaFundacao(canto, eixo),
        grupo: 'fundacao',
        rotulo: `Fundação: ${canto === 'min' ? 'menor' : 'maior'} ${eixo}`,
        ajuda: 'Medida no espaço do modelo, em metros.',
        obrigatorio: true,
        tipo: 'numero',
      }),
    ),
  ),
  {
    chave: CHAVES.texto,
    grupo: 'placa',
    rotulo: 'Texto da placa',
    ajuda: `Até ${LIMITES_DO_ARQUIPELAGO.textoDaPlaca} letras.`,
    obrigatorio: true,
    tipo: 'texto',
    maxCaracteres: LIMITES_DO_ARQUIPELAGO.textoDaPlaca,
  },
  {
    chave: CHAVES.destino,
    grupo: 'placa',
    rotulo: 'Destino da placa',
    ajuda: 'O lugar para onde a placa leva.',
    obrigatorio: true,
    tipo: 'texto',
    maxCaracteres: LIMITES_DO_ARQUIPELAGO.destinoDaPlaca,
  },
  {
    chave: CHAVES.viaX,
    grupo: 'placa',
    rotulo: 'Ponto do caminho (x)',
    ajuda: 'Um ponto do caminho até o destino, em metros.',
    obrigatorio: true,
    tipo: 'numero',
  },
  {
    chave: CHAVES.viaZ,
    grupo: 'placa',
    rotulo: 'Ponto do caminho (z)',
    ajuda: 'Um ponto do caminho até o destino, em metros.',
    obrigatorio: true,
    tipo: 'numero',
  },
  {
    chave: CHAVES.ator,
    grupo: 'ator',
    rotulo: 'Personagem',
    ajuda: 'Só uma Íris por cenário.',
    obrigatorio: true,
    tipo: 'escolha',
    valores: [{ valor: 'iris', rotulo: 'Íris' }],
  },
]

export interface PontoDaFundacao {
  x: number
  y: number
  z: number
}
export interface CamposDoArquipelago {
  fisica?: { tipo?: TipoDeFisicaDoArquipelago; raioDoTronco?: number }
  enterrada?: number
  fundacao?: { min: PontoDaFundacao; max: PontoDaFundacao }
  placa?: { texto: string; destino: string; via: { x: number; z: number } }
  ator?: AtorDoArquipelago
}
/** `null` tira o grupo inteiro; um grupo ausente fica como está. */
export type MudancasNoArquipelago = {
  [G in keyof CamposDoArquipelago]?: CamposDoArquipelago[G] | null
}

export type TipoDeAvisoDoArquipelago =
  | 'ator-invalido'
  | 'placa-incompleta'
  | 'fisica-invalida'
  | 'raio-do-tronco-invalido'
  | 'enterrada-invalida'
  | 'fundacao-invalida'
export interface AvisoDoArquipelago {
  tipo: TipoDeAvisoDoArquipelago
  grupo: GrupoDoArquipelago
  /** O campo que precisa de conserto. */
  chave: string
  mensagem: string
  /** `perfil`: o jogo recusa ao abrir. `fisica-nativa`: recusa ao montar a física da ilha. */
  regra: 'perfil' | 'fisica-nativa'
}

type Leitura = Readonly<Record<string, unknown>>

const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
/** Mesmo teste do `texto` do jogo: texto, não só espaços, até `max` (comprimento do JavaScript). */
const ehTexto = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim() !== '' && v.length <= max
const ehFisica = (v: unknown): v is TipoDeFisicaDoArquipelago =>
  TIPOS_DE_FISICA_DO_ARQUIPELAGO.some((t) => t === v)
const raioValido = (v: unknown): v is number =>
  ehNumero(v) && v > 0 && v <= LIMITES_DO_ARQUIPELAGO.raioDoTronco
const enterradaValida = (v: unknown): v is number => ehNumero(v) && v >= 0 && v <= 1

/** O jogo considera a fundação presente com qualquer chave `arquipelago.fundacao.*`. */
const temFundacao = (p: Leitura) => Object.keys(p).some((n) => n.startsWith(PREFIXO_DA_FUNDACAO))
const temPlaca = (p: Leitura) =>
  [CHAVES.texto, CHAVES.destino, CHAVES.viaX, CHAVES.viaZ].some((c) => p[c] !== undefined)

function lerFundacao(p: Leitura): CamposDoArquipelago['fundacao'] | undefined {
  const canto = (nome: 'min' | 'max'): PontoDaFundacao | undefined => {
    const [x, y, z] = EIXOS.map((e) => p[chaveDaFundacao(nome, e)])
    return ehNumero(x) && ehNumero(y) && ehNumero(z) ? { x, y, z } : undefined
  }
  const min = canto('min'),
    max = canto('max')
  if (!min || !max || EIXOS.some((e) => min[e] > max[e])) return undefined
  return { min, max }
}

/**
 * O que o jogo lê destas propriedades, grupo a grupo. Grupo incompleto ou com valor recusado
 * fica de fora (o jogo recusaria o cenário); `validarCamposDoArquipelago` diz o porquê.
 */
export function lerCamposDoArquipelago(propriedades?: Leitura | null): CamposDoArquipelago {
  const p = propriedades ?? {},
    r: CamposDoArquipelago = {}
  const fisica = p[CHAVES.fisica],
    raio = p[CHAVES.raioDoTronco]
  if (ehFisica(fisica) || raioValido(raio))
    r.fisica = {
      ...(ehFisica(fisica) ? { tipo: fisica } : {}),
      ...(raioValido(raio) ? { raioDoTronco: raio } : {}),
    }
  const enterrada = p[CHAVES.enterrada]
  if (enterradaValida(enterrada)) r.enterrada = enterrada
  if (temFundacao(p)) {
    const f = lerFundacao(p)
    if (f) r.fundacao = f
  }
  const texto = p[CHAVES.texto],
    destino = p[CHAVES.destino],
    viaX = p[CHAVES.viaX],
    viaZ = p[CHAVES.viaZ]
  if (
    ehTexto(texto, LIMITES_DO_ARQUIPELAGO.textoDaPlaca) &&
    ehTexto(destino, LIMITES_DO_ARQUIPELAGO.destinoDaPlaca) &&
    ehNumero(viaX) &&
    ehNumero(viaZ)
  )
    r.placa = { texto, destino, via: { x: viaX, z: viaZ } }
  if (p[CHAVES.ator] === 'iris') r.ator = 'iris'
  return r
}

/** As chaves que pertencem a um grupo nestas propriedades (a fundação leva qualquer sobra). */
export function chavesDoGrupoDoArquipelago(
  grupo: GrupoDoArquipelago,
  propriedades?: Leitura | null,
): string[] {
  const doGrupo = CAMPOS_DO_ARQUIPELAGO.filter((c) => c.grupo === grupo).map((c) => c.chave)
  if (grupo !== 'fundacao' || !propriedades) return doGrupo
  return [
    ...new Set([
      ...doGrupo,
      ...Object.keys(propriedades).filter((n) => n.startsWith(PREFIXO_DA_FUNDACAO)),
    ]),
  ]
}

/**
 * Novas propriedades com as mudanças aplicadas; as de entrada não mudam. Cada grupo mudado é
 * regravado inteiro: as chaves antigas dele saem antes, e `null` só tira.
 */
export function gravarCamposDoArquipelago(
  propriedades: Propriedades | null | undefined,
  mudancas: MudancasNoArquipelago,
): Propriedades {
  const saida: Propriedades = { ...(propriedades ?? {}) }
  const tirar = (grupo: GrupoDoArquipelago) => {
    for (const chave of chavesDoGrupoDoArquipelago(grupo, saida)) delete saida[chave]
  }
  if (mudancas.fisica !== undefined) {
    tirar('fisica')
    if (mudancas.fisica?.tipo !== undefined) saida[CHAVES.fisica] = mudancas.fisica.tipo
    if (mudancas.fisica?.raioDoTronco !== undefined)
      saida[CHAVES.raioDoTronco] = mudancas.fisica.raioDoTronco
  }
  if (mudancas.enterrada !== undefined) {
    tirar('enterrada')
    if (mudancas.enterrada !== null) saida[CHAVES.enterrada] = mudancas.enterrada
  }
  if (mudancas.fundacao !== undefined) {
    tirar('fundacao')
    const f = mudancas.fundacao
    if (f)
      for (const canto of CANTOS)
        for (const eixo of EIXOS) saida[chaveDaFundacao(canto, eixo)] = f[canto][eixo]
  }
  if (mudancas.placa !== undefined) {
    tirar('placa')
    const placa = mudancas.placa
    if (placa) {
      saida[CHAVES.texto] = placa.texto
      saida[CHAVES.destino] = placa.destino
      saida[CHAVES.viaX] = placa.via.x
      saida[CHAVES.viaZ] = placa.via.z
    }
  }
  if (mudancas.ator !== undefined) {
    tirar('ator')
    if (mudancas.ator !== null) saida[CHAVES.ator] = mudancas.ator
  }
  return saida
}

/** Avisos dos campos do Arquipélago, com a mesma régua do leitor do jogo. */
export function validarCamposDoArquipelago(propriedades?: Leitura | null): AvisoDoArquipelago[] {
  const p = propriedades ?? {},
    avisos: AvisoDoArquipelago[] = []
  const avisar = (
    tipo: TipoDeAvisoDoArquipelago,
    grupo: GrupoDoArquipelago,
    chave: string,
    mensagem: string,
    regra: AvisoDoArquipelago['regra'] = 'perfil',
  ) => avisos.push({ tipo, grupo, chave, mensagem, regra })

  const ator = p[CHAVES.ator]
  if (ator !== undefined && ator !== 'iris')
    avisar('ator-invalido', 'ator', CHAVES.ator, 'O ator do Arquipélago só pode ser a Íris.')

  if (temPlaca(p)) {
    const textoDaPlaca = (chave: string, max: number, falta: string, longo: string) => {
      const v = p[chave]
      if (ehTexto(v, max)) return
      avisar(
        'placa-incompleta',
        'placa',
        chave,
        typeof v === 'string' && v.length > max ? longo : falta,
      )
    }
    textoDaPlaca(
      CHAVES.texto,
      LIMITES_DO_ARQUIPELAGO.textoDaPlaca,
      'A placa precisa de um texto.',
      `O texto da placa pode ter até ${LIMITES_DO_ARQUIPELAGO.textoDaPlaca} letras.`,
    )
    textoDaPlaca(
      CHAVES.destino,
      LIMITES_DO_ARQUIPELAGO.destinoDaPlaca,
      'A placa precisa dizer para onde leva.',
      `O destino da placa pode ter até ${LIMITES_DO_ARQUIPELAGO.destinoDaPlaca} letras.`,
    )
    for (const [chave, eixo] of [
      [CHAVES.viaX, 'x'],
      [CHAVES.viaZ, 'z'],
    ] as const)
      if (!ehNumero(p[chave]))
        avisar(
          'placa-incompleta',
          'placa',
          chave,
          `A placa precisa do ponto do caminho em ${eixo}, em número.`,
        )
  }

  const fisica = p[CHAVES.fisica]
  if (fisica !== undefined && !ehFisica(fisica))
    avisar(
      'fisica-invalida',
      'fisica',
      CHAVES.fisica,
      'Este tipo de física não existe no Arquipélago.',
    )
  const raio = p[CHAVES.raioDoTronco]
  if (raio !== undefined && !raioValido(raio))
    avisar(
      'raio-do-tronco-invalido',
      'fisica',
      CHAVES.raioDoTronco,
      `O raio do tronco precisa ser maior que 0 e ir até ${LIMITES_DO_ARQUIPELAGO.raioDoTronco} m.`,
    )
  const enterrada = p[CHAVES.enterrada]
  if (enterrada !== undefined && !enterradaValida(enterrada))
    avisar(
      'enterrada-invalida',
      'enterrada',
      CHAVES.enterrada,
      'A parte enterrada precisa ficar entre 0 e 1.',
    )

  if (temFundacao(p)) {
    let completa = true
    for (const canto of CANTOS)
      for (const eixo of EIXOS) {
        const chave = chaveDaFundacao(canto, eixo)
        if (ehNumero(p[chave])) continue
        completa = false
        avisar(
          'fundacao-invalida',
          'fundacao',
          chave,
          'A fundação precisa dos seis limites, em número.',
        )
      }
    if (completa)
      for (const eixo of EIXOS) {
        const min = p[chaveDaFundacao('min', eixo)] as number,
          max = p[chaveDaFundacao('max', eixo)] as number
        if (min > max)
          avisar(
            'fundacao-invalida',
            'fundacao',
            chaveDaFundacao('max', eixo),
            `Na fundação, o maior ${eixo} precisa passar do menor.`,
          )
        else if (min === max)
          avisar(
            'fundacao-invalida',
            'fundacao',
            chaveDaFundacao('max', eixo),
            `A fundação precisa ter tamanho em ${eixo}.`,
            'fisica-nativa',
          )
      }
  }
  return avisos
}
