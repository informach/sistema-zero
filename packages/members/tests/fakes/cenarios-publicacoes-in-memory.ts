import { digestDoDocumentoDeCenario } from '@sistemazero/molda-cenarios-core/compilar'
import type {
  PerfilDePublicacao,
  RecursoDaPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
import {
  CenarioDesatualizadoError,
  CenarioNaoEncontradoError,
} from '../../src/domain/cenarios/cenarios.errors'
import {
  type NovaPublicacaoDeCenario,
  type PublicacaoDeCenario,
  PublicacaoDeCenarioConflitanteError,
  type PublicacaoGravada,
} from '../../src/domain/cenarios/publicacoes'
import type { CenariosPublicacoesRepository } from '../../src/domain/ports/cenarios-publicacoes-repository.port'
import type { CenariosRepository } from '../../src/domain/ports/cenarios-repository.port'

export class PublicacoesEmMemoria implements CenariosPublicacoesRepository {
  readonly versoes = new Map<string, PublicacaoDeCenario>()
  private readonly operacoes = new Map<
    string,
    { digestDaOperacao: string; publicacao: PublicacaoDeCenario }
  >()
  private readonly perfis = new Map<string, string>()
  private readonly arquivos = new Map<string, readonly RecursoDaPublicacao[]>()
  private fila: Promise<unknown> = Promise.resolve()
  antesDeGravar?: () => Promise<void>
  constructor(private readonly autoria: Pick<CenariosRepository, 'cenario' | 'mundo' | 'espaco'>) {}
  async operacao(id: string) {
    return structuredClone(this.operacoes.get(id) ?? null)
  }
  async atual(perfil: PerfilDePublicacao) {
    return this.porId(this.perfis.get(`${perfil.tipo}:${perfil.ilha}`) ?? '')
  }
  async porId(id: string) {
    return structuredClone(this.versoes.get(id) ?? null)
  }
  async recursos(id: string) {
    return structuredClone(this.arquivos.get(id) ?? [])
  }
  async recurso(id: string, digest: string) {
    return structuredClone(this.arquivos.get(id)?.find((r) => r.digest === digest) ?? null)
  }
  gravar(dados: NovaPublicacaoDeCenario, agora: Date): Promise<PublicacaoGravada> {
    const executar = async (): Promise<PublicacaoGravada> => {
      await this.antesDeGravar?.()
      const repetida = this.operacoes.get(dados.pedido.operacaoId)
      if (repetida) {
        if (
          repetida.digestDaOperacao !== dados.digestDaOperacao ||
          repetida.publicacao.autorId !== dados.autorId
        )
          throw new PublicacaoDeCenarioConflitanteError('Esta operação já publicou outro conteúdo')
        return { publicacao: structuredClone(repetida.publicacao), repetido: true }
      }
      const cenario = await this.autoria.cenario(dados.pedido.fonte.cenario)
      const mundo = cenario && (await this.autoria.mundo(cenario.mundoId))
      const espaco = mundo && (await this.autoria.espaco(mundo.espacoId))
      if (!cenario || mundo?.espacoId !== dados.espacoId || espaco?.tipo !== 'equipe')
        throw new CenarioNaoEncontradoError('O cenário')
      if (cenario.revisao !== dados.pedido.fonte.revisao)
        throw new CenarioDesatualizadoError(cenario.revisao)
      if ((await digestDoDocumentoDeCenario(cenario.documento)) !== dados.pedido.fonte.digest)
        throw new PublicacaoDeCenarioConflitanteError('A fonte da publicação mudou')
      const atual = await this.atual(dados.pedido.perfil)
      if ((atual?.versao ?? 0) !== dados.pedido.versaoEsperada)
        throw new PublicacaoDeCenarioConflitanteError()
      const publicacao: PublicacaoDeCenario = {
        id: dados.id,
        espacoId: dados.espacoId,
        perfil: dados.pedido.perfil,
        versao: dados.pedido.versaoEsperada + 1,
        fonte: dados.pedido.fonte,
        manifesto: dados.pedido.manifesto,
        autorId: dados.autorId,
        criadoEm: agora,
      }
      this.versoes.set(publicacao.id, structuredClone(publicacao))
      this.arquivos.set(publicacao.id, structuredClone(dados.recursos))
      this.operacoes.set(dados.pedido.operacaoId, {
        digestDaOperacao: dados.digestDaOperacao,
        publicacao: structuredClone(publicacao),
      })
      this.perfis.set(`${publicacao.perfil.tipo}:${publicacao.perfil.ilha}`, publicacao.id)
      return { publicacao: structuredClone(publicacao), repetido: false }
    }
    const resultado = this.fila.then(executar)
    this.fila = resultado.catch(() => {})
    return resultado
  }
}
