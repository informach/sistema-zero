import { mock } from 'bun:test'
import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'
const previousEntry = process.env.PINTA_REVIEW_LEGACY_ENTRY!
const sharedDb = await import('../../../pinta/src/state/assetAuthorityDb')
mock.module(previousEntry.replace('persistence.ts', 'assetAuthorityDb.ts'), () => ({...sharedDb}))
const {createPintaPersistence: oldPersistence} = await import(previousEntry)

import { addObjectLayer } from '../../../pinta/src/tiles/tilemapOps'
import { createMapObject } from '../../../pinta/src/tiles/mapObjects'
import { isObjectLayer } from '../../../pinta/src/core/project'
import { pintaDoorBindings } from '../../../pinta/src/core/sceneMapClosure'
test('a porta do mapa editado conserva a folha transitiva que só a cabana observa',async()=>{
  const namespace='folha-observada-atraves-de-porta'
  const local = createPintaCausalPersistence({namespace})
  const older = oldPersistence({namespace})
  const sheet = createTilesetAsset({name:'folha',tileSize:8})
  sheet.tiles[0].data[0] = 3
  const ground=createTilesetAsset({name:'grama',tileSize:8})
  const cabin=createTilemapAsset({name:'cabana',cols:1,rows:1,tilesetId:sheet.id})
  cabin.layers.find(isTileLayer).cells[0]=0
  const map=addObjectLayer(createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:ground.id}),'portas')
  map.layers.find(isObjectLayer).objects.push(createMapObject({id:'porta',role:'door',properties:{destino:'cabana'}}))
  map.layers.find(isTileLayer).cells[0] = 0
  const original = await Promise.all([cloudAsset(sheet,1,'1'),cloudAsset(map,1),cloudAsset(cabin,1),cloudAsset(ground,1,'1')])
  await local.causal.applyPull({
    fromEpoch:null,epoch:'1',transitions:[sheet,map,cabin,ground].map((after,index)=>({
      id:after.id,before:null,beforeRevision:null,after,remote:original[index].entry,
    })),
  },()=>true)
  const newSheet = structuredClone(sheet)
  newSheet.tiles[0].data[0] = 7
  const officialMap = {...map,name:'vila-conta'}
  const remote = await Promise.all([cloudAsset(newSheet,2,'1'),cloudAsset(officialMap,2),original[2],original[3]])
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
    const observations=await Promise.all([ground.id,cabin.id].map(id=>local.loadAssetById(id)))
    const observedMap = await local.loadAssetById(map.id)
    await wrapper.persistAsset({...observedMap,name:'vila-do-aparelho'},{resources:observations.map(asset=>({id:asset.id,localRevision:pintaLocalRevisionOf(asset)}))})
    const syncOptions = {local:local.causal,cloud:transport,reader:6,signal:request.signal}
    await expect(flushPintaCausalOutbox(syncOptions)).rejects.toThrow('offline')
    const before = await local.causal.inFlight()
    expect(before.sealed.intent.members.map(member=>member.itemId)).toEqual([map.id])
    expect(before.sealed.intent.readSet.map(edge=>edge.targetId).sort()).toEqual([ground.id,cabin.id].sort())
    const oldSheet = await older.loadAssetById(sheet.id)
    const current = {...oldSheet,tiles:structuredClone(oldSheet.tiles)}
    current.tiles[0].data[0]=5
    await older.persistAsset(current)
    terminal = true
    const outcome = await syncPintaCausalAccount({...syncOptions,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})
    expect(outcome).toMatchObject({applied:true})
    const reopened = createPintaCausalPersistence({namespace})
    const docs = await reopened.listAllAssets()
    const byId = new Map(docs.map(item=>[item.id,item]))
    const maps = docs.filter(item=>item.kind==='tilemap')
    const pairs=maps.filter(item=>item.name.startsWith('vila')).map(item=>{
      const [door]=pintaDoorBindings(item,byId)
      const destination=door?.binding.type==='target'?byId.get(door.binding.id):undefined
      return [item.name,byId.get(destination?.tilesetId)?.tiles[0].data[0]]
    })
    expect(pairs).toContainEqual([expect.stringContaining('vila-do-aparelho'),3])
    expect(pairs).toContainEqual(['vila-conta',7])
    expect(docs.filter(item=>item.kind==='tileset').map(item=>item.tiles[0].data[0])).toContain(5)
    expect((await reopened.causal.inspect()).epoch).toBe('2')
    expect(await reopened.causal.inFlight()).toBeNull()
  } finally { wrapper.dispose?.() }
})
