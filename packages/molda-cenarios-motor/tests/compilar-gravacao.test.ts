import { expect, test } from 'bun:test'
import { BoxGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three'
import { ArquivosDaCompilacao } from '../src/compilar/arquivos'
import { gravarGlbCompilado } from '../src/compilar/arquivos-glb'

test('gravação não descarta silenciosamente um canal de morph sem suporte', async () => {
  const g = new BoxGeometry(),
    material = new MeshStandardMaterial(),
    raiz = new Group(),
    sinal = new AbortController().signal,
    arquivos = new ArquivosDaCompilacao(sinal)
  g.morphAttributes.color = [
    new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 3), 3),
  ]
  raiz.add(new Mesh(g, material))
  try {
    await expect(
      gravarGlbCompilado(raiz, 'modelos/a.glb', 'modelo', arquivos, sinal),
    ).rejects.toThrow(/morph/)
    expect(arquivos.arquivos.size).toBe(0)
  } finally {
    arquivos.descartar()
    g.dispose()
    material.dispose()
  }
})
