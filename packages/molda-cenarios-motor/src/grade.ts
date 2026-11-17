import {
  alturaDoChao,
  type DocumentoDeCenario,
  type EncaixeDeComposicao,
  type FonteDeAlturas,
} from '@sistemazero/molda-cenarios-core/v2'
import { BufferGeometry, Float32BufferAttribute } from 'three'

/** Grade de referência com orçamento limitado; as linhas largas continuam múltiplas do passo real. */
export function geometriaDaGrade(
  doc: DocumentoDeCenario,
  encaixe: EncaixeDeComposicao,
  fonte?: FonteDeAlturas,
): BufferGeometry {
  const g = new BufferGeometry(),
    pontos: number[] = []
  if (encaixe.grade === null || (doc.base.tipo === 'terreno' && !fonte)) return g
  const base = doc.base
  const largura =
    base.tipo === 'plano'
      ? base.largura
      : base.tipo === 'terreno'
        ? base.colunas * base.passo
        : 1024
  const comprimento =
    base.tipo === 'plano'
      ? base.comprimento
      : base.tipo === 'terreno'
        ? base.linhas * base.passo
        : 1024
  const minX = base.tipo === 'terreno' ? base.origem.x : -largura / 2,
    minZ = base.tipo === 'terreno' ? base.origem.z : -comprimento / 2
  const passo =
    encaixe.grade * Math.max(1, Math.ceil(Math.max(largura, comprimento) / encaixe.grade / 128))
  const segmentos = base.tipo === 'terreno' && !encaixe.andar ? 64 : 1
  const altura = (x: number, z: number) =>
    encaixe.andar
      ? encaixe.origem.y + encaixe.andar.nivel * encaixe.andar.altura
      : alturaDoChao(base, x, z, fonte)
  const linha = (x: number, z: number, dx: number, dz: number) => {
    for (let i = 0; i < segmentos; i++) {
      const a = { x: x + (dx * i) / segmentos, z: z + (dz * i) / segmentos },
        b = { x: x + (dx * (i + 1)) / segmentos, z: z + (dz * (i + 1)) / segmentos }
      pontos.push(a.x, altura(a.x, a.z) + 0.015, a.z, b.x, altura(b.x, b.z) + 0.015, b.z)
    }
  }
  const inicioX = encaixe.origem.x + Math.ceil((minX - encaixe.origem.x) / passo) * passo
  const inicioZ = encaixe.origem.z + Math.ceil((minZ - encaixe.origem.z) / passo) * passo
  for (let i = 0, x = inicioX; i <= 128 && x <= minX + largura + 1e-8; i++, x = inicioX + i * passo)
    linha(x, minZ, 0, comprimento)
  for (
    let i = 0, z = inicioZ;
    i <= 128 && z <= minZ + comprimento + 1e-8;
    i++, z = inicioZ + i * passo
  )
    linha(minX, z, largura, 0)
  g.setAttribute('position', new Float32BufferAttribute(pontos, 3))
  return g
}
