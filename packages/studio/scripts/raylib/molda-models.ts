/**
 * Os modelos 3D dos exemplos Raylib saem do PRÓPRIO Molda: os "Modelos prontos" que a criança vê
 * no Criar novo, gravados pelo mesmo exportador do "Trazer do Molda" (`encodeSceneGlb` com
 * `animatedPaint`). Assim um exemplo só usa o que a criança consegue refazer no Molda e trazer.
 *
 *     bun --no-env-file scripts/raylib/molda-models.ts          # grava
 *     bun --no-env-file scripts/raylib/molda-models.ts --check  # confere sem gravar
 *
 * Fica fora do typecheck do Estúdio de propósito: lê o código-fonte do Molda (só aqui, na
 * geração). O jogo e o runtime nunca importam o Molda; eles recebem os .glb gravados.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { encodeSceneGlb } from '../../../molda/src/export/sceneGlb'
import { createSceneProject } from '../../../molda/src/scene/createProject'
import type { MoldaTemplateId } from '../../../molda/src/templates/catalog'

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))

// Ids sorteados viram uma sequência fixa: o mesmo modelo dá os mesmos bytes em toda geração.
let next = 0
crypto.randomUUID = () =>
  `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}` as ReturnType<
    typeof crypto.randomUUID
  >

function template(templateId: MoldaTemplateId, name: string) {
  next = 0
  const document = createSceneProject({ kind: 'template', templateId, name })
  const { bytes, issues } = encodeSceneGlb(document, { animatedPaint: true })
  if (issues.length) throw new Error(`${name}: o Molda avisou ${issues.map((i) => i.code)}`)
  return bytes
}

function fixture(file: string) {
  const json = JSON.parse(
    readFileSync(
      join(HERE, '../../src/official-extensions/game-3d-advanced/__tests__/fixtures', file),
      'utf8',
    ),
  ) as { dataUrl: string }
  return new Uint8Array(Buffer.from(json.dataUrl.split(',')[1]!, 'base64'))
}

/** Caminho (a partir de scripts/raylib) → bytes. */
export function moldaModels(): Record<string, Uint8Array> {
  return {
    'scenes/assets/models/molda-nave.glb': template('nave', 'nave'),
    // Personagem com esqueleto e dois movimentos, gravado pelo Molda (contrato do lote 117).
    'scenes/assets/models/molda-pesos.glb': fixture('molda-skinned.json'),
  }
}

if (import.meta.main) {
  const check = process.argv.includes('--check')
  let stale = 0
  for (const [path, bytes] of Object.entries(moldaModels())) {
    const target = join(HERE, path)
    let current: Uint8Array | null = null
    try {
      current = readFileSync(target)
    } catch {}
    const same = current !== null && Buffer.compare(Buffer.from(current), Buffer.from(bytes)) === 0
    if (same) continue
    stale++
    if (check) console.error(`desatualizado: ${path}`)
    else {
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, bytes)
      console.log(`gravado: ${path} (${bytes.length} bytes)`)
    }
  }
  if (check && stale) process.exit(1)
}
