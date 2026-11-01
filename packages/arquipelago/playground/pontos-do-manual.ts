import { writeFileSync } from 'node:fs'
import { ilha as ilhaDe } from '@sistemazero/arquipelago-contracts'
import type { Object3D } from 'three'
import { paraOMundo } from '../src/mundo/bosque'
import { ALTURA_DAS_NUVENS, centroNoAnel, giroDaIlha } from '../src/mundo/medidas'
import { arquivoDaIlha, carregarGlb } from '../tests/ajuda-colisores'

const ILHAS = ['bosque', 'vila-doce', 'recife', 'pico', 'vale-dos-dinos', 'nuvens'] as const
const saida: Record<string, unknown> = {}
for (const id of ILHAS) {
  const ilha = ilhaDe(id)
  const raiz: Object3D = await carregarGlb(arquivoDaIlha(`${id}.glb`))
  raiz.updateMatrixWorld(true)
  const centro = centroNoAnel(ilha)
  const giro = giroDaIlha(ilha)
  const soma = id === 'nuvens' ? ALTURA_DAS_NUVENS : 0
  const ancoras: Record<string, [number, number, number]> = {}
  raiz.traverse((o) => {
    if (o.type !== 'Object3D' || !o.name || o.name.startsWith('col-')) return
    const p = { x: 0, y: 0, z: 0 }
    const w = o.getWorldPosition(new (o.position.constructor as never)())
    paraOMundo({ x: w.x, y: w.y, z: w.z }, { x: centro.x, y: soma, z: centro.z }, giro, p)
    ancoras[o.name] = [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]
  })
  saida[id] = { centro: [centro.x, soma, centro.z], giro, ancoras }
}
writeFileSync(process.argv[2] ?? '.cache/pontos-do-manual.json', JSON.stringify(saida, null, 1))
console.log(
  Object.entries(saida)
    .map(([k, v]) => `${k}: ${Object.keys((v as { ancoras: object }).ancoras).length}`)
    .join(', '),
)
