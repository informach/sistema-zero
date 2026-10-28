import {
  type Acesso,
  CODIGO_SALVAMENTO_DESATUALIZADO,
  type ConflitoDeSalvamento,
  criarSalvamentoInicial,
  diaDeSaoPaulo,
  GravarSalvamentoSchema,
  LIMITE_DIARIO_PADRAO_MINUTOS,
  type Plataforma,
  type PublicoJogo,
  type QuartoDoJogo,
  RegistrarTempoSchema,
  type SalvamentoGuardado,
} from '@sistemazero/arquipelago-contracts'

/**
 * Uma plataforma de mentira para rodar o jogo sozinho (playground e testes). Cumpre o mesmo
 * contrato da de verdade, com o serviço do jogo em memória (e, se der, no localStorage).
 */
export interface OpcoesDaPlataformaFalsa {
  publico?: PublicoJogo
  posicao?: number
  limiteDiarioMinutos?: number | null
  liberado?: boolean
  quarto?: QuartoDoJogo
  persistir?: boolean
  agora?: () => Date
  /** Começa fora de casa, com a porta já aberta, neste ponto (para testar a ilha). */
  comecarEm?: { x: number; z: number }
  /** Volta o começo do jogo N minutos (para ver a noite: 13). */
  adiantarMinutos?: number
}

export const QUARTO_DE_EXEMPLO: QuartoDoJogo = {
  theme: 'padrao',
  placedItems: [
    { itemId: 'cama', x: 0, y: 1, rot: 0 },
    { itemId: 'criado-mudo', x: 2, y: 0 },
    { itemId: 'luminaria-mesa', x: 0, y: 0, on: 'criado-mudo', slot: 0 },
    { itemId: 'guarda-roupa', x: 4, y: 0 },
    { itemId: 'mesa-estudo', x: 8, y: 0 },
    { itemId: 'cadeira-gamer', x: 8, y: 1 },
    { itemId: 'pufe', x: 5, y: 4 },
    { itemId: 'cesto-brinquedos', x: 0, y: 6 },
    { itemId: 'letreiro-neon', x: 4, y: 2, wall: 'right' },
    { itemId: 'janela', x: 2, y: 1, wall: 'left' },
  ],
  pet: 'pet-gato',
  wallColors: { left: '#f6d7e3', right: '#f6d7e3' },
  floor: 'piso-madeira-clara',
}

const CHAVE = 'arquipelago-playground'

