import { beforeEach, expect, test } from 'bun:test'
import { clearIdbMock } from './src/testing/idbMock'
import { createTilemapAsset, createTilesetAsset, isObjectLayer } from './src/core/project'
import { addObjectLayer } from './src/tiles/tilemapOps'
import { createMapObject } from './src/tiles/mapObjects'
import { pintaDoorBindings } from './src/core/sceneMapClosure'
const { createPintaCausalPersistence } = await import('./src/state/persistence')
beforeEach(clearIdbMock)
const room=(name,tilesetId)=>createTilemapAsset({name,cols:2,rows:2,tilesetId})
const sheet=(name)=>createTilesetAsset({name,tileSize:8})
function door(map,selector){
 const changed=addObjectLayer(map,'portas')
 changed.layers.find(isObjectLayer).objects.push(createMapObject({id:'porta',role:'door',properties:{destino:selector}}))
 return changed
}
async function scan(local,map){
 return pintaDoorBindings(map,new Map((await local.listAllAssets()).map(v=>[v.id,v])))[0].binding
}
const entry=(item)=>({itemId:item.id,name:item.name,kind:item.kind,itemUpdatedAt:new Date(item.updatedAt).toISOString(),formatVersion:4,bytes:100,revision:2,sha256:'a'.repeat(64),coverage:'certified',layoutRevision:null})
async function adopt(local,assets){
 const before=await local.causal.capture(assets.map(a=>a.id))
 const pull={fromEpoch:null,epoch:'2',recoverInitial:true,transitions:before.map((b,i)=>({...b,after:assets[i],remote:entry(assets[i])}))}
 const impact=await local.causal.pullImpact(pull)
 expect(impact.blocked).toBe(false)
 expect(await local.causal.applyPull({...pull,coveredIds:impact.ids},()=>true)).toBe(true)
 return impact
}
test('recuperação conserva porta antes ausente de mapa fora do fechamento',async()=>{
 const loc=createPintaCausalPersistence({namespace:'alias-a'})
 const a=sheet('folha-a'), b=sheet('folha-b')
 const villa=room('vila',a.id)
 const isolated=door(room('isolada',b.id),'vila-copia')
 for(const asset of [a,b,villa,isolated]) await loc.persistAsset(asset)
 expect(await scan(loc,isolated)).toEqual({type:'missing'})
 const impact=await adopt(loc,[{...villa,name:'vila-remota'}])
 expect(impact.ids).not.toContain(isolated.id)
 const copy=(await loc.listAllAssets()).find(x=>x.name.startsWith('vila-copia'))
 expect(copy).toBeDefined()
 expect(await scan(loc,isolated)).toEqual({type:'missing'})
})
test('cópia guarda destino local apesar do alias de ID remoto',async()=>{
 const loc=createPintaCausalPersistence({namespace:'alias-b'})
 const a=sheet('uma-folha')
 const cabin=room('cabana',a.id)
 const home=door(room('vila',a.id),'cabana')
 for(const asset of [a,cabin,home]) await loc.persistAsset(asset)
 expect(await scan(loc,home)).toEqual({type:'target',id:cabin.id})
 const shadow={...room('outra',a.id),id:'cabana-copia'}
 await adopt(loc,[{...cabin,name:'cabana-conta'},shadow])
 const localAssets=await loc.listAllAssets()
 const copiedHome=localAssets.find(x=>x.name==='vila-copia'),copiedCabin=localAssets.find(x=>x.name.startsWith('cabana-copia'))
 expect(copiedHome).toBeDefined()
 expect(copiedCabin).toBeDefined()
 expect(await scan(loc,copiedHome)).toEqual({type:'target',id:copiedCabin.id})
 expect((await scan(loc,copiedHome)).id).not.toBe(shadow.id)
})
test('lápide sem base recupera o item remoto sem enfileirar exclusão',async()=>{
 const db=createPintaCausalPersistence({namespace:'unbased-delete'})
 const s=sheet('a')
 await db.persistAsset(s)
 const [before]=await db.causal.capture([s.id])
 await db.causal.stageUnbased({transitions:[{...before,after:null}],readSet:[],requireKnownInventory:true})
 const [removed]=await db.causal.capture([s.id])
 expect(removed.before).toBeNull()
 expect(removed.beforeRevision).toBeTruthy()
 const pull={fromEpoch:null,epoch:'2',recoverInitial:true,transitions:[{...removed,after:s,remote:{...entry(s),layoutRevision:'1'}}]}
 const impact=await db.causal.pullImpact(pull)
 expect(impact.blocked).toBe(false)
 expect(await db.causal.applyPull({...pull,coveredIds:impact.ids},()=>true)).toBe(true)
 expect((await db.causal.inspect()).epoch).toBe(pull.epoch)
 expect((await db.causal.inspect()).unbased).toBeUndefined(); expect((await db.causal.inspect()).pending).toHaveLength(0); expect((await db.loadAssetById(s.id)).name).toBe(s.name)
})
test('primeira adoção admite uma pintura posterior de slot estável',async()=>{
 const db=createPintaCausalPersistence({namespace:'unbased-paint'})
 const s=sheet('a'),map=room('vila',s.id)
 const [sp]=await db.causal.capture([s.id])
 await db.causal.stageUnbased({transitions:[{...sp,after:s}],readSet:[]})
 const [sheetBefore,mapBefore]=await db.causal.capture([s.id,map.id])
 await db.causal.stageUnbased({transitions:[{...mapBefore,after:map}],readSet:[{consumerId:map.id,targetId:s.id,localRevision:sheetBefore.beforeRevision}]})
 const next=structuredClone(s); next.tiles[0].data[0]=1; expect(s.tiles[0].data[0]).toBe(0)
 await db.causal.stageUnbased({transitions:[{...sheetBefore,after:next}],readSet:[],stableTilesets:[s.id]})
 const pull={fromEpoch:null,epoch:'1',recoverInitial:true,transitions:[]}
 expect((await db.causal.pullImpact(pull)).blocked).toBe(false)
 expect(await db.causal.applyPull(pull,()=>true)).toBe(true)
 expect((await db.causal.inspect()).epoch).toBe(pull.epoch)
})

