/** Envelope de erro padronizado para respostas HTTP: `{ error: { code, message } }`. */
export interface ErrorEnvelope {
  error: { code: string; message: string }
}

export const envelope = (code: string, message: string): ErrorEnvelope => ({
  error: { code, message },
})
