import { describe, expect, it } from 'bun:test'
import { buildPwaRevision, buildServiceWorker, buildWebAppManifest, publicPathToUrl } from '../pwa'

describe('PWA export', () => {
  it('gera manifesto instalavel com nome normalizado e icone local', () => {
    const manifest = JSON.parse(buildWebAppManifest('  Meu\nMundo 3D  '))
    expect(manifest.name).toBe('Meu Mundo 3D')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('./')
    expect(manifest.icons[0].src).toBe('./icon.svg')
    expect(manifest.icons[0].purpose).toContain('maskable')
  })

  it('troca a revisao quando qualquer conteudo exportado muda', () => {
    const first = buildPwaRevision({ 'public/index.html': '<h1>A</h1>' })
    const second = buildPwaRevision({ 'public/index.html': '<h1>B</h1>' })
    expect(first).toHaveLength(8)
    expect(second).not.toBe(first)
  })

  it('codifica cada segmento de caminho sem perder subpastas', () => {
    expect(publicPathToUrl('public/modelos/casa azul.glb')).toBe('./modelos/casa%20azul.glb')
  })

  it('gera service worker valido com precache, fallback e cache de modulos usados', () => {
    const source = buildServiceWorker(['./index.html', './script.js', './script.js'], 'abc-123')
    expect(() => new Function(source)).not.toThrow()
    expect(source).toContain('sz-project-abc-123')
    expect(source.match(/\.\/script\.js/g)?.length).toBe(1)
    expect(source).toContain("caches.match('./index.html')")
    expect(source).toContain("data.type !== 'SZ_CACHE_URLS'")
    expect(source).toContain("event.request.method !== 'GET'")
  })
})
