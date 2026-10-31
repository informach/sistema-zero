import {
  type Acesso,
  AMIZADE_MAXIMA,
  abrirRotinaNaPlataforma,
  BICHOS_DO_BOSQUE,
  type ClubeDoJogo,
  CODIGO_SALVAMENTO_DESATUALIZADO,
  ComandoSessaoTempoSchema,
  type ConflitoDeSalvamento,
  chavesUsadasNaObra,
  criarSalvamentoInicial,
  diaDeSaoPaulo,
  type Fantasma,
  festaDoDia,
  GravarSalvamentoSchema,
  ilhaAberta,
  ilhasDoAnel,
  LIMITE_DIARIO_PADRAO_MINUTOS,
  type LumiId,
  type MoldeDaRotina,
  MoldeDeObjetoSchema,
  MoldeDoVestuarioSchema,
  migrarSalvamento,
  type PedidoDeFerramenta,
  type Plataforma,
  type PublicoJogo,
  type QuartoDoJogo,
  RegistrarTempoSchema,
  type ResultadoDaFerramentaRotina,
  type ResultadoDeFerramenta,
  roupasConquistadas,
  type SalvamentoGuardado,
  type SituacaoDoClube,
} from '@sistemazero/arquipelago-contracts'
import { adotar } from '../sistemas/bichos'
import { MORADORES_CONVIDAVEIS } from '../sistemas/visitas-dos-moradores'
import { lerAparenciaFalsa, listarCriacoesQueCabemFalsas } from './aparencias-falsas'
import { type CartasDoPlayground, respostaDasCartas } from './cartas-falsas'
import { criarDesafiosFalsos, type DiaDoPlayground } from './desafios-falsos'
import { criarFamiliaFalsa, type FamiliaDoPlayground } from './familia-falsa'
import { CHAVE_DOS_FANTASMAS_FALSOS, criarFantasmasFalsos } from './fantasmas-falsos'
import { criarGaleriaFalsa, type OpcoesDaGaleriaFalsa } from './galeria-falsa'
import { criarInsumosFalsos, type RegistroDeInsumosFalso } from './insumos-falsos'
import {
  obraDeExemplo,
  obraDeExemploComEntrada,
  obraDeExemploComFundo,
  PROJETOS_DE_EXEMPLO,
} from './obra-de-exemplo'
import { criarPedidosFalsos, type RegistroDePedidoFalso } from './pedidos-falsos'
import { criarProfissoesFalsas } from './profissoes-falsas'
import { criarVendasFalsas, type RegistroDeVendaFalsa } from './vendas-falsas'
import { criarVisitasAdultasFalsas } from './visitas-adultas-falsas'

/**
 * Uma plataforma de mentira para rodar o jogo sozinho (playground e testes). Cumpre o mesmo
 * contrato da de verdade, com o serviço do jogo em memória (e, se der, no localStorage).
 */
