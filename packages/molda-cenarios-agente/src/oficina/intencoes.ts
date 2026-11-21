import {
  abrirParaEditar,
  baseInicialDeTerreno,
  type CenariosHost,
  comandosParaEspalhar,
  comandosParaPor,
  comandosParaPorConjunto,
  type EdicaoDoTerreno,
  escolhaDaBiblioteca,
  gravarSemPalco,
  type ModeloDeBiblioteca,
  novoIdAleatorio,
  prepararCamadas,
  prepararGravacaoDoTerreno,
  prepararPaleta,
  prepararReceita,
  type TerrenoAberto,
} from '@sistemazero/molda-cenarios/oficina/autoria'
import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import {
  aplicarFerramentaDeTerreno,
  type ComandoDeCenario,
  clonarEstadoDoTerreno,
  conferirImplantacao,
  criarAmostradorDeEspalhamento,
  type DocumentoDeCenario,
  dominioDoChao,
  type EstadoDoTerreno,
  encaixarNaVizinha,
  executarLote,
  type FonteDeAlturas,
  type IntencaoDeAguaSchema,
  LIMITES_CENARIO_V2,
  type ParametrosDeTerreno,
  ParametrosDeTerrenoSchema,
  type PontoDaEscultura,
  type PontoDeEncaixe,
  prepararConsultaDaAgua,
  prepararOperacaoDeAgua,
  prepararOperacaoDeCaminho,
  type ReceitaDeEspalhamento,
  type ReceitaDeTerreno,
  type RegioesDeTerreno,
  referenciasDoTerreno,
  resolverConjuntos,
  unirRegioes,
} from '@sistemazero/molda-cenarios-core/v2'
import { pontosDeEncaixeDoGlb } from '@sistemazero/molda-cenarios-motor/encaixes'
import type { z } from 'zod'

/**
 * Os comandos de intenção do agente: cada um é UM lote (um passo de desfazer na oficina), na
 * revisão lida agora, feito com as mesmas funções que a oficina usa à mão. Quem chama pode passar
 * `revisaoEsperada`: se o cenário mudou desde então (outra pessoa editou), nada é gravado.
 */

export class CenarioMudou extends Error {
  constructor(readonly revisaoAtual: number) {
    super(`O cenário mudou (agora está na revisão ${revisaoAtual}). Leia de novo e refaça.`)
    this.name = 'CenarioMudou'
  }
}

export interface OpcoesDoLote {
  /** A revisão que o agente leu por último; diferente da atual, nada é gravado. */
  revisaoEsperada?: number
  /** Repetir o mesmo id depois de uma resposta perdida não aplica duas vezes. */
  operacaoId?: string
}

export interface ResultadoDoLote {
  revisao: number
  alterado: boolean
  /** Ids das entidades criadas pelo comando (para o agente se referir a elas depois). */
  criados: string[]
  avisos: string[]
}

type Aberto = Awaited<ReturnType<typeof abrirParaEditar>>
type Ponto = { x: number; z: number }

/** Uma passada do pincel: amostras espaçadas ao longo dos pontos, como o gesto do palco. */
function amostrasDoTraco(pontos: readonly Ponto[], espaco: number): Ponto[] {
  if (pontos.length < 2) return pontos.map((p) => ({ x: p.x, z: p.z }))
  const saida: Ponto[] = [{ x: pontos[0]!.x, z: pontos[0]!.z }]
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1]!,
      b = pontos[i]!,
      n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / espaco))
    for (let k = 1; k <= n; k++)
      saida.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n })
  }
  return saida
}

/** A altura do chão onde não há relevo (base plana): zero, a régua do documento. */
const alturaSemRelevo = () => 0

