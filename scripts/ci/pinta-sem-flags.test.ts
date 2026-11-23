import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Glob } from 'bun'

// Decisão da dona (23/11/2026): "Não precisa ter flag de nada." A nuvem causal do Pinta, as paletas
// negociadas e o gravador selado do Estúdio valem para todo perfil, sem variável de ambiente nem
// lista de perfis. Esta guarda impede que alguma delas volte a ser lida pelo código ou pelo build.
// O que é capacidade ainda não pronta (o nativo 9 / nuvem 8) é constante no código, não variável.
const removed = [
  'NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1',
  'PINTA_CAUSAL_CANDIDATE',
  'PINTA_PALETTE_WRITE_CANDIDATE',
  'PINTA_CAUSAL_QA_PROFILES',
  'PINTA_WORKSHOP_SERVICE_READER',
  'STUDIO_SEALED_PARTS_CANDIDATE',
  'STUDIO_SEALED_QA_PROFILES',
]
const root = fileURLToPath(new URL('../../', import.meta.url))
const scanned = [
  'packages/{members,member-shell,community,community-kids,pinta,core,studio,api-gateway}/src/**/*.{ts,tsx,mjs}',
  'packages/*/Dockerfile',
  '.github/workflows/*.yml',
]

test('nenhuma flag da missão Pinta Cenários volta ao código, ao build ou ao CI', () => {
  const offenders: string[] = []
  let files = 0
  for (const pattern of scanned)
    for (const file of new Glob(pattern).scanSync({ cwd: root })) {
      files += 1
      const text = readFileSync(`${root}${file}`, 'utf8')
      for (const name of removed) if (text.includes(name)) offenders.push(`${file}: ${name}`)
    }
  expect(files).toBeGreaterThan(1000)
  expect(offenders).toEqual([])
})
