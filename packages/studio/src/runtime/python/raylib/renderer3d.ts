/**
 * The 3D half of the Raylib renderer (the Raylib 3D extension): camera, meshes, models and
 * shaders. The 2D renderer hands over every opcode from 60 on.
 */
export interface Raylib3DHost {
  setProjection(matrix: Float32Array): void
  setView(matrix: Float32Array): void
  restore2D(): void
  size(): readonly [number, number]
  vertex(x: number, y: number, u: number, v: number, color: number, z?: number): void
  begin(mode: 0 | 1, texture?: number, vertices?: number): void
}

export interface Raylib3D {
  /** Runs one 3D opcode whose arguments start at `at`; returns where the next record starts. */
  op(op: number, list: Float64Array, at: number, host: Raylib3DHost): number
  /** Uploads the models and meshes the module registered this frame. */
  load(models: readonly unknown[], attachments: ReadonlyMap<number, Uint8Array<ArrayBuffer>>): void
  dispose(): void
}

export function createRaylib3D(
  _gl: WebGL2RenderingContext,
  _shared: { flush(): void; textures(id: number): WebGLTexture | undefined },
): Raylib3D {
  return {
    op() {
      throw new Error('O desenho 3D é da extensão Raylib 3D.')
    },
    load() {
      throw new Error('Os modelos 3D são da extensão Raylib 3D.')
    },
    dispose() {},
  }
}
