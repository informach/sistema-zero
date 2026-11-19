import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/** Installed pinned vendors, real renderer; the subclass only records public counters. */
export async function prepararVendors(pasta: string) {
  const vendors = {
    three:
      'export * from "three"; import { WebGLRenderer as RealRenderer } from "three"; export class WebGLRenderer extends RealRenderer { constructor(...args) { super(...args); (globalThis.__qaRenderers ??= []).push(this); } }',
    GLTFLoader: 'export { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";',
    HDRLoader: 'export { HDRLoader } from "three/addons/loaders/HDRLoader.js";',
    SkeletonUtils: 'export * from "three/addons/utils/SkeletonUtils.js";',
  }
  for (const [nome, texto] of Object.entries(vendors)) {
    const entrada = resolve(pasta, `${nome}.entry.js`)
    await writeFile(entrada, texto)
    const resultado = await Bun.build({
      entrypoints: [entrada],
      target: 'browser',
      format: 'esm',
      minify: true,
      external: nome === 'three' ? [] : ['three'],
      plugins: [
        {
          name: 'installed-vendor',
          setup(build) {
            build.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) =>
              nome !== 'three' && path === 'three'
                ? { path, external: true }
                : { path: Bun.resolveSync(path, resolve(import.meta.dirname, '../..')) },
            )
          },
        },
      ],
    })
    if (!resultado.success || resultado.outputs.length !== 1)
      throw new AggregateError(resultado.logs, 'Falha ao preparar o vendor do ensaio')
    await writeFile(resolve(pasta, `${nome}.js`), await resultado.outputs[0]!.text())
  }
}
