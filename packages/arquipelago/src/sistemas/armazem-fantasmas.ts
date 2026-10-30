import {
  type Fantasma,
  FantasmaSchema,
  PERCURSOS,
  type PercursoId,
} from '@sistemazero/arquipelago-contracts'

export interface ArmazemDosFantasmas {
  listar(): Promise<Fantasma[]>
  guardar(fantasma: Fantasma): Promise<void>
  remover(percurso: PercursoId, tempoMs: number): Promise<void>
  fechar(): void
}

/** Diário de envio separado do save. No máximo um trajeto por percurso e perfil/público. */
export async function criarArmazemDosFantasmas(perfil: string): Promise<ArmazemDosFantasmas> {
  const banco = await new Promise<IDBDatabase>((resolve, reject) => {
    const p = indexedDB.open('sistema-zero-arquipelago-fantasmas', 1)
    let recusado = false
    p.onupgradeneeded = () =>
      p.result.createObjectStore('pendentes', { keyPath: ['perfil', 'percurso'] })
    p.onblocked = () => {
      recusado = true
      reject(new Error('Feche as outras abas para atualizar os trajetos.'))
    }
    p.onerror = () => reject(p.error)
    p.onsuccess = () => {
      if (recusado) {
        p.result.close()
        return
      }
      p.result.onversionchange = () => p.result.close()
      resolve(p.result)
    }
  })
  const fim = (tx: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error ?? new Error('O trajeto não foi guardado neste aparelho.'))
      tx.onerror = () => reject(tx.error ?? new Error('O trajeto não foi guardado neste aparelho.'))
    })
  return {
    async listar() {
      const tx = banco.transaction('pendentes', 'readonly'),
        pronta = fim(tx)
      const p = tx
        .objectStore('pendentes')
        .getAll(IDBKeyRange.bound([perfil, ''], [perfil, '\uffff']), PERCURSOS.length)
      await pronta
      const linhas: unknown[] = p.result
      return linhas.map((linha) => {
        if (!linha || typeof linha !== 'object' || !('fantasma' in linha))
          throw new Error('Trajeto local ilegível.')
        return FantasmaSchema.parse(linha.fantasma)
      })
    },
    async guardar(fantasma) {
      const dado = FantasmaSchema.parse(fantasma)
      const tx = banco.transaction('pendentes', 'readwrite'),
        pronta = fim(tx)
      const store = tx.objectStore('pendentes')
      const p = store.get([perfil, dado.percurso])
      p.onsuccess = () => {
        const anterior = FantasmaSchema.safeParse(p.result?.fantasma)
        if (!anterior.success || dado.tempoMs < anterior.data.tempoMs)
          store.put({ perfil, percurso: dado.percurso, fantasma: dado })
      }
      await pronta
    },
    async remover(percurso, tempoMs) {
      const tx = banco.transaction('pendentes', 'readwrite'),
        pronta = fim(tx)
      const store = tx.objectStore('pendentes'),
        p = store.get([perfil, percurso])
      p.onsuccess = () => {
        const f = FantasmaSchema.safeParse(p.result?.fantasma)
        // Uma confirmação antiga não apaga o recorde mais novo que chegou durante o envio.
        if (f.success && f.data.tempoMs === tempoMs) store.delete([perfil, percurso])
      }
      await pronta
    },
    fechar: () => banco.close(),
  }
}
