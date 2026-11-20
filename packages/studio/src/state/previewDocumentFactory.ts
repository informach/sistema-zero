/**
 * A fábrica do documento da prévia de UMA instância (aba "Meus testes", proposta aprovada em
 * 20/11/2026). Quem tem tudo o que o documento do jogo precisa (os motores das extensões, os
 * materiais, a fonte escolhida, as cenas 3D) é a prévia (`PreviewIframe`); quem roda um teste pede
 * a ela o MESMO documento, com o script da criança passado pelo leitor das variáveis e um script
 * confiável a mais (o piloto do teste). Assim o teste roda o jogo que a criança vê, sem uma segunda
 * receita do documento. Por instância, no molde do `editorHistory`: dois Estúdios na mesma página
 * não rodam o jogo um do outro.
 */
export interface PreviewDocumentRequest {
  /** O script da criança como vai ao documento (o leitor das variáveis entra aqui). */
  transformScript: (source: string) => string
  /** Scripts confiáveis a mais, depois dos motores (o piloto do teste). */
  trustedScripts: readonly string[]
  /** A origem que recebe as mensagens do jogo (o quadro do teste mora na página do editor). */
  parentOrigin: string
}

/**
 * O documento pedido, ou `null` quando a prévia não tem como montá-lo agora (os materiais ou os
 * motores ainda chegando, ou quem olha não pode rodar o jogo).
 */
export type PreviewDocumentFactory = (request: PreviewDocumentRequest) => string | null

export interface PreviewDocumentSource {
  /** A prévia montada entrega a fábrica; a devolução a retira. */
  register(factory: PreviewDocumentFactory): () => void
  get(): PreviewDocumentFactory | null
}

export function createPreviewDocumentSource(): PreviewDocumentSource {
  let current: PreviewDocumentFactory | null = null
  return {
    register(factory) {
      current = factory
      return () => {
        // Uma prévia nova (o largo virando estreito remonta os painéis) pode ter registrado antes
        // de a antiga sair: a saída da antiga não derruba a nova.
        if (current === factory) current = null
      }
    },
    get: () => current,
  }
}
