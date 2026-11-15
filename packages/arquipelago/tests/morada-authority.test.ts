import { expect, test } from 'bun:test'
import { criarSalvamentoInicial, type Plataforma } from '@sistemazero/arquipelago-contracts'
import {
  createMoradaHouse,
  MORADA_CATALOG,
  MORADA_PRICES,
  type MoradaHouse,
} from '@sistemazero/avatar-quarto/morada/catalog'
import { criarLoja } from '../src/estado/loja'
import { createCasaMoradaStore, podeConstruirMorada } from '../src/estado/morada'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { OBRA_VAZIA } from '../src/sistemas/construcao/lote'
import { moradaWithGarden } from '../src/sistemas/morada'
import { petDaMorada } from '../src/sistemas/pet-morada'

const now = new Date('2026-11-14T12:00:00Z')
function game() {
  const saved = criarSalvamentoInicial(now)
  saved.casa.portaNova = true
  return criarLoja({
    salvamento: saved,
    jornada: 8,
    quarto: { theme: 'padrao', placedItems: [], pet: null },
    avatar: { slots: {} },
    acesso: {
      liberado: true,
      somenteLeitura: false,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
    },
    aoMudar() {},
  })
}
function memory() {
  const values = new Map<string, string>()
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v)
    },
    removeItem: (k: string) => {
      values.delete(k)
    },
  }
}
function setup() {
  const source = game()
  const platform = criarPlataformaFalsa({ persistir: false })
  let house = moradaWithGarden(createMoradaHouse(), source.getState().salvamento)
  house = {
    ...house,
    migrations: ['arquipelago-functions-v1'],
    rooms: house.rooms.map((r) => ({ ...r, label: 'Minha casa' })),
  }
  const envelope = { house, revision: 1, owned: [] as string[] }
  platform.lerCasaMorada = async () => structuredClone(envelope)
  platform.salvarCasaMorada = async (request) => {
    if (request.revision !== envelope.revision)
      throw Object.assign(new Error('CAS'), { current: structuredClone(envelope) })
    envelope.house = structuredClone(request.house)
    envelope.revision++
    return structuredClone(envelope)
  }
  const storage = memory()
  return {
    source,
    platform,
    envelope,
    storage,
    store: createCasaMoradaStore(source, platform, storage),
  }
}
function visit(house: MoradaHouse) {
  return {
    perfilId: 'visitado',
    nome: 'Outra pessoa',
    obra: null,
    horta: [],
    completos: [],
    quarto: { theme: 'padrao' as const, placedItems: [], pet: null, house },
  }
}
function rename(house: MoradaHouse, label: string) {
  return { ...house, rooms: house.rooms.map((r) => ({ ...r, label })) }
}
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

