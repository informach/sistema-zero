import { createHash } from 'node:crypto'

/**
 * C02 (30/10/2026): o ambiente Python dos desafios do Recife e do Pico.
 *
 * Os projetos apontam para a release ATIVA em staging e produção desde 29/10/2026,
 * `2026-10-25-integrated-games-2` (catálogo do Members `022e5b54…`, com Turtle, Pygame Zero,
 * Pygame-ce e Raylib 2D/3D). A prova (`packages/studio-runtime/tests/desafios-python-smoke.ts`)
 * baixa a distribuição publicada desta release, confere cada arquivo e o hash do manifesto, e roda
 * os desafios nela com a imagem do executor publicada. Quando a release ativa mudar, troque estes
 * valores, regenere os manifestos e rode a prova de novo: o Members recusa o projeto cujo ambiente
 * não está no catálogo.
 */
export const AMBIENTE_PYTHON_C02 = {
  profileId: 'python-browser',
  releaseId: '2026-10-25-integrated-games-2',
  manifestSha256: '0d27adb3af80195770b95545f3d1a40c4153941d4cf5cfc56f513b95e07371e1',
  pythonVersion: '3.14.2',
} as const

/** As extensões que a release ativa aprova (o `extensions` do manifesto dela). */
export const EXTENSOES_DA_RELEASE_C02 = [
  { id: 'python-turtle', versions: ['1.0.0'] },
  { id: 'python-pgzero', versions: ['1.0.0'] },
  { id: 'python-pygame', versions: ['1.0.0'] },
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
