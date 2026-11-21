import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  renderStudioProScene3DModule,
  STUDIO_PRO_SCENE3D_MODULE,
  STUDIO_PRO_SCENE3D_RUNTIME,
  STUDIO_PRO_SCENE3D_TYPES,
  type StudioProScene3DMaterial,
} from '@sistemazero/core/studio/pro-scene3d'
import { InvalidBuildRequestError, verifyBuildBinaries } from '../src/contracts'

/**
 * R3 da revisão de 20/11/2026: os arquivos derivados dos cenários do Molda chegam ao build como
 * material. O Worker recusa o módulo fora do modelo do Estúdio, e o contêiner troca o runtime e os
 * tipos pelos da imagem e escreve o módulo de novo só com os dados.
 */

const material: StudioProScene3DMaterial = {
  id: 'praia',
  name: 'Praia',
  kind: 'scene3d',
  dado3d: { versao: 1 },
  url: 'studio-assets/praia.json',
  mime: 'application/json',
  bytes: 10,
  sha256: 'c'.repeat(64),
}

async function binary(text: string) {
  const bytes = new TextEncoder().encode(text)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return {
    base64: Buffer.from(bytes).toString('base64'),
    sha256: Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join(''),
  }
}

describe('os cenários do Pro no servidor do build', () => {
  test('o Worker aceita o módulo do Estúdio e recusa o que traz código além do modelo', async () => {
    const module = renderStudioProScene3DModule([material], 'a'.repeat(64))
    await verifyBuildBinaries({ [STUDIO_PRO_SCENE3D_MODULE]: await binary(module) })
    for (const forged of [
      `${module}globalThis.fetch('https://exemplo.test')\n`,
      'export const carregar = () => fetch("https://exemplo.test")\n',
    ])
      await expect(
        verifyBuildBinaries({ [STUDIO_PRO_SCENE3D_MODULE]: await binary(forged) }),
      ).rejects.toBeInstanceOf(InvalidBuildRequestError)
  })

  test('o contêiner troca o runtime e os tipos pelos da imagem e reescreve o módulo', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sz-scene3d-'))
    try {
      await mkdir(join(root, 'studio-generated'))
      const module = renderStudioProScene3DModule([material], 'a'.repeat(64))
      await writeFile(join(root, STUDIO_PRO_SCENE3D_MODULE), module)
      await writeFile(
        join(root, STUDIO_PRO_SCENE3D_RUNTIME),
        'export const criarSDKPro = 1 // falso\n',
      )
      await writeFile(join(root, STUDIO_PRO_SCENE3D_TYPES), 'export type Falso = 1\n')
      const script = fileURLToPath(new URL('../runtime/scene3d-pro-canonical.mjs', import.meta.url))
      const run = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
      expect(run.status).toBe(0)
      const trusted = await import('../scripts/scene3d-pro-contract')
      expect(await readFile(join(root, STUDIO_PRO_SCENE3D_RUNTIME), 'utf8')).toBe(
        trusted.SCENE3D_PRO_RUNTIME,
      )
      expect(await readFile(join(root, STUDIO_PRO_SCENE3D_TYPES), 'utf8')).toBe(
        trusted.SCENE3D_PRO_TYPES,
      )
      expect(await readFile(join(root, STUDIO_PRO_SCENE3D_MODULE), 'utf8')).toBe(
        renderStudioProScene3DModule([material], trusted.SCENE3D_PRO_RUNTIME_META.sha256),
      )
      // Fora do modelo, o contêiner para (o Worker já recusa antes; isto é a segunda trava).
      await writeFile(join(root, STUDIO_PRO_SCENE3D_MODULE), 'export const x = 1\n')
      expect(spawnSync(process.execPath, [script], { cwd: root }).status).not.toBe(0)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
