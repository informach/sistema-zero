import type { PreparoDeExportacao } from '@sistemazero/molda-cenarios-core/compilar'
import {
  conferirProcedenciaDaPublicacao,
  digestDoPedidoDeVolta,
  LIMITE_DE_VERSOES_LISTADAS,
  lerResultadoDaPublicacao,
  lerResultadoDaVolta,
  PedidoDeVoltaSchema,
  PerfilDePublicacaoSchema,
  type PublicacaoParaOJogo,
  type ResultadoDaPublicacao,
  VersoesPublicadasSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/conteudo'
import { prepararPacoteDaPublicacao } from './publicacao-pacote'
import {
  PublicacaoDesatualizada,
  type PublicacoesDeCenariosHost,
  pedidoDaVolta,
} from './publicacoes'

/** Quem publica no ensaio: o host em memória não tem conta, então todas as versões são dela. */
export const AUTOR_DO_ENSAIO = '00000000-0000-4000-8000-00000000e5a1'

/** Uma versão guardada da ilha, imutável, com os arquivos que ela usa no espaço. */
interface VersaoGuardada {
  publicacao: PublicacaoParaOJogo
  espacoId: string
  publicadaEm: string
  autorId: string
  arquivos: readonly string[]
}

export function criarPublicacoesEmMemoria(deps: {
  preparar(id: string, revisao: number, sinal?: AbortSignal): Promise<PreparoDeExportacao>
  guardar(espacoId: string, arquivos: ReadonlyMap<string, Uint8Array>): void
  /** O arquivo ainda está no espaço? (padrão: todos ficam, como no host de verdade). */
  presente?(espacoId: string, digest: string): boolean
  agora?: () => Date
}): PublicacoesDeCenariosHost {
  /** Por ilha, da mais antiga à mais nova: a última é a que está no ar. */
  const versoes = new Map<string, VersaoGuardada[]>()
  const operacoes = new Map<string, { digest: string; resultado: ResultadoDaPublicacao }>()
  const agora = deps.agora ?? (() => new Date())
  const chaveDo = (perfil: { tipo: string; ilha: string }) => `${perfil.tipo}:${perfil.ilha}`
  const atualDe = (chave: string) => versoes.get(chave)?.at(-1) ?? null
  const guardarVersao = (chave: string, versao: VersaoGuardada) =>
    versoes.set(chave, [...(versoes.get(chave) ?? []), structuredClone(versao)])
  const repetir = (operacaoId: string, digest: string) => {
    const repetida = operacoes.get(operacaoId)
    if (!repetida) return null
    if (repetida.digest !== digest) throw Error('Esta operação já publicou outro conteúdo')
    return structuredClone({ ...repetida.resultado, repetido: true })
  }
  return {
    async obter(entrada, sinal) {
      sinal?.throwIfAborted()
      const perfil = PerfilDePublicacaoSchema.parse(entrada)
      return structuredClone(atualDe(chaveDo(perfil))?.publicacao ?? null)
    },
    async listarVersoes(entrada, sinal) {
      sinal?.throwIfAborted()
      const perfil = PerfilDePublicacaoSchema.parse(entrada)
      const guardadas = [...(versoes.get(chaveDo(perfil)) ?? [])]
        .reverse()
        .slice(0, LIMITE_DE_VERSOES_LISTADAS)
      return VersoesPublicadasSchema.parse({
        perfil,
        versoes: guardadas.map((v, i) => ({
          id: v.publicacao.id,
          versao: v.publicacao.versao,
          fonte: { cenario: v.publicacao.fonte.cenario, revisao: v.publicacao.fonte.revisao },
          manifesto: v.publicacao.manifesto,
          publicadaEm: v.publicadaEm,
          autorId: v.autorId,
          atual: i === 0,
        })),
      })
    },
    async publicar(pacote, destino, sinal, progresso) {
      const { manifesto, snapshot } = await prepararPacoteDaPublicacao(pacote, destino, sinal)
      const { pedido } = snapshot,
        repetida = repetir(pedido.operacaoId, snapshot.digestDaOperacao)
      if (repetida) return repetida
      progresso?.({ etapa: 'conferencia', feitos: 0, total: 1 })
      await conferirConteudoCompilado(snapshot.cena, pacote.arquivos, sinal)
      const preparo = await deps.preparar(pedido.fonte.cenario, pedido.fonte.revisao, sinal)
      sinal?.throwIfAborted()
      if (preparo.espacoId !== 'equipe' || !preparo.contexto.equipe)
        throw Error('Publique a partir do espaço da equipe')
      if (preparo.digest !== pedido.fonte.digest) throw Error('A fonte da publicação mudou')
      conferirProcedenciaDaPublicacao(snapshot.cena, preparo)
      // A conferência final e a troca são síncronas, como o commit do host de autoria.
      const chave = chaveDo(pedido.perfil),
        atual = atualDe(chave)
      const corrida = repetir(pedido.operacaoId, snapshot.digestDaOperacao)
      if (corrida) return corrida
      if ((atual?.publicacao.versao ?? 0) !== pedido.versaoEsperada)
        throw new PublicacaoDesatualizada()
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
      guardarVersao(chave, {
        publicacao: resultado.publicacao,
        espacoId: preparo.espacoId,
        publicadaEm: agora().toISOString(),
        autorId: AUTOR_DO_ENSAIO,
        arquivos: [...arquivos.keys()],
      })
      operacoes.set(pedido.operacaoId, {
        digest: snapshot.digestDaOperacao,
        resultado: structuredClone(resultado),
      })
      progresso?.({ etapa: 'conferencia', feitos: 1, total: 1 })
      return resultado
    },
    async voltarParaVersao(destino, sinal) {
      const pedido = PedidoDeVoltaSchema.parse(pedidoDaVolta(destino)),
        alvoEsperado = structuredClone({
          fonte: destino.versao.fonte,
          manifesto: destino.versao.manifesto,
        })
      const digest = await digestDoPedidoDeVolta(pedido)
      sinal?.throwIfAborted()
      // Daqui em diante tudo é síncrono: repetição, CAS, arquivos e a troca, como numa publicação.
      const repetida = repetir(pedido.operacaoId, digest)
      if (repetida) return lerResultadoDaVolta(pedido, repetida, alvoEsperado)
      const chave = chaveDo(pedido.perfil),
        atual = atualDe(chave)
      const alvo = versoes.get(chave)?.find((v) => v.publicacao.id === pedido.publicacaoId)
      if (!alvo) throw Error('A versão não existe mais')
      if ((atual?.publicacao.versao ?? 0) !== pedido.versaoEsperada)
        throw new PublicacaoDesatualizada()
      if (atual?.publicacao.id === alvo.publicacao.id) throw Error('Esta versão já está no ar')
      const presente = deps.presente ?? (() => true)
      if (alvo.arquivos.some((d) => !presente(alvo.espacoId, d)))
        throw Error(
          'Alguns arquivos desta versão já saíram do espaço da equipe, então ela não pode voltar ao ar. Publique uma revisão de novo.',
        )
      const resultado = lerResultadoDaVolta(
        pedido,
        {
          publicacao: {
            ...structuredClone(alvo.publicacao),
            id: crypto.randomUUID(),
            versao: pedido.versaoEsperada + 1,
          },
          repetido: false,
        },
        alvoEsperado,
      )
      guardarVersao(chave, {
        ...alvo,
        publicacao: resultado.publicacao,
        publicadaEm: agora().toISOString(),
        autorId: AUTOR_DO_ENSAIO,
      })
      operacoes.set(pedido.operacaoId, { digest, resultado: structuredClone(resultado) })
      return resultado
    },
  }
}
