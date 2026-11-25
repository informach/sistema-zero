import { sha256 } from '../../src/artifacts'
import {
  currentPublishedSource,
  type PublicationBucket,
  publicationCommand,
  purgePublication,
  retirePublicationReservation,
} from '../../src/publications'

export default {
  async fetch(_request: Request, env: { QA_BUCKET: PublicationBucket }) {
    const bucket = env.QA_BUCKET
    const playId = crypto.randomUUID()
    const owner = 'a'.repeat(64)
    const base = {
      operation: 'promote-classic',
      playId,
      owner,
      projectId: 'native-r2-game',
      parentOrigin: 'https://kids.test',
    }
    const source = (code: string) =>
      JSON.stringify({ id: base.projectId, files: { 'script.js': code } })
    const promote = (text: string, expectedVersion: number, requestId = crypto.randomUUID()) =>
      publicationCommand(bucket, { ...base, source: text, expectedVersion, requestId })
    try {
      const first = await promote(source('first()'), 0)
      if (!first || !('activeRevision' in first)) throw new Error('Missing first revision')
      const requestId = crypto.randomUUID()
      const second = await promote(source('second()'), 1, requestId)
      if (!second || !('activeRevision' in second)) throw new Error('Missing second revision')
      const replay = await promote(source('second()'), 1, requestId)
      let staleRefused = false
      try {
        await promote(source('stale()'), 1)
      } catch (error) {
        staleRefused = error instanceof Error && 'status' in error && error.status === 409
      }
      const current = await currentPublishedSource(bucket, playId)
      const disable = await publicationCommand(bucket, {
        operation: 'activate',
        playId,
        owner,
        requestId: crypto.randomUUID(),
        expectedVersion: 2,
        revision: first.activeRevision,
        disabled: true,
      })
      const disabledSource = await currentPublishedSource(bucket, playId)
      const restore = await publicationCommand(bucket, {
        operation: 'activate',
        playId,
        owner,
        requestId: crypto.randomUUID(),
        expectedVersion: 3,
        revision: first.activeRevision,
        disabled: false,
      })
      const restoredSource = await currentPublishedSource(bucket, playId)
      const reservedPlayId = crypto.randomUUID()
      const reservedSource = source('reserved()')
      await publicationCommand(bucket, {
        ...base,
        playId: reservedPlayId,
        source: reservedSource,
        expectedVersion: 0,
        requestId: crypto.randomUUID(),
      })
      const retirement = {
        playId: reservedPlayId,
        owner,
        snapshotHash: await sha256(new TextEncoder().encode(reservedSource)),
        retirementHash: 'b'.repeat(64),
      }
      await retirePublicationReservation(bucket, retirement)
      await retirePublicationReservation(bucket, retirement)
      const retiredSource = await currentPublishedSource(bucket, reservedPlayId)
      await purgePublication(bucket, playId)
      return Response.json({
        firstVersion: first.version,
        secondVersion: second.version,
        replayVersion: replay && 'version' in replay ? replay.version : null,
        sameLink: first.playId === second.playId,
        historyLength: second.revisions.length,
        staleRefused,
        updatedSource: current?.source === source('second()'),
        disabled: disable && 'disabled' in disable ? disable.disabled : null,
        disabledSource: disabledSource === null,
        restoredVersion: restore && 'version' in restore ? restore.version : null,
        restoredSource: restoredSource?.source === source('first()'),
        retiredSource: retiredSource === null,
        purgedSource: (await currentPublishedSource(bucket, playId)) === null,
      })
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    }
  },
}
