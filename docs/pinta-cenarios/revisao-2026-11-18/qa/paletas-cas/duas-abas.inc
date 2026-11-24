import {createStoredSyncedMarks,resetStoredSyncedMarksForTests} from '../../src/lib/creations-sync'
import {PALETTE_LIBRARY_ITEM_ID as paletteId,PALETTE_LIBRARY_KIND as paletteKind} from '../../src/lib/pinta-cloud-persistence'

test('GET atrasado de outra aba não restaura uma cor excluída cuja lápide já foi compactada',async()=>{
 const kv=new Map<string,string>()
 const storage:Storage={get length(){return kv.size},key:i=>[...kv.keys()][i]??null,getItem:k=>kv.get(k)??null,setItem:(k,v)=>{kv.set(k,v)},removeItem:k=>{kv.delete(k)},clear:()=>kv.clear()}
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage})
 resetStoredSyncedMarksForTests()
 const profile='compartilhado', a=createPintaPersistence({namespace:profile}), b=createPintaPersistence({namespace:profile})
 const marksA=createStoredSyncedMarks('pinta-paleta-perfil')
 resetStoredSyncedMarksForTests()
 const marksB=createStoredSyncedMarks('pinta-paleta-perfil')
 const saved={id:'apagada',name:'Apagada',colors:['','#abcdef',...Array(14).fill('')],updatedAt:100}
 const past={version:1,updatedAt:100,palettes:[saved],removed:[]}
 const recent={version:1,updatedAt:300,palettes:[],removed:Array.from({length:48},(_,i)=>({id:'mais-recente-'+i,removedAt:200+i}))}
 const pack=(doc,revision)=>({json:JSON.stringify(doc),summary:{itemId:paletteId,kind:paletteKind,name:'Minhas paletas',itemUpdatedAt:doc.updatedAt,revision,bytes:128,thumb:null,syncedAt:doc.updatedAt},parts:[],fetchPart:async()=>{throw Error('sem partes')}})
 const gate=Promise.withResolvers(), started=Promise.withResolvers()
 const {cloud}=fakeCloud(createTilemapAsset({name:'dummy',cols:1,rows:1,tilesetId:'x'}),1)
 let first=true,jobA
 const hostA=createCloudMirroredPintaPersistence({local:a,viewerId:profile,marks:marksA,cloud:{...cloud,download:async()=>{
    if(first){first=false;started.resolve();await gate.promise;return pack(past,2)}
    return pack(recent,52)
 },enqueueUpload:(_i,produce,ack,stale)=>{jobA={produce,ack,stale}}}})
 const hostB=createCloudMirroredPintaPersistence({local:b,viewerId:profile,marks:marksB,cloud:{...cloud,download:async()=>pack(recent,52)}})
 try{
   const pending=hostA.syncPaletteLibrary()
   await started.promise
   await hostB.syncPaletteLibrary()
   expect((await b.loadPaletteLibrary()).palettes).toEqual([])
   expect(marksB.revision(paletteId)).toBe(52)
   gate.resolve()
   await pending
   marksB.flush()
   marksA.flush()
   resetStoredSyncedMarksForTests()
   const after=createStoredSyncedMarks('pinta-paleta-perfil')
   const original=(await a.loadPaletteLibrary()).palettes.map(p=>p.id)
   const revision=after.revision(paletteId)
   let wire
   if(jobA){await jobA.stale({itemId:paletteId,currentRevision:52});wire=await jobA.produce()}
   console.log(JSON.stringify({original,revision,base:wire?.meta?.baseRevision,reupload:wire?JSON.parse(wire.json).palettes.map(p=>p.id):[]}))
   expect(original).toEqual([])
   expect(revision).toBe(52)
 }finally{gate.resolve();hostA.dispose();hostB.dispose();resetStoredSyncedMarksForTests();if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else Reflect.deleteProperty(globalThis,'localStorage')}
})
