import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const form = readFileSync(
  join(import.meta.dir, '../src/app/admin/catalogo/produtos/product-form-client.tsx'),
  'utf8',
)

describe('oferta principal da página de venda (25/11/2026)', () => {
  test('o formulário lista só as ofertas do produto e manda a escolha no PATCH completo', () => {
    expect(form).toContain("new URLSearchParams({ productId, limit: '100', offset: '0' })")
    expect(form).toContain("o.status !== 'archived'")
    expect(form).toContain('primaryOfferId: primaryOfferId || null,')
    expect(form).toContain('Oferta principal da página de venda')
    // "Sem página de venda" limpa a marca (o catálogo responde 503 na página sem oferta principal).
    expect(form).toContain('<option value="">Sem página de venda</option>')
  })
})
