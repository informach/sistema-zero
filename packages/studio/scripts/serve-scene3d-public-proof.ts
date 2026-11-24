import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createEmptyProject } from '../src/core/project'
import { lerAssetDeCena3D } from '../src/core/scene3d/referencias'
import { buildClassicFileMap } from '../src/export/fileMap'
import { identityMinifiers } from '../src/export/minify'
import { renderProjectToPreviewDocAsync } from '../src/preview/renderProject'
import { criarTransporteDeEnsaio } from '../src/testing/scene3dTransportFixture'

const NativeResponse = globalThis.Response
GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
const root = resolve(import.meta.dirname, '..')
const output = resolve(root, '.cache/mission/scene3d-public-proof')
const port = Number(process.env.SCENE3D_PROOF_PORT ?? 5417)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
const fixture = await criarTransporteDeEnsaio()
const id = fixture.assets.find((asset) => asset.kind === 'scene3d')!.id
const program = `import { Scene, PerspectiveCamera, WebGLRenderer, Vector3 } from 'three';
const send = result => parent.postMessage({ tag: 'studio-scene3d-public', result }, '*');
(async () => {
  const renderer = new WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setSize(320, 240); renderer.setPixelRatio(1); document.body.append(renderer.domElement);
  const camera = new PerspectiveCamera(60, 320 / 240, 0.1, 200);
  camera.position.set(7, 8, 10); camera.lookAt(0, 0, 0);
  const empty = new Scene(), cycles = []; let image, result;
  try {
    for (let index = 0; index < 3; index++) {
      const loaded = await window.SZScene3D.carregar(${JSON.stringify(id)}, new AbortController().signal);
      try {
        loaded.atualizar(1 / 60); loaded.quadro(camera, new Vector3()); renderer.render(loaded.cena, camera);
        const active = { ...renderer.info.memory, calls: renderer.info.render.calls };
        const sameThree = loaded.cena instanceof Scene;
        const instances = [...loaded.instancias.keys()].sort();
        const height = loaded.alturas(0, 0);
        if (index === 0) image = renderer.domElement.toDataURL('image/png');
        loaded.descartar(); loaded.descartar(); renderer.render(empty, camera); renderer.renderLists.dispose();
        cycles.push({ sameThree, instances, height, active, after: { ...renderer.info.memory },
          children: loaded.cena.children.length, trees: loaded.colisoes.arvores });
      } finally { loaded.descartar(); }
    }
    const controller = new AbortController(); controller.abort();
    let aborted = false;
    try { await window.SZScene3D.carregar(${JSON.stringify(id)}, controller.signal); }
    catch (error) { aborted = error.name === 'AbortError'; }
    result = { origin: self.origin, cycles, aborted, image };
  } finally { renderer.dispose(); renderer.forceContextLoss(); }
  send({ ...result, final: { ...renderer.info.memory } });
})().catch(error => send({ error: String(error), stack: error.stack }));`
const project = {
  ...createEmptyProject('scene3d-public-proof', 'Cena geométrica de homologação'),
  assets: fixture.assets,
  files: {
    'index.html': '<!doctype html><html><head></head><body></body></html>',
    'style.css': 'body{margin:0}',
    'script.js': program,
  },
}
await mkdir(output, { recursive: true })
await writeFile(
  resolve(output, 'fixture.json'),
  JSON.stringify({
    nodes: lerAssetDeCena3D(fixture.assets.find((asset) => asset.id === id)!)
      .cena.nos.map((node) => node.id)
      .sort(),
  }),
)
await writeFile(
  resolve(output, 'preview.html'),
  await renderProjectToPreviewDocAsync(project, {
    securityProfile: 'strict',
  }),
)
const exported = await buildClassicFileMap(project, identityMinifiers)
for (const [path, content] of Object.entries(exported.files)) {
  const destination = resolve(output, 'export', path)
  if (!destination.startsWith(resolve(output, 'export') + sep)) throw Error('Caminho inválido')
  await mkdir(resolve(destination, '..'), { recursive: true })
  await writeFile(destination, content)
}
for (const [name, source] of Object.entries({
  three: 'export * from "three";',
  GLTFLoader: 'export { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";',
  SkeletonUtils: 'export * from "three/addons/utils/SkeletonUtils.js";',
})) {
  const entry = resolve(output, `${name}.entry.js`)
  await writeFile(entry, source)
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    format: 'esm',
    minify: true,
    external: name === 'three' ? [] : ['three'],
    plugins: [
      {
        name: 'installed-vendor',
        setup(build) {
          build.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) =>
            name !== 'three' && path === 'three'
              ? { path, external: true }
              : { path: Bun.resolveSync(path, root) },
          )
        },
      },
    ],
  })
  if (!result.success || result.outputs.length !== 1) throw new AggregateError(result.logs, name)
  await writeFile(resolve(output, `${name}.js`), await result.outputs[0]!.text())
}
Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname)
    if (path === '/')
      return new NativeResponse('<!doctype html><html><body></body></html>', {
        headers: { 'Content-Type': 'text/html' },
      })
    const target = resolve(output, `.${path}`)
    if (!target.startsWith(output + sep)) return new NativeResponse('Forbidden', { status: 403 })
    const file = Bun.file(target)
    return (await file.exists())
      ? new NativeResponse(file)
      : new NativeResponse('Not found', { status: 404 })
  },
})
console.log(`Public scene proof: http://127.0.0.1:${port}`)
