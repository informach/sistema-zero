import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const requireStudio = createRequire(new URL('../../../../../../packages/studio/package.json', import.meta.url));
const threeEntry = pathToFileURL(requireStudio.resolve('three'));
const THREE = await import(new URL('./three.module.js', threeEntry).href);
const {GLTFExporter} = await import(pathToFileURL(requireStudio.resolve('three/addons/exporters/GLTFExporter.js')).href);
const {GLTFLoader} = await import(pathToFileURL(requireStudio.resolve('three/addons/loaders/GLTFLoader.js')).href);
const modelsDirectory = new URL('../../3d/modelos/', import.meta.url);
fs.mkdirSync(modelsDirectory, {recursive:true});

// No 3D artwork is authored here. The exact model-construction excerpt from
// the existing gallery project is executed with matching Three.js primitives
// and packaged as embedded GLB files for the native model-picker block.
const reference=new URL('../../../../../../packages/studio/src/official-extensions/game-3d/__gen_patrulhaEspacial.ts',import.meta.url);
const raw=fs.readFileSync(reference,'utf8');
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), 'b859bff7604cec0370f5ec0957e5f16564c57aa76028b29fd5dc430284b82adf', 'Gallery source differs from the validated reference');
const source=raw.match(/export const PATRULHA_ESPACIAL_SOURCE = `([\s\S]*?)`\.trim\(\)/)?.[1];
assert.ok(source,'Pinned gallery source was not found');
const excerpt=source.slice(source.indexOf('const nave ='),source.indexOf('const meteoros ='));
assert.ok(excerpt.includes('SZGame3D.addToModel(nave, bico);'));
const cena=new THREE.Scene();
function mesh(geometry,color){const x=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color}));cena.add(x);return x;}
const api={
 createModel(){const x=new THREE.Group();cena.add(x);return x;},
 createBlock(_scene,o){return mesh(new THREE.BoxGeometry(o.width,o.height,o.depth),o.color);},
 createSphere(_scene,o){return mesh(new THREE.SphereGeometry(o.radius,32,16),o.color);},
 createCone(_scene,o){return mesh(new THREE.ConeGeometry(o.radius,o.height,24),o.color);},
 setPosition(o,x,y,z){o.position.set(x,y,z);},
 setRotation(o,x,y,z){o.rotation.set(x*Math.PI/180,y*Math.PI/180,z*Math.PI/180);},
 setVisible(o,mode){o.visible=mode!=='hide';},
 addToModel(model,part){model.add(part);},
 setMaterial(o,kind){assert.equal(kind,'glow');o.traverse(n=>{if(n.material){n.material.emissive.copy(n.material.color);n.material.roughness=1;n.material.metalness=0;}});},
};
const context=vm.createContext({SZGame3D:api,cena});
vm.runInContext(excerpt+'\nglobalThis.parts={nave,corpo,asaEsquerda,asaDireita,bico,moldeMeteoro,moldeTiro};',context);
for(const [name,part] of Object.entries(context.parts))part.name=name;
// Browser FileReader is used by the official Three exporter for the final Blob.
globalThis.FileReader=class{
 readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
 readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result='data:application/octet-stream;base64,'+Buffer.from(buffer).toString('base64');this.onloadend?.();});}
};
const assets=[],report=[];
const selections=[
 ['patrulha-nave-provisoria','Nave da Patrulha Espacial',context.parts.nave,3],
 ['patrulha-asteroide-provisorio','Meteoro da Patrulha Espacial',context.parts.moldeMeteoro,1.8],
 ['patrulha-laser-provisorio','Laser da Patrulha Espacial',context.parts.moldeTiro,0.9],
];
for(const [name,label,object,size] of selections){
 object.visible=true;
 object.position.set(0,0,0);
 const modelScene=new THREE.Scene();modelScene.add(object);
 const buffer=await new GLTFExporter().parseAsync(modelScene,{binary:true,onlyVisible:true});
 assert.ok(buffer instanceof ArrayBuffer);
 const bytes=Buffer.from(buffer);
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
 const file=name+'.glb';fs.writeFileSync(new URL(file,modelsDirectory),bytes);
 const loaded=await new GLTFLoader().parseAsync(buffer,'');
 const bounds=new THREE.Box3().setFromObject(loaded.scene).getSize(new THREE.Vector3()).toArray();
 let meshes=0;loaded.scene.traverse(x=>{if(x.isMesh)meshes++;});
 assets.push({id:'construtor-'+name,name,kind:'model3d',source:'upload',dataUrl:'data:model/gltf-binary;base64,'+bytes.toString('base64'),originalFileName:file});
 report.push({name,label,file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),meshes,rawDimensions:bounds.map(x=>+x.toFixed(5)),blockSize:size});
}
fs.writeFileSync(new URL('assets.json',import.meta.url),JSON.stringify(assets)+'\n');
fs.writeFileSync(new URL('gallery-models-origin.json',import.meta.url),JSON.stringify({
 repository:'informach/sistema-zero',ref:'9ca0696aef5a536846525704b9d01261e2bd0da7',
 path:'packages/studio/src/official-extensions/game-3d/__gen_patrulhaEspacial.ts',
 sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),
 method:'Exact existing gallery geometry and colors, packaged as GLB. Root placement is reset for a reusable asset; native model import centers and fits the bounds.',
 models:report,
},null,2)+'\n');
console.log(JSON.stringify({models:report,assetsFile:'assets.json'}));
