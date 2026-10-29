import { randomUUID } from 'node:crypto'
import {
  type AnaliseDoDesafio,
  type AplicacaoDoManifesto,
  type AplicarManifesto,
  blocosExigidos,
  CARTAS_LUMI,
  type ConferenciaDoManifesto,
  type ConteudoDoDesafio,
  type CriarDesafio,
  coberturaDosBlocos,
  type DesafioDaEquipe,
  type GravarDesafio,
  type ItemDaConferencia,
  ilha as ilhaDoContrato,
  LIMITES_DO_DESAFIO,
  LIMITES_DO_MANIFESTO,
  type ManifestoDeDesafios,
  type MetadadosDoDesafio,
  migrarConteudoDoDesafio,
  type ProblemaDoDesafio,
  type ResumoDoDesafio,
} from '@sistemazero/arquipelago-contracts'
import type {
  DesafioNoBanco,
  FiltroDosDesafios,
  RepositorioDeDesafios,
  ResultadoDaEscrita,
} from '../domain/desafios.port'
import type { Equipe } from '../domain/jogador'
import {
  decidir,
  impressaoDigital,
  itemDoCadastro,
  metadadosDoItem,
  novoManifesto,
  ordemDeGravacao,
} from '../domain/manifestos'
import { MembrosIndisponiveisError, type PortaDosMembros } from '../domain/membros.port'
import {
  ConflitoDoCadastroError,
  DesafioComProblemasError,
  DesafioDesatualizadoError,
  DesafioNaoEncontradoError,
  ManifestoDesatualizadoError,
  ManifestoExcedeLimiteError,
  PlataformaIndisponivelError,
  SemPermissaoDeEscritaError,
} from './erros'
import type { LeiturasDosMembros } from './leituras-dos-membros'
import type { ConferenciaDoMapa } from './mapa-das-ilhas'

/**
 * A seção Jogo do Admin: cadastro dos desafios com trava de revisão, a análise feita pelo Members
 * (o mesmo verificador das aulas) e a publicação, que congela o que a pessoa vai jogar. Publicar é
 * recusado enquanto a análise tiver problema.
 */
export class ServicoDaEquipe {
  constructor(
    private readonly repo: RepositorioDeDesafios,
    private readonly membros: PortaDosMembros | null,
    private readonly leituras: LeiturasDosMembros,
    private readonly mapa: ConferenciaDoMapa,
    private readonly agora: () => Date = () => new Date(),
    private readonly novoId: () => string = randomUUID,
  ) {}

  async listar(
    _equipe: Equipe,
    filtro: FiltroDosDesafios,
  ): Promise<{ desafios: ResumoDoDesafio[] }> {
    return { desafios: (await this.repo.listar(filtro)).map(resumo) }
  }

  async ler(_equipe: Equipe, id: string): Promise<DesafioDaEquipe> {
    return paraEquipe(await this.exigir(id))
  }

  async criar(equipe: Equipe, pedido: CriarDesafio): Promise<DesafioDaEquipe> {
    this.exigirEscrita(equipe)
    return paraEquipe(
      resolver(
        await this.repo.criar({
          id: this.novoId(),
          metadados: pedido.metadados,
          conteudo: pedido.conteudo,
          por: equipe.id,
          agora: this.agora(),
        }),
      ),
    )
  }

  async gravar(equipe: Equipe, id: string, pedido: GravarDesafio): Promise<DesafioDaEquipe> {
    this.exigirEscrita(equipe)
    return paraEquipe(
      resolver(
        await this.repo.gravar({
          id,
          revisaoBase: pedido.revisaoBase,
          metadados: pedido.metadados,
          conteudo: pedido.conteudo,
          por: equipe.id,
          agora: this.agora(),
        }),
      ),
    )
  }

