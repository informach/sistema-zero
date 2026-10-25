import * as RealTHREE from 'three'

/**
 * THREE CONTADOR para as travas de desempenho dos três runtimes 3D (lote 14 do review 3D).
 *
 * Embrulha um namespace THREE (o do harness de cada extensão, com o WebGLRenderer falso) e troca
 * as classes de matemática por SUBCLASSES que contam construções (`clone()` também conta: ele
 * chama `new this.constructor()`). As alocações INTERNAS do three não entram (os módulos dele
 * usam as classes originais): o que se mede é o que o RUNTIME pede por quadro.
 *
 * Espiões:
 * - `Scene.updateMatrixWorld`: cada chamada, com o `force` recebido (o renderer de verdade chama
 *   uma vez por `render`; o runtime não deve somar mais de uma por quadro);
 * - `Raycaster.intersectObjects`/`intersectObject`: o tamanho de cada lista consultada.
 */
export interface ThreeCounts {
  Vector3: number
  Vector2: number
  Box3: number
  Matrix4: number
  Quaternion: number
  Raycaster: number
  Sphere: number
  sceneUpdateMatrixWorld: number
  sceneUpdateMatrixWorldForced: number
  intersectLists: number[]
}

export function emptyCounts(): ThreeCounts {
  return {
    Vector3: 0,
    Vector2: 0,
    Box3: 0,
    Matrix4: 0,
    Quaternion: 0,
    Raycaster: 0,
    Sphere: 0,
    sceneUpdateMatrixWorld: 0,
    sceneUpdateMatrixWorldForced: 0,
    intersectLists: [],
  }
}

/** Soma das construções de matemática (o que as travas exigem que seja zero no laço). */
export function mathAllocations(c: ThreeCounts): number {
  return c.Vector3 + c.Vector2 + c.Box3 + c.Matrix4 + c.Quaternion + c.Raycaster + c.Sphere
}

export function makeCountingThree<T extends Record<string, unknown>>(base: T) {
  const counts = emptyCounts()
  let armed = true
  const bump = (key: keyof Omit<ThreeCounts, 'intersectLists'>) => {
    if (armed) counts[key] += 1
  }

  class Vector3 extends RealTHREE.Vector3 {
    constructor(x?: number, y?: number, z?: number) {
      super(x, y, z)
      bump('Vector3')
    }
  }
  class Vector2 extends RealTHREE.Vector2 {
    constructor(x?: number, y?: number) {
      super(x, y)
      bump('Vector2')
    }
  }
  class Box3 extends RealTHREE.Box3 {
    constructor(min?: RealTHREE.Vector3, max?: RealTHREE.Vector3) {
      super(min, max)
      bump('Box3')
    }
  }
  class Matrix4 extends RealTHREE.Matrix4 {
    constructor(...args: ConstructorParameters<typeof RealTHREE.Matrix4>) {
      super(...args)
      bump('Matrix4')
    }
  }
  class Quaternion extends RealTHREE.Quaternion {
    constructor(x?: number, y?: number, z?: number, w?: number) {
      super(x, y, z, w)
      bump('Quaternion')
    }
  }
  class Sphere extends RealTHREE.Sphere {
    constructor(center?: RealTHREE.Vector3, radius?: number) {
      super(center, radius)
      bump('Sphere')
    }
  }
  class Raycaster extends RealTHREE.Raycaster {
    constructor(...args: ConstructorParameters<typeof RealTHREE.Raycaster>) {
      super(...args)
      bump('Raycaster')
    }
    override intersectObjects<O extends RealTHREE.Object3D>(
      objects: RealTHREE.Object3D[],
      recursive?: boolean,
      target?: RealTHREE.Intersection<O>[],
    ): RealTHREE.Intersection<O>[] {
      if (armed) counts.intersectLists.push(objects.length)
      return super.intersectObjects(objects, recursive, target)
    }
    override intersectObject<O extends RealTHREE.Object3D>(
      object: RealTHREE.Object3D,
      recursive?: boolean,
      target?: RealTHREE.Intersection<O>[],
    ): RealTHREE.Intersection<O>[] {
      if (armed) counts.intersectLists.push(1)
      return super.intersectObject(object, recursive, target)
    }
  }
  class Scene extends RealTHREE.Scene {
    override updateMatrixWorld(force?: boolean): void {
      if (armed) {
        counts.sceneUpdateMatrixWorld += 1
        if (force) counts.sceneUpdateMatrixWorldForced += 1
      }
      super.updateMatrixWorld(force)
    }
  }

  const THREE = {
    ...base,
    Vector3,
    Vector2,
    Box3,
    Matrix4,
    Quaternion,
    Sphere,
    Raycaster,
    Scene,
  }
  return {
    THREE,
    counts,
    /** Zera os contadores (fim do aquecimento). */
    reset() {
      Object.assign(counts, emptyCounts())
    },
    /** Liga/desliga a contagem (o harness pode desligar o que é do próprio teste). */
    arm(on: boolean) {
      armed = on
    },
  }
}
