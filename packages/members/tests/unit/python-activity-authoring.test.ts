import { expect, test } from 'bun:test'
import {
  type SectionProjectCheck,
  sectionProjectChecksEnvironmentIssue,
} from '@sistemazero/core/learning'
import { authoringFixture } from '../fakes/studio-authoring-policy'

test('section objectives keep language and profile consistent with the initial project', async () => {
  const { project } = await authoringFixture('python', 'pro')
  const pythonCheck: SectionProjectCheck = {
    id: 'loop',
    label: 'Laço',
    programmingLanguage: 'python',
    profileId: project.runtime.profileId,
    rule: { type: 'usesLoop' },
  }
  const javascriptCheck: SectionProjectCheck = {
    id: 'loop',
    label: 'Laço',
    rule: { type: 'usesLoop' },
  }
  expect(sectionProjectChecksEnvironmentIssue([pythonCheck], project)).toBeNull()
  expect(sectionProjectChecksEnvironmentIssue([javascriptCheck], project)).toMatch(/linguagem/)
  const { project: js } = await authoringFixture('javascript', 'classic')
  expect(sectionProjectChecksEnvironmentIssue([pythonCheck], js)).toMatch(/linguagem/)
  expect(
    sectionProjectChecksEnvironmentIssue(
      [{ ...pythonCheck, profileId: 'another-profile' }],
      project,
    ),
  ).toMatch(/perfil/)
  expect(sectionProjectChecksEnvironmentIssue([javascriptCheck], js)).toBeNull()
})
