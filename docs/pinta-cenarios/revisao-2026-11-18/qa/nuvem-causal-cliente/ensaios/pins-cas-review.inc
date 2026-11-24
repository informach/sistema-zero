import { idbMockDb, setIdbWriteGuard } from '../../../pinta/src/testing/idbMock'

for (const race of ['different-revision','last-physical-put']) test('a escrita do mapa e da folha observada reverte por '+race,async()=>{
  const ns='reversao-recurso-'+race, local=createPintaCausalPersistence({namespace:ns})
  const sheet=createTilesetAsset({name:'folha',tileSize:8})
  sheet.tiles[0].data[0]=3
  const map=createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:sheet.id})
  const remote=await Promise.all([cloudAsset(sheet,1,'1'),cloudAsset(map,1)])
  await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[sheet,map].map((after,index)=>({id:after.id,before:null,beforeRevision:null,after,remote:remote[index].entry}))},()=>true)
  const {cloud}=fakeCloud(map,1)
  const idle=async()=>{throw TypeError('offline')}
  const encoded=Promise.withResolvers(),proceed=Promise.withResolvers()
  const control={...local.causal,encodeCandidates:async(...args)=>{
    const exact=await local.causal.encodeCandidates(...args)
    encoded.resolve()
    await proceed.promise
    return exact
  }}
  const host=createCloudMirroredPintaPersistence({viewerId:ns,local,cloud:{...cloud,pintaCausal:{snapshot:idle,upload:idle,backfill:idle,verifyEpoch:idle,download:idle}},causal:{local:control,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
  const legacyPath=process.env.PINTA_REVIEW_LEGACY_ENTRY!
  const kv=await import('../../../pinta/src/state/assetAuthorityDb')
  const {mock}=await import('bun:test')
  mock.module(legacyPath.replace('persistence.ts','assetAuthorityDb.ts'),()=>({...kv}))
  const {createPintaPersistence:createOld}=await import(legacyPath)
  const older=createOld({namespace:ns})
  const observed=await local.loadAssetById(sheet.id)
  const priorMap=await local.loadAssetById(map.id)
  const context={resources:[{id:sheet.id,localRevision:pintaLocalRevisionOf(observed)}]}
  const disk=idbMockDb('sistema-zero-pinta-'+ns)
  let actualPut=false
  try {
    const write=host.persistAsset({...priorMap,name:'vila-nova'},context)
    await encoded.promise
    if(race==='different-revision'){
      const changed=await older.loadAssetById(sheet.id)
      changed.tiles[0].data[0]=5
      await older.persistAsset(changed)
    } else {
      setIdbWriteGuard((key)=>{
        if(key==='pinta:sync:observed-resources') {actualPut=true;throw Error('disco recusou folha')}
      })
    }
    proceed.resolve()
    await expect(write).rejects.toThrow()
    if(race==='last-physical-put')expect(actualPut).toBe(true)
    const reopened=createPintaCausalPersistence({namespace:ns})
    const doc=await reopened.loadAssetById(map.id)
    expect(doc.name).toBe('vila')
    expect(pintaLocalRevisionOf(doc)).toBe(pintaLocalRevisionOf(priorMap))
    expect((await reopened.loadAssetById(sheet.id)).tiles[0].data[0]).toBe(race==='different-revision'?5:3)
    const state=await reopened.causal.inspect()
    expect(state.pending).toHaveLength(0)
    expect(state.pins?.size??0).toBe(0)
    expect(disk.get('pinta:sync:observed-resources')?.size??0).toBe(0)
    if(race==='last-physical-put'){
      setIdbWriteGuard(null)
      await host.persistAsset({...priorMap,name:'vila-nova'},context)
      expect((await reopened.loadAssetById(map.id)).name).toBe('vila-nova')
      expect(disk.get('pinta:sync:observed-resources').size).toBe(1)
    }
  } finally {proceed.resolve(); setIdbWriteGuard(null);host.dispose?.()}
})
