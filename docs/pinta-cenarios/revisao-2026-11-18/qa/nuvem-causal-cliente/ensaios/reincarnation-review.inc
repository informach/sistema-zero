test('proof: a sealed fresh creation whose id was compacted in the cloud acknowledges only its verified receipt',async()=>{
 const doc=createTilesetAsset({name:'old',tileSize:8})
 const local=createPintaCausalPersistence({namespace:'recreate-ack'})
 const {entry}=await cloudAsset(doc,7,'1')
 expect(await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[{id:doc.id,before:null,beforeRevision:null,after:doc,remote:entry}]},()=>true)).toBe(true)
 const [live]=await local.causal.capture([doc.id])
 expect(await local.causal.applyPull({fromEpoch:'1',epoch:'2',transitions:[{...live!,after:null,remote:null}]},()=>true)).toBe(true)
 const [missing]=await local.causal.capture([doc.id])
 const fresh={...doc,name:'fresh'}
 await local.causal.stage({opId:crypto.randomUUID(),baseEpoch:'2',transitions:[{...missing!,after:fresh,baseRevision:0,operation:{type:'create'}}],readSet:[]})
 let ackDelivered=false
 await flushPintaCausalOutbox({reader:6,local:local.causal,cloud:{async upload(sent){
   ackDelivered=true
   const m=sent.intent.members[0]!
   if(m.action!=='put')throw Error('unexpected')
   const receipt={opId:sent.intent.opId,intentHash:sent.intentHash,epoch:'3',members:[{itemId:m.itemId,revision:1,deleted:false,sha256:m.sha256,layoutRevision:'3'}]}; expect(await local.causal.acknowledge({...receipt,opId:crypto.randomUUID()})).toBe(false); await expect(local.causal.acknowledge({...receipt,members:[{...receipt.members[0],sha256:'b'.repeat(64)}]})).rejects.toThrow(); expect((await local.causal.inspect()).confirmed.get(doc.id)?.deleted).toBe(true); return receipt
 }},signal:new AbortController().signal})
 expect(ackDelivered).toBe(true)
 expect((await local.causal.inspect()).sealed).toBeNull()
 expect((await local.causal.inspect()).confirmed.get(doc.id)?.deleted).toBe(false)
})
