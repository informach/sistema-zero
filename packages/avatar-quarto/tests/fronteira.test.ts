import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pkg from '../package.json'

/**
 * O pacote é dividido pela plataforma e pelo Arquipélago Vagalume. Ele só pode depender de
 * three e do React Three Fiber: importar a plataforma (member-shell, apps) ou o jogo daqui
 * faria uma mudança de um lado quebrar o outro.
 */
const PERMITIDOS = ['react', 'three', '@react-three/fiber', '@react-three/drei']

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? arquivos(join(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  )
}

describe('avatar-quarto', () => {
  const src = join(import.meta.dir, '..', 'src')

  test('só importa three, React Three Fiber e o próprio pacote', () => {
    const fora: string[] = []
    for (const f of arquivos(src)) {
      for (const m of readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)) {
        const alvo = m[1] ?? ''
        if (alvo.startsWith('.')) continue
        if (!PERMITIDOS.some((p) => alvo === p || alvo.startsWith(`${p}/`)))
          fora.push(`${f}: ${alvo}`)
      }
    }
    expect(fora).toEqual([])
  })

  test('todo arquivo de src tem uma entrada no exports', () => {
    const exportados = new Set(Object.values(pkg.exports))
    const faltando = arquivos(src)
      .map((f) => `./${f.slice(src.length - 3)}`)
      .filter((f) => !exportados.has(f))
    expect(faltando).toEqual([])
  })
})
