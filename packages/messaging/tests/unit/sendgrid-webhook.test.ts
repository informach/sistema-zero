import { describe, expect, it } from 'bun:test'
import crypto from 'node:crypto'
import { verifySendGridSignature } from '../../src/infrastructure/gateways/sendgrid/sendgrid.webhook'

function makeKeyAndSign(payload: string, timestamp: string) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const publicKeyBase64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
  const signer = crypto.createSign('sha256')
  signer.update(timestamp + payload)
  signer.end()
  const signature = signer.sign(privateKey).toString('base64')
  return { publicKeyBase64, signature }
}

describe('verifySendGridSignature', () => {
  const payload = JSON.stringify([{ event: 'delivered', sg_event_id: 'e1' }])
  const timestamp = '1717689097'

  it('aceita assinatura ECDSA válida', () => {
    const { publicKeyBase64, signature } = makeKeyAndSign(payload, timestamp)
    expect(verifySendGridSignature({ publicKeyBase64, payload, signature, timestamp })).toBe(true)
  })

  it('rejeita corpo adulterado', () => {
    const { publicKeyBase64, signature } = makeKeyAndSign(payload, timestamp)
    expect(
      verifySendGridSignature({ publicKeyBase64, payload: `${payload} `, signature, timestamp }),
    ).toBe(false)
  })

  it('rejeita assinatura inválida sem lançar', () => {
    const { publicKeyBase64 } = makeKeyAndSign(payload, timestamp)
    expect(
      verifySendGridSignature({ publicKeyBase64, payload, signature: 'lixo', timestamp }),
    ).toBe(false)
  })
})
