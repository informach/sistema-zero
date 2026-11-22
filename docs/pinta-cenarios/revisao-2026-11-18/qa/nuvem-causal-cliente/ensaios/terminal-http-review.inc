import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'
import { createPintaCausalCloud } from '../../src/lib/pinta-causal-cloud'
test('dois PUTs escritos uma vez, último falha, outro commit vence abort e somente recibo exato libera a unidade',async()=>{
 const ns='http-race-terminal'
 const local=createPintaCausalPersistence({namespace:ns})
 await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[]},()=>true)
 const assets=['a','b'].map(id=>({...createTilesetAsset({name:'s'+id,tileSize:8}),id}))
 const opId=crypto.randomUUID()
 await local.causal.stage({opId,baseEpoch:'1',readSet:[],transitions:assets.map(after=>({id:after.id,before:null,beforeRevision:null,after,baseRevision:0,operation:{type:'create'}}))})
 const blobs=new Map(),verified=new Set(),paths=[]
 let intent, intentHash,phase=1,visible=false
 const result=()=>({opId,intentHash,epoch:'2',members:intent.members.map(m=>({itemId:m.itemId,revision:1,sha256:m.sha256,deleted:false,layoutRevision:'2'}))})
 const reserved=()=>({opId,intentHash,state:'reserved',nextCursor:null,tickets:intent.members.map(m=>({itemId:m.itemId,revision:1,method:'PUT',uploadUrl:'https://unit.invalid/'+m.itemId,bytes:m.bytes,headers:{'if-none-match':'*'}}))})
 const client=createPintaCausalCloud({signal:new AbortController().signal,viewerId:'perfil',reader:6,audience:'kids',fetch:async(url,init)=>{
  const path=String(url);paths.push(path)
  if(path.endsWith('/units/reserve')){intent=JSON.parse(init.body);intentHash=intent.intentHash;return Response.json(reserved())}
  if(path.startsWith('https://unit.invalid/')){
   const id=path.split('/').at(-1)
   if(phase===1&&id==='b')return new Response(null,{status:503})
   if(blobs.has(id))return new Response(null,{status:412})
   const bytes=await init.body.arrayBuffer();expect(await pintaCausalGzipHash(bytes)).toBe(intent.members.find(m=>m.itemId===id).sha256)
   blobs.set(id,bytes);return new Response()
  }
  if(path.endsWith('/verify')){const id=JSON.parse(init.body).itemId;expect(blobs.has(id)).toBe(true);verified.add(id);return Response.json({verified:true})}
  if(path.endsWith('/commit'))return Response.json({reason:'epoch-changed'},{status:409})
  if(path.endsWith('/abort')){expect(verified.size).toBe(2);if(phase===2)return Response.json({state:'committed',result:{...result(),intentHash:'0'.repeat(64)}});visible=true;return Response.json({state:'committed',result:result()})}
  if(path.endsWith('/'+opId))return intent?Response.json(reserved()):new Response(null,{status:404})
  throw Error(path)
 }})
 const cloud={...client,snapshot:async()=>({epoch:visible?'2':'1',requiredFormat:6,entries:visible?intent.members.map(m=>({...m,revision:1,layoutRevision:'2',coverage:'certified'})):[]}),verifyEpoch:async()=>{}}
 const sync=(l)=>syncPintaCausalAccount({cloud,local:l.causal,reader:6,signal:new AbortController().signal,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})
 await expect(sync(local)).rejects.toMatchObject({reason:'upload-failed'})
 expect([...blobs.keys()]).toEqual(['a']);expect(verified.size).toBe(1);expect(paths.some(p=>p.endsWith('/abort'))).toBe(false)
 const after=await local.causal.inFlight();expect(after.blobs.size).toBe(2);expect((await local.causal.inspect()).epoch).toBe('1')
 phase=2
 const reopened=createPintaCausalPersistence({namespace:ns});await expect(sync(reopened)).rejects.toThrow()
 expect((await reopened.causal.inFlight()).sealed.intentHash).toBe(after.sealed.intentHash)
 expect((await reopened.causal.inspect()).confirmed.size).toBe(0)
 phase=3;await expect(sync(reopened)).resolves.toMatchObject({applied:true})
 const state=await reopened.causal.inspect();expect(state.sealed).toBeNull();expect(state.epoch).toBe('2')
 for(const [id,entry] of state.confirmed)expect(entry).toMatchObject({opId,revision:1,sha256:await pintaCausalGzipHash(blobs.get(id))})
 expect((await reopened.listAllAssets()).map(a=>a.id).sort()).toEqual(['a','b']);expect(state.recovered?.size??0).toBe(0)
})
