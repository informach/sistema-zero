import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const target = process.argv[2]
if (!target) throw Error('Informe a pasta public do aplicativo.')
for (const [name, path] of [
  ['celebracao.mp3', 'sounds/celebracao.mp3'],
  ['coin.webp', 'zappy/coin.webp'],
]) {
  const source = fileURLToPath(new URL(`../assets/lesson/${name}`, import.meta.url))
  const destination = resolve(target, path)
  await mkdir(resolve(destination, '..'), { recursive: true })
  await copyFile(source, destination)
  if (!(await readFile(source)).equals(await readFile(destination)))
    throw Error('Recurso de aula divergente.')
}
