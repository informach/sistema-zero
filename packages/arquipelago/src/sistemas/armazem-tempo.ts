import { diaDeSaoPaulo } from '@sistemazero/arquipelago-contracts'

/** Fila durável por perfil. Um evento nunca é alterado depois que passa a ser enviável. */
export interface EventoTempoPendente {
  id: string
  perfil: string
  dia: string
  segundos: number
  fechado: boolean
  criadoEm: number
}

const BANCO = 'sistema-zero-arquipelago-tempo'
const TABELA = 'eventos'
const TAMANHO_LOTE = 10

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => {
      const tabela = pedido.result.createObjectStore(TABELA, { keyPath: 'id' })
      tabela.createIndex('perfil', 'perfil')
    }
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error ?? new Error('Não foi possível guardar o tempo'))
    pedido.onblocked = () => reject(new Error('Banco do tempo bloqueado'))
  })
}

function concluiu(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('Não foi possível guardar o tempo'))
    tx.onerror = () => reject(tx.error ?? new Error('Não foi possível guardar o tempo'))
  })
}

/** As transações impedem que duas abas alterem um evento já enviado. */
export async function criarArmazemDeTempo(perfil: string, agora = () => new Date()) {
  const banco = await abrirBanco()
  let atual = crypto.randomUUID()
  return {
    async somarSegundo(registradoEm = agora()): Promise<void> {
      const tx = banco.transaction(TABELA, 'readwrite')
      const fim = concluiu(tx)
      const tabela = tx.objectStore(TABELA)
      const pedido = tabela.get(atual)
      pedido.onsuccess = () => {
        let evento = pedido.result as EventoTempoPendente | undefined
        const dia = diaDeSaoPaulo(registradoEm)
        if (evento && !evento.fechado && evento.dia !== dia) {
          tabela.put({ ...evento, fechado: true })
          evento = undefined
        }
        if (!evento || evento.fechado) {
          atual = crypto.randomUUID()
          evento = {
            id: atual,
            perfil,
            dia,
            segundos: 0,
            fechado: false,
            criadoEm: registradoEm.getTime(),
          }
        }
        evento.segundos += 1
        evento.fechado = evento.segundos >= TAMANHO_LOTE
        tabela.put(evento)
      }
      await fim
    },
    async fecharPendentes(): Promise<void> {
      const tx = banco.transaction(TABELA, 'readwrite')
      const fim = concluiu(tx)
      const pedido = tx.objectStore(TABELA).index('perfil').openCursor(IDBKeyRange.only(perfil))
      pedido.onsuccess = () => {
        const cursor = pedido.result
        if (!cursor) return
        const evento = cursor.value as EventoTempoPendente
        if (!evento.fechado) cursor.update({ ...evento, fechado: true })
        cursor.continue()
      }
      await fim
    },
    async listar(): Promise<EventoTempoPendente[]> {
      const tx = banco.transaction(TABELA, 'readonly')
      const fim = concluiu(tx)
      const pedido = tx.objectStore(TABELA).index('perfil').getAll(IDBKeyRange.only(perfil))
      await fim
      return (pedido.result as EventoTempoPendente[])
        .filter((evento) => evento.fechado)
        .sort((a, b) => a.criadoEm - b.criadoEm || a.id.localeCompare(b.id))
    },
    async remover(id: string): Promise<void> {
      const tx = banco.transaction(TABELA, 'readwrite')
      const fim = concluiu(tx)
      tx.objectStore(TABELA).delete(id)
      await fim
    },
    fechar() {
      banco.close()
    },
  }
}
