import crypto from 'node:crypto'

/**
 * Verifica a assinatura do "Signed Event Webhook" do SendGrid (ECDSA P-256 sobre
 * `timestamp + payload`). A chave pública vem do dashboard em base64 (DER SPKI).
 * Implementado com `node:crypto` (sem `@sendgrid/eventwebhook` → zero deps novas).
 */
export function verifySendGridSignature(input: {
  publicKeyBase64: string
  payload: string
  signature: string
  timestamp: string
}): boolean {
  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(input.publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    })
    const verifier = crypto.createVerify('sha256')
    verifier.update(input.timestamp + input.payload)
    verifier.end()
    return verifier.verify(key, Buffer.from(input.signature, 'base64'))
  } catch {
    return false
  }
}

export const SENDGRID_SIGNATURE_HEADER = 'x-twilio-email-event-webhook-signature'
export const SENDGRID_TIMESTAMP_HEADER = 'x-twilio-email-event-webhook-timestamp'