export interface OpcoesDaPlataformaFalsa {
  visitaAdulta?: 'ligado' | 'revogar-ao-conferir'
  fantasma?: Fantasma
  somenteLeitura?: boolean
  /** O playground hospeda o editor fora do jogo; a falsa mantém as mesmas recusas da ponte. */
  editarRotina?: (molde: MoldeDaRotina) => Promise<ResultadoDaFerramentaRotina | null>
  rotina?: 'editor' | 'cancelado' | 'indisponivel'
  publico?: PublicoJogo
  posicao?: number
  limiteDiarioMinutos?: number | null
  /** Segundos já usados hoje (o playground prova o fim do tempo sem esperar o limite inteiro). */
  usadoHojeSegundos?: number
  liberado?: boolean
  quarto?: QuartoDoJogo
  persistir?: boolean
  agora?: () => Date
  /** Começa fora de casa, com a porta já aberta, neste ponto (para testar a ilha). `y` padrão 6. */
  comecarEm?: { x: number; z: number; y?: number }
  /** Volta o começo do jogo N minutos (para ver a noite: 13). */
  adiantarMinutos?: number
  /** Desafios do Quadro das Cores: ligados (padrão, com exemplos no Bosque) ou desligados. */
  desafios?: 'ligados' | 'desligados'
  /** O desafio do dia: `pronto` (padrão), `feito` ("Amanhã tem outro") ou `nenhum`. */
  dia?: DiaDoPlayground
  /** Os quadros do Bosque todos feitos (`?quadros=feitos`). */
  quadrosFeitos?: boolean
  /**
   * O Pinta e o Molda no molde de um objeto: `pronto` (padrão, a ferramenta de mentira guarda na
   * hora) ou `sem-acesso` (a página responde que a ferramenta não está liberada).
   */
  objetos?: 'pronto' | 'sem-acesso'
  aparencias?: 'pronto' | 'falha' | 'sem-metodo'
  editarObjeto?: (pedido: PedidoDeFerramenta) => Promise<boolean>
  /**
   * `exemplo`: a casa já começa com a obra de exemplo do modo construção (`obra-de-exemplo.ts`);
   * `fundo`: a mesma, com um cômodo atrás do quarto e a porta no fundo dele; `entrada`: a mesma, com a
   * porta de entrada (e a varanda) na frente do cômodo da frente do quarto.
   */
  obra?: 'exemplo' | 'fundo' | 'entrada'
  /** `exemplo`: um minijogo aprovado e um jogo do Mural nas listas (`?jogos=exemplo`, galeria do Farol). */
  jogos?: 'exemplo'
  /** Casa arrumada e moradores conhecidos, apenas para a conferência local. */
  convidados?: boolean
  /** Prepara os quatro achados, preservando a marca de um presente já entregue. */
  bichos?: 'achados'
  /** Um gato já adotado, chamado Mingau, como companhia (S01). */
  adotado?: boolean
  /** A amizade com o Bento (de 0 a 500): com 100 ele já lembrou o bolo de fubá (fase2-04). */
  bento?: number
  /** Põe um par de patins na mochila (o prêmio da entrega pelos telhados, fase2-05). */
  patins?: boolean
  /** Põe o planador na mochila (o presente do Floco, fase3-09; os segredos, N12). */
  planador?: boolean
  /** Põe a lanterna na mochila (o presente do Bento, fase2-06). */
  lanterna?: boolean
  /**
   * As pontes das ilhas abertas já vistas (o playground começa assim, para a cena da subida de
   * posto não cobrir as conferências; `?chegada=1` mostra a cena).
   */
  pontesVistas?: boolean
  /** A energia de começo (de 0 a 100), para conferir o descanso (fase2-13). */
  energia?: number
  /** Os Lumis já presos (`{ quindim: 2 }`), como se a lanterna já tivesse prendido (fase2-06). */
  lumis?: Partial<Record<LumiId, number>>
  /** Cartões dos Lumis: `algumas` (padrão: Repetir e Se conquistados), `todas` (equipe), `desligadas` (403) ou `fora-do-ar` (424). */
  cartas?: CartasDoPlayground
  /** A galeria: o saldo de moedas (`moedas`, padrão 80) ou `situacao: 'fora-do-ar'` (424). */
  galeria?: OpcoesDaGaleriaFalsa
  /** Os irmãos (recordes e visitas, fase3-12): `sozinha` (padrão), `irmaos`, `desligada` ou `fora-do-ar`. */
  familia?: FamiliaDoPlayground
  /**
   * Fotos no Clube (N08b): sem a opção, a plataforma não monta o Clube (como o adulto). Com ela,
   * a situação que o Clube responde; `falha-no-envio` diz `ligado` e falha ao mandar.
   */
  clube?: ClubeDoPlayground
}

export type ClubeDoPlayground = SituacaoDoClube | 'falha-no-envio'

