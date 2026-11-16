import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'

/** Separa a pintura das tábuas e dos pilares por faces; mantém geometria, UV e o atlas fonte. */
export async function prepararPonteFaisca(fonte: Buffer): Promise<Buffer> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
    doc = await io.readBinary(fonte)
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of [...mesh.listPrimitives()]) {
      const mat = prim.getMaterial(),
        pos = prim.getAttribute('POSITION'),
        ind = prim.getIndices()
      if (!mat || !pos || !ind || !['cor', 'cor_2'].includes(mat.getName())) continue
      const grupos = { original: [] as number[], madeira: [] as number[], pedra: [] as number[] }
      for (let i = 0; i < ind.getCount(); i += 3) {
        const ids = [ind.getScalar(i), ind.getScalar(i + 1), ind.getScalar(i + 2)],
          vs = ids.map((n) => pos.getElement(n, [])),
          x = Math.abs(vs.reduce((s, v) => s + v[0]!, 0) / 3),
          y = vs.reduce((s, v) => s + v[1]!, 0) / 3,
          z = Math.abs(vs.reduce((s, v) => s + v[2]!, 0) / 3)
        const tipo =
          mat.getName() === 'cor'
            ? 'pedra'
            : z < 1.08 && ((x < 3.6 && y > 0.9) || (x > 4.36 && y < 1.02))
              ? 'madeira'
              : 'original'
        grupos[tipo].push(...ids)
      }
      for (const [nome, indices] of Object.entries(grupos)) {
        if (!indices.length) continue
        const copia = prim
          .clone()
          .setIndices(
            doc
              .createAccessor()
              .setType('SCALAR')
              .setArray(new Uint32Array(indices))
              .setBuffer(ind.getBuffer()),
          )
        if (nome !== 'original')
          copia.setMaterial(
            mat
              .clone()
              .setName(nome === 'madeira' ? 'faisca_madeira_violeta' : 'faisca_pedra_natural'),
          )
        mesh.addPrimitive(copia)
      }
      mesh.removePrimitive(prim)
      prim.dispose()
    }
  return Buffer.from(await io.writeBinary(doc))
}
