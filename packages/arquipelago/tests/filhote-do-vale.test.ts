import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  DIAS_PARA_CHOCAR,
  NINHOS_DO_VALE,
  type Salvamento,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import type { Mesh } from 'three'
import { chaoLivre } from '../src/mundo/chao-livre'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { conciliarSalvamento } from '../src/sistemas/conciliar-salvamento'
import { ganharProjetos } from '../src/sistemas/construcao/projeto-azul'
import { colecaoDoVale } from '../src/sistemas/diario'
import {
  alimentarOFilhote,
  aquecerOOvo,
  carinhoNoFilhote,
  comecarPasseio,
  cresceu,
  DIAS_PARA_CRESCER,
  FALA_DA_JADE_COM_O_FILHOTE,
  FALA_DA_JADE_COM_O_OVO,
  FALA_DO_OVO,
  juntarFilhotes,
  nasceu,
  nomearOFilhote,
  OVO_NOVO,
  PASSEIO_DO_FILHOTE,
  passoDoPasseio,
  TAMANHO_DO_FILHOTE,
  tamanhoDoFilhote,
} from '../src/sistemas/filhote-do-vale'
import { comecarConversaComAJade } from '../src/sistemas/jade'
import { cuidarDoNinho } from '../src/sistemas/vale'
import { arquivoDaIlha, carregarGlb, type Forma, gradeDeAndar, TAMPO } from './ajuda-colisores'

const novo = () => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
const comNinhos = () => NINHOS_DO_VALE.reduce((s, id) => cuidarDoNinho(s, id, true), novo())
const dia = (n: number) => `2026-11-${String(n).padStart(2, '0')}`

/** O ovo entregue pela Jade e chocado em três dias. */
function comFilhote(): Salvamento {
  let s = comecarConversaComAJade(comNinhos()).salvamento
  for (let d = 1; d <= DIAS_PARA_CHOCAR; d++) s = aquecerOOvo(s, dia(d))!.salvamento
  return s
}

test('a Jade só entrega o ovo depois dos três ninhos, uma vez', () => {
  const antes = novo()
  expect(comecarConversaComAJade(antes).salvamento).toBe(antes)
  const s = comNinhos()
  const entrega = comecarConversaComAJade(s)
  expect(entrega.salvamento.vale.filhote).toEqual(OVO_NOVO)
  expect(entrega.falas).toEqual(['Você cuidou dos três ninhos.', ...FALA_DO_OVO])
  expect(s.vale.filhote).toBeNull()
  const depois = comecarConversaComAJade(entrega.salvamento)
  expect(depois.salvamento).toBe(entrega.salvamento)
  expect(depois.falas).toEqual([FALA_DA_JADE_COM_O_OVO])
  expect(comecarConversaComAJade(comFilhote()).falas).toEqual([FALA_DA_JADE_COM_O_FILHOTE])
  expect(SalvamentoSchema.safeParse(entrega.salvamento).success).toBe(true)
})

test('o ovo esquenta um dia por vez e choca no terceiro, sem prazo', () => {
  expect(aquecerOOvo(novo(), dia(1))).toBeNull()
  let s = comecarConversaComAJade(comNinhos()).salvamento
  const primeiro = aquecerOOvo(s, dia(1))!
  expect(primeiro.salvamento.vale.filhote?.ovo).toBe(1)
  expect(primeiro.fala).toBe('O ovo ficou quentinho. Faltam 2 dias para ele chocar.')
  // O mesmo dia não conta de novo.
  const repetido = aquecerOOvo(primeiro.salvamento, dia(1))!
  expect(repetido.salvamento).toBe(primeiro.salvamento)
  // Uma semana sem aquecer não tira nada.
  s = aquecerOOvo(primeiro.salvamento, dia(9))!.salvamento
  expect(s.vale.filhote?.ovo).toBe(2)
  expect(nasceu(s.vale.filhote)).toBe(false)
  const choca = aquecerOOvo(s, dia(10))!
  expect(nasceu(choca.salvamento.vale.filhote)).toBe(true)
  expect(choca.fala).toContain('nasceu')
  expect(aquecerOOvo(choca.salvamento, dia(11))).toBeNull()
  expect(SalvamentoSchema.safeParse(choca.salvamento).success).toBe(true)
})

test('o nome tem de 1 a 16 letras e só depois de nascer', () => {
  const ovo = comecarConversaComAJade(comNinhos()).salvamento
  expect(nomearOFilhote(ovo, 'Tricê')).toBe(ovo)
  const s = comFilhote()
  expect(nomearOFilhote(s, '   ')).toBe(s)
  const nomeado = nomearOFilhote(s, '  Tricê  ')
  expect(nomeado.vale.filhote?.nome).toBe('Tricê')
  expect(nomearOFilhote(nomeado, 'Tricê')).toBe(nomeado)
  const longo = nomearOFilhote(s, 'x'.repeat(30))
  expect(longo.vale.filhote?.nome).toHaveLength(16)
  expect(SalvamentoSchema.safeParse(longo).success).toBe(true)
})

