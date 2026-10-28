import type { MetadadosDoDesafio } from '@sistemazero/arquipelago-contracts'
import { canonicalJson } from '@sistemazero/core/creations'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ServicoDosDesafios } from '../../src/application/servico-dos-desafios'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import type {
  ConclusaoGuardada,
  DesafioNoBanco,
  DesafioPublicado,
  PublicacaoGuardada,
  RepositorioDeDesafios,
  RepositorioDoJogadorNosDesafios,
  ResultadoDaEscrita,
  SituacaoDasMoedas,
} from '../../src/domain/desafios.port'

/** Repositório de desafios em memória com as mesmas regras do Drizzle (revisão, slug, quadro). */
export class DesafiosEmMemoria implements RepositorioDeDesafios {
  readonly linhas = new Map<string, DesafioNoBanco>()
  readonly publicacoes = new Map<string, { revisao: number; blocosExigidos: string[] }[]>()
  readonly snapshots = new Map<string, { conteudo: unknown; metadados: MetadadosDoDesafio }>()

  async listar(filtro: Parameters<RepositorioDeDesafios['listar']>[0]) {
    return [...this.linhas.values()]
      .filter(
        (d) =>
          (!filtro.publico || d.metadados.publico === filtro.publico) &&
          (!filtro.ilha || d.metadados.ilha === filtro.ilha) &&
          (!filtro.tipo || d.metadados.tipo === filtro.tipo) &&
          (!filtro.situacao || d.situacao === filtro.situacao),
      )
      .sort((a, b) => a.metadados.ordem - b.metadados.ordem)
      .map((d) => structuredClone(d))
  }

  async ler(id: string) {
    const d = this.linhas.get(id)
    return d ? structuredClone(d) : null
  }

  async criar(e: Parameters<RepositorioDeDesafios['criar']>[0]): Promise<ResultadoDaEscrita> {
    const conflito = this.conflito(e.id, e.metadados, e.metadados, 'rascunho')
    if (conflito) return { ok: false, motivo: conflito }
    const d: DesafioNoBanco = {
      id: e.id,
      metadados: structuredClone(e.metadados),
      situacao: 'rascunho',
      revisao: 1,
      revisaoPublicada: null,
      metadadosPublicados: null,
      alteradoDepoisDePublicar: false,
      conteudo: structuredClone(e.conteudo),
      atualizadoEm: e.agora,
      atualizadoPor: e.por,
      blocosPublicados: null,
    }
    this.linhas.set(e.id, d)
    return { ok: true, desafio: structuredClone(d) }
  }

  async gravar(e: Parameters<RepositorioDeDesafios['gravar']>[0]): Promise<ResultadoDaEscrita> {
    const d = this.linhas.get(e.id)
    if (!d || d.revisao !== e.revisaoBase)
      return { ok: false, motivo: 'revisao', atual: await this.ler(e.id) }
    const conflito = this.conflito(
      e.id,
      e.metadados,
      d.metadadosPublicados ?? e.metadados,
      d.situacao,
    )
    if (conflito) return { ok: false, motivo: conflito }
    Object.assign(d, {
      metadados: structuredClone(e.metadados),
      conteudo: structuredClone(e.conteudo),
      revisao: d.revisao + 1,
      atualizadoEm: e.agora,
      atualizadoPor: e.por,
    })
    const snapshot = this.snapshots.get(e.id)
    d.alteradoDepoisDePublicar =
      !!snapshot &&
      (canonicalJson(d.conteudo) !== canonicalJson(snapshot.conteudo) ||
        canonicalJson(d.metadados) !== canonicalJson(snapshot.metadados))
    return { ok: true, desafio: structuredClone(d) }
  }

