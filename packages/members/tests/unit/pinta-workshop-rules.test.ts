import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type {
  PintaCausalAttestation,
  PintaCausalIntent,
  PintaCausalManifest,
  PintaCausalMember,
} from '@sistemazero/core/creations/pinta-causal'
import { verifyPintaGraph } from '../../src/domain/creations/pinta-causal-graph'

test('o livro observa a folha inteira sob o mesmo lock, inclusive quando os exemplos não usam slots', () => {
  const id = randomUUID(),
    first = 'a'.repeat(64),
    next = 'b'.repeat(64),
    time = new Date().toISOString()
  function item(name: string, kind: 'tilemap' | 'tileset', hash: string, revision: number) {
    const member: Extract<PintaCausalMember, { action: 'put' }> = {
      itemId: name,
      name,
      kind,
      bytes: 99,
      action: 'put',
      sha256: hash,
      baseRevision: revision,
      itemUpdatedAt: time,
      formatVersion: 8,
      operation: { type: revision ? 'update' : 'create' },
    }
    const manifest: PintaCausalManifest = {
      version: 1,
      itemId: name,
      name,
      kind,
      nativeSchema: kind === 'tilemap' ? 9 : 0,
      backupVersion: kind === 'tilemap' ? 9 : 1,
      requiredNativeSchema: kind === 'tilemap' ? 9 : 0,
      doorSelectors: [],
      refs:
        kind === 'tilemap'
          ? [{ id: 'folha', roles: ['default-sheet'], ruleSheetSha256: hash }]
          : [],
      ...(kind === 'tileset' ? { sheet: { count: 1, tileSize: 16, ruleSheetSha256: hash } } : {}),
    }
    const proof: PintaCausalAttestation = {
      purpose: 'pinta-unit-content-v1',
      binding: {
        namespace: { userId: id, audience: 'kids', tool: 'pinta' },
        opId: id,
        intentHash: first,
        baseEpoch: '0',
        baseRevision: revision,
        revision: revision + 1,
        baseSha256: revision ? first : null,
        candidateSha256: hash,
        itemId: name,
        nonce: id,
        expiresAt: time,
      },
      manifest,
      transitions: [],
    }
    return { member, proof }
  }
  function unit(...entries: ReturnType<typeof item>[]) {
    const intent: PintaCausalIntent = {
      protocol: 1,
      baseEpoch: '0',
      opId: id,
      reader: 8,
      members: entries.map((e) => e.member),
      readSet: entries.some((e) => e.member.kind === 'tilemap')
        ? [{ source: 'unit', consumerId: 'mapa', targetId: 'folha' }]
        : [],
    }
    return [intent, new Map(entries.map((e) => [e.member.itemId, e.proof]))] as const
  }
  const empty = new Map()
  const atlas = item('folha', 'tileset', first, 0),
    map = item('mapa', 'tilemap', first, 0)
  const graph = verifyPintaGraph(empty, ...unit(atlas, map), '1')
  expect(graph.size).toBe(2)
  const painted = item('folha', 'tileset', next, 1)
  expect(() => verifyPintaGraph(graph, ...unit(painted), '2')).toThrow('missing-consumer')
  const rebound = item('mapa', 'tilemap', next, 1)
  expect(verifyPintaGraph(graph, ...unit(painted, rebound), '2').get('mapa')?.revision).toBe(2)
  delete atlas.proof.manifest!.sheet!.ruleSheetSha256
  expect(() => verifyPintaGraph(empty, ...unit(atlas, map), '1')).toThrow('missing-consumer')
})
