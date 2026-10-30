import { createHash } from 'node:crypto'

/**
 * C02 (30/10/2026): o ambiente Python dos desafios do Recife e do Pico.
 *
 * ⚠️ Nenhum ambiente publicado tem hoje uma release Python com Pygame Zero e Raylib (a candidata
 * de staging, `2026-10-22-visual-games-3`, só traz a Turtle). Os projetos apontam para a release
 * construída na prova local a partir do vendor verificado (`buildPythonRuntimeDistribution`) e
 * das extensões que o Estúdio declara. A prova (`packages/studio-runtime/tests/
 * desafios-python-smoke.ts`) recalcula a release e recusa rodar se o hash divergir. Quando a dona
 * ativar uma release com Pygame Zero, troque estes quatro valores pela release ativa, regenere os
 * manifestos e rode a prova de novo: o Members recusa o projeto cujo ambiente não está no catálogo.
 */
export const AMBIENTE_PYTHON_C02 = {
  profileId: 'python-browser',
  releaseId: '2026-10-30-c02-qa',
  manifestSha256: 'e99427f77021904702977f086ff9f9476607d91039da736251c074fe735a3f7a',
  pythonVersion: '3.14.2',
} as const

/** As extensões que a release da prova aprova (as mesmas do `python-mission-smoke.ts`). */
export const EXTENSOES_DA_RELEASE_C02 = [
  { id: 'python-turtle', versions: ['1.0.0'] },
  { id: 'python-pgzero', versions: ['1.0.0'] },
  { id: 'python-raylib-2d', versions: ['1.0.0'] },
  { id: 'python-raylib-3d', versions: ['1.0.0'] },
] as const

const sha256 = (texto: string) => createHash('sha256').update(texto).digest('hex')

/** Um projeto Python clássico (só `main.py`), como o Estúdio guarda, sem materiais. */
export function projetoPythonClassico(opcoes: {
  id: string
  nome: string
  fonte: string
  extensao: 'python-pgzero' | 'python-raylib-2d' | 'python-raylib-3d'
}) {
  const { profileId, releaseId, manifestSha256, pythonVersion } = AMBIENTE_PYTHON_C02
  return {
    formatVersion: 3,
    id: opcoes.id,
    name: opcoes.nome,
    createdAt: 0,
    updatedAt: 0,
    programmingLanguage: 'python',
    runtime: { profileId, releaseId, manifestSha256 },
    kind: 'classic',
    mode: 'bridge',
    projectTools: [],
    installedExtensions: [{ id: opcoes.extensao, version: '1.0.0', installedAt: 0 }],
    assets: [],
    python: {
      entrypoint: 'main.py',
      dependencyLock: {
        lockVersion: 1,
        target: 'browser',
        pythonVersion,
        runtimeManifestSha256: manifestSha256,
        requirementsSha256: sha256(''),
        packages: [],
      },
    },
    ir: null,
    blocksState: null,
    files: { 'main.py': opcoes.fonte, 'requirements.txt': '' },
  }
}
