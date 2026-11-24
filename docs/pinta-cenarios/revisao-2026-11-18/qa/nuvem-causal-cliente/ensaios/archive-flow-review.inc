import { mock } from 'bun:test'
import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'
const previousEntry = process.env.PINTA_REVIEW_LEGACY_ENTRY!
const sharedDb = await import('../../../pinta/src/state/assetAuthorityDb')
mock.module(previousEntry.replace('persistence.ts', 'assetAuthorityDb.ts'), () => ({...sharedDb}))
const {createPintaPersistence: oldPersistence} = await import(previousEntry)

for (const oldAlsoChangesMap of [false, true]) test('uma folha externa sem a revisão observada exige o grafo completo, writer também altera mapa ' + oldAlsoChangesMap, async () => {
  const namespace = 'folha-externa-perdida-' + oldAlsoChangesMap
  const local = createPintaCausalPersistence({namespace})
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
      throw new PintaCausalRequestError(409,'epoch-changed')
    },
    settle:async()=>({state:'unknown'}),
  }
  const {cloud} = fakeCloud(map,1)
  const options = {local,cloud:{...cloud,pintaCausal:transport},viewerId:namespace,causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}}
  const wrapper = createCloudMirroredPintaPersistence(options)
  try {
    const observedSheet = await local.loadAssetById(sheet.id)
    const observedMap = await local.loadAssetById(map.id)
    await wrapper.persistAsset({...observedMap,name:'vila-do-aparelho'},{resources:[{id:sheet.id,localRevision:pintaLocalRevisionOf(observedSheet)}]})
    const syncOptions = {local:local.causal,cloud:transport,reader:6,signal:request.signal}
    await expect(flushPintaCausalOutbox(syncOptions)).rejects.toThrow('offline')
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
    const outcome = await syncPintaCausalAccount({...syncOptions,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})
    expect(outcome).toMatchObject({applied:true})
    const reopened = createPintaCausalPersistence({namespace})
    const docs = await reopened.listAllAssets()
    const byId = new Map(docs.map(item=>[item.id,item]))
    const maps = docs.filter(item=>item.kind==='tilemap')
    const pairs = maps.map(item=>[item.name,byId.get(item.tilesetId)?.tiles[0].data[0]])
    expect(pairs).toContainEqual([expect.stringContaining('vila-do-aparelho'),3])
    expect(pairs).toContainEqual(['vila-conta',7])
    expect(docs.filter(item=>item.kind==='tileset').map(item=>item.tiles[0].data[0])).toContain(5)
    if (oldAlsoChangesMap) expect(pairs).toContainEqual([expect.stringContaining('vila-antiga'),5])
    expect((await reopened.causal.inspect()).epoch).toBe('2')
    expect(await reopened.causal.inFlight()).toBeNull()
  } finally { wrapper.dispose?.() }
})
