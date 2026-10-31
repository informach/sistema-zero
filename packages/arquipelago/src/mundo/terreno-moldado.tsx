import type { Terreno } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo } from 'react'
import { type BufferAttribute, type BufferGeometry, type Mesh, type Object3D, Vector3 } from 'three'
import { type FonteDoTerreno, lojaDaConstrucao } from '../estado/construcao'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaObraEstendida, useObraEstendida } from '../estado/obra-estendida'
import { loteDaCasa } from '../sistemas/construcao/lote'
import { alturaDoCanto, celulasPlanas, podeMoldarOTerreno } from '../sistemas/construcao/terreno'

/** A altura (em metros, acima do chão de sempre) de um canto inteiro da grade da sua ilha. */
export type AlturaDoCanto = (x: number, z: number) => number

/**
 * O terreno moldado do lote da casa (E04, "Nuvens: moldar o terreno"), lido do documento à parte
 * do serviço. `null` quando não há nada moldado (e na visita: o documento não viaja com ela).
 */
export function useAlturaDoTerreno(): AlturaDoCanto | null {
  const { loja, plataforma } = useJogo()
  const extensa = lojaDaObraEstendida(loja, plataforma)
  const terreno = useObraEstendida(extensa, (s) => s.obra?.terreno ?? null)
  const visita = useEstado((s) => s.visita !== null)
  const obra = useEstado((s) => s.salvamento.construcao.casa)
  const jornada = useEstado((s) => s.jornada)
  return useMemo(() => {
    if (visita || !terreno || terreno.alturas.length === 0) return null
    const lote = loteDaCasa(jornada)
    const planas = celulasPlanas(obra, lote)
    return (x: number, z: number) => alturaDoCanto(terreno, lote, planas, x, z)
  }, [terreno, visita, obra, jornada])
}

/**
 * Liga o terreno ao Construir: a fonte que a loja do Construir lê e grava, e a primeira leitura
 * do documento (só depois das Nuvens, quando o Terreno aparece na barra).
 */
export function TerrenoMoldado() {
  const { loja, plataforma } = useJogo()
  const extensa = lojaDaObraEstendida(loja, plataforma)
  const pode = useEstado((s) => podeMoldarOTerreno(s.jornada) && s.visita === null)
  useEffect(() => {
    if (!pode) return
    if (extensa.getState().situacao !== 'pronta') void extensa.getState().carregar()
    const fonte: FonteDoTerreno = {
      ler: () => extensa.getState().obra?.terreno ?? null,
      gravar: (terreno: Terreno | null) => extensa.getState().mudar((o) => ({ ...o, terreno })),
    }
    const construcao = lojaDaConstrucao(loja)
    construcao.getState().registrarTerreno(fonte)
    return () => {
      if (construcao.getState().fonteDoTerreno === fonte)
        construcao.getState().registrarTerreno(null)
    }
  }, [pode, extensa, loja])
  return null
}

/**
 * Sobe os vértices das malhas de `no` (o `chao-do-lote` do `terreno.glb`, grade de 1 m) pela
 * altura de cada canto. Guarda a altura original no primeiro uso, para voltar ao plano.
 */
export function moldarMalhas(no: Object3D, altura: AlturaDoCanto | null): void {
  no.updateWorldMatrix(true, true)
  const p = new Vector3()
  no.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const g = m.geometry as BufferGeometry
    const pos = g.getAttribute('position') as BufferAttribute
    let original = g.userData.alturaOriginal as Float32Array | undefined
    if (!original) {
      original = new Float32Array(pos.count)
      for (let i = 0; i < pos.count; i++) original[i] = pos.getY(i)
      g.userData.alturaOriginal = original
    }
    // A malha não gira nem escala no arquivo: a altura no mundo soma direto no y local.
    for (let i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), original[i] ?? 0, pos.getZ(i)).applyMatrix4(m.matrixWorld)
      const h = altura ? altura(Math.round(p.x), Math.round(p.z)) : 0
      pos.setY(i, (original[i] ?? 0) + h)
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    g.computeBoundingSphere()
    g.computeBoundingBox()
  })
}

/** A malha do chão de antes (a da colisão), com os cantos do lote subidos; copia as posições. */
export function verticesMoldados(
  geometria: BufferGeometry,
  altura: AlturaDoCanto | null,
): Float32Array {
  const pos = geometria.attributes.position as BufferAttribute
  const vertices = new Float32Array(pos.array)
  if (!altura) return vertices
  for (let i = 0; i < pos.count; i++) {
    const x = Math.round(vertices[i * 3] ?? 0)
    const z = Math.round(vertices[i * 3 + 2] ?? 0)
    vertices[i * 3 + 1] = (vertices[i * 3 + 1] ?? 0) + altura(x, z)
  }
  return vertices
}