  /** O que a publicação congelaria, para a equipe ver antes de publicar. Não grava nada. */
  async analisar(_equipe: Equipe, id: string, revisaoBase: number): Promise<AnaliseDoDesafio> {
    const desafio = await this.exigirRevisao(id, revisaoBase)
    return (await this.analise(desafio)).analise
  }

  async publicar(equipe: Equipe, id: string, revisaoBase: number): Promise<DesafioDaEquipe> {
    this.exigirEscrita(equipe)
    const desafio = await this.exigirRevisao(id, revisaoBase)
    const { analise, conteudo, vista } = await this.analise(desafio)
    if (analise.problemas.length > 0) throw new DesafioComProblemasError(analise.problemas)
    return paraEquipe(
      resolver(
        await this.repo.publicar({
          id,
          revisaoBase,
          publicacao: {
            conteudo,
            blocosDerivados: analise.blocosDerivados,
            blocosExigidos: analise.blocosExigidos,
            vista,
            analise,
          },
          por: equipe.id,
          agora: this.agora(),
        }),
      ),
    )
  }

  async arquivar(equipe: Equipe, id: string, revisaoBase: number): Promise<DesafioDaEquipe> {
    return this.mudarSituacao(equipe, id, revisaoBase, 'arquivado')
  }

  async reativar(equipe: Equipe, id: string, revisaoBase: number): Promise<DesafioDaEquipe> {
    return this.mudarSituacao(equipe, id, revisaoBase, 'ativo')
  }

  /** O mapa das ilhas conferido contra a jornada e de onde se aprende cada cartão dos Lumis. */
  async cobertura(_equipe: Equipe, publico: 'kids' | 'adulto') {
    const situacao = this.mapa.situacao()
    const curriculo = await this.leituras.curriculo(publico === 'kids' ? 'kids' : 'adult')
    // Cartão não é de ilha: o "depois do posto da ilha" não se aplica (limite = a Lenda).
    const porBloco = new Map(
      coberturaDosBlocos(
        CARTAS_LUMI.flatMap((c) => (c.bloco ? [c.bloco] : [])),
        curriculo,
        'god',
      ).map((c) => [c.bloco, c]),
    )
    return {
      mapa: {
        situacao: situacao.situacao,
        ...(situacao.situacao === 'com-problemas' ? { problemas: situacao.problemas } : {}),
      },
      cartas: CARTAS_LUMI.map((carta) => {
        const c = carta.bloco ? porBloco.get(carta.bloco) : undefined
        return {
          id: carta.id,
          nome: carta.nome,
          bloco: carta.bloco,
          cursos: c?.cursos ?? [],
          avisos: c?.avisos ?? [],
        }
      }),
    }
  }

  // ── Manifesto de desafios (28/10/2026) ───────────────────────────────────────────────────

  /**
   * A prévia do manifesto: o que cada desafio do arquivo vai virar, com a análise do Members dos
   * que vão ser gravados ou publicados. Não grava nada.
   */
  async conferirManifesto(
    _equipe: Equipe,
    manifesto: ManifestoDeDesafios,
  ): Promise<ConferenciaDoManifesto> {
    const cadastro = await this.repo.listar({})
    const decisoes = decidir(manifesto, cadastro)
    const itens: ItemDaConferencia[] = []
    for (const [i, item] of manifesto.desafios.entries()) {
      const d = decisoes[i]
      if (!d) continue
      const analisa =
        d.acao === 'criar' || d.acao === 'atualizar' || (item.publicar && d.temOQuePublicar)
      const analise =
        d.acao !== 'conflito' && analisa
          ? (await this.analiseDe(metadadosDoItem(item), item.conteudo)).analise
          : null
      itens.push({
        slug: item.slug,
        titulo: item.conteudo.titulo,
        publico: item.publico,
        ilha: item.ilha,
        tipo: item.tipo,
        quadro: item.quadro,
        acao: d.acao,
        id: d.existente?.id ?? null,
        conflito: d.conflito,
        analise,
        publica:
          Boolean(item.publicar) &&
          d.temOQuePublicar &&
          analise !== null &&
          analise.problemas.length === 0,
      })
    }
    const conta = (acao: ItemDaConferencia['acao']) => itens.filter((i) => i.acao === acao).length
    return {
      impressao: impressaoDigital(manifesto, cadastro),
      itens,
      contagem: {
        criar: conta('criar'),
        atualizar: conta('atualizar'),
        igual: conta('igual'),
        conflito: conta('conflito'),
        comProblema: itens.filter((i) => (i.analise?.problemas.length ?? 0) > 0).length,
        publica: itens.filter((i) => i.publica).length,
      },
    }
  }

