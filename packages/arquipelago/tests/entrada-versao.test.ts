import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  VERSAO_CONTRATO_PLATAFORMA,
  VERSOES_COMPATIVEIS_DA_PLATAFORMA,
} from '@sistemazero/arquipelago-contracts'
import { conferirContrato, versaoContrato } from '../src/contrato-da-entrada'

// A conferência mora fora de `entrada.tsx`: importar a entrada carrega o jogo inteiro, que pede os
// modelos ao ser importado, e no Bun o carregador do three quebra sem `ProgressEvent` (o arquivo
// ficava com 0 testes e 11 erros soltos).

test('a entrada aceita o contrato atual e o anterior e recusa os outros (A35)', () => {
  expect(versaoContrato).toBe(VERSAO_CONTRATO_PLATAFORMA)
  expect(VERSOES_COMPATIVEIS_DA_PLATAFORMA).toContain(VERSAO_CONTRATO_PLATAFORMA)
  for (const versao of VERSOES_COMPATIVEIS_DA_PLATAFORMA) {
    expect(() => conferirContrato({ versaoContrato: versao })).not.toThrow()
  }
  expect(() => conferirContrato({ versaoContrato: VERSAO_CONTRATO_PLATAFORMA + 1 })).toThrow(
    'Contrato da plataforma',
  )
  expect(() => conferirContrato({ versaoContrato: 0 })).toThrow('Contrato da plataforma')
})

test('a entrada confere o contrato antes de tocar no elemento', () => {
  const fonte = readFileSync(path.join(import.meta.dir, '..', 'src', 'entrada.tsx'), 'utf8')
  const corpo = fonte.slice(fonte.indexOf('export const montarArquipelago'))
  const conferir = corpo.indexOf('conferirContrato(plataforma)')
  expect(conferir).toBeGreaterThan(0)
  for (const toque of ['document.createElement', 'elemento.append', 'createRoot(']) {
    expect(corpo.indexOf(toque)).toBeGreaterThan(conferir)
  }
  expect(fonte).toContain("export { versaoContrato } from './contrato-da-entrada'")
})
