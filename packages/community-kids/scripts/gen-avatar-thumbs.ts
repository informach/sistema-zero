/**
 * Pré-gera as MINIATURAS (PNG) de cada peça do avatar e salva em `public/avatar3d/thumbs/<id>.png`
 * — igual ao WawaSensei (thumbnails ESTÁTICAS, zero WebGL em runtime). Rode UMA vez e commite os PNGs:
 *
 *   bun run gen:avatar-thumbs        (de packages/community-kids)
 *
 * COMO funciona: sobe um servidorzinho local (Bun.serve) com uma página geradora + os GLBs, e ABRE
 * no SEU navegador real (WebGL confiável — nada de headless frágil). A página renderiza cada peça
 * com o MESMO esqueleto+skinned mesh do app e faz POST do PNG, que o servidor grava no disco. Quando
 * termina, fecha sozinho. Depois é só `git add public/avatar3d/thumbs`.
 */
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  AVATAR_PART_INFO,
  AVATAR_REMOVABLE_NONE,
  DEFAULT_AVATAR_SLOTS,
} from '../src/lib/avatar3d-catalog'

const PORT = 4599
const THREE_VER = '0.184.0'
const ROOT = join(import.meta.dir, '..')
const PUBLIC = join(ROOT, 'public')
const THUMBS = join(PUBLIC, 'avatar3d', 'thumbs')
const HEAD_DEFAULT = DEFAULT_AVATAR_SLOTS.head.asset

const HEAD_SITTING = new Set([
  'hair',
  'eyes',
  'eyebrows',
  'nose',
  'faceDecor',
  'facialHair',
  'glasses',
  'hat',
  'accessory',
])

// Peças COM GLB (pula os "*-none", que não têm arquivo).
const noneIds = new Set(Object.values(AVATAR_REMOVABLE_NONE))
const allParts = Object.entries(AVATAR_PART_INFO)
  .filter(([id]) => !noneIds.has(id) && !id.endsWith('-none'))
  .map(([id, info]) => ({
    id,
    onHead: HEAD_SITTING.has(info.category),
    color: DEFAULT_AVATAR_SLOTS[info.category]?.color ?? null,
  }))

// Filtro opcional por id (args da CLI): `gen:avatar-thumbs outfit-01 hair-08` gera SÓ
// essas peças — sem re-renderizar (e churnar no git) os PNGs já commitados. Sem args = tudo.
const onlyIds = new Set(
  process.argv
    .slice(2)
    .map((s) => s.trim())
    .filter(Boolean),
)
for (const id of onlyIds) {
  if (!allParts.some((p) => p.id === id)) console.warn(`⚠️  id desconhecido (ignorado): ${id}`)
}
const parts = onlyIds.size ? allParts.filter((p) => onlyIds.has(p.id)) : allParts
const validIds = new Set(parts.map((p) => p.id))

