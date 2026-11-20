import type { CenariosPublicadosDoJogo } from '@sistemazero/arquipelago-contracts'
import { criarInstaladorDeCenasThree } from '@sistemazero/molda-cenarios-motor/instalar'
import type { CenaNoThree } from '@sistemazero/molda-cenarios-motor/runtime'
import type { Scene } from 'three'
import type { TerritorioId } from '../sistemas/geografia-do-arquipelago'
import { lerCenarioPublicado } from '../sistemas/ler-cenario-publicado'
import { type CenarioPublicadoPronto, prepararCenarioPublicado } from './preparar-cenario-publicado'

/** Adaptador do instalador canônico. Rede e GPU terminam antes da troca da cena ativa. */
export function criarCarregadorPublicado(opcoes: {
  porta: CenariosPublicadosDoJogo
  alvo: Scene
  foco(): { x: number; z: number }
  maxTextura: number
  prepararGpu(pronto: CenarioPublicadoPronto, sinal: AbortSignal): Promise<void>
  /** Última conferência síncrona (posição/colisão), ainda antes de substituir a versão ativa. */
  antesDeInstalar?(pronto: CenarioPublicadoPronto): void
  /** Transporte de blobs, sem credenciais de sessão. */
  buscar?: Parameters<typeof lerCenarioPublicado>[3]
}) {
  opcoes = { ...opcoes }
  const pacotes = new Map<string, NonNullable<Awaited<ReturnType<typeof lerCenarioPublicado>>>>(),
    preparados = new WeakMap<CenaNoThree, CenarioPublicadoPronto>()
  let encerrado = false,
    pendente: AbortController | null = null
  const instalador = criarInstaladorDeCenasThree(
    async (id, sinal) => {
      const pacote = pacotes.get(id)
      if (!pacote)
        throw Error('O pacote publicado não está mais disponível para este carregamento.')
      const pronto = await prepararCenarioPublicado(pacote, opcoes.foco(), sinal, opcoes.maxTextura)
      try {
        pronto.chegada()
        await opcoes.prepararGpu(pronto, sinal)
        sinal.throwIfAborted()
        // O avatar pode ter andado durante os awaits de rede/GPU.
        pronto.atualizarDetalhe(opcoes.foco())
        opcoes.antesDeInstalar?.(pronto)
        sinal.throwIfAborted()
        preparados.set(pronto, pronto)
        return pronto
      } catch (erro) {
        pronto.descartar()
        throw erro
      }
    },
    (vista) => {
      const publicado = preparados.get(vista)
      if (!publicado) throw Error('O cenário não recebeu o preparo nativo.')
      return { publicado }
    },
  )
  return {
    async carregar(ilha: TerritorioId) {
      if (encerrado) throw Error('O carregador publicado já foi encerrado.')
      pendente?.abort()
      const controle = new AbortController()
      pendente = controle
      let id: string | undefined
      try {
        const pacote = await lerCenarioPublicado(opcoes.porta, ilha, controle.signal, opcoes.buscar)
        controle.signal.throwIfAborted()
        if (!pacote) {
          instalador.instalado(opcoes.alvo)?.descartar()
          return null
        }
        id = crypto.randomUUID()
        pacotes.set(id, pacote)
        const handle = await instalador.instalar(id, opcoes.alvo, controle.signal, {
          ambiente: 'luzes-locais',
        })
        return handle.publicado
      } finally {
        if (id) pacotes.delete(id)
        if (pendente === controle) pendente = null
      }
    },
    instalado() {
      return instalador.instalado(opcoes.alvo)?.publicado ?? null
    },
    descartar() {
      if (encerrado) return
      encerrado = true
      pendente?.abort()
      pendente = null
      instalador.descartar()
      pacotes.clear()
    },
  }
}
