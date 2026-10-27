import { expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { criarFilaDeTempo } from '../src/sistemas/fila-tempo'

test('recupera resposta perdida sem duplicar segundos e preserva o perfil', async () => {
  const perfil = crypto.randomUUID()
  const aceitos = new Map<string, number>()
  let perderResposta = true
  const erros: unknown[] = []
  const confirmados: number[] = []
  const servico = {
    async buscar(_caminho: string, pedido?: { corpo?: unknown }) {
      const evento = pedido?.corpo as { eventoId: string; segundos: number }
      aceitos.set(evento.eventoId, evento.segundos)
      if (perderResposta) throw new Error('resposta perdida')
      return {
        status: 200,
        corpo: {
          usadoHojeSegundos: [...aceitos.values()].reduce((a, b) => a + b, 0),
          limiteDiarioMinutos: 30,
          acabou: false,
        },
      }
    },
  }
  const fila = await criarFilaDeTempo({
    perfil,
    servico,
    aoConfirmar: (tempo) => confirmados.push(tempo.usadoHojeSegundos),
    aoErro: (e) => erros.push(e),
  })
  for (let i = 0; i < 10; i++) await fila.somarSegundo()
  await expect(fila.guardarEEnviar()).rejects.toThrow()
  expect(erros.length).toBeGreaterThan(0)
  expect([...aceitos.values()]).toEqual([10])
  perderResposta = false
  await fila.guardarEEnviar()
  expect(confirmados.at(-1)).toBe(10)
  expect(aceitos.size).toBe(1)
  await fila.encerrar()
})

import { criarArmazemDeTempo } from '../src/sistemas/armazem-tempo'

test('ao reabrir, envia os segundos guardados antes de um fechamento inesperado', async () => {
  const perfil = crypto.randomUUID()
  const armazem = await criarArmazemDeTempo(perfil)
  for (let i = 0; i < 4; i++) await armazem.somarSegundo()
  armazem.fechar()
  const segundos: number[] = []
  const fila = await criarFilaDeTempo({
    perfil,
    servico: {
      async buscar(_caminho, pedido) {
        const corpo = pedido?.corpo as { segundos: number; dia: string }
        segundos.push(corpo.segundos)
        expect(corpo.dia).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        return {
          status: 200,
          corpo: { usadoHojeSegundos: corpo.segundos, limiteDiarioMinutos: 30, acabou: false },
        }
      },
    },
    aoConfirmar: () => {},
    aoErro: () => {},
  })
  expect(segundos).toEqual([4])
  await fila.encerrar()
})

test('salvar ao mesmo tempo que chegam segundos não perde nem duplica tempo', async () => {
  const aceitos = new Map<string, number>()
  const fila = await criarFilaDeTempo({
    perfil: crypto.randomUUID(),
    servico: {
      async buscar(_caminho, pedido) {
        const evento = pedido?.corpo as { eventoId: string; segundos: number }
        aceitos.set(evento.eventoId, evento.segundos)
        return {
          status: 200,
          corpo: {
            usadoHojeSegundos: [...aceitos.values()].reduce((a, b) => a + b, 0),
            limiteDiarioMinutos: 30,
            acabou: false,
          },
        }
      },
    },
    aoConfirmar: () => {},
    aoErro: () => {},
  })
  const operacoes: Promise<void>[] = []
  for (let i = 0; i < 40; i++) {
    operacoes.push(fila.somarSegundo())
    if (i % 7 === 0) operacoes.push(fila.guardarEEnviar())
  }
  await Promise.all(operacoes)
  await fila.guardarEEnviar()
  expect([...aceitos.values()].reduce((a, b) => a + b, 0)).toBe(40)
  await fila.encerrar()
})
