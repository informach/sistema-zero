import { describe, expect, it } from 'bun:test'
import type { StudioProAssistanceRequest } from './pro-assistance'
import { studioProChangeScopeIssue } from './pro-change-scope'
import type { StudioProChange } from './pro-revision'

const request: StudioProAssistanceRequest = {
  version: 1,
  intent: 'change',
  scope: 'selection',
  criteria: [],
  selection: { path: 'main.ts', startLine: 2, endLine: 2, sourceHash: 'a'.repeat(64) },
}
const files = { 'main.ts': 'const a = 1\r\nconst b = 2\r\nconst c = 3\r\n' }
function change(content: string | null, path = 'main.ts'): StudioProChange {
  return {
    baseHash: 'a'.repeat(64),
    summary: 'teste',
    patches: [{ path, before: 'b'.repeat(64), content }],
  }
}
describe('line-scoped proposals', () => {
  it('counts CR-only lines without normalizing untouched content', () => {
    const source = { 'main.ts': 'first\rmiddle\rlast' }
    expect(studioProChangeScopeIssue(request, source, change('first\rnew\rlast'))).toBeNull()
    expect(studioProChangeScopeIssue(request, source, change('first\nnew\rlast'))).toContain(
      'fora das linhas',
    )
  })
  it('permits replacing or removing chosen lines and keeps exact CRLF outside them', () => {
    expect(
      studioProChangeScopeIssue(
        request,
        files,
        change('const a = 1\r\nconst b = 9\nconst d = 4\nconst c = 3\r\n'),
      ),
    ).toBeNull()
    expect(
      studioProChangeScopeIssue(request, files, change('const a = 1\r\nconst c = 3\r\n')),
    ).toBeNull()
  })
  it('rejects changes before, after, another file, deletion and directory changes', () => {
    for (const proposal of [
      change('const a = 9\r\nconst b = 2\r\nconst c = 3\r\n'),
      change('const a = 1\r\nconst b = 2\r\nconst c = 9\r\n'),
      change('hello', 'other.ts'),
      change(null),
      { ...change(files['main.ts']), directories: { before: [], after: ['new'] } },
      change('const a = 1\r\nmergedconst c = 3\r\n'),
    ])
      expect(studioProChangeScopeIssue(request, files, proposal)).toContain('fora das linhas')
  })
  it('requires real lines and permits broader changes only for a broader request', () => {
    expect(studioProChangeScopeIssue(request, {}, change('x'))).toContain('arquivo')
    expect(
      studioProChangeScopeIssue(
        { ...request, selection: { ...request.selection!, endLine: 9 } },
        files,
        change('x'),
      ),
    ).toContain('linhas')
    expect(
      studioProChangeScopeIssue({ ...request, scope: 'part' }, files, change('x', 'other.ts')),
    ).toBeNull()
    expect(
      studioProChangeScopeIssue(
        { ...request, selection: { ...request.selection!, startLine: 4, endLine: 4 } },
        files,
        change(`${files['main.ts']}fim`),
      ),
    ).toBeNull()
  })
})