test('cópia de porta para mapa público sobrevive a ID privado homônimo',async()=>{
 const loc=createPintaCausalPersistence({namespace:'private-shadow'})
 const liveSheet=sheet('folha-publica')
 const privateSheet={...sheet('folha-privada'),id:'folha-versao'}
 const cabin={...room('cabana',liveSheet.id),id:privateSheet.id}
 const home=door({...room('vila',privateSheet.id),resources:[{sourceId:liveSheet.id,capturedAt:1,asset:privateSheet}]},cabin.id)
 for(const asset of [liveSheet,cabin,home]) await loc.persistAsset(asset)
 expect(await scan(loc,home)).toEqual({type:'target',id:cabin.id})
 await adopt(loc,[{...cabin,name:'cabana-conta'}])
 const assets=await loc.listAllAssets()
 const copyHome=assets.find(x=>x.name==='vila-copia'),copyCabin=assets.find(x=>x.name==='cabana-copia')
 expect(copyHome).toBeDefined()
 expect(copyCabin).toBeDefined()
 const obj=copyHome.layers.find(isObjectLayer).objects[0]
 expect(obj.properties.destino).not.toBe(copyHome.resources[0].asset.id)
 expect(await scan(loc,copyHome)).toEqual({type:'target',id:copyCabin.id})
})
import { expandRegionMap,prepareMapRegions } from './src/tiles/regionMap'
import { setCell,cellAt } from './src/tiles/tilemapOps'
import { createLocalRegionAssetAuthority,stampLocalRegionAsset } from './src/state/localRegionAssetAuthority'
import { localRegionStorageCodec } from './src/state/localRegionChunkStorage'
import { createLocalPintaPersistence } from './src/state/persistence'
test('recuperação regional mantém origem, grade esparsa 10000x10000, vínculo e createdAt',async()=>{
 const loc=createLocalPintaPersistence({namespace:'private-region',guardCausalWrites:true},{authority:createLocalRegionAssetAuthority(),stamp:stampLocalRegionAsset,codec:localRegionStorageCodec,strictCapture:true})
 const s={...sheet('folha'),createdAt:1000},dense={...room('vila',s.id),createdAt:2000}
 dense.layers[0].tilesetId=s.id
 const prepared=prepareMapRegions(dense);expect(prepared.ok).toBe(true)
 const big=expandRegionMap(prepared.map,{col:-64,row:-64,cols:10000,rows:10000});expect(big.ok).toBe(true)
 const edited=setCell(big.map,big.map.layers[0].id,-64,-64,1)
 await loc.persistAssets([s,edited])
 await adopt(loc,[{...edited,name:'vila-conta'}])
 const assets=await loc.listAllAssets()
 const sheetCopy=assets.find(a=>a.name==='folha-copia'),mapCopy=assets.find(a=>a.name==='vila-copia')
 expect(mapCopy.createdAt).toBe(2000)
 expect(sheetCopy.createdAt).toBe(1000)
 expect(mapCopy.origin).toEqual({col:-64,row:-64})
 expect(mapCopy.rows*mapCopy.cols).toBe(100000000)
 expect(mapCopy.tilesetId).toBe(sheetCopy.id)
 expect(mapCopy.layers[0].tilesetId).toBe(sheetCopy.id)
 expect(mapCopy.layers[0].cells).toEqual(edited.layers[0].cells)
 expect(cellAt(mapCopy,mapCopy.layers[0].id,-64,-64)).toBe(1)
})
test('porta histórica ainda ausente conserva estado durante adoção e recuperação',async()=>{
 const loc=createPintaCausalPersistence({namespace:'draft-missing'})
 const a=sheet('folha-a'),home=door(room('vila',a.id),'mapa-removido')
 await loc.persistAssets([a,home])
 const remote=[{...home,name:'oficial'},sheet('item-independente-da-conta'),a]
 const before=await loc.causal.capture(remote.map(a=>a.id))
 const pull={fromEpoch:null,epoch:'2',recoverInitial:true,transitions:before.map((b,i)=>({...b,after:remote[i],remote:entry(remote[i])}))}
 const impact=await loc.causal.pullImpact(pull)
 expect(impact.blocked).toBe(false)
 expect(await loc.causal.applyPull({...pull,coveredIds:impact.ids},()=>true)).toBe(true)
 expect((await loc.causal.inspect()).epoch).toBe('2')
 expect(await loc.loadAssetById(remote[1].id)).not.toBeNull(); const recovered=(await loc.listAllAssets()).find(x=>x.name==='vila-copia'); expect(await scan(loc,recovered)).toEqual({type:'missing'})
 expect((await loc.causal.inspect()).pending).toHaveLength(0)
})
test('catálogo local sem divergências de documento não captura porta remota por ID',async()=>{
 const loc=createPintaCausalPersistence({namespace:'remote-alias-no-copies'})
 const a=sheet('local-tiles'),b=sheet('remote-tiles')
 const localShadow={...room('galpao',a.id),id:'cabana'}
 const remoteHome=door(room('vila',b.id),'cabana'),remoteCabin=room('cabana',b.id)
 await loc.persistAssets([a,localShadow])
 const remote=[b,remoteCabin,remoteHome]
 const official=new Map(remote.map(i=>[i.id,i]))
 expect(pintaDoorBindings(remoteHome,official)[0].binding).toEqual({type:'target',id:remoteCabin.id})
 const before=await loc.causal.capture(remote.map(a=>a.id))
 const pull={fromEpoch:null,epoch:'1',recoverInitial:true,transitions:before.map((b,i)=>({...b,after:remote[i],remote:entry(remote[i])}))}
 const impact=await loc.causal.pullImpact(pull)
 const admitted=await loc.causal.applyPull({...pull,coveredIds:impact.ids},()=>true)
 expect(admitted).toBe(true); expect(await scan(loc,remoteHome)).toEqual({type:'target',id:remoteCabin.id})
})


