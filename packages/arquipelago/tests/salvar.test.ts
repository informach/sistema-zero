import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, type SalvamentoGuardado } from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { criarFilaDeSalvamento } from '../src/sistemas/salvar'

function relogioManual() {
  const tarefas: (() => void)[] = []
  return {
    agendar: (fn: () => void) => {
      tarefas.push(fn)
      return tarefas.length
    },
    cancelar: () => {},
    rodar: () => {
      const t = tarefas.splice(0)
      for (const fn of t) fn()
    },
  }
}

describe('fila de salvamento', () => {
  test('junta as mudanças e grava só a última', async () => {
    const p = criarPlataformaFalsa()
    const r = relogioManual()
    const fila = criarFilaDeSalvamento({
      servico: p.servico,
      revisaoInicial: 0,
      aoAdotar: () => {},
      aoErro: () => {},
      ...r,
    })
    const s = criarSalvamentoInicial(new Date())
    fila.guardar({ ...s, inventario: { alface: 1 } })
    fila.guardar({ ...s, inventario: { alface: 2 } })
    await fila.salvarAgora()
    expect(p.guardado().revisao).toBe(1)
    expect(p.guardado().salvamento?.inventario).toEqual({ alface: 2 })
    fila.guardar({ ...s, inventario: { alface: 3 } })
    await fila.salvarAgora()
    expect(p.guardado().revisao).toBe(2)
  })

  test('no conflito adota a versão guardada (outro aparelho salvou antes)', async () => {
    const p = criarPlataformaFalsa()
    const s = criarSalvamentoInicial(new Date())
    // Outro aparelho grava primeiro.
    await p.servico.buscar('/salvamento', {
      metodo: 'PUT',
      corpo: { revisaoBase: 0, salvamento: { ...s, inventario: { milho: 9 } } },
    })
    let adotado: SalvamentoGuardado | null = null
    const fila = criarFilaDeSalvamento({
      servico: p.servico,
      revisaoInicial: 0,
      aoAdotar: (g) => {
        adotado = g
      },
      aoErro: () => {},
      ...relogioManual(),
    })
    fila.guardar({ ...s, inventario: { alface: 1 } })
    await fila.salvarAgora()
    expect((adotado as SalvamentoGuardado | null)?.salvamento?.inventario).toEqual({ milho: 9 })
    expect(p.guardado().salvamento?.inventario).toEqual({ milho: 9 })
    expect(fila.temPendente()).toBe(false)
  })

  test('erro de rede não perde a mudança: ela vai de novo depois', async () => {
    const p = criarPlataformaFalsa()
    let falhar = true
    const servico = {
      buscar: async (c: string, o?: { metodo?: 'GET' | 'POST' | 'PUT'; corpo?: unknown }) => {
        if (falhar) throw new Error('sem rede')
        return p.servico.buscar(c, o)
      },
    }
    const erros: unknown[] = []
    const r = relogioManual()
    const fila = criarFilaDeSalvamento({
      servico,
      revisaoInicial: 0,
      aoAdotar: () => {},
      aoErro: (e) => erros.push(e),
      ...r,
    })
    fila.guardar(criarSalvamentoInicial(new Date()))
    await fila.salvarAgora()
    expect(erros).toHaveLength(1)
    expect(fila.temPendente()).toBe(true)
    falhar = false
    await fila.salvarAgora()
    expect(p.guardado().revisao).toBe(1)
  })
})

describe('plataforma de mentira', () => {
  test('cumpre o contrato: acesso, quarto, avatar e tempo livre do Kids', async () => {
    const p = criarPlataformaFalsa({ limiteDiarioMinutos: 10 })
    const acesso = await p.servico.buscar('/acesso')
    expect(acesso.status).toBe(200)
    expect((acesso.corpo as { limiteDiarioMinutos: number }).limiteDiarioMinutos).toBe(10)
    expect((await p.lerQuarto()).placedItems.length).toBeGreaterThan(0)
    expect(Object.keys((await p.lerAvatar()).slots).length).toBeGreaterThan(0)
    for (let i = 0; i < 5; i++)
      await p.servico.buscar('/tempo', { metodo: 'POST', corpo: { segundos: 120 } })
    const r = await p.servico.buscar('/tempo', { metodo: 'POST', corpo: { segundos: 60 } })
    expect((r.corpo as { acabou: boolean }).acabou).toBe(true)
  })

  test('adulto não tem limite', async () => {
    const p = criarPlataformaFalsa({ publico: 'adulto' })
    const acesso = await p.servico.buscar('/acesso')
    expect((acesso.corpo as { limiteDiarioMinutos: number | null }).limiteDiarioMinutos).toBeNull()
  })
})
