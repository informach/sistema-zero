import { describe, expect, it } from 'bun:test'
import { coreImportsForCode, THREE_CDN, withCoreImports } from '../coreImports'

/**
 * O import automático do three.js (Canvas 3D) é LAZY: entra só quando o código
 * gerado importa `three`. Um projeto 2D (sem esse import) não recebe importmap
 * nenhum — nada de custo de rede/perf.
 */

describe('coreImportsForCode — lazy por detecção no código', () => {
  it('código que importa three → { three: CDN pinado }', () => {
    expect(
      coreImportsForCode("import * as THREE from 'three';\nconst s = new THREE.Scene();"),
    ).toEqual({
      three: THREE_CDN,
    })
    // aspas duplas também
    expect(coreImportsForCode('import * as T from "three";')).toEqual({ three: THREE_CDN })
  })

  it('código SEM three (projeto 2D) → {} (nenhum importmap, sem custo)', () => {
    expect(coreImportsForCode('const ctx = canvas.getContext("2d");')).toEqual({})
    expect(coreImportsForCode('')).toEqual({})
    expect(coreImportsForCode(undefined)).toEqual({})
  })

  it('NÃO casa addons (three/addons/…) — isso é Fase 2', () => {
    expect(
      coreImportsForCode("import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';"),
    ).toEqual({})
  })

  it('withCoreImports funde com os das extensões, e devolve o MESMO objeto no caso 2D', () => {
    const ext = { html2canvas: 'https://esm.sh/html2canvas' }
    // 2D: mesmo objeto (sem alocar)
    expect(withCoreImports(ext, 'const x = 1;')).toBe(ext)
    // 3D: funde three sem perder os da extensão
    const merged = withCoreImports(ext, "import * as THREE from 'three';")
    expect(merged).toEqual({ html2canvas: 'https://esm.sh/html2canvas', three: THREE_CDN })
    expect(merged).not.toBe(ext)
  })
})
