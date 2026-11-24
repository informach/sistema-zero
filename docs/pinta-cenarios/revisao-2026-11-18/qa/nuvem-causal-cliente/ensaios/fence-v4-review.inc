import { mock } from 'bun:test'
import { idbMockDb } from '../../../pinta/src/testing/idbMock'

test('o gravador causal v3 recusa um estoque v4 e o escritor atual continua a edição',async()=>{
  const v3Entry=process.env.PINTA_REVIEW_V3_ENTRY!
  const v3Host=v3Entry.replace(/pinta[\\/]src[\\/]state[\\/]persistence.ts$/,'member-shell/src/lib/pinta-cloud-persistence.ts')
  const shared=await import('../../../pinta/src/state/assetAuthorityDb')
  mock.module(v3Entry.replace('persistence.ts','assetAuthorityDb.ts'),()=>({...shared}))
  const {createPintaCausalPersistence:createV3}=await import(v3Entry)
  const {createCloudMirroredPintaPersistence:hostV3}=await import(v3Host)
  const ns='cerca-v4',local=createPintaCausalPersistence({namespace:ns})
  const sheet=createTilesetAsset({name:'folha',tileSize:8})
  const map=createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:sheet.id})
  const remote=await Promise.all([cloudAsset(sheet,1,'1'),cloudAsset(map,1)])
  await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[sheet,map].map((after,i)=>({id:after.id,before:null,beforeRevision:null,after,remote:remote[i].entry}))},()=>true)
  const {cloud}=fakeCloud(map,1)
  const idle=async()=>{throw TypeError('offline')}
  const transport={...cloud,pintaCausal:{snapshot:idle,upload:idle,download:idle,verifyEpoch:idle,backfill:idle}}
  const port=store=>({local:store,cloud:transport,viewerId:ns,causal:{local:store.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
  const current=createCloudMirroredPintaPersistence(port(local))
  const old=createV3({namespace:ns}),prior=hostV3(port(old))
  try{
    const base=await local.loadAssetById(map.id),read=await local.loadAssetById(sheet.id)
    const context={resources:[{id:sheet.id,localRevision:pintaLocalRevisionOf(read)}]}
    await current.persistAsset({...base,name:'vila-quatro'},context)
    const before=await local.causal.inspect()
    expect(before.version).toBe(4)
    const pins=idbMockDb('sistema-zero-pinta-'+ns).get('pinta:sync:observed-resources')
    const [[digest,bytes]]=pins
    const native=await bytes.arrayBuffer()
    await expect(old.causal.inspect()).rejects.toThrow('Não consegui conferir')
    const persisted=await old.loadAssetById(map.id)
    await expect(prior.persistAsset({...persisted,name:'tentativa-anterior'},{resources:[]})).rejects.toThrow('Não consegui conferir')
    expect((await local.causal.inspect()).pending).toEqual(before.pending)
    expect((await local.loadAssetById(map.id)).name).toBe('vila-quatro')
    expect(await idbMockDb('sistema-zero-pinta-'+ns).get('pinta:sync:observed-resources').get(digest).arrayBuffer()).toEqual(native)
    const again=await local.loadAssetById(map.id)
    await current.persistAsset({...again,name:'vila-cinco'},context)
    expect((await local.loadAssetById(map.id)).name).toBe('vila-cinco')
  } finally {prior.dispose?.();current.dispose?.()}
})
