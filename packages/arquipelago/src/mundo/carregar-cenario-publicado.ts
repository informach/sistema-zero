import type { CenariosPublicadosDoJogo } from '@sistemazero/arquipelago-contracts'
import { criarInstaladorDeCenasThree } from '@sistemazero/molda-cenarios-motor/instalar'
import type { CenaNoThree } from '@sistemazero/molda-cenarios-motor/runtime'
import type { Scene } from 'three'
import type { TerritorioId } from '../sistemas/geografia-do-arquipelago'
import { lerCenarioPublicado, type MemoriaDePublicacoes } from '../sistemas/ler-cenario-publicado'
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
  /** Pacotes já baixados, divididos entre carregadores: voltar a uma ilha não baixa de novo. */
  memoria?: MemoriaDePublicacoes
}) {
  opcoes = { ...opcoes }
  const pacotes = new Map<string, NonNullable<Awaited<ReturnType<typeof lerCenarioPublicado>>>>(),
    preparados = new WeakMap<CenaNoThree, CenarioPublicadoPronto>()
  let encerrado = false,
    pendente: AbortController | null = null,
    // O carregamento em andamento: pedir a mesma ilha de novo espera este, sem recomeçar.
    emAndamento: { ilha: TerritorioId; promessa: Promise<CenarioPublicadoPronto | null> } | null =
      null
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
  async function carregarAgora(ilha: TerritorioId) {
    pendente?.abort()
    const controle = new AbortController()
    pendente = controle
    let id: string | undefined
    try {
      const pacote = await lerCenarioPublicado(
        opcoes.porta,
        ilha,
        controle.signal,
        opcoes.buscar,
        opcoes.memoria,
      )
      controle.signal.throwIfAborted()
      if (!pacote) {
        instalador.instalado(opcoes.alvo)?.descartar()
        return null
      }
      // A mesma publicação já instalada (ela voltou à ilha e nada foi publicado): fica como está,
      // sem preparar, compilar nem trocar a cena.
      const atual = instalador.instalado(opcoes.alvo)?.publicado
      if (
        atual &&
        atual.publicacao.id === pacote.publicacao.id &&
        atual.publicacao.versao === pacote.publicacao.versao
      )
        return atual
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
  }
  return {
    carregar(ilha: TerritorioId): Promise<CenarioPublicadoPronto | null> {
      if (encerrado) return Promise.reject(Error('O carregador publicado já foi encerrado.'))
      if (emAndamento?.ilha === ilha) return emAndamento.promessa
      const andamento = {
        ilha,
        promessa: carregarAgora(ilha).finally(() => {
          if (emAndamento === andamento) emAndamento = null
        }),
      }
      emAndamento = andamento
      return andamento.promessa
    },
    instalado() {
      return instalador.instalado(opcoes.alvo)?.publicado ?? null
    },
    descartar() {
      if (encerrado) return
      encerrado = true
      pendente?.abort()
      pendente = null
      emAndamento = null
      instalador.descartar()
      pacotes.clear()
    },
  }
}
