for(const initial of [true,false])test('mutação durante encode mantém documento e gzip da mesma autoria: '+(initial?'sem base':'com base'),async()=>{
 const ns='mutable-encode-'+initial,local=createPintaCausalPersistence({namespace:ns})
 if(!initial)await local.causal.applyPull({fromEpoch:null,epoch:'0',transitions:[]},()=>true)
 const s=createTilesetAsset({name:'pecas',tileSize:8})
 const room=createTilemapAsset({name:'dummy',cols:1,rows:1,tilesetId:s.id})
 s.tiles[0].data[0]=3
 const {cloud}=fakeCloud(room,1),unused=async()=>{throw Error('network')}
 const encoded=Promise.withResolvers(),go=Promise.withResolvers()
 const causal={...local.causal,encodeCandidates:async(...args)=>{
   const blob=await local.causal.encodeCandidates(...args)
   encoded.resolve();await go.promise
   return blob
 }}
 const wrapper=createCloudMirroredPintaPersistence({local,cloud:{...cloud,pintaCausal:{snapshot:unused,upload:unused,verifyEpoch:unused,backfill:unused,download:unused}},viewerId:ns,causal:{local:causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
 try{
   const append=wrapper.persistAsset(s,{resources:[]})
   await encoded.promise
   s.tiles[0].data[0]=4
   go.resolve()
   await append
   const state=await local.causal.inspect(),op=initial?state.unbased:state.pending[0]
   const item=await local.causal.retained(op.opId)
   const blob=item.blobs.get(s.id)
   const body=await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()
   const fromGzip=local.causal.decodeCandidate(body)
   const document=await local.loadAssetById(s.id)
   expect(fromGzip.tiles[0].data[0]).toBe(3)
   expect(document.tiles[0].data[0]).toBe(fromGzip.tiles[0].data[0])
 }finally{go.resolve();wrapper.dispose?.()}
})