/** O Clube de mentira: guarda as fotos mandadas para a conferência. */
function clubeFalso(clube: ClubeDoPlayground): ClubeDoJogo & { mandadas: Blob[] } {
  const mandadas: Blob[] = []
  return {
    mandadas,
    situacao: async () => (clube === 'falha-no-envio' ? 'ligado' : clube),
    async mandarFoto(foto) {
      if (clube === 'falha-no-envio') return 'falhou'
      if (clube !== 'ligado') return clube === 'fora-do-ar' ? 'falhou' : clube
      mandadas.push(foto)
      return 'em-moderacao'
    },
  }
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
/** As compras da galeria de mentira, à parte do salvamento (o `?novo=1` do playground apaga). */
export const CHAVE_DA_GALERIA = 'arquipelago-playground:galeria'
export const CHAVE_DAS_PROFISSOES = 'arquipelago-playground:profissoes'
/** As roupas que o playground já deu ao avatar (A21). */
export const CHAVE_DAS_ROUPAS = 'arquipelago-playground:roupas'

/** Os jogos de `jogos: 'exemplo'`, só do playground. */
export const MINIJOGO_DE_EXEMPLO = {
  desafioId: '5b3f0a52-6d1e-4c3a-9a51-0e7f4c2b9d10',
  titulo: 'Corrida dos bichos da Ana',
  aprovadoEm: '2026-10-29T15:00:00.000Z',
  atualizadoEm: '2026-10-29T15:00:00.000Z',
  capa: null,
  ilha: 'bosque',
} as const
/** Os da Vila Doce e do Pico, para a barraca da feira e o quiosque do festival (B10). */
export const MINIJOGOS_DAS_ILHAS_DE_EXEMPLO = [
  {
    desafioId: '7c1e2a40-8b5d-4f1e-9a2c-3d4e5f6a7b81',
    titulo: 'Corrida do entregador',
    aprovadoEm: '2026-10-30T15:00:00.000Z',
    atualizadoEm: '2026-10-30T15:00:00.000Z',
    capa: null,
    ilha: 'vila-doce',
  },
  {
    desafioId: '8d2f3b51-9c6e-4a2f-8b3d-4e5f6a7b8c92',
    titulo: 'Fase de plataforma',
    aprovadoEm: '2026-10-30T14:00:00.000Z',
    atualizadoEm: '2026-10-30T14:00:00.000Z',
    capa: null,
    ilha: 'pico',
  },
] as const
export const JOGO_DO_MURAL_DE_EXEMPLO = {
  playId: '9d2c7e41-3a8b-4f6d-b1c5-2e4a6f8d0b13',
  titulo: 'Labirinto das conchas',
} as const

export function criarPlataformaFalsa(o: OpcoesDaPlataformaFalsa = {}): Plataforma & {
  guardado(): SalvamentoGuardado
} {
  const agora = o.agora ?? (() => new Date())
  const publico = o.publico ?? 'kids'
  const limite = publico === 'kids' ? (o.limiteDiarioMinutos ?? LIMITE_DIARIO_PADRAO_MINUTOS) : null
  const desafios = criarDesafiosFalsos(o.posicao ?? 2, {
    dia: o.dia,
    agora,
    quadrosFeitos: o.quadrosFeitos,
  })
  const galeria = criarGaleriaFalsa(
    o.galeria,
    o.persistir && typeof localStorage !== 'undefined'
      ? {
          ler: () => localStorage.getItem(CHAVE_DA_GALERIA),
          gravar: (v) => localStorage.setItem(CHAVE_DA_GALERIA, v),
        }
      : undefined,
  )
  const familia = criarFamiliaFalsa(o.familia)
  const visitasAdultas = criarVisitasAdultasFalsas({
    publico,
    somenteLeitura: o.somenteLeitura === true,
    salvo: () => guardado,
    exemplo: o.visitaAdulta,
    casa: { versao: 1, obra: obraDeExemplo(), horta: [], completos: [], quarto: null },
  })
  const fantasmas = criarFantasmasFalsos({
    salvo: () => guardado,
    somenteLeitura: () => o.somenteLeitura === true,
    familia: (c, m) => familia.buscar(c, m),
    exemplo: o.fantasma,
    persistencia:
      o.persistir && typeof localStorage !== 'undefined'
        ? {
            ler: () => localStorage.getItem(CHAVE_DOS_FANTASMAS_FALSOS),
            gravar: (dado) => localStorage.setItem(CHAVE_DOS_FANTASMAS_FALSOS, dado),
          }
        : undefined,
  })
  const profissoes = criarProfissoesFalsas({
    agora,
    posicao: o.posicao ?? 2,
    somenteLeitura: o.somenteLeitura ?? false,
    creditar: galeria.creditar,
    guarda:
      o.persistir && typeof localStorage !== 'undefined'
        ? {
            ler: () => localStorage.getItem(`${CHAVE_DAS_PROFISSOES}:${publico}`),
            gravar: (valor) => localStorage.setItem(`${CHAVE_DAS_PROFISSOES}:${publico}`, valor),
          }
        : undefined,
  })
  let registrosDeInsumos: RegistroDeInsumosFalso[] = []
  let registrosDePedidos: RegistroDePedidoFalso[] = []
  let registrosDeVendas: RegistroDeVendaFalsa[] = []
  const roupasDadas = new Set<string>(
    (() => {
      if (!o.persistir || typeof localStorage === 'undefined') return []
      try {
        const lido: unknown = JSON.parse(localStorage.getItem(CHAVE_DAS_ROUPAS) ?? '[]')
        return Array.isArray(lido) ? lido.filter((p): p is string => typeof p === 'string') : []
      } catch {
        return []
      }
    })(),
  )
  let quarto = o.quarto ?? QUARTO_DE_EXEMPLO
  let guardado: SalvamentoGuardado = { revisao: 0, salvamento: null, atualizadoEm: null }
  const usado = new Map<string, number>()
  if (o.usadoHojeSegundos) usado.set(diaDeSaoPaulo(agora()), Math.max(0, o.usadoHojeSegundos))
  const eventos = new Map<string, { segundos: number; dia: string; diaEfetivo: string }>()
  type Sessao = {
    id: string
    cursor: number
    vencimento: number
    sequencia: number
    acao: 'iniciar' | 'pulsar' | 'pausar'
    estado: 'ativa' | 'encerrada' | 'expirada'
  }
  const sessoes = new Map<string, Sessao>()
  let sessaoAtiva: Sessao | null = null

  function acertar(sessao: Sessao, instante: number, pausar: boolean) {
    const fim = Math.max(sessao.cursor, Math.min(instante, sessao.vencimento))
    const segundos = Math.floor((fim - sessao.cursor) / 1000)
    for (let i = 0; i < segundos; i++) {
      const dia = diaDeSaoPaulo(new Date(sessao.cursor + i * 1000))
      usado.set(dia, Math.min(86_400, (usado.get(dia) ?? 0) + 1))
    }
    sessao.cursor += segundos * 1000
    sessao.estado = instante >= sessao.vencimento ? 'expirada' : pausar ? 'encerrada' : 'ativa'
    if (sessao.estado === 'ativa') sessao.vencimento = instante + 20_000
    else if (sessaoAtiva === sessao) sessaoAtiva = null
  }

  /**
   * O molde de um objeto (modo construção), com as mesmas recusas da página
   * (`member-shell/src/lib/arquipelago-objeto.ts`): o Estúdio não abre objeto, o Pinta pede faces;
   * pronto, a ferramenta de mentira "salva" na hora.
   */
  async function abrirNoMolde(pedido: PedidoDeFerramenta): Promise<ResultadoDeFerramenta> {
    const molde = MoldeDeObjetoSchema.safeParse(pedido.molde)
    if (pedido.proposito !== 'objeto' || !molde.success)
      return { situacao: 'indisponivel', motivo: 'playground' }
    if (pedido.ferramenta === 'estudio') return { situacao: 'indisponivel', motivo: 'em-breve' }
    if (o.objetos === 'sem-acesso') return { situacao: 'indisponivel', motivo: 'acesso-necessario' }
    if (pedido.ferramenta === 'pinta' && molde.data.faces.length === 0)
      return { situacao: 'indisponivel', motivo: 'sem-faces' }
    await new Promise((r) => setTimeout(r, 400))
    if (o.editarObjeto && !(await o.editarObjeto(pedido))) return { situacao: 'cancelado' }
    return { situacao: 'pronto', criacaoId: `molde-${molde.data.objeto}-${pedido.ferramenta}` }
  }

  if (o.comecarEm) {
    const inicial = criarSalvamentoInicial(
      new Date(agora().getTime() - (o.adiantarMinutos ?? 0) * 60_000),
    )
    guardado = {
      revisao: 1,
      salvamento: {
        ...inicial,
        posicao: { x: o.comecarEm.x, y: o.comecarEm.y ?? 6, z: o.comecarEm.z },
        casa: { portaNova: true },
      },
      atualizadoEm: agora().toISOString(),
    }
  } else if (o.persistir && typeof localStorage !== 'undefined') {
    try {
      const bruto = localStorage.getItem(CHAVE)
      if (bruto) {
        const {
          comprasDeInsumos: registros,
          pedidosRemunerados,
          vendasNaFeira,
          ...salvo
        } = JSON.parse(bruto)
        guardado = salvo as SalvamentoGuardado
        registrosDeInsumos = registros ?? []
        registrosDePedidos = pedidosRemunerados ?? []
        registrosDeVendas = vendasNaFeira ?? []
      }
    } catch {}
    galeria.lembrarCompras(migrarSalvamento(guardado.salvamento))
  }
  if (o.obra) {
    const obra =
      o.obra === 'fundo'
        ? obraDeExemploComFundo()
        : o.obra === 'entrada'
          ? obraDeExemploComEntrada()
          : obraDeExemplo()
    const atual =
      migrarSalvamento(guardado.salvamento) ??
      criarSalvamentoInicial(new Date(agora().getTime() - (o.adiantarMinutos ?? 0) * 60_000))
    guardado = {
      revisao: guardado.revisao + 1,
      salvamento: {
        ...atual,
        casa: { portaNova: true },
        construcao: { ...atual.construcao, casa: obra },
        // A obra de exemplo usa acabamentos dos cômodos: as chaves vêm com ela (N11).
        chaves: atual.chaves | chavesUsadasNaObra(obra),
        projetos: { ...PROJETOS_DE_EXEMPLO, ...atual.projetos },
      },
      atualizadoEm: agora().toISOString(),
    }
  }
  if (o.convidados) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    const moradores = { ...atual.moradores }
    for (const quem of MORADORES_CONVIDAVEIS)
      moradores[quem] = { ...moradores[quem], conversaEm: diaDeSaoPaulo(agora()) }
    quarto = {
      theme: 'padrao',
      pet: null,
      placedItems: [
        { itemId: 'planta', x: 0, y: 0 },
        { itemId: 'cacto', x: 3, y: 0 },
        { itemId: 'vela', x: 5, y: 0 },
        { itemId: 'luminaria', x: 7, y: 0 },
        { itemId: 'vaso-flores', x: 9, y: 0 },
      ],
    }
    guardado = {
      revisao: guardado.revisao + 1,
      atualizadoEm: agora().toISOString(),
      salvamento: { ...atual, casa: { portaNova: true }, moradores },
    }
  }
  if (o.bichos === 'achados') {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    guardado = {
      revisao: guardado.revisao + 1,
      salvamento: { ...atual, bichos: { ...atual.bichos, achados: [...BICHOS_DO_BOSQUE] } },
      atualizadoEm: agora().toISOString(),
    }
  }
  if (o.adotado) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    const bichos = adotar({ ...atual.bichos, achados: [...BICHOS_DO_BOSQUE] }, 'gato', 'Mingau')
    if (bichos && !atual.bichos.adotado)
      guardado = {
        revisao: guardado.revisao + 1,
        salvamento: { ...atual, bichos, companhia: 'adotado' },
        atualizadoEm: agora().toISOString(),
      }
  }
  if (o.bento !== undefined && Number.isFinite(o.bento)) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    const amizade = Math.max(0, Math.min(AMIZADE_MAXIMA, Math.round(o.bento)))
    guardado = {
      revisao: guardado.revisao + 1,
      salvamento: {
        ...atual,
        moradores: { ...atual.moradores, bento: { ...atual.moradores.bento, amizade } },
      },
      atualizadoEm: agora().toISOString(),
    }
  }
  if (o.patins) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    if (!atual.inventario.patins)
      guardado = {
        revisao: guardado.revisao + 1,
        salvamento: { ...atual, inventario: { ...atual.inventario, patins: 1 } },
        atualizadoEm: agora().toISOString(),
      }
  }
  if (o.planador) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    if (!atual.inventario.planador)
      guardado = {
        revisao: guardado.revisao + 1,
        salvamento: { ...atual, inventario: { ...atual.inventario, planador: 1 } },
        atualizadoEm: agora().toISOString(),
      }
  }
  if (o.energia !== undefined) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    const energia = Math.max(0, Math.min(100, o.energia))
    guardado = {
      revisao: guardado.revisao + 1,
      salvamento: { ...atual, necessidades: { ...atual.necessidades, energia } },
      atualizadoEm: agora().toISOString(),
    }
  }
  if (o.pontesVistas) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    const abertas = ilhasDoAnel()
      .filter((i) => ilhaAberta(i.id, o.posicao ?? 1))
      .map((i) => i.id)
    const faltam = abertas.filter((id) => !atual.pontesVistas.includes(id))
    if (faltam.length > 0)
      guardado = {
        revisao: guardado.revisao + 1,
        salvamento: { ...atual, pontesVistas: [...atual.pontesVistas, ...faltam] },
        atualizadoEm: agora().toISOString(),
      }
  }
  if (o.lanterna) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    if (!atual.inventario.lanterna)
      guardado = {
        revisao: guardado.revisao + 1,
        salvamento: { ...atual, inventario: { ...atual.inventario, lanterna: 1 } },
        atualizadoEm: agora().toISOString(),
      }
  }
  if (o.lumis) {
    const atual = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(agora())
    guardado = {
      revisao: guardado.revisao + 1,
      salvamento: { ...atual, lumis: { ...atual.lumis, ...o.lumis } },
      atualizadoEm: agora().toISOString(),
    }
  }
  const persistir = () => {
    if (!o.persistir || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        CHAVE,
        JSON.stringify({
          ...guardado,
          comprasDeInsumos: registrosDeInsumos,
          pedidosRemunerados: registrosDePedidos,
          vendasNaFeira: registrosDeVendas,
        }),
      )
    } catch {}
  }

  const insumos = criarInsumosFalsos({
    somenteLeitura: o.somenteLeitura ?? false,
    ler: () => guardado,
    registros: registrosDeInsumos,
    debitar: galeria.debitar,
    agora,
    gravar: (salvo, registros) => {
      if (o.persistir && typeof localStorage !== 'undefined')
        localStorage.setItem(
          CHAVE,
          JSON.stringify({
            ...salvo,
            comprasDeInsumos: registros,
            pedidosRemunerados: registrosDePedidos,
            vendasNaFeira: registrosDeVendas,
          }),
        )
      guardado = salvo
      registrosDeInsumos = registros
    },
  })

  const pedidos = criarPedidosFalsos({
    somenteLeitura: o.somenteLeitura ?? false,
    posicao: o.posicao ?? 2,
    ler: () => guardado,
    registros: registrosDePedidos,
    compraPendente: insumos.pendente,
    creditar: galeria.creditar,
    agora,
    gravar: (salvo, registros) => {
      if (o.persistir && typeof localStorage !== 'undefined')
        localStorage.setItem(
          CHAVE,
          JSON.stringify({
            ...salvo,
            comprasDeInsumos: registrosDeInsumos,
            pedidosRemunerados: registros,
            vendasNaFeira: registrosDeVendas,
          }),
        )
      guardado = salvo
      registrosDePedidos = registros
    },
  })

  const vendas = criarVendasFalsas({
    somenteLeitura: o.somenteLeitura ?? false,
    posicao: o.posicao ?? 2,
    ler: () => guardado,
    registros: registrosDeVendas,
    compraPendente: insumos.pendente,
    creditar: galeria.creditar,
    agora,
    gravar: (salvo, registros) => {
      if (o.persistir && typeof localStorage !== 'undefined')
        localStorage.setItem(
          CHAVE,
          JSON.stringify({
            ...salvo,
            comprasDeInsumos: registrosDeInsumos,
            pedidosRemunerados: registrosDePedidos,
            vendasNaFeira: registros,
          }),
        )
      guardado = salvo
      registrosDeVendas = registros
    },
  })

  const acesso = (): Acesso => ({
    somenteLeitura: o.somenteLeitura ?? false,
    liberado: o.liberado ?? true,
    motivo: (o.liberado ?? true) ? null : 'fora-da-lista',
    limiteDiarioMinutos: limite,
    usadoHojeSegundos: usado.get(diaDeSaoPaulo(agora())) ?? 0,
    contabilizaTempo: publico === 'kids',
  })

  return {
    versaoContrato: 1,
    ...(o.aparencias === 'sem-metodo'
      ? {}
      : {
          lerAparencia: o.aparencias === 'falha' ? async () => null : lerAparenciaFalsa,
          listarCriacoesQueCabem:
            o.aparencias === 'falha'
              ? async () => {
                  throw new Error('As criações não responderam.')
                }
              : listarCriacoesQueCabemFalsas,
        }),
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
        const exemplo = o.jogos === 'exemplo'
        if (caminho === '/mural')
          return { status: 200, corpo: { jogos: exemplo ? [JOGO_DO_MURAL_DE_EXEMPLO] : [] } }
        if (caminho === '/minijogos')
          return {
            status: 200,
            corpo: {
              minijogos: exemplo ? [MINIJOGO_DE_EXEMPLO, ...MINIJOGOS_DAS_ILHAS_DE_EXEMPLO] : [],
            },
          }
        const metodo = opcoes?.metodo ?? 'GET'
        const daVisitaAdulta = visitasAdultas.buscar(caminho, metodo, opcoes?.corpo)
        if (daVisitaAdulta) return daVisitaAdulta
        const doFantasma = fantasmas.buscar(caminho, metodo, opcoes?.corpo)
        if (doFantasma) return doFantasma
        const dosInsumos = insumos.buscar(caminho, metodo, opcoes?.corpo)
        if (dosInsumos) return dosInsumos
        const dosPedidos = pedidos.buscar(caminho, metodo, opcoes?.corpo)
        if (dosPedidos) return dosPedidos
        const daFeira = vendas.buscar(caminho, metodo, opcoes?.corpo)
        if (daFeira) return daFeira
        // As roupas conquistadas (A21): o que o salvamento guardado conquistou e ainda não chegou.
        if (caminho === '/roupas/sincronizar' && metodo === 'POST') {
          if (o.somenteLeitura)
            return { status: 403, corpo: { error: { code: 'SOMENTE_LEITURA' } } }
          const salvo = migrarSalvamento(guardado.salvamento)
          const novas = salvo
            ? roupasConquistadas(salvo, festaDoDia(agora())).filter((p) => !roupasDadas.has(p))
            : []
          for (const p of novas) roupasDadas.add(p)
          if (novas.length > 0 && o.persistir && typeof localStorage !== 'undefined')
            try {
              localStorage.setItem(CHAVE_DAS_ROUPAS, JSON.stringify([...roupasDadas]))
            } catch {}
          return { status: 200, corpo: { versao: 1, novas } }
        }
        const daProfissao = profissoes.buscar(caminho, metodo, opcoes?.corpo)
        if (daProfissao) return daProfissao
        const daGaleria = galeria.buscar(caminho, metodo, opcoes?.corpo)
        if (daGaleria) return daGaleria
        const daFamilia = familia.buscar(caminho, metodo)
        if (daFamilia) return daFamilia
        if (caminho.startsWith('/desafios')) {
          if (o.desafios === 'desligados' && caminho !== '/desafios/cores')
            return { status: 403, corpo: { error: { code: 'DESAFIOS_DESLIGADOS' } } }
          const r = desafios.buscar(caminho, metodo)
          if (r) return r
        }
        if (caminho === '/cartas' && metodo === 'GET')
          return respostaDasCartas(o.cartas ?? 'algumas', publico)
        if (caminho === '/acesso' && metodo === 'GET') return { status: 200, corpo: acesso() }
        if (caminho === '/salvamento' && metodo === 'GET') return { status: 200, corpo: guardado }
        if (caminho === '/salvamento' && metodo === 'PUT') {
          if (insumos.pendente())
            return { status: 423, corpo: { error: { code: 'COMPRA_PENDENTE' } } }
          const corpo = GravarSalvamentoSchema.safeParse(opcoes?.corpo)
          if (!corpo.success) return { status: 400, corpo: { code: 'VALIDATION_ERROR' } }
          if (!galeria.aceita(corpo.data.salvamento))
            return { status: 422, corpo: { error: { code: 'APARENCIA_NAO_COMPRADA' } } }
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
        if (caminho === '/tempo/recuperar' && metodo === 'POST') {
          const corpo = RegistrarTempoSchema.safeParse(opcoes?.corpo)
          if (!corpo.success) return { status: 400, corpo: { code: 'VALIDATION_ERROR' } }
          const anterior = eventos.get(corpo.data.eventoId)
          if (
            anterior !== undefined &&
            (anterior.segundos !== corpo.data.segundos || anterior.dia !== corpo.data.dia)
          )
            return { status: 409, corpo: { code: 'TEMPO_CONFLITANTE' } }
          const dia =
            anterior?.diaEfetivo ??
            (corpo.data.dia > diaDeSaoPaulo(agora()) ? diaDeSaoPaulo(agora()) : corpo.data.dia)
          const total = (usado.get(dia) ?? 0) + (anterior === undefined ? corpo.data.segundos : 0)
          eventos.set(corpo.data.eventoId, {
            segundos: corpo.data.segundos,
            dia: corpo.data.dia,
            diaEfetivo: dia,
          })
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
        if (caminho === '/tempo/sessao' && metodo === 'POST') {
          if (publico !== 'kids' || limite === null)
            return { status: 403, corpo: { code: 'FORBIDDEN' } }
          const pedido = ComandoSessaoTempoSchema.safeParse(opcoes?.corpo)
          if (!pedido.success) return { status: 400, corpo: { code: 'VALIDATION_ERROR' } }
          const comando = pedido.data
          const data = agora()
          const instante = data.getTime()
          const responder = (
            situacao: 'ativa' | 'encerrada' | 'expirada' | 'substituida' | 'limite',
            sessao?: Sessao,
          ) => ({
            status: 200,
            corpo: {
              situacao,
              usadoHojeSegundos: usado.get(diaDeSaoPaulo(data)) ?? 0,
              limiteDiarioMinutos: limite,
              servidorEm: data.toISOString(),
              vencimento:
                situacao === 'ativa' && sessao ? new Date(sessao.vencimento).toISOString() : null,
            },
          })
          const existente = sessoes.get(comando.sessaoId)
          if (comando.acao === 'iniciar') {
            if (existente) {
              if (existente !== sessaoAtiva || existente.estado !== 'ativa')
                return responder('substituida')
              if (instante >= existente.vencimento) {
                acertar(existente, instante, true)
                return responder('expirada')
              }
              return responder('ativa', existente)
            }
            if (sessaoAtiva) acertar(sessaoAtiva, instante, true)
            if ((usado.get(diaDeSaoPaulo(data)) ?? 0) >= limite * 60) return responder('limite')
            const nova: Sessao = {
              id: comando.sessaoId,
              cursor: instante,
              vencimento: instante + 20_000,
              sequencia: 0,
              acao: 'iniciar',
              estado: 'ativa',
            }
            sessoes.set(nova.id, nova)
            sessaoAtiva = nova
            return responder('ativa', nova)
          }
          if (
            existente &&
            existente.estado !== 'ativa' &&
            comando.sequencia === existente.sequencia &&
            comando.acao === existente.acao
          )
            return responder(
              (usado.get(diaDeSaoPaulo(data)) ?? 0) >= limite * 60 ? 'limite' : existente.estado,
            )
          if (!existente || existente !== sessaoAtiva || existente.estado !== 'ativa')
            return responder('substituida')
          if (comando.sequencia === existente.sequencia && comando.acao !== existente.acao)
            return { status: 409, corpo: { code: 'TEMPO_SEQUENCIA_INVALIDA' } }
          const repetida = comando.sequencia === existente.sequencia
          if (!repetida && comando.sequencia !== existente.sequencia + 1)
            return { status: 409, corpo: { code: 'TEMPO_SEQUENCIA_INVALIDA' } }
          if (repetida && instante < existente.vencimento) return responder('ativa', existente)
          acertar(existente, instante, comando.acao === 'pausar')
          existente.sequencia = comando.sequencia
          existente.acao = comando.acao
          if ((usado.get(diaDeSaoPaulo(data)) ?? 0) >= limite * 60) {
            existente.estado = 'encerrada'
            sessaoAtiva = null
            return responder('limite')
          }
          return responder(existente.estado, existente)
        }
        return { status: 404, corpo: { code: 'NOT_FOUND' } }
      },
    },
    abrirFerramenta: async (pedido) => {
      // O editor do Meu Quarto (A10): no playground não há editor; devolve o quarto como está,
      // com um móvel girado para a mudança aparecer na casa.
      if (pedido.ferramenta === 'quarto') {
        if (o.somenteLeitura) return { situacao: 'indisponivel', motivo: 'acesso-necessario' }
        if (pedido.proposito !== 'arrumar')
          return { situacao: 'indisponivel', motivo: 'pedido-invalido' }
        const [primeiro, ...resto] = quarto.placedItems
        if (primeiro)
          quarto = {
            ...quarto,
            placedItems: [
              {
                ...primeiro,
                rot: (((primeiro.rot ?? 0) + 1) % 4) as 0 | 1 | 2 | 3,
              },
              ...resto,
            ],
          }
        return { situacao: 'quarto-pronto', quarto: structuredClone(quarto) }
      }
      if (pedido.ferramenta === 'avatar') {
        if (o.somenteLeitura) return { situacao: 'indisponivel', motivo: 'acesso-necessario' }
        if (
          pedido.proposito !== 'vestir' ||
          !MoldeDoVestuarioSchema.safeParse(pedido.molde).success
        )
          return { situacao: 'indisponivel', motivo: 'pedido-invalido' }
        return { situacao: 'indisponivel', motivo: 'playground' }
      }
      if (pedido.ferramenta === 'rotina-lumi') {
        if (o.rotina === 'indisponivel' || (!o.editarRotina && o.rotina !== 'cancelado'))
          return { situacao: 'indisponivel', motivo: 'playground' }
        return abrirRotinaNaPlataforma(
          pedido,
          async () => respostaDasCartas(o.cartas ?? 'algumas', publico),
          async (molde) =>
            o.rotina === 'cancelado' ? null : ((await o.editarRotina?.(molde)) ?? null),
        )
      }
      return (await desafios.abrir(pedido)) ?? (await abrirNoMolde(pedido))
    },
    ...(o.clube ? { clube: clubeFalso(o.clube) } : {}),
    voltarParaPlataforma: () => {},
    relatarErro: (erro, contexto) => console.error(`[arquipelago] ${contexto}`, erro),
    guardado: () => guardado,
  }
}