const page = `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>Gerando miniaturas do avatar…</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0d1117;color:#eee;margin:0;padding:24px}
  h1{font-size:18px} #bar{height:10px;background:#222;border-radius:6px;overflow:hidden;margin:12px 0}
  #fill{height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#a3e635);transition:width .2s}
  #grid{display:grid;grid-template-columns:repeat(auto-fill,64px);gap:8px;margin-top:16px}
  #grid div{width:64px;height:64px;border-radius:10px;background:#161b22;display:grid;place-items:center;overflow:hidden}
  #grid img{width:100%;height:100%;object-fit:contain} #log{color:#8b949e;font-size:12px;white-space:pre}
  canvas{display:none}
</style></head><body>
<h1>🖼️ Gerando miniaturas do avatar…</h1>
<div id="bar"><div id="fill"></div></div>
<div id="status">Carregando three.js…</div>
<div id="grid"></div>
<div id="log"></div>
<canvas id="c" width="256" height="256"></canvas>
<script type="module">
const PARTS = ${JSON.stringify(parts)};
const HEAD_DEFAULT = ${JSON.stringify(HEAD_DEFAULT)};
const SKIN = '#ecad80';
const base = location.origin + '/avatar3d';
const $ = (id) => document.getElementById(id);
const log = (m) => { $('log').textContent += m + '\\n'; };

const THREE = await import('https://esm.sh/three@${THREE_VER}');
const { GLTFLoader } = await import('https://esm.sh/three@${THREE_VER}/examples/jsm/loaders/GLTFLoader.js');
const { clone } = await import('https://esm.sh/three@${THREE_VER}/examples/jsm/utils/SkeletonUtils.js');

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
const loader = new GLTFLoader();
let armGltf = null;

function findSkeleton(scene){ let f=null; scene.traverse(o=>{ if(o.isSkinnedMesh && !f) f=o.skeleton }); return f; }
function rootBoneOf(sk){ const s=new Set(sk.bones); return sk.bones.find(b=>!b.parent||!s.has(b.parent)) ?? sk.bones[0] ?? null; }

async function renderThumb(partId, onHead, color){
  if(!armGltf) armGltf = await loader.loadAsync(base + '/base/Armature.glb');
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.6); d1.position.set(2,3,4); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.4); d2.position.set(-2,1,-2); scene.add(d2);

  const cloned = clone(armGltf.scene);
  const skeleton = findSkeleton(cloned);
  const rootBone = rootBoneOf(skeleton);
  const group = new THREE.Group();
  group.rotation.x = Math.PI/2;
  group.scale.setScalar(0.01);
  if(rootBone) group.add(rootBone);
  scene.add(group);

  const skin = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 1 });
  const addPart = async (id, col) => {
    const g = await loader.loadAsync(base + '/parts/' + id + '.glb');
    g.scene.traverse(child => {
      if(!child.isMesh) return;
      const src = Array.isArray(child.material) ? child.material[0] : child.material;
      let mat;
      if(src && src.name && src.name.includes('Skin_')) mat = skin;
      else { mat = src ? src.clone() : new THREE.MeshStandardMaterial(); if(col && mat.name && mat.name.includes('Color_')) mat.color.set(col); }
      const sm = new THREE.SkinnedMesh(child.geometry, mat);
      sm.skeleton = skeleton;
      sm.morphTargetDictionary = child.morphTargetDictionary;
      sm.morphTargetInfluences = child.morphTargetInfluences;
      group.add(sm);
    });
  };
  if(onHead) await addPart(HEAD_DEFAULT, null);
  await addPart(partId, color);

  scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  group.traverse(o => { if(o.isMesh) box.expandByObject(o); });
  if(box.isEmpty()) throw new Error('box vazio');
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const fov = camera.fov * Math.PI/180;
  const dist = (sphere.radius / Math.sin(fov/2)) * 1.1;
  camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + dist);
  camera.lookAt(sphere.center);
  camera.near = Math.max(0.001, dist - sphere.radius*2);
  camera.far = dist + sphere.radius*2 + 1;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
  return await new Promise(res => canvas.toBlob(res, 'image/png'));
}

let okN = 0;
for(let i=0;i<PARTS.length;i++){
  const p = PARTS[i];
  $('status').textContent = 'Gerando ' + (i+1) + '/' + PARTS.length + ' — ' + p.id;
  try{
    const blob = await renderThumb(p.id, p.onHead, p.color);
    await fetch('/save?id=' + encodeURIComponent(p.id), { method:'POST', body: blob });
    okN++;
    const cell = document.createElement('div');
    const img = document.createElement('img'); img.src = URL.createObjectURL(blob); cell.appendChild(img);
    $('grid').appendChild(cell);
  }catch(e){ log('✗ ' + p.id + ': ' + e.message); }
  $('fill').style.width = Math.round(((i+1)/PARTS.length)*100) + '%';
}
await fetch('/done', { method:'POST' });
$('status').textContent = '✅ Pronto! ' + okN + '/' + PARTS.length + ' miniaturas salvas. Pode fechar esta aba e commitar public/avatar3d/thumbs.';
</script></body></html>`

function openBrowser(url: string) {
  const cmd =
    process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore' })
    else spawn(cmd, [url], { stdio: 'ignore' })
  } catch {
    // ignora — o usuário abre na mão
  }
}

await mkdir(THUMBS, { recursive: true })

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
    if (url.pathname.startsWith('/avatar3d/') && req.method === 'GET') {
      const file = Bun.file(join(PUBLIC, url.pathname))
      return (await file.exists()) ? new Response(file) : new Response('not found', { status: 404 })
    }
    if (url.pathname === '/save' && req.method === 'POST') {
      const id = url.searchParams.get('id') ?? ''
      if (!validIds.has(id)) return new Response('bad id', { status: 400 })
      await Bun.write(join(THUMBS, `${id}.png`), await req.arrayBuffer())
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
console.log(`\n🖼️  Gerador de miniaturas do avatar (${parts.length} peças).`)
// SZ_THUMBS_NO_OPEN=1 → não abre o navegador sozinho (p/ dirigir por um navegador
// automatizado/CI sem corrida com a aba aberta na mão).
if (process.env.SZ_THUMBS_NO_OPEN) {
  console.log(`   Abra você mesmo no Chrome/Firefox e aguarde terminar: ${url}\n`)
} else {
  console.log(`   Abrindo no navegador: ${url}`)
  console.log('   (se não abrir, abra essa URL no Chrome/Firefox e aguarde terminar)\n')
  openBrowser(url)
}

await done
await new Promise((r) => setTimeout(r, 600)) // garante a última gravação
server.stop(true)
console.log(`\n✅ ${saved.size}/${parts.length} miniaturas salvas em public/avatar3d/thumbs/`)
console.log('   Agora: git add packages/community-kids/public/avatar3d/thumbs && commit.\n')
process.exit(0)
