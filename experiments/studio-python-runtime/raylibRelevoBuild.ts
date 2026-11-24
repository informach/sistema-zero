/**
 * Monta o projeto do relevo de mundo grande num processo à parte (`raylibRelevoFixtures.ts`): o
 * exportador de GLB do three usa o FileReader do navegador, e o happy-dom global trocaria o `fetch`
 * e o `Response` do servidor de provas. Escreve o projeto em JSON na saída padrão.
 */
import { fileURLToPath } from 'node:url'
import { prepararFontesPythonDoCenario } from '../../packages/studio/src/core/scene3d/python'
import { RAYLIB_3D_EXTENSION } from '../../packages/studio/src/runtime/python/raylib/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { pythonFilesToTree } from '../../packages/studio/src/state/pythonProjectValidation'
import { criarTransporteDeEnsaio } from '../../packages/studio/src/testing/scene3dTransportFixture'
import { programaDoRelevo, RAYLIB_RELEVO_FIXTURE } from './raylibRelevoPrograma'

// O happy-dom é dependência do pacote do Estúdio (é o mesmo preload dos testes de lá).
const { GlobalRegistrator } = (await import(
  Bun.resolveSync(
    '@happy-dom/global-registrator',
    fileURLToPath(new URL('../../packages/studio/', import.meta.url)),
  )
)) as { GlobalRegistrator: { register(): void } }
if (typeof globalThis.FileReader === 'undefined') GlobalRegistrator.register()
async function montar(name: string) {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.id = name
  project.name = 'Mundo de 2 km'
  project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: project.createdAt }]
  project.assets = []
  delete project.coverAssetName
  project.python.entrypoint = 'main.py'
  project.tree = pythonFilesToTree({ 'main.py': 'import cenario\n' })
  const plano = await criarTransporteDeEnsaio({
    relevoEmCampo: true,
    comRelevo: true,
    colunas: 1024,
    passo: 2,
    origem: { x: -1024, z: -1024 },
    projeto: project,
  })
  const cena = plano.assets.find((a) => a.kind === 'scene3d')
  if (!cena) throw new Error('fixture: a cena não veio')
  const { assets, fontesPython } = await prepararFontesPythonDoCenario(
    project,
    plano.assets,
    cena.id,
    new AbortController().signal,
  )
  const modulo = fontesPython[0]
  if (!modulo || fontesPython.length !== 1) throw new Error('fixture: o módulo do cenário')
  project.assets = assets
  project.tree = pythonFilesToTree({
    'main.py': programaDoRelevo(modulo.caminho.replace(/\.py$/, '')),
    [modulo.caminho]: modulo.texto,
  })
  return project
}

process.stdout.write(JSON.stringify(await montar(RAYLIB_RELEVO_FIXTURE)))