test('envelope real owned vazio permite móveis grátis e recusa troféu não conquistado', async () => {
  const { store } = setup()
  await store.getState().enter(true)
  expect(store.getState().edit(rename(store.getState().house!, 'Editada'))).toBe(true)
  const house = store.getState().house!
  const trophy = Object.values(MORADA_CATALOG.pieces).find((p) => p.id.startsWith('trophy/'))!
  expect(
    store.getState().edit({
      ...house,
      instances: [
        ...house.instances,
        { id: 'unearned', pieceId: trophy.id, position: [10, 0, 0], rotation: 0 },
      ],
    }),
  ).toBe(false)
})
test('playground usa owned somente para troféus, igual Members', async () => {
  const platform = criarPlataformaFalsa({ persistir: false })
  expect((await platform.lerCasaMorada!()).owned.every((id) => id.startsWith('trophy/'))).toBe(true)
})
test('fim da visita restaura a própria casa e não transforma casa visitada em própria', async () => {
  const { store, source, envelope } = setup()
  await store.getState().enter()
  source.getState().visitar(visit(rename(envelope.house, 'Visitada')))
  await store.getState().load()
  expect(store.getState().house!.rooms[0]!.label).toBe('Visitada')
  source.getState().visitar(null)
  await Promise.resolve()
  expect(store.getState().house!.rooms[0]!.label).toBe('Minha casa')
})
test('resposta antiga de leitura própria não substitui visita ativa', async () => {
  const { store, source, platform, envelope } = setup()
  const pending = deferred<Awaited<ReturnType<NonNullable<Plataforma['lerCasaMorada']>>>>()
  platform.lerCasaMorada = () => pending.promise
  const opening = store.getState().enter()
  source.getState().visitar(visit(rename(envelope.house, 'Visitada')))
  await store.getState().load()
  pending.resolve(envelope)
  await opening
  expect(store.getState().house!.rooms[0]!.label).toBe('Visitada')
})
test('sair offline fecha imediatamente e conserva rascunho próprio para retomar', async () => {
  const { store, platform, storage, source } = setup()
  await store.getState().enter(true)
  platform.salvarCasaMorada = async () => {
    throw new TypeError('offline')
  }
  store.getState().edit(rename(store.getState().house!, 'Rascunho'))
  await store.getState().close()
  expect(store.getState().open).toBe(false)
  expect(source.getState().dentroDeCasa).toBe(false)
  expect(storage.getItem('morada:casa:v1:kids:perfil-de-teste')).toContain('Rascunho')
  await store.getState().enter(true)
  expect(store.getState().house!.rooms[0]!.label).toBe('Rascunho')
})
test('migração canônica revisão1 importa funções do térreo e do andar', async () => {
  const { store, source, platform, envelope } = setup()
  delete envelope.house.migrations
  source.getState().mudar((saved) => ({
    ...saved,
    projetos: {
      forno: { ganhoEm: now.toISOString(), aparencia: null, aparencias: [] },
      geladeira: { ganhoEm: now.toISOString(), aparencia: null, aparencias: [] },
    },
    construcao: {
      ...saved.construcao,
      casa: {
        ...OBRA_VAZIA,
        objetos: [{ id: 'forno', x: 0, z: 0, giro: 0 }],
      },
    },
  }))
  const buscar = platform.servico.buscar
  platform.servico.buscar = async (path, options) =>
    path === '/obra-estendida'
      ? {
          status: 200,
          corpo: {
            revisao: 1,
            obra: {
              versao: 1,
              iglu: null,
              terreno: null,
              andar: {
                escada: null,
                paredes: [],
                aberturas: [],
                pisos: [],
                objetos: [{ id: 'geladeira', x: 0, z: 0, giro: 0 }],
              },
            },
          },
        }
      : buscar(path, options)
  await store.getState().enter(true)
  expect(
    store
      .getState()
      .house!.instances.filter((i) => i.behavior)
      .map((i) => i.behavior)
      .sort(),
  ).toEqual(['objeto:forno', 'objeto:geladeira'])
})

