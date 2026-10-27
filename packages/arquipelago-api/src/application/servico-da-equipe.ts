import { randomUUID } from 'node:crypto'
import {
  type AnaliseDoDesafio,
  blocosExigidos,
  CARTAS_LUMI,
  type ConteudoDoDesafio,
  type CriarDesafio,
  coberturaDosBlocos,
  type DesafioDaEquipe,
  type GravarDesafio,
  ilha as ilhaDoContrato,
  LIMITES_DO_DESAFIO,
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
import { MembrosIndisponiveisError, type PortaDosMembros } from '../domain/membros.port'
import {
  ConflitoDoCadastroError,
  DesafioComProblemasError,
  DesafioDesatualizadoError,
  DesafioNaoEncontradoError,
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
    const conteudo = conteudoDe(desafio)
    if (!this.membros) throw new PlataformaIndisponivelError()
    const audience = desafio.metadados.publico === 'kids' ? ('kids' as const) : ('adult' as const)
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
    const cobertura = coberturaDosBlocos(
      exigidos,
      curriculo,
      ilhaDoContrato(desafio.metadados.ilha).posto,
    )
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
    alteradoDepoisDePublicar: d.revisaoPublicada !== null && d.revisao > d.revisaoPublicada,
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
