import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { alturaDoCampo } from '@sistemazero/molda-cenarios-core/v2'
import { decodeProjectAsset } from '../../../core/assetBinary'
import { buildPythonAssetBundle } from '../../../core/pythonAssets'
import { prepararFontesPythonDoCenario } from '../../../core/scene3d/python'
import { lerAssetDeCena3D } from '../../../core/scene3d/referencias'
import { documentFixture } from '../../../state/fixtures/projectDocuments'
import { pythonFilesToTree } from '../../../state/pythonProjectValidation'
import { criarTransporteDeEnsaio } from '../../../testing/scene3dTransportFixture'
import { RAYLIB_3D_EXTENSION } from './contract'

/**
 * O mundo de 2 km em campo pelo caminho inteiro, sem navegador (plano "Mundos de 2 km", lote 6):
 * a autoria e o compilador de verdade, o importador do Estúdio num projeto Python (o módulo
 * `cenario_…` e os caminhos dos materiais) e a mesma materialização da execução; o `cenario.py`
 * abre, anda 1,8 km pela rota e a altura que o personagem pisa é a do campo no TypeScript.
 */
const motor = fileURLToPath(new URL('./py', import.meta.url))
const script = fileURLToPath(new URL('./__tests__/cenario_campo.py', import.meta.url))

test('um mundo de 2 km em campo, trazido para um projeto Python, abre e anda no cenario.py', async () => {
  const projeto = documentFixture('python', 'pro')
  if (projeto.programmingLanguage !== 'python' || projeto.kind !== 'pro') throw new Error('fixture')
  projeto.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: projeto.createdAt }]
  projeto.assets = []
  delete projeto.coverAssetName
  projeto.python.entrypoint = 'main.py'
  projeto.tree = pythonFilesToTree({ 'main.py': 'import cenario\n' })
  const plano = await criarTransporteDeEnsaio({
    relevoEmCampo: true,
    comRelevo: true,
    colunas: 1024,
    passo: 2,
    origem: { x: -1024, z: -1024 },
    projeto,
  })
  const cena = plano.assets.find((a) => a.kind === 'scene3d')!
  const { assets, fontesPython } = await prepararFontesPythonDoCenario(
    projeto,
    plano.assets,
    cena.id,
    new AbortController().signal,
  )
  expect(fontesPython).toHaveLength(1)
  const bundle = await buildPythonAssetBundle(assets, {
    files: ['main.py', ...fontesPython.map((f) => f.caminho)],
  })
  // As alturas do pacote, para conferir a altura do Python com a do campo no TypeScript.
  const envelope = lerAssetDeCena3D(cena)
  const terreno = (
    envelope.cena as unknown as {
      terreno: {
        origem: { x: number; z: number }
        passo: number
        colunas: number
        linhas: number
        alturas: string
        relevo?: { tipo: string }
      }
    }
  ).terreno
  expect(terreno.relevo?.tipo).toBe('campo')
  const recurso = envelope.recursos.find((r) => r.caminho === terreno.alturas)!
  const bytes = decodeProjectAsset(assets.find((a) => a.id === recurso.asset)!.dataUrl).bytes
  const alturas = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
  const pontos: [number, number][] = []
  // Fora das arestas da grade (u e v quaisquer): a diagonal da célula muda a altura.
  for (let x = -900.3; x <= 900; x += 10.7) pontos.push([x, x * 0.37 - 41.3])
  const raiz = mkdtempSync(join(tmpdir(), 'sz-campo-python-'))
  try {
    for (const [caminho, conteudo] of bundle.files) {
      mkdirSync(dirname(join(raiz, caminho)), { recursive: true })
      writeFileSync(join(raiz, caminho), conteudo)
    }
    for (const f of fontesPython) {
      mkdirSync(dirname(join(raiz, f.caminho)), { recursive: true })
      writeFileSync(join(raiz, f.caminho), f.texto)
    }
    const modulo = fontesPython[0]!.caminho.replace(/\.py$/, '').replaceAll('/', '.')
    const run = spawnSync(
      'python',
      ['-I', '-B', script, motor, raiz, modulo, JSON.stringify(pontos)],
      { encoding: 'utf8', timeout: 180_000 },
    )
    expect(run.status, run.stderr + run.stdout).toBe(0)
    const r = JSON.parse(run.stdout.trim().split('\n').at(-1)!)
    // Abre com o relevo pronto em volta do início; anda sem cair do mundo.
    expect(r.inicio.desenhados).toBeGreaterThan(0)
    expect(r.inicio.faltam).toBe(0)
    expect(r.semChao).toBe(0)
    // Anti-vácuo: o relevo não é plano (sem colinas, qualquer diagonal daria a mesma altura).
    expect(Math.max(...r.alturas) - Math.min(...r.alturas)).toBeGreaterThan(2)
    expect(r.fim.faltam).toBe(0)
    expect(r.fim.completos).toBeGreaterThan(0)
    expect(r.maiorDesenho).toBeLessThan(120)
    expect(r.completosGuardados).toBeLessThanOrEqual(r.tetoDeCompletos)
    // A altura que o personagem pisa é a do campo (a mesma diagonal da colisão do JavaScript).
    pontos.forEach(([x, z], i) => {
      expect(r.alturas[i]).toBeCloseTo(alturaDoCampo({ ...terreno, alturas }, x, z), 4)
    })
  } finally {
    rmSync(raiz, { recursive: true, force: true })
  }
}, 300_000)
