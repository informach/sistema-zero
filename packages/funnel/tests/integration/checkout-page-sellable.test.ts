import { beforeEach, describe, expect, test } from 'bun:test'
import { clearOfferCache } from '../../src/server/catalog'
import { startPix } from '../../src/server/checkout'
import { clearPrimaryOfferCache } from '../../src/server/page-offer'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const CONTACT = {
  nome: 'Ana Souza',
  email: 'ana@example.com',
  cpf: '529.982.247-25',
  telefone: '(11) 98888-7777',
}

// O checkout cobra só o que a página vende (25/11/2026, full review): a principal, a irmã do
// alternador ou outra oferta do MESMO produto marcada `pageSellable`. A de presente nunca.
describe('checkout: só as ofertas que a página vende', () => {
  beforeEach(() => {
    clearOfferCache()
    clearPrimaryOfferCache()
  })

  async function pix(offerSlug: string, gw: ReturnType<typeof createFakeGateway>) {
    const { repo } = createFakeRepo()
    const { id } = await repo.createLead('kids/cade-todo-mundo')
    return startPix(
      new Request('http://localhost/api/checkout/pix', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: `funil_lead=${id}` },
        body: JSON.stringify({ contact: CONTACT, offerSlug }),
      }),
      {
        repo,
        gateway: gw.gateway,
        resolveOffer: () => ({
          offerSlug: 'cade-1-ano',
          productName: 'Cadê Todo Mundo',
          productSku: 'cade-todo-mundo',
        }),
        fulfill: async () => {},
        grantMembers: async () => {},
      },
    )
  }

  test('oferta do mesmo produto SEM a marca (a de presente) é recusada com 400', async () => {
    const gw = createFakeGateway()
    gw.setOfferConfig('cade-15-dias', { productSku: 'cade-todo-mundo' })
    const res = await pix('cade-15-dias', gw)
    expect(res.status).toBe(400)
    expect(gw.calls.create).toHaveLength(0)
  })
})
