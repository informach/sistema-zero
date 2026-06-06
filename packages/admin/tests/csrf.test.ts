import { describe, expect, test } from 'bun:test'
import { isSameOriginRequest, requiresOriginCheck } from '../src/lib/csrf'

describe('requiresOriginCheck', () => {
  test('métodos seguros não exigem checagem', () => {
    expect(requiresOriginCheck('GET')).toBe(false)
    expect(requiresOriginCheck('head')).toBe(false)
    expect(requiresOriginCheck('OPTIONS')).toBe(false)
  })

  test('métodos que mutam exigem checagem', () => {
    expect(requiresOriginCheck('POST')).toBe(true)
    expect(requiresOriginCheck('patch')).toBe(true)
    expect(requiresOriginCheck('DELETE')).toBe(true)
    expect(requiresOriginCheck('PUT')).toBe(true)
  })
})

describe('isSameOriginRequest', () => {
  test('Sec-Fetch-Site decide quando presente (header não-forjável)', () => {
    expect(isSameOriginRequest({ secFetchSite: 'same-origin', origin: null, host: null })).toBe(
      true,
    )
    // same-site = subdomínio irmão (o vetor que o SameSite=Lax não barra) → bloqueia
    expect(isSameOriginRequest({ secFetchSite: 'same-site', origin: null, host: null })).toBe(false)
    expect(isSameOriginRequest({ secFetchSite: 'cross-site', origin: null, host: null })).toBe(
      false,
    )
    // POST sem site iniciador não vem das nossas telas
    expect(isSameOriginRequest({ secFetchSite: 'none', origin: null, host: null })).toBe(false)
  })

  test('Sec-Fetch-Site vence o Origin', () => {
    expect(
      isSameOriginRequest({
        secFetchSite: 'cross-site',
        origin: 'https://admin.sistemazero.com.br',
        host: 'admin.sistemazero.com.br',
      }),
    ).toBe(false)
  })

  test('sem Sec-Fetch-Site, compara Origin × host', () => {
    expect(
      isSameOriginRequest({
        secFetchSite: null,
        origin: 'https://admin.sistemazero.com.br',
        host: 'admin.sistemazero.com.br',
      }),
    ).toBe(true)
    expect(
      isSameOriginRequest({
        secFetchSite: null,
        origin: 'https://funil.sistemazero.com.br',
        host: 'admin.sistemazero.com.br',
      }),
    ).toBe(false)
    // Origin malformado → bloqueia
    expect(isSameOriginRequest({ secFetchSite: null, origin: 'lixo', host: 'x' })).toBe(false)
  })

  test('sem nenhum sinal = cliente não-browser (sem vetor de CSRF) → libera', () => {
    expect(isSameOriginRequest({ secFetchSite: null, origin: null, host: 'qualquer' })).toBe(true)
  })
})
