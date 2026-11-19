import { describe, expect, it } from 'bun:test'
import { serveClassicShell } from '../src/classic-shell'

const URL_DA_CASCA = 'https://runtime.test/v1/classic-shell/1.html'

describe('rota da casca da prévia do Clássico', () => {
  it('sem origens configuradas a rota não existe', () => {
    expect(serveClassicShell(new Request(URL_DA_CASCA), undefined)?.status).toBe(404)
    expect(serveClassicShell(new Request(URL_DA_CASCA), ' ')?.status).toBe(404)
  })

  it('outras rotas seguem para o resto do worker', () => {
    expect(
      serveClassicShell(new Request('https://runtime.test/v1/artifacts/x'), 'https://a.test'),
    ).toBeNull()
  })

  it('serve a página com frame-ancestors das origens e os cabeçalhos de isolamento', async () => {
    const response = serveClassicShell(
      new Request(URL_DA_CASCA),
      'https://www.a.test,http://localhost:5195',
    )
    expect(response?.status).toBe(200)
    expect(response?.headers.get('content-security-policy')).toBe(
      'frame-ancestors https://www.a.test http://localhost:5195',
    )
    expect(response?.headers.get('cross-origin-embedder-policy')).toBe('credentialless')
    expect(response?.headers.get('cross-origin-resource-policy')).toBe('cross-origin')
    const page = await response!.text()
    expect(page).toContain('sz-shell:ready')
    expect(page).not.toContain('allow-same-origin')
  })

  it('só GET e HEAD', async () => {
    const post = serveClassicShell(new Request(URL_DA_CASCA, { method: 'POST' }), 'https://a.test')
    expect(post?.status).toBe(405)
    const head = serveClassicShell(new Request(URL_DA_CASCA, { method: 'HEAD' }), 'https://a.test')
    expect(head?.status).toBe(200)
    expect(await head!.text()).toBe('')
  })
})