  /**
   * Grava o que a prévia mostrou. A impressão precisa ser a da prévia (alguém mexeu num desafio do
   * arquivo no meio → 409 `MANIFESTO_DESATUALIZADO`, sem gravar nada). Cada desafio segue sozinho:
   * conflito não grava, problema na análise deixa em rascunho, e os outros continuam.
   */
  async aplicarManifesto(equipe: Equipe, pedido: AplicarManifesto): Promise<AplicacaoDoManifesto> {
    this.exigirEscrita(equipe)
    const { manifesto } = pedido
    const cadastro = await this.repo.listar({})
    if (impressaoDigital(manifesto, cadastro) !== pedido.impressao)
      throw new ManifestoDesatualizadoError()
    const decisoes = decidir(manifesto, cadastro)
    // Grava na ordem que libera cada quadro antes de ocupá-lo; responde na ordem do arquivo.
    const porIndice: AplicacaoDoManifesto['itens'][number][] = []
    for (const i of ordemDeGravacao(manifesto, decisoes)) {
      const item = manifesto.desafios[i]
      const d = decisoes[i]
      if (!item || !d) continue
      const responder = (r: AplicacaoDoManifesto['itens'][number]) => {
        porIndice[i] = r
      }
      if (d.acao === 'conflito') {
        responder({
          slug: item.slug,
          id: d.existente?.id ?? null,
          acao: 'conflito',
          publicado: false,
          problemas: d.conflito ? [d.conflito] : [],
        })
        continue
      }
      let atual: DesafioDaEquipe | null = d.existente ? paraEquipe(d.existente) : null
      try {
        if (d.acao === 'criar')
          atual = await this.criar(equipe, {
            metadados: metadadosDoItem(item),
            conteudo: item.conteudo,
          })
        else if (d.acao === 'atualizar' && d.existente)
          atual = await this.gravar(equipe, d.existente.id, {
            revisaoBase: d.existente.revisao,
            metadados: metadadosDoItem(item),
            conteudo: item.conteudo,
          })
      } catch (erro) {
        if (
          !(erro instanceof ConflitoDoCadastroError) &&
          !(erro instanceof DesafioDesatualizadoError)
        )
          throw erro
        responder({
          slug: item.slug,
          id: d.existente?.id ?? null,
          acao: 'conflito',
          publicado: false,
          problemas: [
            {
              codigo:
                erro instanceof DesafioDesatualizadoError
                  ? 'DESAFIO_DESATUALIZADO'
                  : erro.motivo === 'slug-em-uso'
                    ? 'SLUG_EM_USO'
                    : 'QUADRO_OCUPADO',
              mensagem: erro.message,
            },
          ],
        })
        continue
      }
      if (!atual) continue
      let publicado =
        atual.resumo.situacao === 'publicado' && !atual.resumo.alteradoDepoisDePublicar
      let problemas: ProblemaDoDesafio[] = []
      if (item.publicar && d.temOQuePublicar) {
        try {
          atual = await this.publicar(equipe, atual.resumo.id, atual.resumo.revisao)
          publicado = true
        } catch (erro) {
          // Gravou, mas não publicou: fica em rascunho e a linha diz por quê.
          if (erro instanceof DesafioComProblemasError) problemas = erro.problemas
          else if (erro instanceof DesafioDesatualizadoError)
            problemas = [{ codigo: 'DESAFIO_DESATUALIZADO', mensagem: erro.message }]
          else if (erro instanceof ConflitoDoCadastroError)
            problemas = [{ codigo: 'QUADRO_OCUPADO', mensagem: erro.message }]
          else throw erro
        }
      }
      responder({ slug: item.slug, id: atual.resumo.id, acao: d.acao, publicado, problemas })
    }
    return { itens: porIndice.filter((r) => r !== undefined) }
  }

