import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'
import { setIdbWriteGuard } from '../../../pinta/src/testing/idbMock'
import { createPintaCausalCloud } from '../../src/lib/pinta-causal-cloud'
import { createGalleryStore } from '../../../pinta/src/state/galleryStore'
import { COPY } from '../../../pinta/src/core/copy'
import {mock} from 'bun:test'; const kv=await import('../../../pinta/src/state/assetAuthorityDb'); mock.module(process.env.PINTA_REVIEW_LEGACY_ENTRY.replace('persistence.ts','assetAuthorityDb.ts'),()=>({...kv})); const {createPintaPersistence:legacy}=await import(process.env.PINTA_REVIEW_LEGACY_ENTRY!);Object.defineProperty(navigator,'onLine',{configurable:true,value:true})
for(const change of ['delete','overwrite','none'])for(const status of ['unknown','expired','aborted'])test('último PUT, escritor anterior '+change+' e situação '+status,async()=>{
 const namespace='review-terminal-'+change+status
 const local=createPintaCausalPersistence({namespace}),older=legacy({namespace})
 const localDoc=createTilesetAsset({name:'minhas-pecas',tileSize:8})
 const other=createTilemapAsset({name:'prova',cols:1,rows:1,tilesetId:'other'})
 const source=await cloudAsset(localDoc,1,'1')
 await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[{id:localDoc.id,before:null,beforeRevision:null,after:localDoc,remote:source.entry}]},()=>true)
 const {cloud}=fakeCloud(other,1), statuses=[]
 cloud.reportPintaQueue=(ids,phase,error)=>statuses.push({ids,phase,error})
 let epoch='2', stage='offline'
 const remote={...localDoc,tiles:structuredClone(localDoc.tiles)};remote.tiles[0].data[0]=7
 const bytes=await cloudAsset(remote,2,'1')
 const unused=async()=>{throw Error('Operação inesperada')}
 const transport={snapshot:async()=>({epoch,requiredFormat:6,entries:[epoch==='1'?source.entry:bytes.entry]}),verifyEpoch:async()=>{},download:async()=>epoch==='1'?source.gzip:bytes.gzip,backfill:unused,upload:async()=>{
   if(stage==='offline')throw TypeError('offline')
   throw new PintaCausalRequestError(409,status==='expired'?'operation-expired':status==='aborted'?'operation-aborted':'epoch-changed')
 },settle:async()=>({state:status})}
 const wrapper=createCloudMirroredPintaPersistence({local,cloud:{...cloud,pintaCausal:transport},viewerId:namespace,reconcileMinIntervalMs:0,causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
 try{
  const current=await local.loadAssetById(localDoc.id)
  const painted={...current,tiles:structuredClone(current.tiles)};painted.tiles[0].data[0]=3
  await wrapper.persistAsset(painted,{resources:[]})
  const sig=new AbortController().signal
  await expect(flushPintaCausalOutbox({local:local.causal,cloud:transport,reader:6,signal:sig})).rejects.toThrow('offline')
  const sealed=await local.causal.inFlight()
  const original=await sealed.blobs.get(localDoc.id).arrayBuffer()
  const candidate=await new Response(new Blob([original]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
  expect(assetFromJson(candidate).asset.tiles[0].data[0]).toBe(3)
  const inOld=await older.loadAssetById(localDoc.id)
  if(change==='delete')await older.deleteAsset(localDoc.id,inOld)
  if(change==='overwrite'){
    const changed={...inOld,tiles:structuredClone(inOld.tiles)}; changed.tiles[0].data[0]=5
    await older.persistAsset(changed)
  }
  stage='terminal'
  async function run(){const result=Promise.withResolvers();const end=wrapper.subscribe(e=>{if(e.type==='sync-end')result.resolve()}); const data=await wrapper.listAllAssets();await result.promise;end()}
  if(status==='unknown'){
   epoch='1';await run();expect((await local.causal.inFlight())?.sealed.intentHash).toBe(sealed.sealed.intentHash)
  }
  epoch='2'
  await run()
  const state=await local.causal.inspect()
  const remaining=await local.causal.inFlight()
  const photos=(await local.listAllAssets()).filter(s=>s.kind==='tileset').map(s=>s.tiles[0].data[0])
  if(change==='delete'){
   expect(remaining).toBeNull(); expect(photos.sort()).toEqual([3,7]); expect(state.epoch).toBe('2');expect(state.confirmed.get(localDoc.id)?.opId).toBeUndefined()
  }else if(change==='overwrite'){
   expect(remaining).toBeNull(); expect(photos.sort()).toEqual([3,5,7]);expect(state.epoch).toBe('2')
  }else{
   expect(remaining).toBeNull();expect(photos.sort()).toEqual([3,7]);expect(state.confirmed.get(localDoc.id)?.opId).toBeUndefined()
  }
 }finally{wrapper.dispose?.()}
})
