import { expect, test } from 'bun:test'
import { avaliarOrcamentoDaCena } from '../src/compilar/orcamento'

const MB = 1024 * 1024
test('Estúdio mede malhas reais e os limites por modelo/projeto sem confundi-los com objetos', () => {
  const entrada = {
      malhas: 48,
      arquivos: [
        { caminho: 'modelos/a.glb', bytes: 5 * MB, tipo: 'modelo' as const },
        { caminho: 'terreno/mapa.bin', bytes: 19 * MB, tipo: 'recurso' as const },
      ],
    },
    ok = avaliarOrcamentoDaCena(entrada, 'studio')
  expect(ok.permitido).toBe(true)
  expect(ok.bytes).toBe(24 * MB)
  expect(
    avaliarOrcamentoDaCena({ ...entrada, malhas: 49 }, 'studio').excessos.map((e) => e.tipo),
  ).toEqual(['malhas'])
  expect(avaliarOrcamentoDaCena({ ...entrada, malhas: 49 }, 'studio').sugerirJuncao).toBe(true)
  const excedido = avaliarOrcamentoDaCena(
    { malhas: 49, arquivos: [{ caminho: 'modelos/a.glb', bytes: 25 * MB, tipo: 'modelo' }] },
    'studio',
  )
  expect(excedido.permitido).toBe(false)
  expect(excedido.excessos.map((e) => e.tipo).sort()).toEqual(['malhas', 'modelo', 'projeto'])
})
test('recursos existentes do projeto são somados antes de oferecer uma importação', () => {
  const r = avaliarOrcamentoDaCena(
    {
      malhas: 3,
      malhasExistentes: 46,
      bytesExistentes: 23 * MB,
      arquivos: [{ caminho: 'modelos/novo.glb', bytes: 2 * MB, tipo: 'modelo' }],
    },
    'studio',
  )
  expect(r.malhas).toBe(49)
  expect(r.bytes).toBe(25 * MB)
  expect(r.excessos.map((e) => e.tipo).sort()).toEqual(['malhas', 'projeto'])
})
test('exceder o Estúdio não bloqueia um pacote externo dentro de seu orçamento', () => {
  const entrada = {
    malhas: 80,
    arquivos: [{ caminho: 'modelos/a.glb', bytes: 6 * MB, tipo: 'modelo' as const }],
  }
  expect(avaliarOrcamentoDaCena(entrada, 'studio').permitido).toBe(false)
  for (const destino of ['three', 'glb', 'raylib', 'arquipelago'] as const)
    expect(avaliarOrcamentoDaCena(entrada, destino).permitido).toBe(true)
})
test('fontes inválidas e caminhos repetidos não viram medidas enganosas', () => {
  for (const n of [-1, NaN, Infinity, 1.5]) {
    expect(() => avaliarOrcamentoDaCena({ malhas: n, arquivos: [] }, 'studio')).toThrow()
    expect(() =>
      avaliarOrcamentoDaCena(
        { malhas: 1, arquivos: [{ caminho: 'a.glb', bytes: n, tipo: 'modelo' }] },
        'studio',
      ),
    ).toThrow()
  }
  expect(() =>
    avaliarOrcamentoDaCena(
      {
        malhas: 1,
        arquivos: [
          { caminho: 'a.glb', bytes: 3, tipo: 'modelo' },
          { caminho: 'a.glb', bytes: 3, tipo: 'modelo' },
        ],
      },
      'studio',
    ),
  ).toThrow(/repetid/i)
  for (const caminho of [
    '../a.glb',
    'C:/a.glb',
    '/a.glb',
    'x/../a.glb',
    'https://x/a.glb',
    'modelos/CON.glb',
    'a//b.glb',
    'modelos/a.',
  ])
    expect(() =>
      avaliarOrcamentoDaCena(
        { malhas: 1, arquivos: [{ caminho, bytes: 3, tipo: 'modelo' }] },
        'studio',
      ),
    ).toThrow(/caminho|arquivo/i)
})
