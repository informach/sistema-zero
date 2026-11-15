import type { Interpolant, TypedArray } from 'three'

declare module 'three' {
  interface KeyframeTrack {
    /**
     * Three assigns this factory in setInterpolation; GLTFLoader overrides it for
     * CUBICSPLINE tracks. @types/three 0.184.1 omits the runtime method. Keep the
     * track's own factory so quaternion and custom glTF interpolation are preserved.
     */
    createInterpolant(result?: TypedArray): Interpolant
  }
}
