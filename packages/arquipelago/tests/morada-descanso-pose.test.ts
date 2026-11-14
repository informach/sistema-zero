import { expect, test } from 'bun:test'
import { AVATAR_CATALOG } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { createMoradaHouse } from '@sistemazero/avatar-quarto/morada/catalog'
import { moradaRestPose } from '../src/sistemas/morada-descanso'

test('a cadeira inicial tem assento nativo, separado da cápsula que fica ao lado', () => {
  const house = createMoradaHouse(),
    chair = house.instances.find((i) => i.id === 'cadeira-inicial')!
  const pose = moradaRestPose(house, chair, 'sentar')!
  const seat = Number(
    AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === 'sentado')!.place!.assento_m,
  )
  expect(pose.visual[1] + seat).toBeCloseTo(0.5)
  expect(pose.candidates.every((c) => c[0] !== pose.visual[0] || c[2] !== pose.visual[2])).toBe(
    true,
  )
  const rotated = {
    ...chair,
    rotation: Math.PI / 2,
    position: [1, 0, 2] as [number, number, number],
  }
  const second = moradaRestPose(house, rotated, 'sentar')!
  expect(second.rotation).toBeCloseTo(Math.PI / 2)
  expect(second.visual[0]).toBeCloseTo(1)
  expect(second.visual[2]).toBeCloseTo(2)
})
test('cama deitar usa a superfície do colisor e acompanha cômodo elevado', () => {
  const house = createMoradaHouse(),
    bed = house.instances.find((i) => i.id === 'cama-inicial')!
  house.rooms[0]!.origin = [4, 3.2, 2]
  const pose = moradaRestPose(house, bed, 'deitar')!
  expect(pose.visual[1]).toBeCloseTo(3.2 + 0.53)
  expect(pose.visual[0]).toBeCloseTo(4 + bed.position[0])
  expect(moradaRestPose(house, bed, 'sentar')).toBeNull()
})
