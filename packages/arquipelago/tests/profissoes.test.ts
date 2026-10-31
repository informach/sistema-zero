import { describe, expect, test } from 'bun:test'
import {
  AcessoSchema,
  criarSalvamentoInicial,
  type Plataforma,
  SessaoDaProfissaoSchema,
} from '@sistemazero/arquipelago-contracts'
import { lojaDaGaleria } from '../src/estado/galeria'
import { criarLoja } from '../src/estado/loja'
import { lojaDoTurno } from '../src/estado/turno'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { criarFilaDosTurnos, type GuardaDosTurnos } from '../src/sistemas/profissoes'

function guarda(): GuardaDosTurnos & { dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => {
      dados.set(k, v)
    },
    removeItem: (k) => {
      dados.delete(k)
    },
  }
}
async function abrir(
  p = criarPlataformaFalsa({ posicao: 3, agora: () => new Date('2026-10-29T12:00:00Z') }),
) {
  const loja = criarLoja({
    salvamento: criarSalvamentoInicial(new Date()),
    jornada: 3,
    avatar: await p.lerAvatar(),
    quarto: await p.lerQuarto(),
    acesso: AcessoSchema.parse((await p.servico.buscar('/acesso')).corpo),
    aoMudar() {},
  })
  const t = lojaDoTurno(loja)
  const g = guarda()
  t.getState().abrir('padaria')
  await t.getState().comecar(p, g)
  return { p, loja, t, g }
}
function atender(t: ReturnType<typeof lojaDoTurno>) {
  const atual = t.getState().turno
  if (!atual) throw new Error('Turno não aberto')
  for (const [id, q] of Object.entries(atual.pedidos[atual.atual]?.itens ?? {}))
    for (let i = 0; i < q; i++) t.getState().por(id)
  t.getState().entregar()
}
async function terminouPedido(t: ReturnType<typeof lojaDoTurno>) {
  for (let i = 0; i < 20 && t.getState().ocupada; i++) await Bun.sleep(1)
  expect(t.getState().ocupada).toBe(false)
}

