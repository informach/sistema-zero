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
  /**
   * Liga o registro dos inspetores dos motores (`runtimeInspection`): o clique no sprite de um
   * grupo lê o grupo pelo inspetor oficial do Jogo 2D.
   */
  runtimeInspection?: boolean
}

/**
 * O documento pedido, ou por que não deu: `loading` quando a prévia não tem como montá-lo agora
 * (os materiais ou os motores ainda chegando, ou quem olha não pode rodar o jogo) e `unsaved`
 * quando o projeto não pôde ser gravado antes (a regra do Rodar: só roda o que está gravado).
 */
export type PreviewDocumentResult = { document: string } | { unavailable: 'loading' | 'unsaved' }

/**
 * Prepara como o Rodar (descarrega o que o editor ainda segura e grava o projeto) e monta o
 * documento com o projeto gravado. Assíncrona por causa da gravação.
 */
export type PreviewDocumentFactory = (
  request: PreviewDocumentRequest,
) => Promise<PreviewDocumentResult>

/**
 * Uma vaga por instância que a prévia montada ocupa e a aba "Meus testes" lê: a fábrica do
 * documento (JavaScript) ou o anfitrião dos testes (Python, `pythonTestHost.ts`).
 */
export interface PreviewSlot<Value> {
  /** A prévia montada entrega o valor; a devolução o retira. */
  register(value: Value): () => void
  get(): Value | null
}

export function createPreviewSlot<Value>(): PreviewSlot<Value> {
  let current: Value | null = null
  return {
    register(value) {
      current = value
      return () => {
        // Uma prévia nova (o largo virando estreito remonta os painéis) pode ter registrado antes
        // de a antiga sair: a saída da antiga não derruba a nova.
        if (current === value) current = null
      }
    },
    get: () => current,
  }
}

export type PreviewDocumentSource = PreviewSlot<PreviewDocumentFactory>
