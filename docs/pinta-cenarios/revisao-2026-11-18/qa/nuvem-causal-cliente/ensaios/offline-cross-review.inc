import { mock } from 'bun:test'
import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'
const previousEntry = process.env.PINTA_REVIEW_LEGACY_ENTRY!
const sharedDb = await import('../../../pinta/src/state/assetAuthorityDb')
mock.module(previousEntry.replace('persistence.ts', 'assetAuthorityDb.ts'), () => ({...sharedDb}))
const {createPintaPersistence: oldPersistence} = await import(previousEntry)
const v3 = process.env.PINTA_REVIEW_V3_ENTRY!
const fromV3 = (part: string) => v3.replace(/pinta[\\/]src[\\/]state[\\/]persistence.ts$/, part)
mock.module(fromV3('pinta/src/state/assetAuthorityDb.ts'), () => ({...sharedDb}))
const {createPintaCausalPersistence: createV3} = await import(v3)
const {pintaLocalRevisionOf: v3Revision} = await import(fromV3('pinta/src/core/localAssetOrigin.ts'))
const {createCloudMirroredPintaPersistence: createV3Host} = await import(fromV3('member-shell/src/lib/pinta-cloud-persistence.ts'))
const {flushPintaCausalOutbox: flushV3} = await import(fromV3('member-shell/src/lib/pinta-causal-queue.ts'))
const {syncPintaCausalAccount: syncV3} = await import(fromV3('member-shell/src/lib/pinta-causal-sync.ts'))
const {PintaCausalRequestError: V3RequestError} = await import(fromV3('member-shell/src/lib/pinta-causal-cloud.ts'))

import { zipRetainedRecoveryFiles } from '../../../pinta/src/export/zip'
import { unzipSync } from '../../../pinta/node_modules/fflate'
test('um conflito de dependência anterior à v4 continua oferecendo download após reiniciar offline', async () => {
  const oldAlsoChangesMap = false
  const namespace = 'retomar-sem-rede-arquivo-legado'
  const local = createV3({namespace})
  const older = oldPersistence({namespace})
  const sheet = createTilesetAsset({name:'folha',tileSize:8})
  sheet.tiles[0].data[0] = 3
  const map = createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:sheet.id})
  map.layers.find(isTileLayer).cells[0] = 0
  const original = await Promise.all([cloudAsset(sheet,1,'1'),cloudAsset(map,1)])
  await local.causal.applyPull({
    fromEpoch:null,epoch:'1',transitions:[sheet,map].map((after,index)=>({
      id:after.id,before:null,beforeRevision:null,after,remote:original[index].entry,
    })),
  },()=>true)
  const newSheet = structuredClone(sheet)
  newSheet.tiles[0].data[0] = 7
  const officialMap = {...map,name:'vila-conta'}
  const remote = await Promise.all([cloudAsset(newSheet,2,'1'),cloudAsset(officialMap,2)])
  let terminal = false
  const request = new AbortController()
  const transport = {
    snapshot:async()=>({epoch:'2',requiredFormat:6,entries:remote.map(({entry})=>entry)}),
    verifyEpoch:async()=>{},backfill:async()=>{},
    download:async({itemId})=>remote.find(({entry})=>entry.itemId===itemId).gzip,
    upload:async()=>{
      if (!terminal) throw TypeError('offline')
      throw new V3RequestError(409,'epoch-changed')
    },
    settle:async()=>({state:'unknown'}),
  }
  const {cloud} = fakeCloud(map,1)
  const options = {local,cloud:{...cloud,pintaCausal:transport},viewerId:namespace,causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}}
  const wrapper = createV3Host(options)
  try {
    const observedSheet = await local.loadAssetById(sheet.id)
    const observedMap = await local.loadAssetById(map.id)
    await wrapper.persistAsset({...observedMap,name:'vila-do-aparelho'},{resources:[{id:sheet.id,localRevision:v3Revision(observedSheet)}]})
    const syncOptions = {local:local.causal,cloud:transport,reader:6,signal:request.signal}
    await expect(flushV3(syncOptions)).rejects.toThrow('offline')
    const before = await local.causal.inFlight()
    expect(before.sealed.intent.members.map(member=>member.itemId)).toEqual([map.id])
    expect(before.sealed.intent.readSet).toMatchObject([{consumerId:map.id,targetId:sheet.id,source:'snapshot'}])
    const oldSheet = await older.loadAssetById(sheet.id)
    const current = {...oldSheet,tiles:structuredClone(oldSheet.tiles)}
    current.tiles[0].data[0]=5
    const oldMap = await older.loadAssetById(map.id)
    if (oldAlsoChangesMap) await older.persistAssets([current,{...oldMap,name:'vila-antiga'}])
    else await older.persistAsset(current)
    terminal = true
    await expect(syncV3({...syncOptions,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})).rejects.toThrow()
    wrapper.dispose?.()
    const reopened = createPintaCausalPersistence({namespace})
    const offline = async()=>{throw TypeError('Sem rede')}
    const offlineTransport={snapshot:offline,download:offline,upload:offline,verifyEpoch:offline,backfill:offline,settle:offline}
    const offlineWrapper=createCloudMirroredPintaPersistence({...options,local:reopened,cloud:{...cloud,pintaCausal:offlineTransport},causal:{...options.causal,local:reopened.causal}})
    try {
      await offlineWrapper.listAllAssets()
      const files=await offlineWrapper.loadRetainedRecoveryFiles()
      const key=before.sealed.intent.opId+'/'+map.id+'.pinta.json.gz'
      expect(await pintaCausalGzipHash(await files.get(key).arrayBuffer())).toBe(before.sealed.intent.members[0].sha256)
      const zip=unzipSync(new Uint8Array(await (await zipRetainedRecoveryFiles(files)).arrayBuffer()))
      const native=await new Response(new Blob([zip[key]]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
      expect(reopened.causal.decodeCandidate(native)).toMatchObject({id:map.id,name:'vila-do-aparelho',tilesetId:sheet.id})
      expect(Object.keys(zip).sort()).toEqual([key,'LEIA-ME.txt'].sort())
      expect((await reopened.causal.inspect()).epoch).toBe('1')
      expect(offlineWrapper.needsRetainedRecovery()).toBe(true)
    } finally {offlineWrapper.dispose?.()}
  } finally { wrapper.dispose?.() }
})
