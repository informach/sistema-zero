import { expect, test } from 'bun:test'
import { conferirInventarioCompilado } from '../src/compilar/pacote'
import { digestDosBytes } from '../src/v2'

async function pacote() {
  const bytes = new Uint8Array([0, 0, 0, 0]),
    caminho = 'terreno/alturas.bin',
    cena = {
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Inventário',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { cenario: 'c', revisao: 0, digest: 'a'.repeat(64) },
      arquivos: [
        {
          caminho,
          digest: await digestDosBytes(bytes),
          bytes: bytes.length,
          mime: 'application/octet-stream',
          papel: 'alturas',
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
    }
  return { cena, arquivos: new Map([[caminho, bytes]]) }
}
test('inventário confere presença, tamanho e hash antes de entregar arquivos a um decoder', async () => {
  const p = await pacote(),
    antes = JSON.stringify(p.cena)
  await conferirInventarioCompilado(p.cena, p.arquivos)
  expect(JSON.stringify(p.cena)).toBe(antes)
  expect([...p.arquivos.values()][0]).toEqual(new Uint8Array(4))
})
test('arquivo ausente, extra, alterado ou truncado impede o pacote inteiro', async () => {
  const p = await pacote()
  await expect(conferirInventarioCompilado(p.cena, new Map())).rejects.toThrow(
    /arquivo|inventário/i,
  )
  await expect(
    conferirInventarioCompilado(p.cena, new Map([...p.arquivos, ['extra.bin', new Uint8Array(1)]])),
  ).rejects.toThrow(/arquivo|inventário/i)
  await expect(
    conferirInventarioCompilado(p.cena, new Map([['terreno/alturas.bin', new Uint8Array(3)]])),
  ).rejects.toThrow(/tamanho|bytes/i)
  await expect(
    conferirInventarioCompilado(
      p.cena,
      new Map([['terreno/alturas.bin', new Uint8Array([1, 0, 0, 0])]]),
    ),
  ).rejects.toThrow(/hash|conteúdo/i)
})
test('cancelamento não entrega um inventário incompleto como aprovado', async () => {
  const p = await pacote(),
    controle = new AbortController()
  controle.abort()
  await expect(
    conferirInventarioCompilado(p.cena, p.arquivos, controle.signal),
  ).rejects.toHaveProperty('name', 'AbortError')
})
