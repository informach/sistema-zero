import type {
  DesafioNoBanco,
  RepositorioDeDesafios,
  ResultadoDaEscrita,
} from '../../src/domain/desafios.port'

/** Repositório de desafios em memória com as mesmas regras do Drizzle (revisão, slug, quadro). */
export class DesafiosEmMemoria implements RepositorioDeDesafios {
  readonly linhas = new Map<string, DesafioNoBanco>()
  readonly publicacoes = new Map<string, { revisao: number; blocosExigidos: string[] }[]>()

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
    const conflito = this.conflito(e.id, e.metadados, 'rascunho')
    if (conflito) return { ok: false, motivo: conflito }
    const d: DesafioNoBanco = {
      id: e.id,
      metadados: structuredClone(e.metadados),
      situacao: 'rascunho',
      revisao: 1,
      revisaoPublicada: null,
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
    const conflito = this.conflito(e.id, e.metadados, d.situacao)
    if (conflito) return { ok: false, motivo: conflito }
    Object.assign(d, {
      metadados: structuredClone(e.metadados),
      conteudo: structuredClone(e.conteudo),
      revisao: d.revisao + 1,
      atualizadoEm: e.agora,
      atualizadoPor: e.por,
    })
    return { ok: true, desafio: structuredClone(d) }
  }

  async publicar(e: Parameters<RepositorioDeDesafios['publicar']>[0]): Promise<ResultadoDaEscrita> {
    const d = this.linhas.get(e.id)
    if (!d || d.revisao !== e.revisaoBase)
      return { ok: false, motivo: 'revisao', atual: await this.ler(e.id) }
    const lista = this.publicacoes.get(e.id) ?? []
    if (!lista.some((p) => p.revisao === e.revisaoBase))
      lista.push({ revisao: e.revisaoBase, blocosExigidos: [...e.publicacao.blocosExigidos] })
    this.publicacoes.set(e.id, lista)
    Object.assign(d, {
      situacao: 'publicado',
      revisaoPublicada: e.revisaoBase,
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
    const conflito = this.conflito(e.id, d.metadados, nova)
    if (conflito) return { ok: false, motivo: conflito }
    Object.assign(d, { situacao: nova, atualizadoEm: e.agora, atualizadoPor: e.por })
    return { ok: true, desafio: structuredClone(d) }
  }

  private conflito(
    id: string,
    m: DesafioNoBanco['metadados'],
    situacao: DesafioNoBanco['situacao'],
  ): 'slug-em-uso' | 'quadro-ocupado' | null {
    for (const outro of this.linhas.values()) {
      if (outro.id === id) continue
      if (outro.metadados.slug === m.slug) return 'slug-em-uso'
      if (
        m.tipo === 'quadro-das-cores' &&
        situacao !== 'arquivado' &&
        outro.metadados.tipo === 'quadro-das-cores' &&
        outro.situacao !== 'arquivado' &&
        outro.metadados.publico === m.publico &&
        outro.metadados.ilha === m.ilha &&
        outro.metadados.quadro === m.quadro
      )
        return 'quadro-ocupado'
    }
    return null
  }
}
