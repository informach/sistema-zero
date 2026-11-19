import { expect, test } from 'bun:test'
import { asset3DManifest, assetManifest } from '../../core/projectAssets'
import { criarTransporteDeCenas3D } from '../../core/scene3d/transporte'
import { resolveGameUiFontId } from '../../official-extensions/gameUiFonts/resolve'
import {
  buildJavaScriptClassicDocument,
  loadJavaScriptClassicResources,
} from '../../runtime/javascript/classicDocument'
import { criarTransporteDeEnsaio } from '../../testing/scene3dTransportFixture'
import { SCENE3D_RUNTIME } from '../../three/scene3dRuntime.generated'
import { THREE_CDN } from '../../three/threeRuntimeContract'

const scripts = (doc: string) => {
  const html = new DOMParser().parseFromString(doc, 'text/html')
  return [...html.querySelectorAll('script')].map((s) => {
    const src = s.getAttribute('src')
    return src?.startsWith('data:text/javascript;')
      ? Buffer.from(src.split(',')[1]!, 'base64').toString('utf8')
      : (s.textContent ?? '')
  })
}

test('o documento clássico instala o módulo compartilhado antes do motor, com imports pinados e canais por ID', async () => {
  const plano = await criarTransporteDeEnsaio(),
    cenas3d = criarTransporteDeCenas3D(plano.assets)!,
    resources = await loadJavaScriptClassicResources(
      ['world-3d'],
      resolveGameUiFontId({}),
      undefined,
      true,
    ),
    doc = buildJavaScriptClassicDocument({
      html: '<html><head></head><body></body></html>',
      css: '',
      js: '',
      resources,
      assets: assetManifest(plano.assets),
      models3d: asset3DManifest(plano.assets),
      cenas3d,
    }),
    fontes = scripts(doc)
  expect(resources.cenas3d?.imports.three).toBe(THREE_CDN)
  expect(THREE_CDN).toContain('0.184.0')
  expect(fontes.includes(SCENE3D_RUNTIME)).toBe(true)
  expect(fontes.indexOf(SCENE3D_RUNTIME)).toBeLessThan(
    fontes.findIndex((s) => s.includes('window.SZWorld3D')),
  )
  expect(fontes.some((s) => s.includes('__SZGAME_CENAS_3D'))).toBe(true)
  expect(doc).toContain("connect-src 'none'")
  expect(() =>
    buildJavaScriptClassicDocument({
      html: '',
      css: '',
      js: '',
      cenas3d,
      resources: { ...resources, cenas3d: undefined },
    }),
  ).toThrow(/carregador/)
})

test('documento comum não baixa nem injeta o módulo de cenários', async () => {
  const resources = await loadJavaScriptClassicResources([], resolveGameUiFontId({})),
    doc = buildJavaScriptClassicDocument({ html: '', css: '', js: '', resources })
  expect(resources.cenas3d).toBeUndefined()
  expect(scripts(doc).includes(SCENE3D_RUNTIME)).toBe(false)
  expect(doc).not.toContain('0.184.0')
})

test('nome hostil do material permanece texto e não fecha a tag de script do documento', async () => {
  const plano = await criarTransporteDeEnsaio(),
    modelo = plano.assets.find((a) => a.kind === 'model3d')!
  modelo.name = '</script><script id="injetado">window.injetado=true</script>'
  const resources = await loadJavaScriptClassicResources(
      [],
      resolveGameUiFontId({}),
      undefined,
      true,
    ),
    doc = buildJavaScriptClassicDocument({
      html: '<html><body></body></html>',
      css: '',
      js: '',
      resources,
      assets: assetManifest(plano.assets),
      models3d: asset3DManifest(plano.assets),
      cenas3d: criarTransporteDeCenas3D(plano.assets),
    }),
    html = new DOMParser().parseFromString(doc, 'text/html')
  expect(html.querySelector('#injetado')).toBeNull()
  expect(scripts(doc).some((s) => s.includes('window.injetado=true'))).toBe(true)
})