export function criarPlataformaFalsa(o: OpcoesDaPlataformaFalsa = {}): Plataforma & {
  guardado(): SalvamentoGuardado
} {
  const agora = o.agora ?? (() => new Date())
  const publico = o.publico ?? 'kids'
  const limite = publico === 'kids' ? (o.limiteDiarioMinutos ?? LIMITE_DIARIO_PADRAO_MINUTOS) : null
  let quarto = o.quarto ?? QUARTO_DE_EXEMPLO
  let guardado: SalvamentoGuardado = { revisao: 0, salvamento: null, atualizadoEm: null }
  const usado = new Map<string, number>()
  const eventos = new Map<string, { segundos: number; dia: string }>()

  if (o.comecarEm) {
    const inicial = criarSalvamentoInicial(
      new Date(agora().getTime() - (o.adiantarMinutos ?? 0) * 60_000),
    )
    guardado = {
      revisao: 1,
      salvamento: {
        ...inicial,
        posicao: { x: o.comecarEm.x, y: 6, z: o.comecarEm.z },
        casa: { portaNova: true },
      },
      atualizadoEm: agora().toISOString(),
    }
  } else if (o.persistir && typeof localStorage !== 'undefined') {
    try {
      const bruto = localStorage.getItem(CHAVE)
      if (bruto) guardado = JSON.parse(bruto) as SalvamentoGuardado
    } catch {}
  }
  const persistir = () => {
    if (!o.persistir || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(CHAVE, JSON.stringify(guardado))
    } catch {}
  }

  const acesso = (): Acesso => ({
    liberado: o.liberado ?? true,
    motivo: (o.liberado ?? true) ? null : 'fora-da-lista',
    limiteDiarioMinutos: limite,
    usadoHojeSegundos: usado.get(diaDeSaoPaulo(agora())) ?? 0,
  })

  return {
    versaoContrato: 1,
    publico,
    perfil: { id: 'perfil-de-teste', primeiroNome: 'Lia' },
    lerJornada: async () => ({ posicao: o.posicao ?? 2 }),
    lerAvatar: async () => ({
      slots: {
        head: { asset: 'head-01', color: '#d9a07a' },
        hair: { asset: 'hair-13', color: '#3b2416' },
        eyebrows: { asset: 'eyebrow-01', color: '#3b2416' },
        eyes: { asset: 'eyes-01' },
        top: { asset: 'top-06', color: '#e84393' },
        bottom: { asset: 'bottom-01', color: '#2c3e50' },
        shoes: { asset: 'shoes-01', color: '#ffffff' },
      },
    }),
    lerQuarto: async () => quarto,
    salvarQuarto: async (q) => {
      quarto = q
      return q
    },
    servico: {
      async buscar(caminho, opcoes) {
        const metodo = opcoes?.metodo ?? 'GET'
        if (caminho === '/acesso' && metodo === 'GET') return { status: 200, corpo: acesso() }
        if (caminho === '/salvamento' && metodo === 'GET') return { status: 200, corpo: guardado }
        if (caminho === '/salvamento' && metodo === 'PUT') {
          const corpo = GravarSalvamentoSchema.safeParse(opcoes?.corpo)
          if (!corpo.success) return { status: 400, corpo: { code: 'VALIDATION_ERROR' } }
          if (corpo.data.revisaoBase !== guardado.revisao) {
            const conflito: ConflitoDeSalvamento = {
              error: { code: CODIGO_SALVAMENTO_DESATUALIZADO, message: 'Salvo em outro aparelho' },
              atual: guardado,
            }
            return { status: 409, corpo: conflito }
          }
          guardado = {
            revisao: guardado.revisao + 1,
            salvamento: corpo.data.salvamento,
            atualizadoEm: agora().toISOString(),
          }
          persistir()
          return { status: 200, corpo: guardado }
        }
        if (caminho === '/tempo' && metodo === 'POST') {
          const corpo = RegistrarTempoSchema.safeParse(opcoes?.corpo)
          if (!corpo.success) return { status: 400, corpo: { code: 'VALIDATION_ERROR' } }
          if (corpo.data.dia > diaDeSaoPaulo(agora()))
            return { status: 400, corpo: { code: 'VALIDATION_ERROR' } }
          const anterior = eventos.get(corpo.data.eventoId)
          if (
            anterior !== undefined &&
            (anterior.segundos !== corpo.data.segundos || anterior.dia !== corpo.data.dia)
          )
            return { status: 409, corpo: { code: 'TEMPO_CONFLITANTE' } }
          const dia = corpo.data.dia
          const total = (usado.get(dia) ?? 0) + (anterior === undefined ? corpo.data.segundos : 0)
          eventos.set(corpo.data.eventoId, { segundos: corpo.data.segundos, dia })
          usado.set(dia, total)
          const hoje = usado.get(diaDeSaoPaulo(agora())) ?? 0
          return {
            status: 200,
            corpo: {
              usadoHojeSegundos: hoje,
              limiteDiarioMinutos: limite,
              acabou: limite !== null && hoje >= limite * 60,
            },
          }
        }
        return { status: 404, corpo: { code: 'NOT_FOUND' } }
      },
    },
    abrirFerramenta: async () => ({ situacao: 'indisponivel', motivo: 'playground' }),
    voltarParaPlataforma: () => {},
    relatarErro: (erro, contexto) => console.error(`[arquipelago] ${contexto}`, erro),
    guardado: () => guardado,
  }
}
