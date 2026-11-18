/**
 * Confere o pacote Tiled gravado em disco: cada `mapas/mapa-N/mapa.json` e `mapa.tmx` (com as
 * folhas `.tsx` e as imagens ao lado) volta pelo importador e tem que dar a mesma cena que o
 * `maps.json` do pacote guarda. Sai com erro quando alguma coisa difere.
 *
 *   bun scripts/homologacao/verify-tiled.ts                gera o pacote numa pasta temporária
 *   bun scripts/homologacao/verify-tiled.ts <pasta>        confere um pacote já gravado
 *   bun scripts/homologacao/verify-tiled.ts <arquivo>      importa um mapa avulso (por exemplo
 *                                                          um JSON exportado pelo Tiled) e mostra o resumo
 *
 * Este script NÃO executa o programa Tiled. Ele só usa o importador do Pinta.
 */
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { importTiledScene, tiledXmlToJson } from '../../src/export/tiled/import'
import { sceneToNative } from '../../src/export/tiled/native'

const dataUrl = async (path: string) =>
  `data:image/png;base64,${(await readFile(path)).toString('base64')}`
const resolverAt = (folder: string) => ({
  text: (p: string) => readFile(resolve(folder, p), 'utf8'),
  image: (p: string) => dataUrl(resolve(folder, p)),
})
async function importFile(path: string) {
  const text = await readFile(path, 'utf8')
  return importTiledScene(
    path.endsWith('.tmx') ? tiledXmlToJson(text) : JSON.parse(text),
    resolverAt(dirname(path)),
  )
}
const decode = async (url: string) => {
  const im = await loadImage(url),
    c = createCanvas(im.width, im.height),
    ctx = c.getContext('2d')
  ctx.drawImage(im, 0, 0)
  return { width: c.width, height: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data }
}

/** Os problemas do pacote em `folder` (lista vazia = tudo confere). */
export async function verifyTiledPackage(folder: string): Promise<string[]> {
  const problems: string[] = []
  const scenes = Object.values(
    JSON.parse(await readFile(join(folder, 'maps.json'), 'utf8')) as Record<string, PintaScene>,
  )
  if (!scenes.length) problems.push('O pacote não tem mapas em maps.json.')
  for (const [index, saved] of scenes.entries()) {
    // No maps.json as imagens são caminhos do pacote; o importador devolve o conteúdo delas.
    const expected: PintaScene = {
      ...saved,
      tilesets: await Promise.all(
        saved.tilesets.map(async (t) => ({ ...t, image: await dataUrl(join(folder, t.image)) })),
      ),
      ...(saved.art
        ? {
            art: await Promise.all(
              saved.art.map(async (a) => ({ ...a, image: await dataUrl(join(folder, a.image)) })),
            ),
          }
        : {}),
    }
    for (const file of ['mapa.json', 'mapa.tmx']) {
      const path = join(folder, `mapas/mapa-${index}`, file),
        where = `mapas/mapa-${index}/${file}`
      try {
        const result = await importFile(path)
        if (result.warnings.length)
          problems.push(`${where}: avisos inesperados: ${result.warnings.join(' | ')}`)
        if (!Bun.deepEquals(result.scene, expected))
          problems.push(`${where}: a cena importada difere da cena de ${saved.name} em maps.json.`)
        const native = await sceneToNative(result.scene, decode)
        if (native.warnings.length)
          problems.push(`${where}: avisos na conversão: ${native.warnings.join(' | ')}`)
      } catch (e) {
        problems.push(`${where}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
  return problems
}

if (import.meta.main) {
  GlobalRegistrator.register()
  const given = process.argv[2] ? resolve(process.argv[2]) : null
  if (given && (await stat(given)).isFile()) {
    const result = await importFile(given),
      converted = await sceneToNative(result.scene, decode)
    console.log(
      JSON.stringify({
        layers: result.scene.layers.length,
        terrains: result.scene.tilesets[0]?.terrains?.map((t) => t.id),
        objects: result.scene.layers.flatMap((l) => (l.kind === 'objects' ? l.objects : [])).length,
        sets: result.scene.sets?.length,
        warnings: result.warnings,
        nativeWarnings: converted.warnings,
        assets: converted.assets.length,
      }),
    )
  } else {
    const temp = given ? null : await mkdtemp(join(tmpdir(), 'pinta-tiled-'))
    try {
      if (temp) await (await import('./generate')).generateHomologation(temp)
      const problems = await verifyTiledPackage(given ?? join(temp!, 'tiled'))
      if (problems.length) {
        console.error(problems.join('\n'))
        process.exitCode = 1
      } else
        console.log('Tiled: JSON e TMX de todos os mapas do pacote voltam iguais pelo importador.')
    } finally {
      if (temp) await rm(temp, { recursive: true, force: true })
    }
  }
}
