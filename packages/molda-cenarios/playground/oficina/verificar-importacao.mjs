import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/importacao')
mkdirSync(saida, { recursive: true })
const { zipSync } = createRequire(resolve(raiz, 'packages/molda/package.json'))('fflate')
const obj =
  'mtllib mat/folhas.mtl\no Planta\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nusemtl Verde\nf 1/1 2/2 3/3\n'
const mtl = 'newmtl Verde\nKd 0.2 0.8 0.3\nmap_Kd ../texturas/folha.png\n'
const fbx = `; FBX 7.4.0 project file
FBXHeaderExtension:  {
\tFBXHeaderVersion: 1003
\tFBXVersion: 7400
}
Objects:  {
\tGeometry: 100, "Geometry::Triangulo", "Mesh" {
\t\tVertices: *9 {
\t\t\ta: 0,0,0,1,0,0,0,1,0
\t\t}
\t\tPolygonVertexIndex: *3 {
\t\t\ta: 0,1,-3
\t\t}
\t}
\tModel: 200, "Model::Triangulo", "Mesh" {
\t\tVersion: 232
\t\tProperties70:  {
\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",0,0,0
\t\t\tP: "Lcl Rotation", "Lcl Rotation", "", "A",0,0,0
\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
\t\t}
\t\tShading: T
\t\tCulling: "CullingOff"
\t}
}
Connections:  {
\tC: "OO",100,200
\tC: "OO",200,0
}
`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  erros = []
p.on('pageerror', (e) => {
  erros.push(e.message)
  console.error(e.message)
})
let workersConferidos = 0
await p.route('**/*converter.worker*', async (rota) => {
  const resposta = await rota.fetch()
  workersConferidos++
  await rota.fulfill({
    response: resposta,
    headers: {
      ...resposta.headers(),
      'content-security-policy': "connect-src 'self' https:; img-src 'self' blob: data:",
    },
  })
})
try {
  await p.goto('http://127.0.0.1:4541/?vazio=1')
  const png = await p.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 2
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#2cbb61'
    ctx.fillRect(0, 0, 2, 2)
    const b = await new Promise((r) => c.toBlob(r, 'image/png'))
    return [...new Uint8Array(await b.arrayBuffer())]
  })
  const packed = zipSync({
    'natureza/planta.obj': new TextEncoder().encode(obj),
    'natureza/mat/folhas.mtl': new TextEncoder().encode(mtl),
    'natureza/texturas/folha.png': new Uint8Array(png),
  })
  const r = await p.evaluate(
    async ({ zip, modulo, fbx }) => {
      const { prepararArquivos } = await import(modulo)
      const posicoes = new Float32Array([0, 0, 0, 2, 0, 0, 0, 1, 0])
      const gltf = {
        asset: { version: '2.0' },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ uri: 'partes.bin', byteLength: 36 }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
        accessors: [
          {
            bufferView: 0,
            componentType: 5126,
            count: 3,
            type: 'VEC3',
            min: [0, 0, 0],
            max: [2, 1, 0],
          },
        ],
      }
      const resultado = await prepararArquivos([
        new File([new Uint8Array(zip)], 'natureza.zip'),
        {
          caminho: 'gltf/triangulo.gltf',
          arquivo: new File([JSON.stringify(gltf)], 'triangulo.gltf'),
        },
        { caminho: 'gltf/partes.bin', arquivo: new File([posicoes.buffer], 'partes.bin') },
        new File([fbx], 'triangulo.fbx'),
        new File(
          [
            fbx.replace(
              'Objects:  {',
              'GlobalSettings:  {\n\tProperties70:  {\n\t\tP: "UnitScaleFactor", "double", "Number", "",1\n\t}\n}\nObjects:  {',
            ),
          ],
          'centimetros.fbx',
        ),
      ])
      const faltante = await prepararArquivos([
        new File(['mtllib sumiu.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3'], 'incompleto.obj'),
      ])
      const remoto = structuredClone(gltf)
      remoto.buffers[0].uri = 'https://nao-deve-ser-baixado.invalid/modelo.bin'
      const recusado = await prepararArquivos([new File([JSON.stringify(remoto)], 'remoto.gltf')])
      const controle = new AbortController()
      controle.abort()
      let cancelado = false
      try {
        await prepararArquivos([new File([fbx], 'triangulo.fbx')], undefined, controle.signal)
      } catch (e) {
        cancelado = e.name === 'AbortError'
      }
      return {
        faltante: faltante.recusados,
        remoto: recusado.recusados,
        cancelado,
        recusados: resultado.recusados,
        modelos: await Promise.all(
          resultado.prontos.map(async (m) => {
            const v = new DataView(m.conteudo.buffer, m.conteudo.byteOffset, m.conteudo.byteLength)
            const json = JSON.parse(
              new TextDecoder().decode(m.conteudo.slice(20, 20 + v.getUint32(12, true))),
            )
            return {
              nome: m.nome,
              pasta: m.pasta,
              min: m.min,
              max: m.max,
              triangulos: m.triangulos,
              miniatura: m.miniatura.size,
              bytes: m.conteudo.length,
              imagens: json.images,
              comTextura: Boolean(json.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture),
            }
          }),
        ),
      }
    },
    {
      zip: [...packed],
      fbx,
      modulo:
        '/@fs/' +
        resolve(raiz, 'packages/molda-cenarios/src/oficina/importar.ts')
          .replaceAll('\\', '/')
          .replace(/^\//, ''),
    },
  )
  assert.deepEqual(r.recusados, [])
  assert.ok(r.faltante[0].motivo.includes('material'))
  assert.equal(r.remoto.length, 1)
  assert.equal(r.cancelado, true)
  assert.ok(workersConferidos > 0, 'O teste precisa aplicar a CSP ao worker real')
  assert.equal(r.modelos.length, 4)
  assert.deepEqual(r.modelos[3].max, [0.01, 0.01, 0])
  assert.ok(r.modelos.every((m) => m.triangulos === 1 && m.miniatura > 0))
  assert.equal(r.modelos[0].comTextura, true)
  assert.ok(r.modelos[0].imagens.every((i) => i.bufferView !== undefined && !i.uri))
  assert.ok(r.modelos[0].miniatura > 0)
  await p.getByRole('button', { name: 'Bibliotecas', exact: true }).click()
  await p.getByRole('button', { name: 'Criar biblioteca', exact: true }).first().click()
  await p.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Biblioteca de teste')
  await p.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
  await p.getByRole('heading', { name: 'Biblioteca de teste', exact: true }).waitFor()
  await p.getByRole('button', { name: 'Trazer modelos', exact: true }).click()
  const escolha = p.waitForEvent('filechooser')
  await p
    .getByRole('dialog')
    .getByRole('button', { name: 'Arquivos ou pacote ZIP', exact: true })
    .click()
  await (await escolha).setFiles({
    name: 'natureza.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(packed),
  })
  await p
    .getByRole('status')
    .filter({ hasText: '1 modelo novo na biblioteca' })
    .waitFor({ timeout: 30_000 })
  await p.getByText('Planta', { exact: true }).waitFor()
  await p.getByRole('button', { name: 'Editar Planta', exact: true }).click()
  const editar = p.getByRole('dialog')
  await editar.getByLabel('Nome', { exact: true }).fill('Árvore da praça')
  await editar.getByLabel('Pasta', { exact: true }).fill('Natureza/Árvores')
  await editar.getByLabel('Etiquetas, separadas por vírgulas', { exact: true }).fill('verde, vila')
  await editar.getByRole('button', { name: 'Guardar', exact: true }).click()
  await p.getByText('Árvore da praça', { exact: true }).waitFor()
  await p
    .getByRole('combobox', { name: 'Pasta da biblioteca', exact: true })
    .selectOption('Natureza/Árvores')
  await p.getByText('Árvore da praça', { exact: true }).waitFor()
  await p.getByRole('button', { name: 'verde', exact: true }).click()
  await p.getByRole('searchbox', { name: 'Buscar modelo', exact: true }).fill('arvore')
  await p.getByText('Árvore da praça', { exact: true }).waitFor()
  await p.getByRole('progressbar', { name: 'Armazenamento usado', exact: true }).waitFor()
  await p.screenshot({ path: resolve(saida, 'biblioteca-importada.png') })
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...r, erros }, null, 2))
  assert.equal(erros.length, 0)
  console.log(
    'GLTF externo, FBX e ZIP com OBJ/MTL/PNG convertidos; importação pela interface confirmada',
    JSON.stringify(r),
  )
} finally {
  await browser.close()
}
