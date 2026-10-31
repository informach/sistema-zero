import {
  type CompraDeInsumos,
  CompraDeInsumosSchema,
  type EntregarPedido,
  EntregarPedidoSchema,
  type Salvamento,
  type SalvamentoGuardado,
  SalvamentoGuardadoSchema,
  SalvamentoSchema,
  type VenderNaFeira,
  VenderNaFeiraSchema,
} from '@sistemazero/arquipelago-contracts'

export interface RascunhoDoJogo {
  base: SalvamentoGuardado
  local: Salvamento
  /** Persistido antes do PUT, para reconhecer a resposta perdida depois de reabrir. */
  enviado: Salvamento | null
  /** Comando confirmado pela pessoa, escrito antes de pedir o débito. Fora do save V18. */
  compra?: CompraDeInsumos | null
  /** Entrega do morador, mutuamente exclusiva com a compra. Não pertence ao save V18. */
  entrega?: EntregarPedido | null
  /** Venda na banca da feira (A22), exclusiva com a compra e a entrega. Fora do save. */
  venda?: VenderNaFeira | null
}

export interface ArmazemDeSalvamento {
  ler(): Promise<RascunhoDoJogo | null>
  gravar(rascunho: RascunhoDoJogo | null): Promise<void>
  fechar(): void
}

export class JogoAbertoEmOutraAbaError extends Error {
  constructor() {
    super('Este jogo já está aberto em outra aba. Feche aquela aba para continuar aqui.')
  }
}

/** A trava pertence ao documento e o navegador a libera inclusive se a aba/processo morrer. */
async function reservar(perfil: string): Promise<() => void> {
  if (!globalThis.navigator?.locks)
    throw new Error('O navegador não oferece a proteção do salvamento entre abas.')
  return new Promise((resolve, reject) => {
    void navigator.locks
      .request(`arquipelago:salvamento:${perfil}`, { ifAvailable: true }, async (trava) => {
        if (!trava) {
          reject(new JogoAbertoEmOutraAbaError())
          return
        }
        await new Promise<void>((liberar) => resolve(liberar))
      })
      .catch(reject)
  })
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open('sistema-zero-arquipelago-salvamento', 1)
    let recusado = false
    pedido.onupgradeneeded = () =>
      pedido.result.createObjectStore('rascunhos', { keyPath: 'perfil' })
    pedido.onblocked = () => {
      recusado = true
      reject(new Error('Feche as outras abas do jogo para atualizar o armazenamento.'))
    }
    pedido.onerror = () => reject(pedido.error)
    pedido.onsuccess = () => {
      if (recusado) {
        pedido.result.close()
        return
      }
      pedido.result.onversionchange = () => pedido.result.close()
      resolve(pedido.result)
    }
  })
}

function concluir(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () =>
      reject(tx.error ?? new Error('Não foi possível guardar o jogo neste aparelho.'))
    tx.onerror = () =>
      reject(tx.error ?? new Error('Não foi possível guardar o jogo neste aparelho.'))
  })
}

export async function criarArmazemDeSalvamento(
  perfil: string,
  travar: (perfil: string) => Promise<() => void> = reservar,
): Promise<ArmazemDeSalvamento> {
  const liberar = await travar(perfil)
  let banco: IDBDatabase
  try {
    banco = await abrir()
  } catch (erro) {
    liberar()
    throw erro
  }
  return {
    async ler() {
      const tx = banco.transaction('rascunhos', 'readonly')
      const fim = concluir(tx)
      const pedido = tx.objectStore('rascunhos').get(perfil)
      await fim
      const dado: unknown = pedido.result
      if (dado === undefined) return null
      if (
        !dado ||
        typeof dado !== 'object' ||
        !('versao' in dado) ||
        dado.versao !== 1 ||
        !('perfil' in dado) ||
        dado.perfil !== perfil ||
        !('base' in dado) ||
        !('local' in dado) ||
        !('enviado' in dado)
      )
        throw new Error('O salvamento local não pôde ser lido. Ele foi preservado neste aparelho.')
      const comandos = [
        'compra' in dado && dado.compra,
        'entrega' in dado && dado.entrega,
        'venda' in dado && dado.venda,
      ].filter(Boolean)
      if (comandos.length > 1)
        throw new Error('Há dois comandos locais incompatíveis. A cópia foi preservada.')
      return {
        base: SalvamentoGuardadoSchema.parse(dado.base),
        local: SalvamentoSchema.parse(dado.local),
        enviado: dado.enviado === null ? null : SalvamentoSchema.parse(dado.enviado),
        ...('compra' in dado
          ? { compra: dado.compra === null ? null : CompraDeInsumosSchema.parse(dado.compra) }
          : {}),
        ...('entrega' in dado
          ? { entrega: dado.entrega === null ? null : EntregarPedidoSchema.parse(dado.entrega) }
          : {}),
        ...('venda' in dado
          ? { venda: dado.venda === null ? null : VenderNaFeiraSchema.parse(dado.venda) }
          : {}),
      }
    },
    async gravar(rascunho) {
      const tx = banco.transaction('rascunhos', 'readwrite', { durability: 'strict' })
      const fim = concluir(tx)
      const tabela = tx.objectStore('rascunhos')
      if (rascunho) tabela.put({ versao: 1, perfil, ...rascunho })
      else tabela.delete(perfil)
      await fim
    },
    fechar() {
      banco.close()
      liberar()
    },
  }
}
