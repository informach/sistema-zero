test('um mapa editado que só usa slot estável permite remover a última peça no sucessor',async()=>{
 const sheet=addTile(createTilesetAsset({name:'pecas',tileSize:8}),0)
 const map=createTilemapAsset({name:'cabana',cols:1,rows:1,tilesetId:sheet.id})
 map.layers.find(isTileLayer)!.cells[0]=0
 const local=createPintaCausalPersistence({namespace:'stable-slot-follow'})
 const a=await cloudAsset(sheet,1,'1'), b=await cloudAsset(map,1)
 await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[sheet,map].map((after,i)=>({id:after.id,before:null,beforeRevision:null,after,remote:[a,b][i].entry}))},()=>true)
 const source=await local.loadAssetById(sheet.id),room=await local.loadAssetById(map.id)
 const {cloud}=fakeCloud(map,1)
 const unused=async()=>{throw Error('Operação inesperada')}
 cloud.pintaCausal={snapshot:async()=>{throw TypeError('offline')},download:unused,verifyEpoch:unused,upload:unused,backfill:unused}
 const wrapper=createCloudMirroredPintaPersistence({local,cloud,viewerId:'stable',causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
 try{
   await wrapper.persistAsset({...room,layers:room.layers.map(l=>({...l,opacity:.5}))},{resources:[{id:sheet.id,localRevision:pintaLocalRevisionOf(source)}]})
   const catalog=await wrapper.prepareTileRemap(source)
   const remap=remapTilesetConsumers(catalog,[],sheet.id,{removedAt:1})
   expect(remap.ok).toBe(true)
   expect(remap.after).toEqual([])
   await wrapper.persistAssets([removeTile(source,1)],{resources:[],layout:{oldToNew:[0,-1],count:1}})
   const state=await local.causal.inspect()
   expect(state.pending).toHaveLength(2)
   const calls=[]
   await flushPintaCausalOutbox({reader:6,local:local.causal,cloud:{async upload({intent,intentHash}){
    calls.push(intent)
    return {opId:intent.opId,intentHash,epoch:String(1+calls.length),members:intent.members.map(m=>({itemId:m.itemId,revision:2,deleted:false,sha256:m.sha256,layoutRevision:m.itemId===sheet.id?'3':null}))}
   }},signal:new AbortController().signal})
   expect(calls.map(r=>r.members[0].itemId)).toEqual([map.id,sheet.id])
   expect((await local.causal.inspect()).pending).toHaveLength(0)
 }finally{wrapper.dispose?.()}
})
