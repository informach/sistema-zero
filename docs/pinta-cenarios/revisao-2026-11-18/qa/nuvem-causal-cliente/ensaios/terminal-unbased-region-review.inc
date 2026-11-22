import {mock} from 'bun:test'
import {syncPintaCausalAccount} from '../../src/lib/pinta-causal-sync'
import {prepareMapRegions,expandRegionMap} from '../../../pinta/src/tiles/regionMap'
import {createRegionPintaPersistence} from '../../../pinta/src/state/localRegionPersistence'
import {setCell,cellAt} from '../../../pinta/src/tiles/tilemapOps'
const kv=await import('../../../pinta/src/state/assetAuthorityDb')
const previousEntry=process.env.PINTA_REVIEW_LEGACY_ENTRY!
mock.module(previousEntry.replace('persistence.ts','assetAuthorityDb.ts'),()=>({...kv}))
const {createPintaPersistence:oldPersistence}=await import(previousEntry)
const {createRegionPintaPersistence:oldRegion}=await import(previousEntry.replace('persistence.ts','localRegionPersistence.ts'))
const pixel=(s,n)=>{const next={...s,tiles:structuredClone(s.tiles)};next.tiles[0].data[0]=n;return next}
for(const retire of ['edit','delete'])test('primeira base recupera documento de valor 4 apesar da API antiga: '+retire,async()=>{
 const ns='terminal-unbased-'+retire
 const local=createPintaCausalPersistence({namespace:ns}),legacy=oldPersistence({namespace:ns})
 const s=createTilesetAsset({name:'arte',tileSize:8}), dummy=createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:s.id})
 const a=await cloudAsset(pixel(s,7),1,'1')
 const unused=async()=>{throw Error('rede inesperada')}
 const transport={snapshot:async()=>({epoch:'1',requiredFormat:6,entries:[a.entry]}),verifyEpoch:async()=>{},download:async()=>a.gzip,upload:unused,backfill:unused}
 const {cloud}=fakeCloud(dummy,1)
 const wrap=createCloudMirroredPintaPersistence({local,cloud:{...cloud,pintaCausal:transport},viewerId:ns,causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
 try{
   await wrap.persistAsset(pixel(s,4),{resources:[]})
   const state=await local.causal.inspect(); expect(state.epoch).toBeNull(); expect(state.shadows.get(state.unbased.opId).bytes).toBeGreaterThan(0)
   const old=await legacy.loadAssetById(s.id)
   if(retire==='edit')await legacy.persistAsset(pixel(old,5));else await legacy.deleteAsset(s.id,old)
   const reopened=createPintaCausalPersistence({namespace:ns})
   const outcome=await syncPintaCausalAccount({local:reopened.causal,cloud:transport,signal:new AbortController().signal,reader:6,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})
   expect(outcome).toMatchObject({applied:true})
   expect((await reopened.listAllAssets()).map(s=>s.tiles[0].data[0]).sort()).toEqual(retire==='edit'?[4,5,7]:[4,7])
   const result=await reopened.causal.inspect();expect(result.unbased).toBeUndefined();expect(result.shadows?.size??0).toBe(0);expect(result.pending).toHaveLength(0)
 }finally{wrap.dispose?.()}
})
test('última edição nativa8 10000² sobrevive à edição regional antiga e à primeira descida densa',async()=>{
 const ns='regional-unbased-three-worlds', local=createRegionPintaPersistence({namespace:ns})
 const s=createTilesetAsset({name:'pecas',tileSize:8})
 const m=createTilemapAsset({name:'vila',cols:2,rows:2,tilesetId:s.id})
 const conv=prepareMapRegions(m), extent=expandRegionMap(conv.map,{col:-64,row:-64,cols:10000,rows:10000})
 const source=setCell(extent.map,extent.map.layers[0].id,-64,-64,4)
 const sig=new AbortController().signal, shadow=await local.causal.encodeCandidates([s,source],sig)
 await local.causal.stageUnbased({transitions:[s,source].map(after=>({id:after.id,before:null,beforeRevision:null,after})),readSet:[{consumerId:m.id,targetId:s.id,localRevision:null}],shadow})
 const {unbased}=await local.causal.inspect();const stored=await local.causal.retained(unbased.opId)
 expect(stored.blobs.get(m.id).size).toBeLessThan(8192)
 expect(await oldPersistence({namespace:ns}).loadAssetById(m.id)).toBeNull()
 const legacy=oldRegion({namespace:ns}); const outdated=await legacy.loadAssetById(m.id)
 expect(cellAt(outdated,outdated.layers[0].id,-64,-64)).toBe(4)
 await legacy.persistAsset(setCell(outdated,outdated.layers[0].id,-64,-64,5))
 const reopened=createRegionPintaPersistence({namespace:ns})
 const official={...m,name:'vila-conta'};official.layers[0].cells[0]=7
 const remote=await Promise.all([cloudAsset(s,1,'1'),cloudAsset(official,2)])
 const transport={snapshot:async()=>({epoch:'2',requiredFormat:6,entries:remote.map(v=>v.entry)}),verifyEpoch:async()=>{},download:async({itemId})=>remote.find(r=>r.entry.itemId===itemId).gzip}
 const result=await syncPintaCausalAccount({local:reopened.causal,cloud:transport,signal:sig,reader:6,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})
 expect(result).toMatchObject({applied:true})
 const docs=await reopened.listAllAssets(), restored=docs.filter(a=>a.kind==='tilemap'&&'origin' in a)
 expect(restored.map(a=>cellAt(a,a.layers[0].id,-64,-64)).sort()).toEqual([4,5])
 for(const room of restored){expect(room.cols*room.rows).toBe(100000000);expect(room.origin).toEqual({col:-64,row:-64});expect(docs.some(v=>v.id===room.tilesetId&&v.kind==='tileset')).toBe(true)}
 const live=docs.find(v=>v.id===m.id);expect(live.name).toBe('vila-conta');expect(live.layers[0].cells[0]).toBe(7)
})
