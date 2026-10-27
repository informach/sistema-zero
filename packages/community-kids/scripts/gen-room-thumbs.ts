/**
 * Pré-gera as MINIATURAS (PNG) das peças do quarto a partir dos GLBs de `public/room3d/items/` e
 * salva em `public/room3d/thumbs/<id>.png` AQUI e na comunidade adulta (as duas servem os mesmos
 * arquivos; o teste `room3d-catalog` confere que as cópias são iguais). Molde do
 * `gen-avatar-thumbs.ts`:
 *
 *   bun run gen:room-thumbs              (de packages/community-kids; sem args = todas)
 *   bun run gen:room-thumbs cama tv      (só essas)
 *
 * Sobe um servidorzinho local com a página geradora, o three.js da PRÓPRIA instalação e os GLBs,
 * e abre no navegador. A página desenha cada peça no ângulo do quarto (de cima, a 45°; as de
 * parede quase de frente) com fundo transparente e faz POST do PNG. `SZ_THUMBS_NO_OPEN=1` não abre
 * o navegador (para dirigir por um navegador automatizado).
 */
import { spawn } from 'node:child_process'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { ROOM_ITEM_INFO } from '../src/lib/room-catalog'

const PORT = 4598
const ROOT = join(import.meta.dir, '..')
const THREE_DIR = dirname(Bun.resolveSync('three/package.json', ROOT))
const PUBLIC = join(ROOT, 'public')
const THUMBS = join(PUBLIC, 'room3d', 'thumbs')
const ADULT_THUMBS = join(ROOT, '..', 'community', 'public', 'room3d', 'thumbs')

const allItems = Object.entries(ROOM_ITEM_INFO).map(([id, info]) => ({
  id,
  wall: info.mount === 'wall',
}))
const onlyIds = new Set(
  process.argv
    .slice(2)
    .map((s) => s.trim())
    .filter(Boolean),
)
for (const id of onlyIds) {
  if (!allItems.some((p) => p.id === id)) console.warn(`⚠️  id desconhecido (ignorado): ${id}`)
}
const items = onlyIds.size ? allItems.filter((p) => onlyIds.has(p.id)) : allItems
const validIds = new Set(items.map((p) => p.id))

const page = `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>Gerando miniaturas do quarto…</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0d1117;color:#eee;margin:0;padding:24px}
  #grid{display:grid;grid-template-columns:repeat(auto-fill,72px);gap:8px;margin-top:16px}
  #grid img{width:72px;height:72px;object-fit:contain;background:#161b22;border-radius:10px}
  #log{color:#8b949e;font-size:12px;white-space:pre} canvas{display:none}
</style></head><body>
<h1>Gerando miniaturas do quarto…</h1>
<div id="status">Carregando three.js…</div>
<div id="grid"></div>
<div id="log"></div>
<canvas id="c" width="256" height="256"></canvas>
<script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script>
<script type="module">
const ITEMS = ${JSON.stringify(items)};
const $ = (id) => document.getElementById(id);
const log = (m) => { $('log').textContent += m + '\\n'; };
const THREE = await import('three');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
const camera = new THREE.PerspectiveCamera(22, 1, 0.01, 200);
const loader = new GLTFLoader();

async function renderThumb(item){
  const g = await loader.loadAsync('/room3d/items/' + item.id + '.glb');
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.8); sun.position.set(4, 8, 6); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5); fill.position.set(-5, 3, -2); scene.add(fill);
  scene.add(g.scene);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g.scene);
  if (box.isEmpty()) throw new Error('modelo vazio');
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  // O ângulo do quarto: de cima a 45° (as de parede quase de frente, um pouco de lado).
  const az = item.wall ? Math.PI / 9 : Math.PI / 4;
  const el = item.wall ? Math.PI / 14 : Math.PI / 6;
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const dist = (sphere.radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.02;
  camera.position.copy(sphere.center).addScaledVector(dir, dist);
  camera.lookAt(sphere.center);
  camera.near = Math.max(0.01, dist - sphere.radius * 2);
  camera.far = dist + sphere.radius * 2;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return await new Promise((res) => canvas.toBlob(res, 'image/png'));
}

let ok = 0;
for (let i = 0; i < ITEMS.length; i++) {
  const it = ITEMS[i];
  $('status').textContent = 'Gerando ' + (i + 1) + '/' + ITEMS.length + ': ' + it.id;
  try {
    const blob = await renderThumb(it);
    await fetch('/save?id=' + encodeURIComponent(it.id), { method: 'POST', body: blob });
    ok++;
    const img = document.createElement('img'); img.src = URL.createObjectURL(blob); $('grid').appendChild(img);
  } catch (e) { log('✗ ' + it.id + ': ' + e.message); }
}
await fetch('/done', { method: 'POST' });
$('status').textContent = 'Pronto: ' + ok + '/' + ITEMS.length + ' miniaturas salvas.';
</script></body></html>`

function openBrowser(url: string) {
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore' })
    else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' })
  } catch {
    // o usuário abre na mão
  }
}

await mkdir(THUMBS, { recursive: true })
await mkdir(ADULT_THUMBS, { recursive: true })

let resolveDone: () => void = () => {}
const done = new Promise<void>((r) => {
  resolveDone = r
})
const saved = new Set<string>()

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
    if (url.pathname.startsWith('/vendor/three/') && req.method === 'GET') {
      const rel = normalize(url.pathname.slice('/vendor/three/'.length))
      if (rel.startsWith('..')) return new Response('not found', { status: 404 })
      const file = Bun.file(join(THREE_DIR, rel))
      return (await file.exists())
        ? new Response(file, { headers: { 'content-type': 'text/javascript; charset=utf-8' } })
        : new Response('not found', { status: 404 })
    }
    if (url.pathname.startsWith('/room3d/items/') && req.method === 'GET') {
      const rel = normalize(url.pathname.slice(1))
      if (rel.startsWith('..')) return new Response('not found', { status: 404 })
      const file = Bun.file(join(PUBLIC, rel))
      return (await file.exists()) ? new Response(file) : new Response('not found', { status: 404 })
    }
    if (url.pathname === '/save' && req.method === 'POST') {
      const id = url.searchParams.get('id') ?? ''
      if (!validIds.has(id)) return new Response('bad id', { status: 400 })
      const dest = join(THUMBS, `${id}.png`)
      await Bun.write(dest, await req.arrayBuffer())
      await copyFile(dest, join(ADULT_THUMBS, `${id}.png`))
      saved.add(id)
      return new Response('ok')
    }
    if (url.pathname === '/done' && req.method === 'POST') {
      resolveDone()
      return new Response('ok')
    }
    return new Response('not found', { status: 404 })
  },
})

const url = `http://localhost:${PORT}/`
console.log(`\nGerador de miniaturas do quarto (${items.length} peças).`)
if (process.env.SZ_THUMBS_NO_OPEN) {
  console.log(`   Abra no Chrome/Firefox e aguarde terminar: ${url}\n`)
} else {
  console.log(`   Abrindo no navegador: ${url}\n`)
  openBrowser(url)
}

await done
await new Promise((r) => setTimeout(r, 600))
server.stop(true)
console.log(
  `\n${saved.size}/${items.length} miniaturas salvas em public/room3d/thumbs/ (Kids e adulto).`,
)
process.exit(0)
