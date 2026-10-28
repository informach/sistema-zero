import {
  type ServicoDoJogo,
  type TempoRegistrado,
  TempoRegistradoSchema,
} from '@sistemazero/arquipelago-contracts'
import { criarArmazemDeTempo } from './armazem-tempo'

/** Mantém cada evento no aparelho até o serviço confirmar sua gravação. */
export async function criarFilaDeTempo(opcoes: {
  perfil: string
  servico: ServicoDoJogo
  aoConfirmar(tempo: TempoRegistrado): void
  aoErro(erro: unknown): void
}) {
  const armazem = await criarArmazemDeTempo(opcoes.perfil)
  let cadeia: Promise<void> = Promise.resolve()
  let envio: Promise<void> | null = null
  let contador = 0
  const segundosNaoGuardados: Date[] = []
  let encerrada = false

  function enviar(): Promise<void> {
    if (envio) return envio
    envio = (async () => {
      for (const evento of await armazem.listar()) {
        const resposta = await opcoes.servico.buscar('/tempo/recuperar', {
          metodo: 'POST',
          corpo: { eventoId: evento.id, segundos: evento.segundos, dia: evento.dia },
          sinal: AbortSignal.timeout(15_000),
        })
        if (resposta.status !== 200)
          throw new Error(`Registro de tempo indisponível (${resposta.status})`)
        const tempo = TempoRegistradoSchema.parse(resposta.corpo)
        await armazem.remover(evento.id)
        opcoes.aoConfirmar(tempo)
      }
    })()
      .catch((erro) => {
        opcoes.aoErro(erro)
        throw erro
      })
      .finally(() => {
        envio = null
      })
    return envio
  }

  async function guardarSegundos(): Promise<void> {
    while (segundosNaoGuardados.length > 0) {
      await armazem.somarSegundo(segundosNaoGuardados[0])
      segundosNaoGuardados.shift()
      contador += 1
      if (contador >= 10) {
        contador = 0
        void enviar().catch(() => {})
      }
    }
  }

  // Recupera também uma fração deixada por uma aba fechada inesperadamente.
  try {
    await armazem.fecharPendentes()
    await enviar()
  } catch (erro) {
    armazem.fechar()
    throw erro
  }
  function serializar(operacao: () => Promise<void>): Promise<void> {
    cadeia = cadeia.catch(() => {}).then(operacao)
    return cadeia
  }

  return {
    somarSegundo(): Promise<void> {
      if (encerrada) return Promise.resolve()
      segundosNaoGuardados.push(new Date())
      return serializar(guardarSegundos)
    },
    guardarEEnviar(): Promise<void> {
      return serializar(async () => {
        await guardarSegundos()
        await armazem.fecharPendentes()
        if (envio) await envio
        await enviar()
      })
    },
    encerrar(): Promise<void> {
      encerrada = true
      return serializar(async () => {
        try {
          await guardarSegundos()
          await armazem.fecharPendentes()
          if (envio) await envio
          await enviar()
        } finally {
          armazem.fechar()
        }
      })
    },
  }
}
