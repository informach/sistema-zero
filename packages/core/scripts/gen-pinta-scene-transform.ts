import { sceneArtFrame, transformSceneSetObject } from '../src/studio/pinta-scene-runtime'

// Capturar a função ANTES do bundler: a minificação pode introduzir templates e
// renomear símbolos. O texto portátil deve ser estável em dev e produção.
const file = new URL('../src/studio/pinta-scene-transform.generated.ts', import.meta.url)
const source = new Bun.Transpiler({
  loader: 'js',
  minifyWhitespace: true,
  minifySyntax: false,
  minifyIdentifiers: false,
})
  .transformSync(
    `var transformSceneSetObject=(${transformSceneSetObject.toString()});var sceneArtFrame=(${sceneArtFrame.toString()});`,
  )
  .trim()
if (source.includes('`')) throw new Error('O compositor portátil exige fonte sem templates.')
if (process.argv.includes('--check')) {
  const saved = await import(file.href)
  if (saved.sceneObjectTransformSource !== source) {
    console.error('Rode bun packages/core/scripts/gen-pinta-scene-transform.ts')
    process.exit(1)
  }
} else {
  await Bun.write(
    file,
    `// Gerado por scripts/gen-pinta-scene-transform.ts. Não editar.\nexport const sceneObjectTransformSource = ${JSON.stringify(source)}\n`,
  )
}