test('descida incremental protege nomes oficiais contra sombra local por ID',async()=>{
 const loc=createPintaCausalPersistence({namespace:'incremental-alias'})
 const sheetA=sheet('sheet-a'), sheetB=sheet('sheet-b')
 const cabin=room('cabana',sheetA.id), stranger={...room('galpao',sheetB.id),id:'cabana'}
 const first=[sheetA,cabin]
 await loc.causal.applyPull({fromEpoch:null,epoch:'1',recoverInitial:true,transitions:first.map(after=>({id:after.id,before:null,beforeRevision:null,after,remote:entry(after)}))},()=>true)
 await loc.persistAssets([sheetB,stranger])
 const home=door(room('vila',sheetA.id),'cabana')
 const [base]=await loc.causal.capture([home.id])
 const pull={fromEpoch:'1',epoch:'2',recoverInitial:true,transitions:[{...base,after:home,remote:entry(home)}]}
 const impact=await loc.causal.pullImpact(pull)
 expect(impact.blocked).toBe(true)
 expect(impact.ids).toContain(home.id)
 expect(await loc.causal.applyPull({...pull,coveredIds:impact.ids},()=>true)).toBe(false)
 expect((await loc.causal.inspect()).epoch).toBe('1')
 expect(await loc.loadAssetById(home.id)).toBeNull()
})