test('comer e ganhar carinho no mesmo dia conta um dia para crescer', () => {
  let s = comFilhote()
  expect(alimentarOFilhote(s, dia(4))!.fala).toBe(
    'Ele come alface, tomate ou milho. Colha na horta e traga.',
  )
  s = { ...s, inventario: { tomate: 1, milho: DIAS_PARA_CRESCER + 1 } }
  const comeu = alimentarOFilhote(s, dia(4))!
  // A ordem da comida é alface, tomate, milho: o tomate sai primeiro.
  expect(comeu.salvamento.inventario.tomate).toBeUndefined()
  expect(comeu.salvamento.vale.filhote?.dias).toBe(0)
  expect(comeu.fala).toBe('Agora ele quer carinho.')
  expect(alimentarOFilhote(comeu.salvamento, dia(4))!.salvamento).toBe(comeu.salvamento)
  const carinho = carinhoNoFilhote(comeu.salvamento, dia(4))!
  expect(carinho.salvamento.vale.filhote?.dias).toBe(1)
  expect(carinho.fala).toBe('Hoje ele foi bem cuidado. Faltam 4 dias para ele crescer.')
  expect(carinhoNoFilhote(carinho.salvamento, dia(4))!.salvamento).toBe(carinho.salvamento)
  // Carinho primeiro também conta, e só uma vez por dia.
  const outro = carinhoNoFilhote(carinho.salvamento, dia(5))!
  expect(outro.fala).toBe('Agora ele está com fome.')
  s = alimentarOFilhote(outro.salvamento, dia(5))!.salvamento
  expect(s.vale.filhote?.dias).toBe(2)
  for (let d = 6; d < 6 + DIAS_PARA_CRESCER - 2; d++)
    s = carinhoNoFilhote(alimentarOFilhote(s, dia(d))!.salvamento, dia(d))!.salvamento
  expect(cresceu(s.vale.filhote)).toBe(true)
  expect(tamanhoDoFilhote(s.vale.filhote!)).toBe(TAMANHO_DO_FILHOTE.crescido)
  expect(SalvamentoSchema.safeParse(s).success).toBe(true)
})

test('o tamanho vai do recém-nascido ao crescido e não passa dele', () => {
  const f = { ...OVO_NOVO, ovo: DIAS_PARA_CHOCAR }
  expect(tamanhoDoFilhote(f)).toBe(TAMANHO_DO_FILHOTE.nascido)
  const meio = tamanhoDoFilhote({ ...f, dias: 2 })
  expect(meio).toBeGreaterThan(TAMANHO_DO_FILHOTE.nascido)
  expect(meio).toBeLessThan(TAMANHO_DO_FILHOTE.crescido)
  expect(tamanhoDoFilhote({ ...f, dias: 99 })).toBe(TAMANHO_DO_FILHOTE.crescido)
  expect(cresceu(null)).toBe(false)
  expect(cresceu({ ...OVO_NOVO, dias: 9 })).toBe(false)
})

test('duas sessões juntam o filhote mais adiantado, sem perder o nome', () => {
  const a = { ...OVO_NOVO, ovo: 3, nome: null, comeuEm: dia(5), dias: 2 }
  const b = { ...OVO_NOVO, ovo: 2, aquecidoEm: dia(3), nome: 'Tricê', carinhoEm: dia(6), dias: 1 }
  expect(juntarFilhotes(a, b)).toEqual({
    ovo: 3,
    aquecidoEm: dia(3),
    nome: 'Tricê',
    comeuEm: dia(5),
    carinhoEm: dia(6),
    dias: 2,
  })
  expect(juntarFilhotes(null, b)).toBe(b)
  expect(juntarFilhotes(a, null)).toBe(a)
  expect(juntarFilhotes({ ...b, nome: 'Dino' }, b)?.nome).toBe('Dino')
  const base = comNinhos()
  const local = comecarConversaComAJade(base).salvamento
  const junto = conciliarSalvamento(base, local, base)
  expect(junto?.vale.filhote).toEqual(OVO_NOVO)
})

test('as falas seguem a régua dos textos das crianças', () => {
  const s = comFilhote()
  const falas = [
    ...FALA_DO_OVO,
    FALA_DA_JADE_COM_O_OVO,
    FALA_DA_JADE_COM_O_FILHOTE,
    aquecerOOvo(comecarConversaComAJade(comNinhos()).salvamento, dia(1))!.fala,
    alimentarOFilhote(s, dia(4))!.fala,
    carinhoNoFilhote(s, dia(4))!.fala,
  ]
  for (const f of falas) expect(f).not.toMatch(/[—!?]/)
})

