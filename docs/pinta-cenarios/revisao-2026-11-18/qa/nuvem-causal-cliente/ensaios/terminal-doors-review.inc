import { mock } from 'bun:test'
import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'
import { setIdbWriteGuard } from '../../../pinta/src/testing/idbMock'
const kv=await import('../../../pinta/src/state/assetAuthorityDb')
const previousEntry=process.env.PINTA_REVIEW_LEGACY_ENTRY!
mock.module(previousEntry.replace('persistence.ts','assetAuthorityDb.ts'),()=>({...kv}))
import { addObjectLayer } from '../../../pinta/src/tiles/tilemapOps';import { createMapObject } from '../../../pinta/src/tiles/mapObjects';import { isObjectLayer } from '../../../pinta/src/core/project';import { pintaDoorBindings } from '../../../pinta/src/core/sceneMapClosure'; const {createPintaPersistence:oldPersistence}=await import(previousEntry)
const paint=(s,color)=>{const next={...s,tiles:structuredClone(s.tiles)};next.tiles[0].data[0]=color;return next}
test('cópias autorais e preexistentes religam o mapa à folha da mesma versão',async()=>{
 const namespace='review-terminal-graph'
 const local=createPintaCausalPersistence({namespace}), older=oldPersistence({namespace})
 const s=createTilesetAsset({name:'folha',tileSize:8})
 const cabin=createTilemapAsset({name:'cabana',cols:1,rows:1,tilesetId:s.id});const m=addObjectLayer(createTilemapAsset({name:'vila',cols:1,rows:1,tilesetId:s.id}),'portas');m.layers.find(isObjectLayer).objects.push(createMapObject({id:'porta',role:'door',properties:{destino:'cabana',textura:{type:'asset',value:s.id}}}));
 m.layers.find(isTileLayer).cells[0]=0
 const initial=await Promise.all([cloudAsset(s,1,'1'),cloudAsset(m,1),cloudAsset(cabin,1)])
 await local.causal.applyPull({fromEpoch:null,epoch:'1',transitions:[s,m,cabin].map((after,i)=>({id:after.id,before:null,beforeRevision:null,after,remote:initial[i].entry}))},()=>true)
 const official=[paint(s,7),{...m,name:'vila-conta'},{...cabin,layers:cabin.layers.map(l=>({...l,opacity:.7}))}]
 const remote=await Promise.all([cloudAsset(official[0],2,'1'),cloudAsset(official[1],2),cloudAsset(official[2],2)])
 const {cloud}=fakeCloud(m,1)
 let terminal=false
 const transport={snapshot:async()=>({epoch:'2',requiredFormat:6,entries:remote.map(i=>i.entry)}),verifyEpoch:async()=>{},backfill:async()=>{},download:async({itemId})=>remote.find(e=>e.entry.itemId===itemId).gzip,upload:async()=>{if(!terminal)throw TypeError('offline'); throw new PintaCausalRequestError(409,'epoch-changed')},settle:async()=>({state:'unknown'})}
 const wrapper=createCloudMirroredPintaPersistence({local,cloud:{...cloud,pintaCausal:transport},viewerId:namespace,causal:{local:local.causal,holdOpen:async()=>()=>{},withClosed:(_,apply)=>apply()}})
 try{
  const [a,b,c]=await Promise.all([local.loadAssetById(s.id),local.loadAssetById(m.id),local.loadAssetById(cabin.id)])
  await wrapper.persistAssets([paint(a,3),{...b,name:'vila-autora'},{...c,layers:c.layers.map(l=>({...l,opacity:.3}))}],{resources:[{id:s.id,localRevision:pintaLocalRevisionOf(a)},{id:cabin.id,localRevision:pintaLocalRevisionOf(c)}]})
  const common={local:local.causal,cloud:transport,reader:6,signal:new AbortController().signal}
  await expect(flushPintaCausalOutbox(common)).rejects.toThrow('offline')
  const sealed=await local.causal.inFlight();expect(sealed.blobs.size).toBe(3)
  const [aa,bb,cc]=await Promise.all([older.loadAssetById(s.id),older.loadAssetById(m.id),older.loadAssetById(cabin.id)])
  await older.persistAssets([paint(aa,5),{...bb,name:'vila-antiga'},{...cc,layers:cc.layers.map(l=>({...l,opacity:.5}))}])
  terminal=true
  const sync=()=>syncPintaCausalAccount({...common,canContinue:()=>true,isOpen:()=>false,withClosed:(_,apply)=>apply()})
  let lastCopy=''
  setIdbWriteGuard((key,v)=>{if(typeof key==='string'&&key.startsWith('pinta:asset:')&&v?.kind==='tilemap'&&v.name.startsWith('vila-antiga-copia')){lastCopy=v.name;throw Error('falha última cópia')}})
  try{ await expect(sync()).rejects.toThrow('falha última cópia'); expect(lastCopy).toStartWith('vila-antiga-copia') } finally {setIdbWriteGuard(null)}
  expect((await local.causal.inFlight()).sealed.intentHash).toBe(sealed.sealed.intentHash)
  expect((await local.listAllAssets()).map(a=>a.name).sort()).toEqual(['cabana','folha','vila-antiga'])
  await expect(sync()).resolves.toMatchObject({applied:true})
  const catalog=await local.listAllAssets(),byId=new Map(catalog.map(a=>[a.id,a]))
  const pairs=catalog.filter(a=>a.kind==='tilemap'&&a.name.startsWith('vila')).map(map=>[map.name,byId.get(map.tilesetId)?.tiles[0].data[0]])
  expect(pairs).toHaveLength(3)
  for(const [name,color] of [['vila-conta',7],['vila-autora',3],['vila-antiga',5]])expect(pairs.some(([label,slot])=>label.startsWith(name)&&slot===color)).toBe(true)
  for(const home of catalog.filter(i=>i.name.startsWith('vila'))){const meter=byId.get(home.tilesetId).tiles[0].data[0];const target=pintaDoorBindings(home,byId)[0].binding;expect(target.type).toBe('target');expect(byId.get(target.id).layers[0].opacity).toBe(meter/10);expect(home.layers.find(isObjectLayer).objects[0].properties.textura.value).toBe(home.tilesetId)}expect((await local.causal.inspect()).sealed).toBeNull()
 }finally{wrapper.dispose?.()}
})
