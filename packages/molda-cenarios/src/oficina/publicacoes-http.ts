import { conferirInventarioCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  conferirPreparacaoDePublicacao,
  lerResultadoDaPublicacao,
  PerfilDePublicacaoSchema,
  PublicacaoParaOJogoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import type { Reserva } from './host-http'
import { prepararPacoteDaPublicacao } from './publicacao-pacote'
import type { PublicacoesDeCenariosHost } from './publicacoes'

export function criarPublicacoesHttp(deps: {
  pedir<T>(
    metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    caminho: string,
    corpo?: unknown,
    sinal?: AbortSignal,
  ): Promise<T>
  subir(
    reserva: Reserva,
    conteudos: ReadonlyMap<string, Blob | Uint8Array>,
    sinal?: AbortSignal,
  ): Promise<void>
}): PublicacoesDeCenariosHost {
  return {
    async obter(entrada, sinal) {
      const perfil = PerfilDePublicacaoSchema.parse(entrada)
      const r = await deps.pedir<{ publicacao: unknown }>(
        'GET',
        `publicacoes/perfis/${perfil.ilha}`,
        undefined,
        sinal,
      )
      const atual = PublicacaoParaOJogoSchema.nullable().parse(r.publicacao)
      if (atual && (atual.perfil.tipo !== perfil.tipo || atual.perfil.ilha !== perfil.ilha))
        throw Error('A oficina respondeu com outro destino.')
      return atual
    },
    async publicar(pacote, destino, sinal, progresso) {
      const { manifesto, snapshot } = await prepararPacoteDaPublicacao(pacote, destino, sinal),
        pedido = snapshot.pedido
      const preparo = conferirPreparacaoDePublicacao(
        pedido,
        await deps.pedir('POST', 'publicacoes/preparar', pedido, sinal),
      )
      if (preparo.publicacao)
        return lerResultadoDaPublicacao(pedido, { publicacao: preparo.publicacao, repetido: true })
      await conferirInventarioCompilado(snapshot.cena, pacote.arquivos, sinal)
      sinal?.throwIfAborted()
      progresso?.({ etapa: 'manifesto', feitos: 0, total: 1 })
      const reserva = await deps.pedir<Reserva>(
        'POST',
        'publicacoes/manifesto/reservar',
        pedido,
        sinal,
      )
      if (reserva.espacoId !== preparo.espacoId)
        throw Error('A reserva da publicação pertence a outro espaço.')
      await deps.subir(reserva, new Map([[pedido.manifesto.digest, manifesto]]), sinal)
      progresso?.({ etapa: 'manifesto', feitos: 1, total: 1 })
      const recursos = snapshot.recursos.filter((r) => r.papel === 'recurso')
      const porDigest = new Map(
        snapshot.cena.arquivos.map((a) => [a.digest, pacote.arquivos.get(a.caminho)!]),
      )
      progresso?.({ etapa: 'recursos', feitos: 0, total: recursos.length })
      for (let inicio = 0; inicio < recursos.length; inicio += 50) {
        sinal?.throwIfAborted()
        const lote = recursos.slice(inicio, inicio + 50)
        const reserva = await deps.pedir<Reserva>(
          'POST',
          'publicacoes/recursos/reservar',
          { pedido, digests: lote.map((r) => r.digest) },
          sinal,
        )
        if (reserva.espacoId !== preparo.espacoId)
          throw Error('A reserva da publicação pertence a outro espaço.')
        await deps.subir(reserva, porDigest, sinal)
        progresso?.({ etapa: 'recursos', feitos: inicio + lote.length, total: recursos.length })
      }
      sinal?.throwIfAborted()
      progresso?.({ etapa: 'conferencia', feitos: 0, total: 1 })
      const resultado = lerResultadoDaPublicacao(
        pedido,
        await deps.pedir('POST', 'publicacoes/confirmar', { pedido }, sinal),
      )
      sinal?.throwIfAborted()
      progresso?.({ etapa: 'conferencia', feitos: 1, total: 1 })
      return resultado
    },
  }
}