  /** Um desafio, a ilha filtrada ou o jogo inteiro como manifesto (fora os arquivados). */
  async exportarManifesto(
    _equipe: Equipe,
    filtro: FiltroDosDesafios,
  ): Promise<ManifestoDeDesafios | null> {
    const desafios = (await this.repo.listar(filtro)).filter((d) => d.situacao !== 'arquivado')
    if (desafios.length === 0) return null
    if (desafios.length > LIMITES_DO_MANIFESTO.desafios)
      throw new ManifestoExcedeLimiteError(LIMITES_DO_MANIFESTO.desafios)
    const umaIlha =
      filtro.ilha !== undefined &&
      filtro.publico !== undefined &&
      desafios.every(
        (d) => d.metadados.ilha === filtro.ilha && d.metadados.publico === filtro.publico,
      )
    return novoManifesto(
      desafios.map((d) => itemDoCadastro(d, conteudoDe(d))),
      umaIlha
        ? 'ilha'
        : filtro.ilha === undefined && filtro.tipo === undefined
          ? 'jogo'
          : undefined,
    )
  }

  async exportarDesafio(_equipe: Equipe, id: string): Promise<ManifestoDeDesafios> {
    const d = await this.exigir(id)
    return novoManifesto([itemDoCadastro(d, conteudoDe(d))], 'desafio')
  }

  private async mudarSituacao(
    equipe: Equipe,
    id: string,
    revisaoBase: number,
    situacao: 'arquivado' | 'ativo',
  ): Promise<DesafioDaEquipe> {
    this.exigirEscrita(equipe)
    return paraEquipe(
      resolver(
        await this.repo.mudarSituacao({
          id,
          revisaoBase,
          situacao,
          por: equipe.id,
          agora: this.agora(),
        }),
      ),
    )
  }

  private async analise(desafio: DesafioNoBanco) {
    return this.analiseDe(desafio.metadados, conteudoDe(desafio))
  }

  /** A análise de um conteúdo ainda não gravado (a prévia do manifesto). */
  private async analiseDe(metadados: MetadadosDoDesafio, conteudo: ConteudoDoDesafio) {
    if (!this.membros) throw new PlataformaIndisponivelError()
    const audience = metadados.publico === 'kids' ? ('kids' as const) : ('adult' as const)
    let membros: Awaited<ReturnType<PortaDosMembros['analisarObjetivos']>>
    let curriculo: Awaited<ReturnType<LeiturasDosMembros['curriculo']>>
    try {
      ;[membros, curriculo] = await Promise.all([
        this.membros.analisarObjetivos({
          audience,
          projetoInicial: conteudo.projetoInicial,
          gabarito: conteudo.gabarito,
          objetivos: conteudo.objetivos,
        }),
        this.leituras.curriculo(audience),
      ])
    } catch (erro) {
      if (erro instanceof MembrosIndisponiveisError || erro instanceof PlataformaIndisponivelError)
        throw new PlataformaIndisponivelError(erro)
      throw erro
    }
    const exigidos = blocosExigidos(membros.blocosDoGabarito, conteudo.blocosManuais)
    const cobertura = coberturaDosBlocos(exigidos, curriculo, ilhaDoContrato(metadados.ilha).posto)
    const problemas: ProblemaDoDesafio[] = [...membros.problemas, ...problemasLocais(conteudo)]
    return {
      conteudo,
      vista: membros.vista,
      analise: {
        blocosDerivados: [...membros.blocosDoGabarito].sort(),
        blocosExigidos: exigidos,
        cobertura,
        problemas,
        gabarito: membros.gabarito,
        inicial: membros.inicial,
      } satisfies AnaliseDoDesafio,
    }
  }

