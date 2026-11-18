import { expect, test } from 'bun:test'
import {
  alteracoesDoGesto,
  apoioNaAgua,
  criarDocumentoVazio,
  transformarPonto,
  volumeNoMundo,
} from '@sistemazero/molda-cenarios-core/v2'
import { Box3, Matrix4, Vector3 } from 'three'
import { matrizDoObjeto } from '../src/matematica'

test('matriz, volume e posição do apoio de água usam a mesma pose após mover e girar o lago', () => {
  const d = criarDocumentoVazio('c', 'Água')
  const volume = { min: { x: -1, y: 0, z: -2 }, max: { x: 1, y: 2, z: 2 } }
  d.modelos = [{ id: 'm', modelo: 'm', biblioteca: 'b', digest: 'a'.repeat(64), volume }]
  const contorno = [
    { x: -10, z: -10 },
    { x: 10, z: -10 },
    { x: 0, z: 10 },
  ]
  const lago = {
    id: 'a',
    nome: 'Lago',
    tipo: 'lago' as const,
    grupo: null,
    oculto: false,
    bloqueado: false,
    modelo: null,
    centro: { x: 3, z: 5 },
    giro: 0.4,
    escala: 2,
    nivel: 3,
    profundidade: 4,
    contorno,
    recorte: contorno,
  }
  d.aguas = [lago]
  const mundo = {
    posicao: { x: 5, y: 4, z: 8 },
    rotacao: { x: 0.6, y: -0.5, z: 0.7 },
    escala: { x: 2, y: 3, z: 1 },
  }
  const o = {
    id: 'o',
    nome: 'Barco',
    modelo: 'm',
    grupo: null,
    oculto: false,
    bloqueado: false,
    colisao: 'caixa' as const,
    transformacao: mundo,
    apoio: apoioNaAgua(d, 'a', mundo),
  }
  d.instancias = [o]
  lago.nivel += 5
  lago.giro += 0.8
  lago.escala *= 1.5
  const matriz = matrizDoObjeto(d, o, new Matrix4()),
    caixa = new Box3(new Vector3(-1, 0, -2), new Vector3(1, 2, 2)).applyMatrix4(matriz),
    v = volumeNoMundo(d, o)
  for (const e of ['x', 'y', 'z'] as const) {
    expect(caixa.min[e]).toBeCloseTo(v.min[e], 8)
    expect(caixa.max[e]).toBeCloseTo(v.max[e], 8)
  }
  // O próximo gesto de gizmo é mundial: guardá-lo não aplica o giro da água duas vezes.
  const mudanca = { ...mundo, posicao: { x: 2, y: 9, z: 5 } }
  Object.assign(o, alteracoesDoGesto(d, o, mudanca))
  const nova = matrizDoObjeto(d, o, new Matrix4())
  for (const p of [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 1, z: 1 },
  ]) {
    const real = new Vector3(p.x, p.y, p.z).applyMatrix4(nova),
      esperado = transformarPonto(p, mudanca)
    for (const e of ['x', 'y', 'z'] as const) expect(real[e]).toBeCloseTo(esperado[e], 8)
  }
})
