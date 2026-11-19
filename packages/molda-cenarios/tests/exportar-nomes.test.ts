import { expect, test } from 'bun:test'
import { nomeDoArquivoExportado } from '../src/exportar/nomes'

test('download não usa caminhos, controles, extensão fornecida ou nome reservado do cenário', () => {
  for (const nome of [
    '../Praça\n<arquivo>.html',
    'CON',
    '...',
    '\\servidor\\pasta/ilha',
    'Ilha\u0000🌿',
  ]) {
    const arquivo = nomeDoArquivoExportado(nome, 12, 'glb')
    expect(arquivo).toMatch(/^cenario-[a-zA-Z0-9_-]+-r12\.glb$/)
    expect(arquivo).not.toContain('..')
  }
  expect(nomeDoArquivoExportado('Faísca', 2, 'three')).toBe('cenario-Faisca-r2.zip')
  expect(nomeDoArquivoExportado('Á'.repeat(120), 1, 'glb').length).toBeLessThan(85)
})
