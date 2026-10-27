import { readFile } from 'node:fs/promises'
import { buildPrototype } from '../farol-antes-depois/build'

await buildPrototype({
  directory: import.meta.dirname,
  title: 'Cadê Todo Mundo · Exploração antes e depois',
  filename: 'cade-todo-mundo-exploracao-antes-depois.html',
  baseStyles: await readFile(new URL('../farol-antes-depois/styles.css', import.meta.url), 'utf8'),
})
