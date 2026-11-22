import { createEditorStore } from '../../../pinta/src/state/editorStore'
import { createGalleryStore } from '../../../pinta/src/state/galleryStore'
import { COPY } from '../../../pinta/src/core/copy'
import { observePintaReferences } from '../../../pinta/src/core/sceneMapClosure'
import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'
for(const mode of ['invalid-reference','unobserved-delete'])test('a galeria retoma a adoção e mostra o motivo de recuperação: '+mode,async()=>{
 const local=createPintaCausalPersistence({namespace:'adoption-ui-'+mode})
 const sheet=createTilesetAsset({name:'pecas',tileSize:8})
 const basic=createTilemapAsset({name:'vila',cols:2,rows:2,tilesetId:sheet.id})
 const draft={...basic,layers:basic.layers.map(l=>({...l,properties:{sprite:{type:'asset',value:'sumiu'}}}))}
 const official={...basic,name:'vila-conta'}
 await local.persistAssets([sheet,mode==='invalid-reference'?draft:basic])
 const versions=await Promise.all([sheet,official].map((asset,i)=>cloudAsset(asset,2,i===0?'2':null)))
 const cloud=fakeCloud(official,2).cloud
 const unused=async()=>{throw Error('Operação inesperada')}
 const transport={snapshot:async()=>({epoch:'2',requiredFormat:6,entries:versions.map(v=>v.entry)}),verifyEpoch:async()=>{},download:async({itemId})=>versions.find(v=>v.entry.itemId===itemId)!.gzip,upload:unused,backfill:unused}
 const wrapper=createCloudMirroredPintaPersistence({local,cloud:{...cloud,pintaCausal:transport},viewerId:'adoption',causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
 const gallery=createGalleryStore(wrapper)
 const detach=gallery.getState().attachPersistence()
 const events=[]
 const stop=wrapper.subscribe(e=>events.push(e))
 const sync=()=>syncPintaCausalAccount({cloud:transport,local:local.causal,reader:6,signal:new AbortController().signal,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})
 try{
  if(mode==='invalid-reference'){
   expect(await sync()).toMatchObject({mode:'causal',applied:false})
   expect((await local.causal.inspect()).epoch).toBeNull()
   const catalog=await local.listAllAssets(),source=catalog.find(e=>e.id===basic.id)
   const editor=createEditorStore({asset:source,observeResources:a=>observePintaReferences(a,catalog),persist:(saved,linked,layout,resources,slotLineage)=>wrapper.persistAssets([saved,...linked],{layout,resources:resources??[],slotLineage})})
   editor.getState().commit({...source,layers:source.layers.map(l=>({...l,properties:{}}))})
   expect(await editor.getState().flush()).toEqual({ok:true})
  }else{
    const current=await local.loadAssetById(basic.id)
    await wrapper.deleteAsset(basic.id,current)
  }
  expect(await sync()).toMatchObject({mode:'causal',applied:true})
  expect((await local.causal.inspect()).epoch).toBe('2')
  expect((await local.causal.inspect()).pending).toEqual([])
  expect((await local.loadAssetById(basic.id)).name).toBe('vila-conta')
  if(mode==='invalid-reference'){
    expect(gallery.getState().recoveryNotice).toBe(COPY.gallery.accountRecovered)
    expect(events).toContainEqual(expect.objectContaining({type:'account-recovered'}))
    const copy=(await local.listAllAssets()).find(a=>a.name.startsWith('vila-copia'))
    expect(copy).toBeDefined(); expect(copy.layers[0].properties?.sprite).toBeUndefined()
  }else{
    expect(gallery.getState().recoveryNotice).toBe(COPY.gallery.accountRemovalReturned)
    expect(events).toContainEqual({type:'account-removal-returned',names:['vila-conta']})
  }
  gallery.getState().acknowledgeRecovery(); expect(gallery.getState().recoveryNotice).toBeNull()
 }finally{stop();detach();wrapper.dispose?.()}
})

test('pintar slot zero por EditorStore conserva a leitura de mapa até primeira adoção',async()=>{
 const local=createPintaCausalPersistence({namespace:'unbased-real-editor'})
 const sheet=createTilesetAsset({name:'pecas',tileSize:8})
 const map=createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:sheet.id})
 map.layers.find(isTileLayer).cells[0]=0
 const cloud=fakeCloud(map,0).cloud
 const unused=async()=>{throw Error('Operação inesperada')}
 const transport={snapshot:async()=>({epoch:'0',requiredFormat:6,entries:[]}),verifyEpoch:async()=>{},download:unused,upload:unused,backfill:unused}
 const wrapper=createCloudMirroredPintaPersistence({local,cloud:{...cloud,pintaCausal:transport},viewerId:'offline',causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
 try{
  await wrapper.persistAsset(sheet)
  const current=await local.loadAssetById(sheet.id)
  await wrapper.persistAsset(map,{resources:observePintaReferences(map,[current,map])})
  const editor=createEditorStore({asset:current,observeResources:a=>observePintaReferences(a,[current,map]),persist:(saved,linked,layout,resources,slotLineage)=>wrapper.persistAssets([saved,...linked],{layout,resources:resources??[],slotLineage})})
  const painted=structuredClone(current.tiles);painted[0].data[0]=1
  expect(editor.getState().commit({...current,tiles:painted})).toBe(true)
  expect(await editor.getState().flush()).toEqual({ok:true})
  const before=await local.causal.inspect(); expect(before.epoch).toBeNull(); expect(before.unbased.members.length).toBe(2)
  const sync=await syncPintaCausalAccount({cloud:transport,local:local.causal,reader:6,signal:new AbortController().signal,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})
  expect(sync).toMatchObject({mode:'causal',applied:true})
  const [unit]=(await local.causal.inspect()).pending
  expect(unit.opId).toBe(before.unbased.opId)
  expect(unit.readSet).toEqual([{source:'unit',consumerId:map.id,targetId:sheet.id}])
  expect((await local.loadAssetById(sheet.id)).tiles[0].data[0]).toBe(1)
 }finally{wrapper.dispose?.()}
})