describe('profissões: interface e confirmação durável', () => {
  test('seis bandejas reais dão itens e só um crédito, mesmo repetindo o turno', async () => {
    const { p, t, loja, g } = await abrir()
    const carteira = lojaDaGaleria(loja, p)
    await carteira.getState().carregar()
    const antes = (await p.servico.buscar('/galeria')).corpo as { saldo: number }
    for (let i = 0; i < 6; i++) atender(t)
    await terminouPedido(t)
    expect(t.getState().tela).toBe('fim')
    expect(t.getState().sessao?.pagamento).toBe('creditado')
    expect(loja.getState().salvamento.inventario.fuba).toBe(1)
    expect(g.dados.size).toBe(0)
    expect((await p.servico.buscar('/galeria')).corpo).toMatchObject({ saldo: antes.saldo + 5 })
    expect(carteira.getState().dados?.saldo).toBe(antes.saldo + 5)
    await t.getState().comecar(p, g)
    for (let i = 0; i < 6; i++) atender(t)
    await terminouPedido(t)
    expect(loja.getState().salvamento.inventario.fuba).toBe(1)
    expect((await p.servico.buscar('/galeria')).corpo).toMatchObject({ saldo: antes.saldo + 5 })
  })

  test('resposta perdida retoma em outra fila com a mesma chave, sem repetir moedas', async () => {
    const { p, t, g } = await abrir()
    const buscar = p.servico.buscar
    let perder = true
    p.servico.buscar = async (c, o) => {
      const r = await buscar(c, o)
      if (c === '/profissoes/concluir' && perder) throw new Error('Resposta perdida')
      return r
    }
    for (let i = 0; i < 6; i++) atender(t)
    await terminouPedido(t)
    expect(t.getState().erro).toContain('guardada')
    expect(g.dados.size).toBe(1)
    const saldo = (await buscar('/galeria')).corpo
    perder = false
    await criarFilaDosTurnos(p, g).retomar()
    expect(g.dados.size).toBe(0)
    expect((await buscar('/galeria')).corpo).toEqual(saldo)
  })

  test('bloqueio local conserva bandeja e impede prêmio, sem perder entrega', async () => {
    const { p, t, loja, g } = await abrir()
    for (let i = 0; i < 5; i++) atender(t)
    const salvo = loja.getState().salvamento
    g.setItem = () => {
      throw new Error('Sem espaço')
    }
    atender(t)
    expect(t.getState().turno?.atual).toBe(5)
    expect(t.getState().erro).toContain('neste aparelho')
    expect(loja.getState().salvamento).toBe(salvo)
    expect((await p.servico.buscar('/galeria')).corpo).toMatchObject({ saldo: 80 })
  })

  test('perfil, público e posto isolam confirmações; recibo de outro turno não apaga a fila', async () => {
    const { p, t, g } = await abrir()
    const s = t.getState().sessao
    if (!s) throw new Error('Sem sessão')
    const f = criarFilaDosTurnos(p, g)
    f.guardar('padaria', { sessao: s.id, respostas: s.pedidos.map((x) => ({ ...x.itens })) })
    let chamadas = 0
    const outro: Plataforma = {
      ...p,
      publico: 'adulto',
      servico: {
        buscar: async () => {
          chamadas++
          throw new Error('Não chamar')
        },
      },
    }
    await criarFilaDosTurnos(outro, g).retomar()
    await criarFilaDosTurnos(
      { ...outro, publico: 'kids', perfil: { ...p.perfil, id: 'outro' } },
      g,
    ).retomar()
    expect(chamadas).toBe(0)
    p.servico.buscar = async () => ({
      status: 200,
      corpo: { ...s, id: crypto.randomUUID(), concluido: true, pagamento: 'creditado' },
    })
    await expect(f.enviar('padaria')).rejects.toThrow()
    expect(g.dados.size).toBe(1)
  })

  test('fechamento e reabertura descartam resposta antiga sem trocar o balcão atual', async () => {
    const { p, t, g } = await abrir()
    let soltar: (valor: Awaited<ReturnType<Plataforma['servico']['buscar']>>) => void = () => {}
    const antigo = t.getState().sessao
    p.servico.buscar = () =>
      new Promise((resolve) => {
        soltar = resolve
      })
    const pendente = t.getState().comecar(p, g)
    await Bun.sleep(1)
    t.getState().cancelar()
    t.getState().abrir('sucos')
    soltar({ status: 200, corpo: antigo })
    await pendente
    expect(t.getState().posto).toBe('sucos')
    expect(t.getState().tela).toBe('convite')
    expect(t.getState().sessao).toBeNull()
  })

  test('suporte, pausa e conflito não avançam bandejas nem alteram o salvamento', async () => {
    for (const modo of ['suporte', 'pausa', 'conflito'] as const) {
      const { t, loja } = await abrir()
      const anterior = t.getState().turno
      const salvo = loja.getState().salvamento
      if (modo === 'suporte')
        loja.setState({ acesso: { ...loja.getState().acesso, somenteLeitura: true } })
      if (modo === 'pausa') loja.setState({ tempoPausado: true })
      if (modo === 'conflito') loja.setState({ salvamentoSituacao: 'conflito' })
      atender(t)
      expect(t.getState().turno).toBe(anterior)
      expect(loja.getState().salvamento).toBe(salvo)
    }
  })

  test('simulação também recusa itens incorretos, posto fechado e suporte', async () => {
    for (const opcoes of [{ posicao: 1 }, { posicao: 3, somenteLeitura: true }]) {
      const p = criarPlataformaFalsa(opcoes)
      expect(
        (
          await p.servico.buscar('/profissoes/iniciar', {
            metodo: 'POST',
            corpo: { posto: 'sucos' },
          })
        ).status,
      ).toBe(403)
    }
    const { p, t } = await abrir()
    const s = SessaoDaProfissaoSchema.parse(t.getState().sessao)
    expect(
      (
        await p.servico.buscar('/profissoes/concluir', {
          metodo: 'POST',
          corpo: { sessao: s.id, respostas: Array.from({ length: 6 }, () => ({ errado: 1 })) },
        })
      ).status,
    ).toBe(422)
  })
})