  async publicar(e: Parameters<RepositorioDeDesafios['publicar']>[0]): Promise<ResultadoDaEscrita> {
    const d = this.linhas.get(e.id)
    if (!d || d.revisao !== e.revisaoBase)
      return { ok: false, motivo: 'revisao', atual: await this.ler(e.id) }
    // Publicar move a posição que segura o quadro para a do rascunho (o índice único do Drizzle).
    const conflito = this.conflito(e.id, d.metadados, d.metadados, d.situacao)
    if (conflito) return { ok: false, motivo: conflito }
    const lista = this.publicacoes.get(e.id) ?? []
    if (!lista.some((p) => p.revisao === e.revisaoBase))
      lista.push({ revisao: e.revisaoBase, blocosExigidos: [...e.publicacao.blocosExigidos] })
    this.publicacoes.set(e.id, lista)
    this.snapshots.set(
      e.id,
      structuredClone({ conteudo: e.publicacao.conteudo, metadados: d.metadados }),
    )
    Object.assign(d, {
      situacao: 'publicado',
      revisaoPublicada: e.revisaoBase,
      metadadosPublicados: structuredClone(d.metadados),
      alteradoDepoisDePublicar: false,
      blocosPublicados: [...e.publicacao.blocosExigidos],
      atualizadoEm: e.agora,
      atualizadoPor: e.por,
    })
    return { ok: true, desafio: structuredClone(d) }
  }

  async mudarSituacao(
    e: Parameters<RepositorioDeDesafios['mudarSituacao']>[0],
  ): Promise<ResultadoDaEscrita> {
    const d = this.linhas.get(e.id)
    if (!d || d.revisao !== e.revisaoBase)
      return { ok: false, motivo: 'revisao', atual: await this.ler(e.id) }
    const nova =
      e.situacao === 'arquivado'
        ? 'arquivado'
        : d.revisaoPublicada === null
          ? 'rascunho'
          : 'publicado'
    const conflito = this.conflito(e.id, d.metadados, d.metadadosPublicados ?? d.metadados, nova)
    if (conflito) return { ok: false, motivo: conflito }
    Object.assign(d, {
      situacao: nova,
      revisao: d.revisao + 1,
      atualizadoEm: e.agora,
      atualizadoPor: e.por,
    })
    return { ok: true, desafio: structuredClone(d) }
  }

  /**
   * Como os índices do Drizzle: o slug é o do rascunho; o quadro é o da última publicação (ou o do
   * rascunho, antes de publicar), fora os arquivados.
   */
  private conflito(
    id: string,
    rascunho: DesafioNoBanco['metadados'],
    quadro: DesafioNoBanco['metadados'],
    situacao: DesafioNoBanco['situacao'],
  ): 'slug-em-uso' | 'quadro-ocupado' | null {
    for (const outro of this.linhas.values()) {
      if (outro.id === id) continue
      if (outro.metadados.slug === rascunho.slug) return 'slug-em-uso'
      const dele = outro.metadadosPublicados ?? outro.metadados
      if (
        quadro.tipo === 'quadro-das-cores' &&
        situacao !== 'arquivado' &&
        dele.tipo === 'quadro-das-cores' &&
        outro.situacao !== 'arquivado' &&
        dele.publico === quadro.publico &&
        dele.ilha === quadro.ilha &&
        dele.quadro === quadro.quadro
      )
        return 'quadro-ocupado'
    }
    return null
  }
}

/** O lado de quem joga em memória, com as mesmas regras do Drizzle (conclusão e extra uma vez só). */
export class JogadorNosDesafiosEmMemoria implements RepositorioDoJogadorNosDesafios {
  /** Desafios cadastrados: situação, metadados e TODAS as publicações (a última vale). */
  readonly desafios = new Map<
    string,
    Omit<DesafioPublicado, 'publicacao'> & { publicacoes: PublicacaoGuardada[] }
  >()
  readonly concluidos = new Map<
    string,
    ConclusaoGuardada & { jogadorId: string; publico: string }
  >()
  readonly progressos = new Map<
    string,
    { revisao: number; ultimosResultados: { id: string; passou: boolean }[] }
  >()

  private ultimo(id: string): DesafioPublicado | null {
    const d = this.desafios.get(id)
    const publicacao = d?.publicacoes.at(-1)
    if (!d || !publicacao || d.situacao !== 'publicado') return null
    return { id: d.id, metadados: d.metadados, situacao: d.situacao, publicacao }
  }

