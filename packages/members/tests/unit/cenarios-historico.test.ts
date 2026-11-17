import { expect, test } from 'bun:test'
import { CenariosService } from '../../src/application/cenarios/cenarios.service'
import { avancarHistorico } from '../../src/domain/cenarios/historico'
import { CenariosEmMemoria } from '../fakes/cenarios-in-memory'

const ator = {
  usuarioId: '11111111-1111-4111-8111-111111111111',
  contaId: '11111111-1111-4111-8111-111111111111',
  equipe: true,
  suporte: false,
}
const agora = () => new Date('2026-11-16T12:00:00Z')
async function criar() {
  const repo = new CenariosEmMemoria()
  const servico = new CenariosService(repo, agora, { modo: 'equipe', lista: new Set() })
  const [espaco] = await servico.espacos(ator)
  const mundo = await servico.criarMundo(ator, espaco!.id, 'Mundo')
  const cenario = await servico.criarCenario(ator, mundo.id, 'Inicial')
  return { repo, servico, id: cenario.id }
}
test('formas autorais persistem, duplicam e desfazem sem biblioteca ou arquivos GLB fictícios', async () => {
  const { repo, servico, id } = await criar()
  const forma = {
    id: 'forma/rampa',
    nome: 'Rampa',
    tipo: 'rampa',
    largura: 2,
    altura: 3,
    comprimento: 6,
  } as const
  await servico.editarCenario(ator, id, {
    revisaoEsperada: 0,
    operacaoId: 'forma-criar-0001',
    comandos: [
      { tipo: 'forma.definir', forma },
      {
        tipo: 'instancia.criar',
        instancia: {
          id: 'rampa',
          nome: 'Rampa',
          modelo: forma.id,
          grupo: null,
          bloqueado: false,
          oculto: false,
          colisao: 'malha',
          apoio: { tipo: 'terreno', deslocamento: 0, inclinar: false, referencia: 'volume' },
          transformacao: {
            posicao: { x: 0, y: 0, z: 0 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        },
      },
    ],
  })
  const reaberto = new CenariosService(repo, agora, { modo: 'equipe', lista: new Set() })
  const original = await reaberto.abrirCenario(ator, id)
  expect(original.documento.modelos).toHaveLength(0)
  expect(original.documento.formas).toEqual([forma])
  const copia = await reaberto.duplicarCenario(ator, id)
  expect((await reaberto.abrirCenario(ator, copia.id)).documento.formas).toEqual([forma])
  expect(
    (
      await reaberto.moverHistorico(ator, id, {
        acao: 'desfazer',
        revisaoEsperada: 1,
        operacaoId: 'forma-desfazer-1',
      })
    ).documento.formas,
  ).toBeUndefined()
  expect(
    (
      await reaberto.moverHistorico(ator, id, {
        acao: 'refazer',
        revisaoEsperada: 2,
        operacaoId: 'forma-refazer-1',
      })
    ).documento.formas,
  ).toEqual([forma])
})
test('desfazer e refazer usam o registro persistido e sobrevivem a outra instância do serviço', async () => {
  const { repo, servico, id } = await criar()
  await servico.editarCenario(ator, id, {
    revisaoEsperada: 0,
    comandos: [{ tipo: 'cenario.renomear', nome: 'Depois' }],
    operacaoId: 'editar-0001',
  })
  const reaberto = new CenariosService(repo, agora, { modo: 'equipe', lista: new Set() })
  expect((await reaberto.abrirCenario(ator, id)).historico).toEqual({
    revisao: 1,
    desfazer: 1,
    refazer: 0,
  })
  const pedido = { acao: 'desfazer' as const, revisaoEsperada: 1, operacaoId: 'desfazer-0001' }
  const volta = await reaberto.moverHistorico(ator, id, pedido)
  expect(volta.nome).toBe('Inicial')
  expect(volta.historico).toEqual({ revisao: 2, desfazer: 0, refazer: 1 })
  expect((await reaberto.moverHistorico(ator, id, pedido)).revisao).toBe(2)
  const refaz = await reaberto.moverHistorico(ator, id, {
    acao: 'refazer',
    revisaoEsperada: 2,
    operacaoId: 'refazer-0001',
  })
  expect(refaz.nome).toBe('Depois')
  expect(refaz.historico).toEqual({ revisao: 3, desfazer: 1, refazer: 0 })
  expect((await reaberto.revisoes(ator, id)).itens.map((r) => r.revisao)).toEqual([3, 2, 1])
})
test('nova edição após desfazer abandona a pilha de refazer, preservando as revisões anteriores', async () => {
  const { servico, id } = await criar()
  await servico.editarCenario(ator, id, {
    revisaoEsperada: 0,
    comandos: [{ tipo: 'cenario.renomear', nome: 'Antigo' }],
    operacaoId: 'editar-0001',
  })
  await servico.moverHistorico(ator, id, {
    acao: 'desfazer',
    revisaoEsperada: 1,
    operacaoId: 'desfazer-0001',
  })
  await servico.editarCenario(ator, id, {
    revisaoEsperada: 2,
    comandos: [{ tipo: 'cenario.renomear', nome: 'Novo' }],
    operacaoId: 'editar-0002',
  })
  expect((await servico.historico(ator, id)).refazer).toBe(0)
  expect((await servico.documentoNaRevisao(ator, id, 1)).nome).toBe('Antigo')
  expect((await servico.documentoNaRevisao(ator, id, 2)).nome).toBe('Inicial')
  const restaurado = await servico.restaurarRevisao(ator, id, {
    revisao: 1,
    revisaoEsperada: 3,
    operacaoId: 'restaurar-001',
  })
  expect(restaurado.nome).toBe('Antigo')
  expect(restaurado.revisao).toBe(4)
  const desfaz = await servico.moverHistorico(ator, id, {
    acao: 'desfazer',
    revisaoEsperada: 4,
    operacaoId: 'desfazer-0002',
  })
  expect(desfaz.nome).toBe('Novo')
})
test('histórico respeita espaço, suporte, concorrência e não aceita revisão inexistente', async () => {
  const { servico, id } = await criar()
  const outra = {
    ...ator,
    usuarioId: '22222222-2222-4222-8222-222222222222',
    contaId: '22222222-2222-4222-8222-222222222222',
  }
  await expect(servico.historico(outra, id)).rejects.toThrow('não existe')
  await expect(
    servico.moverHistorico(ator, id, {
      acao: 'desfazer',
      revisaoEsperada: 1,
      operacaoId: 'desfazer-0001',
    }),
  ).rejects.toThrow('mudou')
  await expect(servico.documentoNaRevisao(ator, id, 1)).rejects.toThrow('fora do histórico')
  await expect(
    servico.moverHistorico(ator, id, {
      acao: 'refazer',
      revisaoEsperada: 0,
      operacaoId: 'refazer-0001',
    }),
  ).rejects.toThrow('Não há outro passo')
})
test('a pilha mantém 200 passos sem copiar documentos e recusa alvo diferente do último', () => {
  expect(
    avancarHistorico({ passado: [1, 2], futuro: [] }, 3, { acao: 'desfazer', alvo: 1 }),
  ).toBeNull()
  expect(
    avancarHistorico({ passado: Array.from({ length: 200 }, (_, i) => i + 1), futuro: [500] }, 600),
  ).toEqual({ passado: [...Array.from({ length: 199 }, (_, i) => i + 2), 600], futuro: [] })
})
test('um lote sem mudança não impede desfazer o passo anterior', async () => {
  const { servico, id } = await criar()
  await servico.editarCenario(ator, id, {
    revisaoEsperada: 0,
    comandos: [{ tipo: 'cenario.renomear', nome: 'Depois' }],
    operacaoId: 'editar-0001',
  })
  await servico.editarCenario(ator, id, {
    revisaoEsperada: 1,
    comandos: [{ tipo: 'cenario.renomear', nome: 'Depois' }],
    operacaoId: 'editar-0002',
  })
  expect(
    (
      await servico.moverHistorico(ator, id, {
        acao: 'desfazer',
        revisaoEsperada: 2,
        operacaoId: 'desfazer-0001',
      })
    ).nome,
  ).toBe('Inicial')
})
test('restauração não introduz modelos que não pertencem ao espaço', async () => {
  const { servico, id } = await criar()
  const documento = (await servico.abrirCenario(ator, id)).documento
  documento.modelos.push({
    id: 'estrangeiro',
    modelo: 'estrangeiro',
    biblioteca: 'outra',
    digest: 'a'.repeat(64),
  })
  await expect(
    servico.editarCenario(ator, id, {
      revisaoEsperada: 0,
      operacaoId: 'restaurar-malicioso',
      comandos: [{ tipo: 'cenario.restaurar', documento }],
    }),
  ).rejects.toThrow('Modelo ausente')
  expect((await servico.abrirCenario(ator, id)).revisao).toBe(0)
})
test('restauração sem diferença também registra a operação e não se repete depois de outra edição', async () => {
  const { servico, id } = await criar()
  const pedido = { revisao: 0, revisaoEsperada: 0, operacaoId: 'restaurar-0001' }
  expect((await servico.restaurarRevisao(ator, id, pedido)).revisao).toBe(1)
  await servico.editarCenario(ator, id, {
    revisaoEsperada: 1,
    operacaoId: 'editar-0001',
    comandos: [{ tipo: 'cenario.renomear', nome: 'Mais tarde' }],
  })
  expect((await servico.restaurarRevisao(ator, id, pedido)).nome).toBe('Mais tarde')
  expect((await servico.historico(ator, id)).desfazer).toBe(1)
})
