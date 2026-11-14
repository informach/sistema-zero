import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import type { MoradaHouse } from '@sistemazero/avatar-quarto/morada/catalog'
import { MoradaHouseService } from '../../members/src/application/room/morada-house.service'
import type {
  MoradaHouseRecord,
  MoradaHouseRepository,
} from '../../members/src/domain/ports/morada-house-repository.port'
import { criarLoja } from '../src/estado/loja'
import { createCasaMoradaStore } from '../src/estado/morada'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'

test('o jogo edita e grava a resposta real do Members com owned vazio, sem liberar troféus', async () => {
  const rows = new Map<string, MoradaHouseRecord>()
  const repo: MoradaHouseRepository = {
    get: async (user, audience) => structuredClone(rows.get(`${user}:${audience}`) ?? null),
    compareAndSwap: async (user, _account, audience, revision, house) => {
      const key = `${user}:${audience}`
      if ((rows.get(key)?.revision ?? 0) !== revision) return null
      const saved = { house: structuredClone(house), revision: revision + 1 }
      rows.set(key, saved)
      return structuredClone(saved)
    },
  }
  const now = new Date('2026-11-14T12:00:00Z')
  const members = new MoradaHouseService(
    repo,
    {
      getState: async () => null,
      listInventory: async () => [],
      upsertState: async () => {},
      addToInventory: async () => ({ added: true }),
    },
    () => now,
  )
  const platform = criarPlataformaFalsa({ posicao: 8, persistir: false })
  platform.lerCasaMorada = () => members.read(platform.perfil.id, 'kids')
  platform.salvarCasaMorada = (input) =>
    members.save(platform.perfil.id, 'conta-do-responsavel', 'kids', input)
  const initial = await platform.lerCasaMorada()
  expect(initial.owned).toEqual([])
  const store = criarLoja({
    salvamento: criarSalvamentoInicial(now),
    jornada: 8,
    quarto: { theme: 'padrao', placedItems: [], pet: null },
    avatar: { slots: {} },
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
      somenteLeitura: false,
    },
    aoMudar: () => {},
  })
  store.getState().mudar((save) => ({ ...save, casa: { ...save.casa, portaNova: true } }))
  const houseStore = createCasaMoradaStore(store, platform, null)
  await houseStore.getState().enter(true)
  const original = houseStore.getState().house!
  const changed: MoradaHouse = {
    ...original,
    instances: original.instances.map((instance) =>
      instance.id === 'cadeira-inicial'
        ? { ...instance, position: [1, instance.position[1], -1] }
        : instance,
    ),
  }
  expect(houseStore.getState().edit(changed)).toBe(true)
  expect(await houseStore.getState().save()).toBe(true)
  const saved = await platform.lerCasaMorada()
  expect(
    saved.house.instances.find((instance) => instance.id === 'cadeira-inicial')?.position[0],
  ).toBe(1)
  expect(saved.owned).toEqual([])
  const trophy = initial.house.instances[0]!
  const unauthorized: MoradaHouse = {
    ...saved.house,
    instances: [
      ...saved.house.instances,
      { ...trophy, id: 'trofeu-forjado', pieceId: 'trophy/trofeu-chama', position: [0, 1.5, 0] },
    ],
  }
  expect(houseStore.getState().edit(unauthorized)).toBe(false)
  await expect(
    members.save(platform.perfil.id, 'conta-do-responsavel', 'kids', {
      house: unauthorized,
      revision: saved.revision,
    }),
  ).rejects.toThrow('Troféu ainda não conquistado')
})
