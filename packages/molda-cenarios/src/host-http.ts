import type { ModeloDeCatalogo, RevisaoDeCenario } from '@sistemazero/molda-cenarios-core'
import type { CenarioRuntimeMontagem } from '@sistemazero/molda-cenarios-core/runtime'
import type { CenariosHostAdapter } from './portas'
import { ligarSessaoHttp } from './sessao-http'

export async function pedidoCenarios<T>(
  url: string,
  body?: unknown,
  sinal?: AbortSignal,
): Promise<T> {
  const r = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: sinal ?? AbortSignal.timeout(60000),
    cache: 'no-store',
  })
  const v = await r.json()
  if (!r.ok)
    throw Object.assign(Error(v.error?.message ?? `Falha ${r.status}`), {
      status: r.status,
      revisaoAtual: v.revisaoAtual,
      problemas: v.problemas,
    })
  return v
}
function recuperacao() {
  let banco: Promise<IDBDatabase> | null = null
  const abrir = () =>
    (banco ??= new Promise((resolve, reject) => {
      const r = indexedDB.open('molda-cenarios-rascunhos', 1)
      r.onupgradeneeded = () => r.result.createObjectStore('rascunhos')
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    }))
  return async (
    id: string,
    valor?: { base: number; documento: RevisaoDeCenario['documento'] } | null,
  ) => {
    const db = await abrir()
    return new Promise<{ base: number; documento: RevisaoDeCenario['documento'] } | null>(
      (resolve, reject) => {
        const t = db.transaction('rascunhos', valor === undefined ? 'readonly' : 'readwrite'),
          s = t.objectStore('rascunhos')
        const r = valor === undefined ? s.get(id) : valor === null ? s.delete(id) : s.put(valor, id)
        t.oncomplete = () => resolve(valor === undefined ? (r.result ?? null) : valor)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      },
    )
  }
}
export function criarHostHttp({
  base = '/api/molda-cenarios',
  runtime,
  tema = 'light',
}: {
  base?: string
  runtime: CenarioRuntimeMontagem
  tema?: 'light' | 'dark'
}): CenariosHostAdapter {
  const guardar = recuperacao(),
    arte = (m: ModeloDeCatalogo) => `${base}/arte/${m.digest}.glb`
  return {
    ligarSessao: (editor, runtime, aoLigar) => ligarSessaoHttp(base, editor, runtime, aoLigar),
    tema,
    runtime,
    urlDaArte: arte,
    listar: () => pedidoCenarios(`${base}/projetos`),
    abrir: (id) => pedidoCenarios(`${base}/projetos/${encodeURIComponent(id)}`),
    criar: (nome, documento, operacaoId) =>
      pedidoCenarios(`${base}/projetos`, { nome, documento, operacaoId }),
    editar: (id, revisaoEsperada, comandos, operacaoId) =>
      pedidoCenarios(`${base}/projetos/${id}/comandos`, { revisaoEsperada, comandos, operacaoId }),
    restaurar: (id, revisaoEsperada, origem, operacaoId) =>
      pedidoCenarios(`${base}/projetos/${id}/restaurar`, { revisaoEsperada, origem, operacaoId }),
    catalogo: async (r) =>
      (
        await pedidoCenarios<{ modelos: ModeloDeCatalogo[] }>(
          `${base}/catalogos/${r.id}/${r.digest}`,
        )
      ).modelos,
    aplicar: async (id, revisao) => {
      await pedidoCenarios(`${base}/projetos/${id}/aplicar`, { revisao })
    },
    miniatura: async (m, sinal) => {
      if (!m.miniatura) return runtime.miniatura ? runtime.miniatura(m, arte(m), sinal) : null
      const r = await fetch(`${base}/arte/${m.miniatura.digest}.png`, {
        signal: sinal,
        credentials: 'same-origin',
      })
      if (!r.ok) throw Error('Miniatura indisponível')
      return r.blob()
    },
    recuperar: (id) => guardar(id),
    guardarRecuperacao: async (id, valor) => {
      await guardar(id, valor)
    },
  }
}