  async listarPublicados(publico: MetadadosDoDesafio['publico']) {
    return [...this.desafios.keys()]
      .map((id) => this.ultimo(id))
      .filter((d): d is DesafioPublicado => d !== null && d.metadados.publico === publico)
      .sort((a, b) => a.metadados.ordem - b.metadados.ordem)
  }

  async lerPublicado(id: string) {
    return this.ultimo(id)
  }

  async lerPublicacao(id: string, revisao: number) {
    const d = this.desafios.get(id)
    const publicacao = d?.publicacoes.find((p) => p.revisao === revisao)
    if (!d || !publicacao) return null
    return { publicacao, desafio: { id: d.id, metadados: d.metadados, situacao: d.situacao } }
  }

  async conclusoes(jogadorId: string, publico: MetadadosDoDesafio['publico']) {
    return [...this.concluidos.values()]
      .filter((c) => c.jogadorId === jogadorId && c.publico === publico)
      .map(({ jogadorId: _j, publico: _p, ...c }) => c)
  }

  async progresso(jogadorId: string, desafioId: string) {
    return this.progressos.get(`${jogadorId}:${desafioId}`) ?? null
  }

  async guardarTentativa(e: Parameters<RepositorioDoJogadorNosDesafios['guardarTentativa']>[0]) {
    this.progressos.set(`${e.jogadorId}:${e.desafioId}`, {
      revisao: e.revisao,
      ultimosResultados: e.resultados,
    })
  }

  async concluir(e: Parameters<RepositorioDoJogadorNosDesafios['concluir']>[0]) {
    const chave = `${e.jogadorId}:${e.desafioId}`
    if (this.concluidos.has(chave)) return false
    const m = this.desafios.get(e.desafioId)?.metadados
    if (!m) throw new Error('desafio inexistente')
    this.concluidos.set(chave, {
      jogadorId: e.jogadorId,
      publico: e.publico,
      desafioId: e.desafioId,
      ilha: m.ilha,
      tipo: m.tipo,
      quadro: m.quadro,
      revisao: e.revisao,
      concluidoEm: e.agora,
      extraConcluidoEm: null,
      recompensaVistaEm: null,
      moedas: e.moedas,
      moedasSituacao: e.moedas > 0 ? 'pendente' : 'nenhuma',
      moedasExtra: e.moedasExtra,
      moedasExtraSituacao: 'nenhuma',
      moedasTetoSemana: null,
      moedasExtraTetoSemana: null,
    })
    return true
  }

  async marcarExtra(jogadorId: string, desafioId: string, agora: Date) {
    const c = this.concluidos.get(`${jogadorId}:${desafioId}`)
    if (!c || c.extraConcluidoEm) return false
    c.extraConcluidoEm = agora
    c.moedasExtraSituacao = c.moedasExtra > 0 ? 'pendente' : 'nenhuma'
    return true
  }

  async marcarMoedas(
    jogadorId: string,
    desafioId: string,
    premio: 'principal' | 'extra',
    situacao: SituacaoDasMoedas,
    semana?: string,
  ) {
    const c = this.concluidos.get(`${jogadorId}:${desafioId}`)
    if (!c) return
    const tetoSemana = situacao === 'teto' ? (semana ?? null) : null
    if (premio === 'principal') {
      c.moedasSituacao = situacao
      c.moedasTetoSemana = tetoSemana
    } else {
      c.moedasExtraSituacao = situacao
      c.moedasExtraTetoSemana = tetoSemana
    }
  }

  async marcarRecompensaVista(jogadorId: string, desafioId: string, agora: Date) {
    const c = this.concluidos.get(`${jogadorId}:${desafioId}`)
    if (c && !c.recompensaVistaEm) c.recompensaVistaEm = agora
  }
}

/** Os desafios de quem joga desligados (para os testes que não cuidam deles). */
export function desafiosDesligados(politica: PoliticaDeAcesso): ServicoDosDesafios {
  return new ServicoDosDesafios({
    politica,
    modo: 'desligado',
    repo: new JogadorNosDesafiosEmMemoria(),
    leituras: new LeiturasDosMembros(null),
    membros: null,
    moedas: null,
    logger: createLogger({ level: 'error' }),
  })
}