export function criarIntencoes(host: CenariosHost) {
  async function abrir(cenarioId: string, opcoes: OpcoesDoLote): Promise<Aberto> {
    const aberto = await abrirParaEditar(host, cenarioId)
    if (opcoes.revisaoEsperada !== undefined && opcoes.revisaoEsperada !== aberto.revisao)
      throw new CenarioMudou(aberto.revisao)
    return aberto
  }
  /** O relevo editável: o guardado, ou um relevo novo plano sobre a base atual. */
  function relevoDe(aberto: Aberto): { base: EdicaoDoTerreno['base']; estado: EstadoDoTerreno } {
    if (aberto.terreno && aberto.documento.base.tipo === 'terreno')
      return {
        base: aberto.documento.base,
        estado: clonarEstadoDoTerreno(aberto.terreno.estado),
      }
    const base = baseInicialDeTerreno(aberto.documento.base)
    return prepararReceita(base, null, { tipo: 'plano', altura: 0 })
  }
  async function gravar(
    aberto: Aberto,
    cenarioId: string,
    comandos: readonly ComandoDeCenario[],
    edicao: EdicaoDoTerreno | null,
    opcoes: OpcoesDoLote,
    criados: string[] = [],
    avisos: string[] = [],
  ): Promise<ResultadoDoLote> {
    const preparo = edicao
      ? await prepararGravacaoDoTerreno({
          documentoDeOrigem: aberto.documento,
          edicao,
          antes: comandos,
        })
      : { comandos: [...comandos], arquivos: [] }
    const r = await gravarSemPalco(host, {
      cenarioId,
      revisaoEsperada: aberto.revisao,
      comandos: preparo.comandos,
      arquivos: preparo.arquivos,
      ...(opcoes.operacaoId ? { operacaoId: opcoes.operacaoId } : {}),
    })
    return { ...r, criados: r.alterado ? criados : [], avisos }
  }
  /** O modelo da biblioteca pelo id, conferido pelo hash que a busca devolveu. */
  async function modeloDaBiblioteca(
    bibliotecaId: string,
    modeloId: string,
    digest: string,
  ): Promise<ModeloDeBiblioteca> {
    const pagina = await host.listarModelos(bibliotecaId, { digest, limite: 50 })
    const modelo = pagina.itens.find((m) => m.id === modeloId)
    if (!modelo) throw Error('Não achei esse modelo nesta biblioteca. Busque de novo.')
    return modelo
  }

  return {
    /** Gera o relevo inteiro por uma receita (ilha, colinas, vale, plano...). */
    async gerarTerreno(
      cenarioId: string,
      receita: ReceitaDeTerreno,
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      const aberto = await abrir(cenarioId, opcoes)
      const base =
        aberto.documento.base.tipo === 'terreno'
          ? aberto.documento.base
          : baseInicialDeTerreno(aberto.documento.base)
      const estado = aberto.terreno ? clonarEstadoDoTerreno(aberto.terreno.estado) : null
      return gravar(aberto, cenarioId, [], prepararReceita(base, estado, receita), opcoes)
    },

    /** Uma passada de uma ferramenta do relevo (elevar, aplainar, rampa, cratera, pintar...). */
    async esculpirTerreno(
      cenarioId: string,
      pedido: { parametros: Partial<ParametrosDeTerreno>; pontos: readonly Ponto[] },
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      if (!pedido.pontos.length) throw Error('Diga por onde passar a ferramenta.')
      const aberto = await abrir(cenarioId, opcoes)
      const parametros = ParametrosDeTerrenoSchema.parse(pedido.parametros)
      const { base, estado } = relevoDe(aberto)
      const original: FonteDeAlturas = aberto.terreno?.fonte ?? alturaSemRelevo
      const espaco = Math.max(0.25, parametros.raio / 4)
      const amostras = amostrasDoTraco(pedido.pontos, espaco).slice(0, 4096)
      const regioes: RegioesDeTerreno = {}
      let anterior: PontoDaEscultura | null = null
      for (const p of amostras) {
        // Ponto e anterior levam a altura ORIGINAL (a régua do gesto do palco).
        const ponto = { x: p.x, y: original(p.x, p.z), z: p.z }
        const r = aplicarFerramentaDeTerreno(estado, parametros, ponto, anterior ?? ponto)
        for (const papel of ['alturas', 'pintura', 'buracos'] as const)
          if (r[papel]) regioes[papel] = unirRegioes(regioes[papel] ?? null, r[papel] ?? null)
        anterior = ponto
      }
      return gravar(aberto, cenarioId, [], { base, estado, regioes }, opcoes)
    },

    /** Pinta o chão com uma camada de solo (criada antes, se ainda não existir). */
    async pintarChao(
      cenarioId: string,
      pedido: {
        camada: { id: string; nome: string; cor: string }
        pontos: readonly Ponto[]
        raio?: number
        forca?: number
      },
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      if (!pedido.pontos.length) throw Error('Diga por onde pintar.')
      const aberto = await abrir(cenarioId, opcoes)
      const relevo = relevoDe(aberto)
      const camadas = relevo.base.solo?.camadas ?? []
      let indice = camadas.findIndex((c) => c.id === pedido.camada.id)
      let base = relevo.base,
        estado = relevo.estado
      let regioes: RegioesDeTerreno = {}
      if (indice < 0) {
        if (camadas.length >= 8) throw Error('O chão já tem oito camadas; use uma delas.')
        const comNova = prepararCamadas(base, estado, [...camadas, pedido.camada])
        base = comNova.base
        estado = comNova.estado
        regioes = { ...comNova.regioes }
        indice = camadas.length
      }
      const parametros = ParametrosDeTerrenoSchema.parse({
        ferramenta: 'pintar',
        camada: indice,
        raio: pedido.raio ?? 6,
        forca: pedido.forca ?? 0.8,
      })
      const original: FonteDeAlturas = aberto.terreno?.fonte ?? alturaSemRelevo
      let anterior: PontoDaEscultura | null = null
      for (const p of amostrasDoTraco(pedido.pontos, Math.max(0.25, parametros.raio / 4)).slice(
        0,
        4096,
      )) {
        const ponto = { x: p.x, y: original(p.x, p.z), z: p.z }
        const r = aplicarFerramentaDeTerreno(estado, parametros, ponto, anterior ?? ponto)
        for (const papel of ['alturas', 'pintura', 'buracos'] as const)
          if (r[papel]) regioes[papel] = unirRegioes(regioes[papel] ?? null, r[papel] ?? null)
        anterior = ponto
      }
      return gravar(aberto, cenarioId, [], { base, estado, regioes }, opcoes)
    },

    /** Mar, lago num ponto, rio, represa ou cachoeira, com o leito moldado no mesmo lote. */
    async encherAgua(
      cenarioId: string,
      pedido: { nome?: string; intencao: z.input<typeof IntencaoDeAguaSchema> },
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      const aberto = await abrir(cenarioId, opcoes)
      const id = novoIdAleatorio()
      const estado = aberto.terreno ? clonarEstadoDoTerreno(aberto.terreno.estado) : null
      const operacao = prepararOperacaoDeAgua(
        { id, nome: pedido.nome ?? 'Água' },
        pedido.intencao,
        estado,
      )
      const comandos: ComandoDeCenario[] = [{ tipo: 'agua.definir', agua: operacao.agua }]
      const edicao =
        operacao.terreno && aberto.documento.base.tipo === 'terreno'
          ? { base: aberto.documento.base, estado: operacao.terreno, regioes: operacao.regioes }
          : null
      return gravar(aberto, cenarioId, comandos, edicao, opcoes, [id])
    },

    /** Trilha, praça, estrada, cerca, muro ou ponte ao longo dos pontos. */
    async tracarCaminho(
      cenarioId: string,
      pedido: {
        /** Tipo, nome, pontos, largura e acabamento; o núcleo confere tudo (`CaminhoSchema`). */
        caminho: Readonly<Record<string, unknown>>
        moldarTerreno?: boolean
      },
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      const aberto = await abrir(cenarioId, opcoes)
      const id = novoIdAleatorio()
      const estado = aberto.terreno ? clonarEstadoDoTerreno(aberto.terreno.estado) : null
      const operacao = prepararOperacaoDeCaminho(
        { grupo: null, ...pedido.caminho, id, bloqueado: false, oculto: false },
        estado,
        { moldarTerreno: pedido.moldarTerreno ?? true },
      )
      const comandos: ComandoDeCenario[] = [
        ...(operacao.modelos ?? []).map((modelo) => ({ tipo: 'modelo.definir' as const, modelo })),
        ...(operacao.texturas ?? []).map((textura) => ({
          tipo: 'textura.definir' as const,
          textura,
        })),
        { tipo: 'caminho.definir', caminho: operacao.caminho },
      ]
      const edicao =
        operacao.terreno && aberto.documento.base.tipo === 'terreno'
          ? { base: aberto.documento.base, estado: operacao.terreno, regioes: operacao.regioes }
          : null
      return gravar(aberto, cenarioId, comandos, edicao, opcoes, [id])
    },

    /** Põe um modelo da biblioteca no lugar, pisando no chão. */
    async colocarModelo(
      cenarioId: string,
      pedido: {
        bibliotecaId: string
        modeloId: string
        digest: string
        x: number
        z: number
        giro?: number
        escala?: number
      },
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      const aberto = await abrir(cenarioId, opcoes)
      const modelo = await modeloDaBiblioteca(pedido.bibliotecaId, pedido.modeloId, pedido.digest)
      const { comandos, id } = comandosParaPor(aberto.documento, modelo, {
        x: pedido.x,
        z: pedido.z,
      })
      const criar = comandos.at(-1)
      if (criar?.tipo === 'instancia.criar') {
        if (pedido.giro) criar.instancia.transformacao.rotacao.y = pedido.giro
        if (pedido.escala) {
          const e = pedido.escala
          criar.instancia.transformacao.escala = { x: e, y: e, z: e }
        }
      }
      return gravar(aberto, cenarioId, comandos, null, opcoes, [id])
    },

    /** Monta um conjunto da biblioteca na versão publicada dele, assentado pela base. */
    async montarConjunto(
      cenarioId: string,
      pedido: { conjuntoId: string; x: number; z: number },
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      const aberto = await abrir(cenarioId, opcoes)
      const conjunto = await host.obterConjunto(pedido.conjuntoId)
      const versao = await host.versaoDoConjunto(conjunto.id, conjunto.revisao)
      const altura = aberto.terreno?.fonte(pedido.x, pedido.z) ?? 0
      const { comandos, id } = comandosParaPorConjunto(aberto.documento, conjunto, versao, {
        x: pedido.x,
        z: pedido.z,
        y: altura,
      })
      return gravar(aberto, cenarioId, comandos, null, opcoes, [id])
    },

    /**
     * Espalha modelos numa área redonda (até 100 m de raio por passada; áreas maiores viram
     * várias passadas no mesmo lote). `evitarAgua` tira as amostras que cairiam na água.
     */
    async espalhar(
      cenarioId: string,
      pedido: {
        modelos: ReadonlyArray<{ bibliotecaId: string; modeloId: string; digest: string }>
        centro: Ponto
        raio: number
        densidade?: number
        afastamento?: number
        tamanhoMin?: number
        tamanhoMax?: number
        limite?: number
        semente?: number
        evitarAgua?: boolean
      },
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      if (!pedido.modelos.length) throw Error('Diga quais modelos espalhar.')
      const aberto = await abrir(cenarioId, opcoes)
      const modelos = await Promise.all(
        pedido.modelos.map((m) => modeloDaBiblioteca(m.bibliotecaId, m.modeloId, m.digest)),
      )
      const doc = aberto.documento
      const paleta = prepararPaleta(doc, modelos.map(escolhaDaBiblioteca))
      // O documento de consulta tem os modelos da paleta, como o palco monta para a prévia.
      const consulta: DocumentoDeCenario = {
        ...doc,
        modelos: [...doc.modelos, ...paleta.modelos],
        ...(paleta.formas.length ? { formas: [...(doc.formas ?? []), ...paleta.formas] } : {}),
        ...(paleta.texturas.length
          ? { texturas: [...(doc.texturas ?? []), ...paleta.texturas] }
          : {}),
      }
      const raioDaPassada = Math.min(100, Math.max(0.2, pedido.raio))
      const traco: Ponto[] = []
      if (pedido.raio <= 100) traco.push(pedido.centro)
      else
        for (let dz = -pedido.raio; dz <= pedido.raio; dz += raioDaPassada * 1.5)
          for (let dx = -pedido.raio; dx <= pedido.raio; dx += raioDaPassada * 1.5)
            if (Math.hypot(dx, dz) <= pedido.raio)
              traco.push({ x: pedido.centro.x + dx, z: pedido.centro.z + dz })
      const receita: ReceitaDeEspalhamento = {
        prototipos: paleta.prototipos,
        traco: traco.slice(0, 512),
        raio: raioDaPassada,
        densidade: pedido.densidade ?? 2,
        afastamento: pedido.afastamento ?? 3,
        giro: Math.PI,
        tamanhoMin: pedido.tamanhoMin ?? 0.85,
        tamanhoMax: pedido.tamanhoMax ?? 1.15,
        semente: pedido.semente ?? Math.floor(Math.random() * 0x7fffffff),
        limite: Math.min(pedido.limite ?? 200, 2000),
        evitarObjetos: true,
        grupo: null,
        camada: null,
      }
      const fonte = aberto.terreno?.fonte
      const resultado = criarAmostradorDeEspalhamento(consulta, receita, fonte).gerar()
      const aguas = doc.aguas.map((a) => prepararConsultaDaAgua(a))
      const amostras =
        pedido.evitarAgua === false
          ? resultado.amostras
          : resultado.amostras.filter((a) => !aguas.some((q) => q.em(a.x, a.z, fonte)))
      if (!amostras.length)
        return {
          revisao: aberto.revisao,
          alterado: false,
          criados: [],
          avisos: ['Nada coube na área.'],
        }
      const { comandos, ids } = comandosParaEspalhar(doc, {
        documentoDeOrigem: doc,
        modelos: paleta.modelos,
        formas: paleta.formas,
        texturas: paleta.texturas,
        receita,
        amostras,
      })
      const avisos =
        amostras.length < resultado.amostras.length
          ? [`${resultado.amostras.length - amostras.length} ficaram de fora por cair na água.`]
          : []
      return gravar(aberto, cenarioId, comandos, null, opcoes, ids, avisos)
    },

    /** Faz os objetos pisarem no relevo (o apoio no chão que a oficina usa ao colocar). */
    async alinharAoChao(
      cenarioId: string,
      ids: readonly string[],
      opcoes: OpcoesDoLote = {},
    ): Promise<ResultadoDoLote> {
      const aberto = await abrir(cenarioId, opcoes)
      const comandos: ComandoDeCenario[] = [],
        avisos: string[] = []
      for (const id of ids) {
        const o = aberto.documento.instancias.find((i) => i.id === id)
        if (!o) {
          avisos.push(`${id} não é um objeto deste cenário.`)
          continue
        }
        comandos.push({
          tipo: 'instancia.atualizar',
          id,
          alteracoes: {
            apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
            transformacao: {
              ...o.transformacao,
              posicao: { ...o.transformacao.posicao, y: 0 },
            },
          },
        })
      }
      return gravar(aberto, cenarioId, comandos, null, opcoes, [], avisos)
    },

    /**
     * Encaixa cada peça na vizinha mais perto pelos pontos de encaixe, como o botão "Encaixar na
     * vizinha" da oficina: os pontos escritos à mão no modelo ou os da geometria do arquivo. As
     * peças são encaixadas em ordem (a segunda pode encaixar na primeira já movida), num passo só.
     */
    async encaixarPecas(
      cenarioId: string,
      pedido: { pecas: readonly string[]; vizinha?: string; alcance?: number },
      opcoes: OpcoesDoLote = {},
    ): Promise<
      ResultadoDoLote & { encaixes: { peca: string; vizinha: string; distancia: number }[] }
    > {
      const aberto = await abrir(cenarioId, opcoes)
      const doc = { ...aberto.documento, instancias: [...aberto.documento.instancias] }
      const fonte = aberto.terreno?.fonte
      // Só os modelos das peças pedidas e das vizinhas que estão ao alcance da procura (25 m).
      const centros = pedido.pecas
        .map((id) => doc.instancias.find((o) => o.id === id)?.transformacao.posicao)
        .filter((p) => p !== undefined)
      const precisa = new Set<string>()
      for (const o of doc.instancias)
        if (
          centros.some(
            (c) =>
              Math.hypot(c.x - o.transformacao.posicao.x, c.z - o.transformacao.posicao.z) < 30,
          )
        )
          precisa.add(o.modelo)
      const pontos = new Map<string, PontoDeEncaixe[]>()
      for (const m of doc.modelos)
        if (precisa.has(m.id) && !m.encaixes && !pontos.has(m.digest))
          pontos.set(
            m.digest,
            pontosDeEncaixeDoGlb(
              new Uint8Array(
                await host.conteudoDoModelo({ biblioteca: m.biblioteca, digest: m.digest }),
              ),
            ),
          )
      const comandos: ComandoDeCenario[] = [],
        avisos: string[] = [],
        encaixes: { peca: string; vizinha: string; distancia: number }[] = []
      for (const id of pedido.pecas) {
        const i = doc.instancias.findIndex((o) => o.id === id)
        if (i < 0) {
          avisos.push(`${id} não é um objeto deste cenário.`)
          continue
        }
        const r = encaixarNaVizinha(doc, id, (m) => pontos.get(m.digest) ?? null, fonte, {
          ...(pedido.vizinha ? { vizinha: pedido.vizinha } : {}),
          ...(pedido.alcance ? { alcance: pedido.alcance } : {}),
        })
        if (!r) {
          avisos.push(`${id}: nenhuma vizinha com ponto de encaixe compatível ao alcance.`)
          continue
        }
        doc.instancias[i] = { ...doc.instancias[i]!, ...r.alteracoes }
        comandos.push({ tipo: 'instancia.atualizar', id, alteracoes: r.alteracoes })
        encaixes.push({
          peca: id,
          vizinha: r.vizinha,
          distancia: Math.round(r.distancia * 1000) / 1000,
        })
      }
      return { ...(await gravar(aberto, cenarioId, comandos, null, opcoes, [], avisos)), encaixes }
    },

    /** Desfaz ou refaz o último passo, como os botões da oficina. */
    async moverHistorico(
      cenarioId: string,
      acao: 'desfazer' | 'refazer',
      opcoes: OpcoesDoLote = {},
    ): Promise<{ revisao: number; desfazer: number; refazer: number }> {
      const aberto = await host.abrirCenario(cenarioId)
      if (opcoes.revisaoEsperada !== undefined && opcoes.revisaoEsperada !== aberto.revisao)
        throw new CenarioMudou(aberto.revisao)
      if ((acao === 'desfazer' ? aberto.historico.desfazer : aberto.historico.refazer) < 1)
        throw Error(
          acao === 'desfazer' ? 'Não há nada para desfazer.' : 'Não há nada para refazer.',
        )
      const depois = await host.moverHistorico(
        cenarioId,
        aberto.revisao,
        acao,
        opcoes.operacaoId ?? crypto.randomUUID(),
      )
      return {
        revisao: depois.revisao,
        desfazer: depois.historico.desfazer,
        refazer: depois.historico.refazer,
      }
    },

    // ----- Consultas, sem imagem e sem gravar -----

    /** Altura do chão, se há chão e o nível da água em cada ponto. */
    async consultarPontos(cenarioId: string, pontos: readonly Ponto[]) {
      const aberto = await host.abrirCenario(cenarioId)
      const terreno: TerrenoAberto | null =
        aberto.documento.base.tipo === 'terreno'
          ? (await abrirParaEditar(host, cenarioId)).terreno
          : null
      const dominio = dominioDoChao(aberto.documento.base),
        aguas = aberto.documento.aguas.map((a) => ({ id: a.id, q: prepararConsultaDaAgua(a) }))
      return pontos.slice(0, 2000).map((p) => {
        const chao = terreno?.fonte.temChao ? terreno.fonte.temChao(p) : dominio(p)
        const altura = terreno ? terreno.fonte(p.x, p.z) : alturaSemRelevo()
        let agua: { id: string; nivel: number; profundidade: number } | null = null
        for (const a of aguas) {
          const n = a.q.em(p.x, p.z, terreno?.fonte)
          if (n && (!agua || n.nivel > agua.nivel)) agua = { id: a.id, ...n }
        }
        return { x: p.x, z: p.z, chao, altura: chao ? altura : null, agua }
      })
    },

    /**
     * Confere a implantação dos objetos (flutuando, enterrado, sólido no caminho, peça fina colada
     * numa superfície) e os campos `arquipelago.*`, com o relevo guardado. Devolve a contagem por
     * tipo e até `limite` exemplos, repartidos entre os tipos para o agente ver um pouco de cada.
     */
    async conferirImplantacao(cenarioId: string, limite = 50) {
      const aberto = await abrirParaEditar(host, cenarioId)
      const avisos = conferirImplantacao(aberto.documento, aberto.terreno?.fonte ?? null)
      const porTipo = new Map<string, typeof avisos>()
      for (const a of avisos) {
        const lista = porTipo.get(a.tipo)
        if (lista) lista.push(a)
        else porTipo.set(a.tipo, [a])
      }
      const grupos = [...porTipo].map(([tipo, lista]) => ({
        tipo,
        quantidade: lista.length,
        itens: [] as Omit<(typeof avisos)[number], 'tipo'>[],
      }))
      let restam = limite
      for (let rodada = 0; restam > 0; rodada++) {
        let algum = false
        for (const g of grupos) {
          const a = porTipo.get(g.tipo)![rodada]
          if (!a || restam <= 0) continue
          const { tipo: _tipo, ...item } = a
          g.itens.push(item)
          restam--
          algum = true
        }
        if (!algum) break
      }
      return { revisao: aberto.revisao, total: avisos.length, mostrados: limite - restam, grupos }
    },

    /** O que existe numa região retangular do chão (objetos, conjuntos, água, caminhos, marcadores). */
    async consultarRegiao(
      cenarioId: string,
      caixa: { x0: number; z0: number; x1: number; z1: number },
    ) {
      const { documento: d } = await host.abrirCenario(cenarioId)
      const dentro = (p: Ponto) =>
        p.x >= Math.min(caixa.x0, caixa.x1) &&
        p.x <= Math.max(caixa.x0, caixa.x1) &&
        p.z >= Math.min(caixa.z0, caixa.z1) &&
        p.z <= Math.max(caixa.z0, caixa.z1)
      const nomeDoModelo = new Map(d.modelos.map((m) => [m.id, m.nome ?? m.modelo]))
      return {
        objetos: d.instancias
          .filter((o) => dentro(o.transformacao.posicao))
          .map((o) => ({
            id: o.id,
            nome: o.nome,
            modelo: nomeDoModelo.get(o.modelo) ?? o.modelo,
            posicao: o.transformacao.posicao,
            giro: o.transformacao.rotacao.y,
          })),
        conjuntos: (d.montagens ?? [])
          .filter((m) => dentro(m.transformacao.posicao))
          .map((m) => ({ id: m.id, nome: m.nome, posicao: m.transformacao.posicao })),
        aguas: d.aguas
          .filter((a) => {
            const l = prepararConsultaDaAgua(a).limites
            return (
              !l ||
              (l.x1 >= Math.min(caixa.x0, caixa.x1) &&
                l.x0 <= Math.max(caixa.x0, caixa.x1) &&
                l.z1 >= Math.min(caixa.z0, caixa.z1) &&
                l.z0 <= Math.max(caixa.z0, caixa.z1))
            )
          })
          .map((a) => ({ id: a.id, nome: a.nome, tipo: a.tipo })),
        caminhos: d.caminhos
          .filter((c) => c.pontos.some(dentro))
          .map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, pontos: c.pontos.length })),
        marcadores: d.marcadores
          .filter((m) => dentro(m.posicao))
          .map((m) => ({ id: m.id, nome: m.nome, posicao: m.posicao, giro: m.giro })),
      }
    },

    /**
     * Orçamento de autoria a partir dos dados dos modelos (triângulos e bytes guardados de cada
     * um), comparado aos limites de cada destino. É uma estimativa: a exportação junta peças e
     * comprime, então o pacote final costuma ficar menor.
     */
    async orcamento(cenarioId: string) {
      const aberto = await host.abrirCenario(cenarioId)
      const mundo = await host.obterMundo(aberto.resumo.mundoId)
      const doc = resolverConjuntos(aberto.documento).documento
      const usos = new Map<string, number>()
      for (const o of doc.instancias) usos.set(o.modelo, (usos.get(o.modelo) ?? 0) + 1)
      const refs = doc.modelos.filter((m) => usos.has(m.id))
      const ids = [...new Set(refs.map((m) => m.modelo))]
      const dados = new Map<string, ModeloDeBiblioteca>()
      for (let i = 0; i < ids.length; i += 100) {
        const pagina = await host.buscarModelosNoEspaco(mundo.espacoId, {
          ids: ids.slice(i, i + 100),
          limite: 100,
        })
        for (const m of pagina.itens) dados.set(m.id, m)
      }
      let triangulos = 0,
        bytesDosModelos = 0,
        maiorModelo = 0
      const semDados: string[] = []
      for (const m of refs) {
        const d = dados.get(m.modelo)
        if (!d) {
          semDados.push(m.nome ?? m.id)
          continue
        }
        triangulos += d.triangulos * usos.get(m.id)!
        bytesDosModelos += d.bytes
        maiorModelo = Math.max(maiorModelo, d.bytes)
      }
      const pecasDoRelevo = doc.base.tipo === 'terreno' ? referenciasDoTerreno(doc.base).length : 0
      const arquivos = refs.length + pecasDoRelevo + (doc.texturas?.length ?? 0)
      const objetos = doc.instancias.length
      const MIB = 1024 * 1024
      const destino = (motivos: Array<string | false>) => {
        const lista = motivos.filter((m): m is string => !!m)
        return { cabe: lista.length === 0, motivos: lista }
      }
      return {
        objetos,
        modelosDiferentes: refs.length,
        triangulos,
        bytesDosModelos,
        pecasDoRelevo,
        arquivos,
        ...(semDados.length ? { semDados } : {}),
        destinos: {
          oficina: destino([
            objetos > LIMITES_CENARIO_V2.objetos &&
              `Passa de ${LIMITES_CENARIO_V2.objetos} objetos no cenário.`,
          ]),
          three: destino([
            bytesDosModelos > LIMITES_DA_EXPORTACAO.bytesDoPacote &&
              `Os modelos passam de ${LIMITES_DA_EXPORTACAO.bytesDoPacote / MIB} MiB.`,
            arquivos > LIMITES_DA_EXPORTACAO.arquivos &&
              `Passa de ${LIMITES_DA_EXPORTACAO.arquivos} arquivos.`,
          ]),
          // O GLB único: um arquivo de até 32 MiB e 8.192 partes visíveis (`glb-unico.ts`).
          glb: destino([
            bytesDosModelos > 32 * MIB && 'Os modelos passam de 32 MiB num arquivo só.',
            objetos > 8192 && 'Passa de 8.192 partes visíveis.',
          ]),
          estudio: destino([
            bytesDosModelos > LIMITES_DA_EXPORTACAO.studio.bytesDoProjeto &&
              `Os modelos passam de ${LIMITES_DA_EXPORTACAO.studio.bytesDoProjeto / MIB} MiB do projeto.`,
            maiorModelo > LIMITES_DA_EXPORTACAO.studio.bytesPorModelo &&
              `Um modelo passa de ${LIMITES_DA_EXPORTACAO.studio.bytesPorModelo / MIB} MiB.`,
          ]),
          // A publicação no jogo leva o pacote Three: os mesmos tetos.
          arquipelago: destino([
            bytesDosModelos > LIMITES_DA_EXPORTACAO.bytesDoPacote &&
              `Os modelos passam de ${LIMITES_DA_EXPORTACAO.bytesDoPacote / MIB} MiB.`,
            arquivos > LIMITES_DA_EXPORTACAO.arquivos &&
              `Passa de ${LIMITES_DA_EXPORTACAO.arquivos} arquivos.`,
          ]),
        },
      }
    },

    /** Confere um lote sem gravar: o mesmo `executarLote` que o servidor roda. */
    async validarLote(cenarioId: string, comandos: readonly ComandoDeCenario[]) {
      const aberto = await host.abrirCenario(cenarioId)
      try {
        const depois = executarLote(
          { documento: aberto.documento, revisao: aberto.revisao },
          { revisaoEsperada: aberto.revisao, comandos },
        )
        const d = depois.documento
        return {
          valido: true as const,
          revisao: aberto.revisao,
          depois: {
            objetos: d.instancias.length,
            aguas: d.aguas.length,
            caminhos: d.caminhos.length,
            limiteDeObjetos: LIMITES_CENARIO_V2.objetos,
          },
        }
      } catch (falha) {
        return {
          valido: false as const,
          revisao: aberto.revisao,
          problema: falha instanceof Error ? falha.message : String(falha),
        }
      }
    },
  }
}

export type Intencoes = ReturnType<typeof criarIntencoes>
