import { expect, test } from 'bun:test'
import {
  type CenaParaStudio,
  CenaParaStudioSchema,
  lerCenaParaStudio,
  MAX_BYTES_DA_CENA_PARA_STUDIO,
} from '../src/compilar/studio'

function documento(): CenaParaStudio {
  return {
    formato: 'studio-cena3d',
    versao: 1,
    cena: {
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Praça',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { cenario: 'praca', revisao: 3, digest: 'a'.repeat(64) },
      arquivos: [
        {
          caminho: 'imagens/a.png',
          digest: 'b'.repeat(64),
          bytes: 32,
          mime: 'image/png',
          papel: 'textura',
          largura: 1,
          altura: 1,
        },
      ],
      entidades: [],
      nos: [],
      colisoes: [],
      aguas: [],
      caminhos: [],
      marcadores: [],
      texturas: [],
      fontes: { modelos: [], texturas: [], conjuntos: [] },
      licencas: [],
      ambiente: { hora: 12 },
    },
    recursos: [{ caminho: 'imagens/a.png', asset: 'id legado: Árvore 1' }],
  }
}

test('envelope preserva IDs opacos, procedência e bytes do documento original', () => {
  const d = documento(),
    antes = JSON.stringify(d)
  expect(lerCenaParaStudio(antes)).toEqual(d)
  expect(CenaParaStudioSchema.parse(d)).toEqual(d)
  expect(JSON.stringify(d)).toBe(antes)
})

test('recursos cobrem exatamente o inventário; não aceitam falta, repetição ou caminhos extras', () => {
  const d = documento()
  for (const recursos of [
    [],
    [...d.recursos, ...d.recursos],
    [{ caminho: 'imagens/falta.png', asset: 'x' }],
    [...d.recursos, { caminho: '../a.png', asset: 'x' }],
  ])
    expect(() => lerCenaParaStudio({ ...d, recursos })).toThrow(/recurso|caminho|inventário/i)
})

test('um ID pode compartilhar conteúdo idêntico, mas não conteúdos incompatíveis', () => {
  const d = documento(),
    outro = { ...d.cena.arquivos[0]!, caminho: 'imagens/b.png' },
    compartilhado = {
      ...d,
      cena: { ...d.cena, arquivos: [...d.cena.arquivos, outro] },
      recursos: [...d.recursos, { caminho: outro.caminho, asset: d.recursos[0]!.asset }],
    }
  expect(lerCenaParaStudio(compartilhado).recursos).toHaveLength(2)
  for (const patch of [{ digest: 'c'.repeat(64) }, { bytes: 64 }, { largura: 2 }])
    expect(() =>
      lerCenaParaStudio({
        ...compartilhado,
        cena: { ...compartilhado.cena, arquivos: [d.cena.arquivos[0], { ...outro, ...patch }] },
      }),
    ).toThrow(/mesmo asset/i)
})

test('papéis binários diferentes não compartilham um ID, mesmo com digest igual', () => {
  const d = documento(),
    binario = {
      caminho: 'dados/a.bin',
      digest: 'c'.repeat(64),
      bytes: 4,
      mime: 'application/octet-stream',
      papel: 'alturas',
    },
    arquivos = [binario, { ...binario, caminho: 'dados/b.bin', papel: 'buracos' }]
  expect(() =>
    lerCenaParaStudio({
      ...d,
      cena: { ...d.cena, arquivos },
      recursos: arquivos.map((a) => ({ caminho: a.caminho, asset: 'dado' })),
    }),
  ).toThrow(/mesmo asset/i)
})

test('versão, campos desconhecidos e IDs inválidos são recusados sem normalização', () => {
  const d = documento()
  for (const patch of [
    { versao: 2 },
    { formato: 'outro' },
    { codigo: 'executar()' },
    { recursos: [{ caminho: 'imagens/a.png', asset: '' }] },
    { recursos: [{ caminho: 'imagens/a.png', asset: 'a'.repeat(65) }] },
  ])
    expect(() => lerCenaParaStudio({ ...d, ...patch })).toThrow()
  expect(() => lerCenaParaStudio('{')).toThrow(/JSON/i)
  expect(() => lerCenaParaStudio({ ...d, cena: { ...d.cena, ambiente: { hora: NaN } } })).toThrow()
})

test('teto é medido em bytes UTF-8 e também vale para a entrada direta pelo schema', () => {
  const d = documento(),
    grande = {
      ...d,
      cena: {
        ...d.cena,
        entidades: Array.from({ length: 9000 }, (_, i) => ({
          id: `e${i}`,
          nome: 'Á'.repeat(80),
          tipo: 'grupo',
          grupo: null,
        })),
      },
    }
  expect(new TextEncoder().encode(JSON.stringify(grande)).length).toBeGreaterThan(
    MAX_BYTES_DA_CENA_PARA_STUDIO,
  )
  expect(CenaParaStudioSchema.safeParse(grande).success).toBe(false)
  expect(() => lerCenaParaStudio(grande)).toThrow(/limite|MiB/i)
  expect(() => lerCenaParaStudio(' '.repeat(MAX_BYTES_DA_CENA_PARA_STUDIO + 1))).toThrow(
    /limite|MiB/i,
  )
})