test('o passeio fica em chão plano e livre perto do chão quente, também entre os pontos', async () => {
  const raiz = await carregarGlb(arquivoDaIlha('vale-dos-dinos.glb'))
  raiz.updateMatrixWorld(true)
  const colisores = lerColisores(raiz)
  const formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
  const grade = gradeDeAndar(raiz.getObjectByName('col-terreno') as Mesh, formas)
  // O corpo crescido: meia largura 0,34 e 0,86 de altura (0,19 e 0,48 na escala 1).
  const cabe = chaoLivre(colisores, {
    chao: TAMPO,
    raio: 0.19 * TAMANHO_DO_FILHOTE.crescido + 0.1,
    altura: 0.48 * TAMANHO_DO_FILHOTE.crescido,
    raioDaIlha: 14,
  })
  const pe = raiz.getObjectByName('pe-do-vulcao')!.position
  const morador = raiz.getObjectByName('morador')!.position
  const chegada = raiz.getObjectByName('chegada')!.position
  const andou = grade.alcance(chegada.x, chegada.z)
  const noMundo = PASSEIO_DO_FILHOTE.map((p) => ({ x: pe.x + p.x, z: pe.z + p.z }))
  for (const [i, p] of noMundo.entries()) {
    expect([i, Math.abs((grade.chaoEm(p.x, p.z) ?? 0) - TAMPO) < 0.1, cabe(p.x, p.z)]).toEqual([
      i,
      true,
      true,
    ])
    // Longe da Jade (raio 0,41) e onde a criança chega para cuidar.
    expect(Math.hypot(p.x - morador.x, p.z - morador.z)).toBeGreaterThan(1.2)
    expect(grade.chegaPerto(andou, p.x, p.z, 1)).toBe(true)
    const q = noMundo[(i + 1) % noMundo.length]!
    for (let t = 0; t <= 1; t += 0.05) {
      const x = p.x + (q.x - p.x) * t
      const z = p.z + (q.z - p.z) * t
      expect([i, t, Math.abs((grade.chaoEm(x, z) ?? 0) - TAMPO) < 0.1 && cabe(x, z)]).toEqual([
        i,
        t,
        true,
      ])
    }
  }
  // O chão quente também: plano, livre e ao alcance da criança.
  expect(cabe(pe.x, pe.z)).toBe(true)
  expect(grade.chegaPerto(andou, pe.x, pe.z, 0.5)).toBe(true)
}, 120_000)

test('o passeio para em cada ponto e segue para um vizinho, sem sair da roda', () => {
  const pontos = [
    { x: 0, z: 0 },
    { x: 1, z: 0 },
    { x: 1, z: 1 },
  ]
  const p = comecarPasseio(pontos)
  expect(p).toMatchObject({ x: 0, z: 0, alvo: 0 })
  // Parado no começo; ao fim da espera, o sorteio escolhe o seguinte (>= 0,5) ou o anterior.
  expect(passoDoPasseio(p, pontos, 10, 0.9)).toBe(false)
  expect(p.alvo).toBe(1)
  expect(passoDoPasseio(p, pontos, 1, 0.9)).toBe(true)
  expect(p.x).toBeCloseTo(0.5)
  passoDoPasseio(p, pontos, 1, 0.9)
  expect(p).toMatchObject({ x: 1, z: 0, espera: 4 })
  passoDoPasseio(p, pontos, 10, 0.1)
  expect(p.alvo).toBe(0)
  expect(passoDoPasseio(p, [pontos[0]!], 1, 0.5)).toBe(false)
})

test('o museu chega com o fóssil e a coleção do Vale conta o filhote', () => {
  const agora = new Date('2026-10-29T12:00:00Z')
  let s = novo()
  expect(ganharProjetos(s, agora).ganhos).not.toContain('museu')
  s = { ...s, vale: { ...s.vale, escavacao: 3 } }
  const r = ganharProjetos(s, agora)
  expect(r.ganhos).toContain('museu')
  expect(ganharProjetos(r.salvamento, agora).ganhos).not.toContain('museu')
  const item = () => colecaoDoVale(s).find((i) => i.id === 'filhote')!
  expect(item()).toMatchObject({ feito: false, nome: 'Filhote de tricerátopo' })
  s = comecarConversaComAJade({
    ...comNinhos(),
    vale: { ...comNinhos().vale, escavacao: 3 },
  }).salvamento
  expect(item().texto).toBe('O ovo está no chão quente do pé do vulcão: aquecido 0 de 3 dias.')
  s = nomearOFilhote(comFilhote(), 'Tricê')
  expect(item()).toMatchObject({ feito: true, nome: 'Tricê' })
  expect(item().texto).toBe('Tricê cresce com comida e carinho: 0 de 5 dias.')
  for (const i of colecaoDoVale(s)) expect(i.texto).not.toMatch(/[—!?]/)
})
