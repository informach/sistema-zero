import { expect, test } from 'bun:test'
import { conferirPreparoDeExportacao, digestDoDocumentoDeCenario } from '../src/compilar'
import { criarDocumentoVazio } from '../src/v2'

test('preparo de exportação confere cenário, revisão e digest dos dados salvos', async () => {
  const documento = criarDocumentoVazio('c', 'Praça'),
    p = {
      espacoId: 'conta',
      fonte: { cenario: 'c', revisao: 3 },
      digest: await digestDoDocumentoDeCenario(documento),
      documento,
      contexto: { equipe: false, bibliotecas: [] },
    }
  expect(await conferirPreparoDeExportacao(p, 'c', 3)).toEqual(p)
  await expect(conferirPreparoDeExportacao(p, 'outro', 3)).rejects.toThrow(/cenário/)
  await expect(conferirPreparoDeExportacao(p, 'c', 4)).rejects.toThrow(/revisão/)
  await expect(
    conferirPreparoDeExportacao({ ...p, documento: { ...documento, nome: 'Alterado' } }, 'c', 3),
  ).rejects.toThrow(/documento/)
  await expect(
    conferirPreparoDeExportacao({ ...p, documento: { ...documento, id: 'outro' } }, 'c', 3),
  ).rejects.toThrow(/cenário/)
})
