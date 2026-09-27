// Guarda de vocabulário (decisão de 2026-09-22): a **Carreira do Criador** virou
// **Jornada do Criador**. O item do menu chama **Jornada**, o título de `/cursos` é
// **Cursos da Jornada do Criador** e o `/perfil` diz **Minha jornada**.
//
// Esta guarda varre o `src/` inteiro — copy E comentário. É de propósito: o motivo da
// troca foi o app falar duas línguas ao mesmo tempo ("Minha carreira" logo acima de
// "Sua jornada de criador"), e comentário que ensina o vocabulário velho é como a
// segunda língua volta. Não há allowlist aqui: no kids não existe uso legítimo da
// palavra no sentido profissional (esse vive só no texto jurídico do funil).
//
// ⚠️ O que esta guarda NÃO cobre, de propósito: o campo de rede `careerSlot`, o
// `careerLock` e o valor `'career-locked'`, que são contrato com o members e seguem
// em inglês. Por isso a régua é a palavra PORTUGUESA.

import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = join(import.meta.dir, '..', 'src')
const EXTENSOES = ['.ts', '.tsx', '.css']

function arquivos(dir: string): string[] {
  const saida: string[] = []
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) {
      saida.push(...arquivos(caminho))
      continue
    }
    if (EXTENSOES.some((ext) => nome.endsWith(ext))) saida.push(caminho)
  }
  return saida
}

describe('copy do kids — a palavra é jornada, não carreira', () => {
  const todos = arquivos(SRC)

  test('nenhum arquivo do app diz "carreira"', () => {
    const culpados = todos
      .filter((caminho) => /carreira/i.test(readFileSync(caminho, 'utf8')))
      .map((caminho) => relative(SRC, caminho).replaceAll('\\', '/'))

    expect(culpados).toEqual([])
  })

  // Anti-vácuo: um walker quebrado deixaria a guarda verde lendo zero arquivo.
  test('a guarda está de fato lendo o app', () => {
    expect(todos.length).toBeGreaterThan(100)
    const nav = todos.find(
      (caminho) => relative(SRC, caminho).replaceAll('\\', '/') === 'components/kids/nav.ts',
    )
    expect(nav).toBeTruthy()
    expect(readFileSync(nav as string, 'utf8')).toContain("label: 'Jornada'")
  })
})