  private async exigir(id: string): Promise<DesafioNoBanco> {
    const desafio = await this.repo.ler(id)
    if (!desafio) throw new DesafioNaoEncontradoError()
    return desafio
  }

  private async exigirRevisao(id: string, revisaoBase: number): Promise<DesafioNoBanco> {
    const desafio = await this.exigir(id)
    if (desafio.revisao !== revisaoBase) throw new DesafioDesatualizadoError(paraEquipe(desafio))
    return desafio
  }

  private exigirEscrita(equipe: Equipe): void {
    if (!equipe.podeEscrever) throw new SemPermissaoDeEscritaError()
  }
}

/** Conferências que não precisam do Members (o contrato já garante o formato). */
function problemasLocais(conteudo: ConteudoDoDesafio): ProblemaDoDesafio[] {
  const problemas: ProblemaDoDesafio[] = []
  if (!conteudo.objetivos.some((o) => !o.optional))
    problemas.push({
      codigo: 'SEM_OBJETIVO_OBRIGATORIO',
      mensagem:
        'Marque pelo menos um objetivo como obrigatório. Os opcionais formam o desafio extra.',
    })
  const ids = conteudo.objetivos.map((o) => o.id)
  if (new Set(ids).size !== ids.length)
    problemas.push({
      codigo: 'OBJETIVO_REPETIDO',
      mensagem: 'Dois objetivos têm o mesmo identificador.',
    })
  if (conteudo.objetivos.some((o) => o.optional) && !conteudo.desafioExtra)
    problemas.push({
      codigo: 'EXTRA_SEM_TEXTO',
      mensagem: 'Há objetivos opcionais: escreva o título e o texto do desafio extra.',
    })
  if (conteudo.recompensa.moedas > LIMITES_DO_DESAFIO.moedas)
    problemas.push({ codigo: 'MOEDAS_DEMAIS', mensagem: 'Moedas acima do teto.' })
  return problemas
}

function conteudoDe(desafio: DesafioNoBanco): ConteudoDoDesafio {
  const conteudo = migrarConteudoDoDesafio(desafio.conteudo)
  // Guardado fora do formato atual: nunca fingir que está vazio.
  if (!conteudo) throw new Error(`Desafio ${desafio.id} guardado em formato desconhecido`)
  return conteudo
}

function resolver(r: ResultadoDaEscrita): DesafioNoBanco {
  if (r.ok) return r.desafio
  if (r.motivo === 'revisao') {
    if (!r.atual) throw new DesafioNaoEncontradoError()
    throw new DesafioDesatualizadoError(paraEquipe(r.atual))
  }
  throw new ConflitoDoCadastroError(r.motivo)
}

function resumo(d: DesafioNoBanco): ResumoDoDesafio {
  const conteudo = migrarConteudoDoDesafio(d.conteudo)
  return {
    id: d.id,
    slug: d.metadados.slug,
    publico: d.metadados.publico,
    ilha: d.metadados.ilha,
    tipo: d.metadados.tipo,
    quadro: d.metadados.quadro,
    ordem: d.metadados.ordem,
    titulo: conteudo?.titulo ?? '(conteúdo ilegível)',
    situacao: d.situacao,
    revisao: d.revisao,
    revisaoPublicada: d.revisaoPublicada,
    alteradoDepoisDePublicar: d.alteradoDepoisDePublicar,
    atualizadoEm: d.atualizadoEm.toISOString(),
  }
}

function paraEquipe(d: DesafioNoBanco): DesafioDaEquipe {
  return {
    resumo: resumo(d),
    metadados: d.metadados,
    conteudo: conteudoDe(d),
    blocosPublicados: d.blocosPublicados,
  }
}
