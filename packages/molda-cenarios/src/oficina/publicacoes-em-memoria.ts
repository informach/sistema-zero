import type { PreparoDeExportacao } from '@sistemazero/molda-cenarios-core/compilar'
import {
  conferirProcedenciaDaPublicacao,
  lerResultadoDaPublicacao,
  PerfilDePublicacaoSchema,
  type PublicacaoParaOJogo,
  type ResultadoDaPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/conteudo'
import { prepararPacoteDaPublicacao } from './publicacao-pacote'
import { PublicacaoDesatualizada, type PublicacoesDeCenariosHost } from './publicacoes'

export function criarPublicacoesEmMemoria(deps: {
  preparar(id: string, revisao: number, sinal?: AbortSignal): Promise<PreparoDeExportacao>
  guardar(espacoId: string, arquivos: ReadonlyMap<string, Uint8Array>): void
}): PublicacoesDeCenariosHost {
  const perfis = new Map<string, PublicacaoParaOJogo>()
  const operacoes = new Map<string, { digest: string; resultado: ResultadoDaPublicacao }>()
  return {
    async obter(entrada, sinal) {
      sinal?.throwIfAborted()
      const perfil = PerfilDePublicacaoSchema.parse(entrada)
      return structuredClone(perfis.get(`${perfil.tipo}:${perfil.ilha}`) ?? null)
    },
    async publicar(pacote, destino, sinal, progresso) {
      const { manifesto, snapshot } = await prepararPacoteDaPublicacao(pacote, destino, sinal)
      const { pedido } = snapshot,
        repetida = operacoes.get(pedido.operacaoId)
      if (repetida) {
        if (repetida.digest !== snapshot.digestDaOperacao)
          throw Error('Esta operação já publicou outro conteúdo')
        return structuredClone({ ...repetida.resultado, repetido: true })
      }
      progresso?.({ etapa: 'conferencia', feitos: 0, total: 1 })
      await conferirConteudoCompilado(snapshot.cena, pacote.arquivos, sinal)
      const preparo = await deps.preparar(pedido.fonte.cenario, pedido.fonte.revisao, sinal)
      sinal?.throwIfAborted()
      if (preparo.espacoId !== 'equipe' || !preparo.contexto.equipe)
        throw Error('Publique a partir do espaço da equipe')
      if (preparo.digest !== pedido.fonte.digest) throw Error('A fonte da publicação mudou')
      conferirProcedenciaDaPublicacao(snapshot.cena, preparo)
      // A conferência final e a troca são síncronas, como o commit do host de autoria.
      const chave = `${pedido.perfil.tipo}:${pedido.perfil.ilha}`,
        atual = perfis.get(chave)
      const corrida = operacoes.get(pedido.operacaoId)
      if (corrida) {
        if (corrida.digest !== snapshot.digestDaOperacao)
          throw Error('Esta operação já publicou outro conteúdo')
        return structuredClone({ ...corrida.resultado, repetido: true })
      }
      if ((atual?.versao ?? 0) !== pedido.versaoEsperada) throw new PublicacaoDesatualizada()
      const arquivos = new Map<string, Uint8Array>([[pedido.manifesto.digest, manifesto]])
      for (const a of snapshot.cena.arquivos)
        arquivos.set(a.digest, pacote.arquivos.get(a.caminho)!)
      const resultado = lerResultadoDaPublicacao(pedido, {
        publicacao: {
          id: crypto.randomUUID(),
          perfil: pedido.perfil,
          versao: pedido.versaoEsperada + 1,
          fonte: pedido.fonte,
          manifesto: pedido.manifesto,
        },
        repetido: false,
      })
      deps.guardar(preparo.espacoId, arquivos)
      perfis.set(chave, structuredClone(resultado.publicacao))
      operacoes.set(pedido.operacaoId, {
        digest: snapshot.digestDaOperacao,
        resultado: structuredClone(resultado),
      })
      progresso?.({ etapa: 'conferencia', feitos: 1, total: 1 })
      return resultado
    },
  }
}
