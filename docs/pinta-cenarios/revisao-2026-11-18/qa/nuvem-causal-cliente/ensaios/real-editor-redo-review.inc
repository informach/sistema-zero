import { createEditorStore } from '../../../pinta/src/state/editorStore'
import { observePintaReferences } from '../../../pinta/src/core/sceneMapClosure'
for(const renew of [false,true])test('undo preserva prova da operação '+(renew?'renovada':'original'),async()=>{
 const sheet=addTile(createTilesetAsset({name:'pecas',tileSize:8}),0)
 const map=createTilemapAsset({name:'cabana',cols:1,rows:1,tilesetId:sheet.id})
 map.layers.find(isTileLayer)!.cells[0]=0
 const local=createPintaCausalPersistence({namespace:'undo-exp-'+renew})
 const a=await cloudAsset(sheet,1,'1'), b=await cloudAsset(map,1)
 await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[sheet,map].map((after,i)=>({id:after.id,before:null,beforeRevision:null,after,remote:[a,b][i].entry}))},()=>true)
 const source=await local.loadAssetById(sheet.id)
 const {cloud}=fakeCloud(map,1)
 const unused=async()=>{throw Error('Operação inesperada')}
 const snapshot=async()=>({epoch:'1',requiredFormat:6,entries:[a.entry,b.entry]})
 cloud.pintaCausal={snapshot,download:unused,verifyEpoch:async()=>{},upload:unused,backfill:unused}
 const wrapper=createCloudMirroredPintaPersistence({local,cloud,viewerId:'test',causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
 try{
  const catalog=await wrapper.prepareTileRemap(source)
  const remapped=remapTilesetConsumers(catalog,[],sheet.id,{removedAt:0})
  expect(remapped.after[0].layers[0].cells[0]).toBe(-1)
  const editor=createEditorStore({asset:source,observeResources:(asset)=>observePintaReferences(asset,catalog),persist:(saved,linked,layout,resources,slotLineage)=>wrapper.persistAssets([saved,...linked],{layout,resources:resources??[],slotLineage})})
  expect(editor.getState().commitLinked(removeTile(source,0),{before:remapped.before,after:remapped.after},{removedAt:0})).toBe(true); expect(await editor.getState().flush()).toEqual({ok:true})
  const sent=[]
  await flushPintaCausalOutbox({reader:6,local:local.causal,cloud:{snapshot,verifyEpoch:async()=>{},async upload({intent,intentHash}){
    sent.push(intent)
    if(renew && sent.length===1)throw new PintaCausalRequestError(409,'operation-expired')
    return {opId:intent.opId,intentHash,epoch:'2',members:intent.members.map(m=>({itemId:m.itemId,revision:2,deleted:false,sha256:m.sha256,layoutRevision:m.itemId===sheet.id?'2':null}))}
  }},signal:new AbortController().signal})
  const last=await local.loadAssetById(sheet.id),lastMap=await local.loadAssetById(map.id)
  editor.getState().undo(); expect(await editor.getState().flush()).toEqual({ok:true})
  const [undo]=(await local.causal.inspect()).pending
  expect(undo.inverseOf).toBe(sent.at(-1).opId); expect(undo.readSet).toContainEqual({source:'unit',consumerId:map.id,targetId:sheet.id}); await flushPintaCausalOutbox({reader:6,local:local.causal,cloud:{async upload({intent,intentHash}){return {opId:intent.opId,intentHash,epoch:'3',members:intent.members.map(m=>({itemId:m.itemId,revision:3,sha256:m.sha256,deleted:false,layoutRevision:m.itemId===sheet.id?'3':null}))}}},signal:new AbortController().signal}); editor.getState().redo(); expect(await editor.getState().flush()).toEqual({ok:true}); const [redo]=(await local.causal.inspect()).pending; expect(redo.inverseOf).toBe(undo.opId); expect(redo.members.find(m=>m.itemId===sheet.id).operation).toMatchObject({type:'remap',oldToNew:[-1,0],count:1}); expect(redo.readSet).toContainEqual({source:'unit',consumerId:map.id,targetId:sheet.id});
 }finally{wrapper.dispose?.()}
})
