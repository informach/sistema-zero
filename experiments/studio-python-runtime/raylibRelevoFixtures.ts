import { fileURLToPath } from 'node:url'
import { RAYLIB_RELEVO_FIXTURE } from './raylibRelevoPrograma'

export { RAYLIB_RELEVO_FIXTURE }

export function isRaylibRelevoFixture(name: string) {
  return name === RAYLIB_RELEVO_FIXTURE
}

/** O projeto vem do processo à parte (`raylibRelevoBuild.ts`): a autoria e o compilador de verdade. */
export async function raylibRelevoProject(name: string) {
  if (!isRaylibRelevoFixture(name)) throw new Error('Unknown Raylib relevo fixture')
  const filho = Bun.spawn(
    [process.execPath, fileURLToPath(new URL('./raylibRelevoBuild.ts', import.meta.url))],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [codigo, saida, erros] = await Promise.all([
    filho.exited,
    new Response(filho.stdout).text(),
    new Response(filho.stderr).text(),
  ])
  if (codigo !== 0) throw new Error(`fixture do relevo: ${erros.slice(-2000)}`)
  return JSON.parse(saida)
}
