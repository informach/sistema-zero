/**
 * Pede ao navegador armazenamento PERSISTENTE (`navigator.storage.persist()`).
 *
 * Por quê: o rascunho da criança (projeto do Estúdio, desenho do Pinta) vive no IndexedDB, e sem
 * persistência o navegador pode DESPEJÁ-LO sob pressão de disco — e o Safari apaga TODO storage
 * de origem não visitada por ~7 dias. Persistido, o dado só sai se a criança (ou os pais) limpar.
 *
 * Decisões:
 * - Best-effort SEMPRE: sem a API / permissão negada / promise rejeitada → segue sem persistir,
 *   nunca lança, nunca bloqueia a carga do editor.
 * - 1× por SESSÃO (guard de módulo): a concessão é por ORIGEM, não por página — repetir o pedido
 *   a cada bloco de aula seria ruído. Chrome decide sozinho por heurística de engajamento;
 *   ⚠️ o Firefox mostra um PROMPT ao usuário (decisão de produto: aceito — a pergunta aparece
 *   uma vez e proteger o trabalho da criança vale o incômodo).
 * - Fire-and-forget: nenhum chamador precisa (nem deve) esperar a resposta.
 */

let requested = false

export function requestPersistentStorage(): void {
  if (requested) return
  requested = true
  try {
    const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
    if (!storage || typeof storage.persist !== 'function') return
    void storage.persist().catch(() => {
      // Negado/erro: nada a fazer — o rascunho segue no modo best-effort de sempre.
    })
  } catch {
    // Ambiente sem navigator.storage utilizável (SSR, navegador antigo): no-op.
  }
}

/** Só para os testes reexecutarem o guard de sessão. */
export function resetPersistentStorageForTests(): void {
  requested = false
}