test('rascunho próprio não se perde ao visitar, e salvar resposta antiga não contamina a visita', async () => {
  const { store, source, platform, envelope, storage } = setup()
  await store.getState().enter(true)
  const own = rename(store.getState().house!, 'Rascunho próprio')
  expect(store.getState().edit(own)).toBe(true)
  const pending = deferred<Awaited<ReturnType<NonNullable<Plataforma['salvarCasaMorada']>>>>()
  platform.salvarCasaMorada = () => pending.promise
  const saving = store.getState().save()
  source.getState().visitar(visit(rename(envelope.house, 'Visitada')))
  pending.resolve({ ...envelope, house: own, revision: 2 })
  expect(await saving).toBe(false)
  expect(store.getState().house!.rooms[0]!.label).toBe('Visitada')
  expect(store.getState().revision).toBe(0)
  expect(storage.getItem('morada:casa:v1:kids:perfil-de-teste')).toContain('Rascunho próprio')
  source.getState().visitar(null)
  expect(store.getState().house!.rooms[0]!.label).toBe('Rascunho próprio')
  expect(store.getState().dirty).toBe(true)
  expect(source.getState().quarto.house!.rooms[0]!.label).toBe('Rascunho próprio')
})
test('rede pendurada não prende saída e backup só some depois da confirmação', async () => {
  const { store, platform, storage } = setup()
  await store.getState().enter(true)
  expect(store.getState().edit(rename(store.getState().house!, 'Pendente'))).toBe(true)
  const pending = deferred<Awaited<ReturnType<NonNullable<Plataforma['salvarCasaMorada']>>>>()
  platform.salvarCasaMorada = () => pending.promise
  await store.getState().close()
  expect(store.getState().open).toBe(false)
  expect(storage.getItem('morada:casa:v1:kids:perfil-de-teste')).toContain('Pendente')
  pending.resolve({ house: store.getState().house!, revision: 2, owned: [] })
  await Promise.resolve()
  await Promise.resolve()
})
test('marcador canônico mantém removida uma função importada, inclusive em outro cliente', async () => {
  const { store, source, platform, envelope } = setup()
  delete envelope.house.migrations
  source.getState().mudar((saved) => ({
    ...saved,
    projetos: { forno: { ganhoEm: now.toISOString(), aparencia: null, aparencias: [] } },
    construcao: {
      ...saved.construcao,
      casa: { ...OBRA_VAZIA, objetos: [{ id: 'forno', x: 0, z: 0, giro: 0 }] },
    },
  }))
  await store.getState().enter(true)
  expect(store.getState().house!.migrations).toEqual(['arquipelago-functions-v1'])
  expect(await store.getState().save()).toBe(true)
  const house = store.getState().house!
  expect(
    store
      .getState()
      .edit({ ...house, instances: house.instances.filter((i) => i.behavior !== 'objeto:forno') }),
  ).toBe(true)
  expect(await store.getState().save()).toBe(true)
  const second = createCasaMoradaStore(source, platform, memory())
  await second.getState().enter(true)
  expect(second.getState().house!.instances.some((i) => i.behavior === 'objeto:forno')).toBe(false)
})
test('falha na leitura do andar não marca importação final e permite recuperar depois', async () => {
  const { store, source, platform, envelope } = setup()
  delete envelope.house.migrations
  const buscar = platform.servico.buscar
  platform.servico.buscar = async (path, options) =>
    path === '/obra-estendida' ? { status: 503, corpo: {} } : buscar(path, options)
  await store.getState().enter(true)
  expect(store.getState().status).toBe('ready')
  expect(store.getState().house!.migrations).toBeUndefined()
  platform.servico.buscar = buscar
  await store.getState().load()
  expect(store.getState().house!.migrations).toEqual(['arquipelago-functions-v1'])
  expect(source.getState().salvamento.projetos).toEqual({})
})
test('projeção própria preserva troca e remoção do pet, sem adotar pet de visita', async () => {
  const { store, source, envelope } = setup()
  const pets = Object.values(MORADA_CATALOG.pieces)
    .filter((p) => p.kind === 'pet')
    .slice(0, 2)
  // Os bichinhos são pagos (14/11/2026): a troca vale entre os que são dela.
  envelope.owned = pets.map((p) => p.id)
  await store.getState().enter(true)
  for (const pet of [pets[0]!.id, pets[1]!.id, null]) {
    expect(store.getState().edit({ ...store.getState().house!, pet })).toBe(true)
    expect(petDaMorada(source.getState().quarto)).toBe(pet)
  }
  source.getState().visitar(visit({ ...envelope.house, pet: pets[0]!.id }))
  expect(petDaMorada(source.getState().quarto)).toBeNull()
  source.getState().visitar(null)
  expect(petDaMorada(source.getState().quarto)).toBeNull()
})
test('peça paga ou bichinho que não são dela não entram; o que já está na casa continua', async () => {
  const { store, envelope } = setup()
  // Uma peça paga pequena, de chão, no meio do quarto.
  const paga = Object.keys(MORADA_PRICES).find((id) => {
    const p = MORADA_CATALOG.pieces[id]
    return (
      MORADA_PRICES[id]?.tier === 'coins' &&
      p?.mount === 'floor' &&
      p.size[0] < 0.8 &&
      p.size[2] < 0.8
    )
  })
  const pet = Object.values(MORADA_CATALOG.pieces).find((p) => p.kind === 'pet')?.id
  if (!paga || !pet) throw new Error('sem peça paga ou bichinho')
  const comPaga = (h: MoradaHouse): MoradaHouse => ({
    ...h,
    instances: [
      ...h.instances,
      { id: 'sofa', pieceId: paga, position: [1, 0, 1], rotation: 0, roomId: h.roomId },
    ],
  })
  await store.getState().enter(true)
  expect(store.getState().edit({ ...store.getState().house!, pet })).toBe(false)
  expect(store.getState().error).toMatch(/Meu quarto/)
  // A casa guardada já tinha a peça paga e o bichinho: continuam valendo para editar.
  const outro = setup()
  outro.envelope.house = { ...comPaga(outro.envelope.house), pet }
  await outro.store.getState().enter(true)
  const casa = outro.store.getState().house!
  expect(outro.store.getState().edit(rename(casa, 'Com o que já tinha'))).toBe(true)
  expect(envelope.owned).toEqual([])
})
test('modo e operação de construir conservam porta, corrida, suporte, conciliação e resultado como guardas', async () => {
  const { store, source } = setup()
  const state = source.getState()
  expect(podeConstruirMorada(state)).toBe(true)
  for (const patch of [
    { salvamento: { ...state.salvamento, casa: { ...state.salvamento.casa, portaNova: false } } },
    {
      corrida: {
        percurso: 'bosque-copas' as const,
        tempoMs: 0,
        estrelas: 0 as const,
        vagalumes: 0,
        totalDeVagalumes: 3,
      },
    },
    { acesso: { ...state.acesso, somenteLeitura: true } },
    { salvamentoSituacao: 'conflito' as const },
    {
      resultado: {
        melhor: { melhorTempoMs: 0, estrelas: { chegada: true, tempo: false, vagalumes: false } },
        recorde: false,
        percurso: 'bosque-copas' as const,
        tempoMs: 0,
        estrelas: { chegada: true, tempo: false, vagalumes: false },
        vagalumes: 0,
        totalDeVagalumes: 3,
      },
    },
  ]) {
    expect(podeConstruirMorada({ ...state, ...patch })).toBe(false)
  }
  source.getState().mudar((saved) => ({ ...saved, casa: { ...saved.casa, portaNova: false } }))
  await store.getState().enter(true)
  expect(store.getState().open).toBe(false)
})

