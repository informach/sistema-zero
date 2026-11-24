import { expect, mock, test } from 'bun:test'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { regionalSceneMaterial } from '../../studio/src/testing/pintaRegionalMaterialFixture'

mock.module('server-only', () => ({}))
const { prepareStudioPublicProject, studioPublicProject, studioGameFingerprint } = await import(
  '../src/server/studio-publication'
)

test('a publicação admite o PNG completo, retira somente os vínculos privados e mantém a impressão ao reabrir', async () => {
  const material = await regionalSceneMaterial()
  const project = {
    ...createBlankProjectSnapshot('regional-publication', 'Vila'),
    assets: [{ ...material, libRevision: 123 }],
  }
  const before = JSON.stringify(project)
  const published = await prepareStudioPublicProject(project)
  expect(published.assets?.[0]?.dataUrl).toBe(material.dataUrl)
  expect(published.assets?.[0]?.regional).toEqual(material.regional)
  expect(published.assets?.[0]?.libId).toBeUndefined()
  expect(published.assets?.[0]?.libRevision).toBeUndefined()
  expect(published.assets?.[0]?.libOrigin).toBeUndefined()
  expect(
    studioGameFingerprint(await prepareStudioPublicProject(JSON.parse(JSON.stringify(published)))),
  ).toBe(studioGameFingerprint(published))
  expect(JSON.stringify(project)).toBe(before)
  expect(() => studioPublicProject(project)).toThrow('O original foi preservado')
  await expect(
    prepareStudioPublicProject({
      ...project,
      assets: [{ ...material, regional: { ...material.regional, sha256: 'f'.repeat(64) } }],
    }),
  ).rejects.toThrow()
})