test('host sem método de gravação falha com erro claro e libera a tentativa seguinte sem TDZ', async () => {
  const { store, platform } = setup()
  await store.getState().enter(true)
  expect(store.getState().edit(rename(store.getState().house!, 'Host antigo'))).toBe(true)
  delete platform.salvarCasaMorada
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(await store.getState().save()).toBe(false)
    expect(store.getState().status).toBe('error')
    expect(store.getState().error).toContain('versão da plataforma')
    expect(store.getState().dirty).toBe(true)
  }
  await store.getState().close()
  expect(store.getState().open).toBe(false)
})

test('descanso mantém a instância escolhida e termina ao construir ou sair', async () => {
  const { store, source } = setup()
  await store.getState().enter()
  store.getState().rest('cadeira-inicial', 'sentar')
  expect(store.getState().resting).toEqual({ instanceId: 'cadeira-inicial', mode: 'sentar' })
  expect(source.getState().descanso).toBe('sentar')
  store.getState().setEditing(true)
  expect(store.getState().resting).toBeNull()
  expect(source.getState().descanso).toBeNull()
  store.getState().rest('cama-inicial', 'deitar')
  expect(store.getState().resting).toBeNull()
  store.getState().setEditing(false)
  store.getState().rest('cama-inicial', 'deitar')
  expect(store.getState().resting?.mode).toBe('deitar')
  await store.getState().close()
  expect(store.getState().resting).toBeNull()
  expect(source.getState().descanso).toBeNull()
})

test('CAS atualiza a autoridade dos troféus junto com a revisão da casa', async () => {
  const { store, envelope } = setup()
  await store.getState().enter(true)
  expect(store.getState().edit(rename(store.getState().house!, 'Rascunho'))).toBe(true)
  const trophy = Object.values(MORADA_CATALOG.pieces).find((p) => p.id.startsWith('trophy/'))!
  envelope.owned.push(trophy.id)
  envelope.revision++
  expect(await store.getState().save()).toBe(false)
  expect(store.getState().owned).toContain(trophy.id)
  store.getState().recover()
  const house = store.getState().house!
  expect(
    store.getState().edit({
      ...house,
      instances: [
        ...house.instances,
        { id: 'earned', pieceId: trophy.id, position: [10, 0, 0], rotation: 0 },
      ],
    }),
  ).toBe(true)
})
