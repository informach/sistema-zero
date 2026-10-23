(function(){var e=Object.defineProperty,t=(e,t)=>()=>(e&&(t=e(e=0)),t),n=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r};let r=32768;function i(e){let t=``;for(let n=0;n<e.length;n+=r)t+=String.fromCharCode.apply(null,Array.from(e.subarray(n,n+r)));return btoa(t)}function a(e){try{let t=atob(e),n=new Uint8Array(t.length);for(let e=0;e<t.length;e+=1)n[e]=t.charCodeAt(e);return n}catch{return null}}function o(e,t,n){if(!e)throw new g(t,n)}function s(e,t,n){o(typeof e==`object`&&!!e&&!Array.isArray(e),t,`Objeto esperado.`);let r=e;if(n)for(let e of Object.keys(r))o(n.includes(e),`${t}.${e}`,`Campo desconhecido.`);return r}function c(e,t,n){return o(Array.isArray(e)&&e.length<=n,t,`Lista fora do orçamento.`),Array.from(e)}function l(e,t,n=128,r=!1){return o(typeof e==`string`&&e.length<=n&&(r||e.length>0),t,`Texto inválido.`),e}function u(e,t){let n=l(e,t);return o(/^[A-Za-z0-9_:-]+$/.test(n),t,`Identificador inválido.`),n}function d(e,t,n=-1/0,r=1/0,i=!1){return o(typeof e==`number`&&Number.isFinite(e)&&e>=n&&e<=r&&(!i||Number.isSafeInteger(e)),t,`Número inválido.`),e===0?0:e}function f(e,t){return o(typeof e==`boolean`,t,`Valor booleano esperado.`),e}function p(e,t,n){let r=c(e,n,t);return o(r.length===t,n,`Dimensão inválida.`),r.map((e,t)=>d(e,`${n}[${t}]`))}function m(e,t,n){return o(typeof e==`string`&&t.includes(e),n,`Opção desconhecida.`),e}function h(e,t){let n=new Map;for(let r of e)o(!n.has(r.id),t,`Identificador repetido: ${r.id}`),n.set(r.id,r);return n}var g,_=t((()=>{g=class extends Error{path;constructor(e,t){super(t),this.path=e,this.name=`SceneValidationError`}}}));function v(e){return e+(4-e%4)%4}function y(e,t,n=4294967295){let r=new TextEncoder().encode(JSON.stringify(e)),i=v(r.length),a=t.reduce((e,t)=>e+v(t.byteLength),0),o=20+i+(a?8+a:0);if(!Number.isSafeInteger(o)||o>n||o>4294967295)throw RangeError(`O arquivo GLB ultrapassa o tamanho permitido.`);let s=new Uint8Array(o),c=new DataView(s.buffer);if(c.setUint32(0,1179937895,!0),c.setUint32(4,2,!0),c.setUint32(8,o,!0),c.setUint32(12,i,!0),c.setUint32(16,1313821514,!0),s.fill(32,20,20+i),s.set(r,20),a){let e=20+i;c.setUint32(e,a,!0),c.setUint32(e+4,5130562,!0);let n=e+8;for(let e of t)s.set(e,n),n+=v(e.byteLength)}return s}var b=t((()=>{})),x,S,C,w=t((()=>{_(),b(),x=32*1024*1024,S={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},C=class{segments=[];views=[];accessors=[];byteLength=0;addView(e,t){let n=v(e.byteLength);o(e.byteLength>0&&this.byteLength+n<=33554432,`export.buffers`,`Os dados do GLB ultrapassam o tamanho permitido.`);let r=this.views.length;return this.views.push({buffer:0,byteOffset:this.byteLength,byteLength:e.byteLength,...t===void 0?{}:{target:t}}),this.segments.push(e),this.byteLength+=n,r}floats(e,t,n=!1,r){let i=S[t];o(e.length>0&&e.length%i===0&&e.every(Number.isFinite),`export.accessor`,`Os valores não cabem na precisão do GLB.`);let a=Array(i).fill(1/0),s=Array(i).fill(-1/0);if(n)for(let t=0;t<e.length;t++){let n=t%i;a[n]=Math.min(a[n],e[t]),s[n]=Math.max(s[n],e[t])}let c=this.accessors.length;return this.accessors.push({bufferView:this.addView(new Uint8Array(e.buffer,e.byteOffset,e.byteLength),r),componentType:5126,type:t,count:e.length/i,...n?{min:a,max:s}:{}}),c}indices(e){return this.unsignedShorts(e,`SCALAR`,34963)}joints(e){return this.unsignedShorts(e,`VEC4`,34962)}unsignedShorts(e,t,n){o(e.length>0&&e.length%S[t]===0,`export.accessor`,`O grupo de índices do GLB está incompleto.`);let r=this.accessors.length;return this.accessors.push({bufferView:this.addView(new Uint8Array(e.buffer,e.byteOffset,e.byteLength),n),componentType:5123,type:t,count:e.length/S[t]}),r}}}));w();let T=x*2;function E(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function D(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function O(e){return Math.hypot(e[0],e[1],e[2])}function k(e){let t=O(e)||1;return[e[0]/t,e[1]/t,e[2]/t]}function A(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function j(e,t,n){let r=A(t,e),i=A(n,e),a=Math.max(...r.map(Math.abs),...i.map(Math.abs));return a===0?[0,0,0]:k(E([r[0]/a,r[1]/a,r[2]/a],[i[0]/a,i[1]/a,i[2]/a]))}_();let M={points:128,around:{min:3,max:64}};function N(e){let t=c(e.points,`points`,M.points).map((e,t)=>{let n=s(e,`points.${t}`,[`id`,`position`]);return{id:u(n.id,`points.${t}.id`),position:p(n.position,3,`points.${t}.position`)}});h(t,`points`),o(t.length>=2,`points`,`O caminho precisa de pelo menos dois pontos.`);let n=d(e.radius,`radius`,Number.MIN_VALUE),r=d(e.around,`around`,M.around.min,M.around.max,!0),i=f(e.endCaps,`endCaps`),a=e.closed===void 0?!1:f(e.closed,`closed`);return o(!a||t.length>=3,`points`,`Um laço precisa de pelo menos três pontos.`),o(!a||!i,`endCaps`,`Um laço fechado não tem pontas para tampar.`),te(P(t.map(e=>e.position),a),a),o(t[0].position.some((e,n)=>e!==t.at(-1).position[n]),`points`,`Não repita o primeiro ponto no fim do caminho. Para unir as pontas, marque Caminho fechado.`),{points:t,radius:n,around:r,endCaps:i,...e.closed===void 0?{}:{closed:a}}}function P(e,t=!1){return(t?[...e.slice(1),e[0]]:e.slice(1)).map((t,n)=>{let r=A(t,e[n]),i=Math.max(...r.map(Math.abs));o(Number.isFinite(i)&&i>0,`points`,`Separe os pontos vizinhos do caminho e mantenha suas medidas dentro da precisão.`);let a=r.map(e=>e/i),s=Math.hypot(...a);return a.map(e=>e/s)})}function ee(e,t){return(e-+!t.closed)*t.around*2+(!t.closed&&t.endCaps?t.around*2:0)}function te(e,t=!1){return Array.from({length:e.length+ +!t},(n,r)=>{if(!t&&r===0)return e[0];if(!t&&r===e.length)return e.at(-1);let i=e[(r-1+e.length)%e.length],a=e[r];return o(D(i,a)>-.9999999999,`points`,`O caminho está voltando sobre si mesmo. Abra um pouco essa curva.`),k(i.map((e,t)=>e+a[t]))})}_();function ne(e){let{points:t,radius:n,around:r,endCaps:i,closed:a=!1}=N(e),s=t.map(e=>e.position),c=te(P(s,a),a),l=(a?[...s.slice(1),s[0]]:s.slice(1)).map((e,t)=>d(Math.hypot(...A(e,s[t])),`points`)).reduce((e,t)=>d(e+t,`points`),0),u=0,f=c[0],p=[0,0,0];p[f.map(Math.abs).indexOf(Math.min(...f.map(Math.abs)))]=1;let m=k(E(f,p)),h={},g={},_=new Map,v=(e,t)=>`ring:${a?e%s.length:e}:${t%r}`,y=[],b=(e,t,n)=>{let r=E(t,n),i=1+D(t,n);o(i>1e-10,`points`,`Abra um pouco a curva do caminho.`);let a=E(r,e),s=E(r,a);return k(e.map((e,t)=>e+a[t]+s[t]/i))},x=s.map((e,t)=>(t&&(m=b(m,c[t-1],c[t]),u+=Math.hypot(...A(e,s[t-1]))),y.push(u/l),m)),S=a?b(x.at(-1),c.at(-1),f):x[0],C=a?Math.atan2(D(f,E(S,x[0])),D(S,x[0])):0;s.forEach((e,t)=>{let i=c[t],o=x[t];if(a&&C!==0){let e=C*y[t],n=Math.sin(e),r=Math.cos(e),a=E(i,o);o=k(o.map((e,t)=>e*r+a[t]*n))}let s=k(E(i,o));for(let i=0;i<r;i++){let a=i/r*Math.PI*2;h[v(t,i)]=e.map((e,t)=>d(e+n*(Math.cos(a)*o[t]+Math.sin(a)*s[t]),`vertices`))}});let w=(t,n,r)=>{let i=e.surfaces[n];g[t]={...i?.materialId===void 0?{}:{materialId:i.materialId},corners:r.map(e=>({...e,uv:i?[d(i.uv.origin[0]+e.uv[0]*i.uv.u[0]+e.uv[1]*i.uv.v[0],`uv`),d(i.uv.origin[1]+e.uv[0]*i.uv.u[1]+e.uv[1]*i.uv.v[1],`uv`)]:e.uv}))},_.set(t,n)};for(let e=0;e<s.length-+!a;e++)for(let t=0;t<r;t++){let n=[{vertexId:v(e,t),uv:[t/r,y[e]]},{vertexId:v(e,t+1),uv:[(t+1)/r,y[e]]},{vertexId:v(e+1,t+1),uv:[(t+1)/r,y[e+1]??1]},{vertexId:v(e+1,t),uv:[t/r,y[e+1]??1]}];w(`side:${e}:${t}:a`,`side`,[n[0],n[1],n[2]]),w(`side:${e}:${t}:b`,`side`,[n[0],n[2],n[3]])}if(i)for(let[e,t]of[[0,`bottom`],[s.length-1,`top`]]){let n=`center:${t}`;h[n]=s[e];let i=t=>({vertexId:v(e,t),uv:[(Math.cos(t%r/r*Math.PI*2)+1)/2,(Math.sin(t%r/r*Math.PI*2)+1)/2]});for(let a=0;a<r;a++)w(`${t}:${a}`,t,[{vertexId:n,uv:[.5,.5]},...e===0?[i(a+1),i(a)]:[i(a),i(a+1)]])}return{mesh:{id:e.id,kind:`mesh`,vertices:h,faces:g,looseEdges:[]},surfaceByFace:_}}let F={maxParts:128,maxPartSize:32,gridHalf:16,gridHeight:32,minSkin:4,maxSkin:32,texelsPerUnit:[2,4,8],atlasMax:512,textureSizes:[16,32,64],maxExtraColors:48,maxNameChars:48,maxTriangles:2e4,maxMeshVertices:1024,maxMeshFaces:1024,maxMeshLooseEdges:1024,positionPrecision:1/16,meshPrecision:1/16,maxPartNameChars:24,maxThumbChars:12e3,undoBudgetBytes:16e6,exportCacheBytes:16*1024*1024,previewCacheBytes:8*1024*1024,referenceFileBytes:4*1024*1024,referenceImagePixels:4*1024*1024,referenceImageSide:4096,maxGalleryBytes:96*1024*1024,studioMax3DChars:7e6,studioMaxImageChars:8e5};function re(e){return F.texelsPerUnit.includes(e)}function ie(e,t){let[n,r,i]=e,[a,o,s]=t;return{vertices:{v_000:[n,r,i],v_001:[n,r,s],v_010:[n,o,i],v_011:[n,o,s],v_100:[a,r,i],v_101:[a,r,s],v_110:[a,o,i],v_111:[a,o,s]},faces:{f_px:{v:[`v_111`,`v_101`,`v_100`,`v_110`]},f_nx:{v:[`v_010`,`v_000`,`v_001`,`v_011`]},f_py:{v:[`v_010`,`v_011`,`v_111`,`v_110`]},f_ny:{v:[`v_001`,`v_000`,`v_100`,`v_101`]},f_pz:{v:[`v_011`,`v_001`,`v_101`,`v_111`]},f_nz:{v:[`v_110`,`v_100`,`v_000`,`v_010`]}}}}let I={box:[`px`,`nx`,`py`,`ny`,`pz`,`nz`],wedge:[`ny`,`nz`,`slope`,`px`,`nx`],cylinder:[`side`,`top`,`bottom`],sphere:[`around`],mesh:[]};function ae(e){switch(e){case`box`:return 12;case`wedge`:return 8;case`cylinder`:return 64;case`sphere`:return 120;case`mesh`:return 0}}_();let oe={around:{min:3,max:64},down:{min:2,max:32}};function se(e,t){let n=s(t,`tessellation`,e===`sphere`?[`around`,`down`]:[`around`]),r=d(n.around,`tessellation.around`,oe.around.min,oe.around.max,!0);return e===`sphere`?{around:r,down:d(n.down,`tessellation.down`,oe.down.min,oe.down.max,!0)}:{around:r}}function ce(e){return e.kind===`sphere`?se(`sphere`,e.tessellation??{around:12,down:6}):{...se(`cylinder`,e.tessellation??{around:16}),down:1}}function le(e){if(e.kind===`box`||e.kind===`wedge`)return ae(e.kind);let{around:t,down:n}=ce(e);return e.kind===`cylinder`?t*4:t*(n-1)*2}_();let ue=[[0,0],[0,1],[1,1],[1,0]];var de=class{source;mesh;surfaceByFace=new Map;constructor(e){this.source=e,this.mesh={id:e.id,kind:`mesh`,vertices:{},faces:{},looseEdges:[]}}vertex(e,t){this.mesh.vertices[e]=[d(t[0],e),d(t[1],e),d(t[2],e)]}unitVertex(e,t){let n=e=>{let n=(t[e]+1)/2;return n===0?this.source.from[e]:n===1?this.source.to[e]:(1-n)*this.source.from[e]+n*this.source.to[e]};this.vertex(e,[n(0),n(1),n(2)])}face(e,t,n,r=ue){let i=this.source.surfaces[t];this.mesh.faces[e]={...i?.materialId===void 0?{}:{materialId:i.materialId},corners:n.map((t,n)=>{let a=r[n];if(!a)throw Error(`UV ausente na forma.`);let o=i?[i.uv.origin[0]+a[0]*i.uv.u[0]+a[1]*i.uv.v[0],i.uv.origin[1]+a[0]*i.uv.u[1]+a[1]*i.uv.v[1]]:[...a];return{vertexId:t,uv:[d(o[0],e),d(o[1],e)]}})},this.surfaceByFace.set(e,t)}};function fe(e){let t=ie(e.source.from,e.source.to);for(let[n,r]of Object.entries(t.vertices))e.source.kind===`wedge`&&(n===`v_011`||n===`v_111`)||e.vertex(n,r);if(e.source.kind===`box`)for(let n of[`px`,`nx`,`py`,`ny`,`pz`,`nz`]){let r=t.faces[`f_${n}`];if(!r)throw Error(`Face ausente na caixa.`);e.face(n,n,r.v)}else e.face(`ny`,`ny`,[`v_001`,`v_000`,`v_100`,`v_101`]),e.face(`nz`,`nz`,[`v_110`,`v_100`,`v_000`,`v_010`]),e.face(`slope`,`slope`,[`v_010`,`v_001`,`v_101`,`v_110`]),e.face(`px`,`px`,[`v_110`,`v_101`,`v_100`],[[1,0],[0,1],[1,1]]),e.face(`nx`,`nx`,[`v_010`,`v_000`,`v_001`],[[0,0],[0,1],[1,1]])}function pe(e,t){let n=(e,n)=>`ring:${n?`top`:`bottom`}:${e%t}`,r=(e,n)=>{let r=e%t/t*Math.PI*2;return[(Math.sin(r)+1)/2,(1+(n?1:-1)*Math.cos(r))/2]};for(let r=0;r<t;r++){let i=r/t*Math.PI*2;for(let t of[!0,!1])e.unitVertex(n(r,t),[Math.sin(i),t?1:-1,Math.cos(i)]);e.face(`side:${r}`,`side`,[n(r,!0),n(r,!1),n(r+1,!1),n(r+1,!0)],[[r/t,0],[r/t,1],[(r+1)/t,1],[(r+1)/t,0]])}e.unitVertex(`center:top`,[0,1,0]),e.unitVertex(`center:bottom`,[0,-1,0]);for(let i=0;i<t;i++)e.face(`top:${i}`,`top`,[`center:top`,n(i,!0),n(i+1,!0)],[[.5,.5],r(i,!0),r(i+1,!0)]),e.face(`bottom:${i}`,`bottom`,[`center:bottom`,n(i+1,!1),n(i,!1)],[[.5,.5],r(i+1,!1),r(i,!1)])}function me(e,t,n){let r=(e,r)=>r===0?`pole:top`:r===n?`pole:bottom`:`ring:${r}:${e%t}`;e.unitVertex(`pole:top`,[0,1,0]),e.unitVertex(`pole:bottom`,[0,-1,0]);for(let i=1;i<n;i++){let a=i/n*Math.PI;for(let n=0;n<t;n++){let o=n/t*Math.PI*2;e.unitVertex(r(n,i),[Math.sin(a)*Math.sin(o),Math.cos(a),Math.sin(a)*Math.cos(o)])}}for(let i=0;i<n;i++)for(let a=0;a<t;a++){let o=[r(a,i),r(a,i+1),r(a+1,i+1),r(a+1,i)],s=[[a/t,i/n],[a/t,(i+1)/n],[(a+1)/t,(i+1)/n],[(a+1)/t,i/n]],c=i===0?[0,1,2]:i===n-1?[0,2,3]:[0,1,2,3];e.face(`around:${i}:${a}`,`around`,c.map(e=>{let t=o[e];if(!t)throw Error(`Vértice ausente na esfera.`);return t}),c.map(e=>{let t=s[e];if(!t)throw Error(`UV ausente na esfera.`);return t}))}}function he(e){let t=new de(e);if(e.kind===`box`||e.kind===`wedge`)fe(t);else{let n=ce(e);e.kind===`cylinder`?pe(t,n.around):me(t,n.around,n.down)}return{mesh:t.mesh,surfaceByFace:t.surfaceByFace}}let ge=e=>e.kind===`path`?ne(e):he(e),_e=e=>e.kind===`path`?ee(e.points.length,e):le(e),ve=1e-12,ye=(e,t,n)=>(t[0]-e[0])*(n[1]-e[1])-(t[1]-e[1])*(n[0]-e[0]);function be(e,t,n){return Math.abs(ye(e,t,n))<=ve&&n[0]>=Math.min(e[0],t[0])-ve&&n[0]<=Math.max(e[0],t[0])+ve&&n[1]>=Math.min(e[1],t[1])-ve&&n[1]<=Math.max(e[1],t[1])+ve}function xe(e,t,n,r){let i=ye(e,t,n),a=ye(e,t,r),o=ye(n,r,e),s=ye(n,r,t);return i*a<-1e-12*ve&&o*s<-1e-12*ve||be(e,t,n)||be(e,t,r)||be(n,r,e)||be(n,r,t)}function Se(e){if(e.length<3)return{status:`degenerate`,triangles:[]};let t=e[0];if(!t)return{status:`degenerate`,triangles:[]};let n=Math.max(...e.flatMap(e=>[Math.abs(e[0]-t[0]),Math.abs(e[1]-t[1]),Math.abs(e[2]-t[2])]));if(!Number.isFinite(n)||n===0)return{status:`degenerate`,triangles:[]};let r=e.map(e=>[(e[0]-t[0])/n,(e[1]-t[1])/n,(e[2]-t[2])/n]),i=[0,0,0];for(let e=0;e<r.length;e++){let t=r[e],n=r[(e+1)%r.length];if(!t||!n)throw Error(`Polígono incompleto.`);i[0]+=(t[1]-n[1])*(t[2]+n[2]),i[1]+=(t[2]-n[2])*(t[0]+n[0]),i[2]+=(t[0]-n[0])*(t[1]+n[1])}let a=[0,1,2].map(e=>{let t=r.map(t=>t[e]??0);return Math.max(...t)-Math.min(...t)}),o=Math.hypot(...i)>ve?i.map(Math.abs).indexOf(Math.max(...i.map(Math.abs))):a.indexOf(Math.min(...a)),s=r.map(e=>o===0?[e[1],e[2]]:o===1?[e[0],e[2]]:[e[0],e[1]]);for(let e of[0,1]){let t=s.map(t=>t[e]),n=Math.min(...t),r=Math.max(...t)-n;if(r===0)return{status:`degenerate`,triangles:[]};for(let t of s)t[e]=(t[e]-n)/r}let c=e=>{let t=s[e];if(!t)throw Error(`Canto ausente.`);return t};for(let t=0;t<e.length;t++)for(let n=t+1;n<e.length;n++)if(!(n===(t+1)%e.length||t===(n+1)%e.length)&&xe(c(t),c((t+1)%e.length),c(n),c((n+1)%e.length)))return{status:`self-intersection`,triangles:[]};let l=0;for(let t=0;t<e.length;t++){let n=c(t),r=c((t+1)%e.length);l+=n[0]*r[1]-n[1]*r[0]}if(Math.abs(l)<=ve)return{status:`degenerate`,triangles:[]};let u=Math.sign(l),d=e.map((e,t)=>t),f=[];for(;d.length>3;){let e=!1;for(let t=1;t<=d.length;t++){let n=t%d.length,r=d[(n+d.length-1)%d.length],i=d[n],a=d[(n+1)%d.length];if(r===void 0||i===void 0||a===void 0)throw Error(`Polígono incompleto.`);if(!(ye(c(r),c(i),c(a))*u<=ve)&&!d.some(e=>e!==r&&e!==i&&e!==a&&ye(c(r),c(i),c(e))*u>=-1e-12&&ye(c(i),c(a),c(e))*u>=-1e-12&&ye(c(a),c(r),c(e))*u>=-1e-12)){f.push([r,i,a]),d.splice(n,1),e=!0;break}}if(!e)return{status:`degenerate`,triangles:[]}}let[p,m,h]=d;return p===void 0||m===void 0||h===void 0||Math.abs(ye(c(p),c(m),c(h)))<=ve?{status:`degenerate`,triangles:[]}:(f.push([p,m,h]),{status:`ok`,triangles:f})}_();function Ce(e){let t=e.kind===`mesh`?{mesh:e,surfaceByFace:null}:ge(e),n=t.mesh,r=[],i=[],a=[],o=[],s=[],c=[],l=[];for(let[e,u]of Object.entries(n.faces)){let d=t.surfaceByFace?.get(e)??e,f=u.corners.map(e=>{let t=n.vertices[e.vertexId];if(!t||!Object.hasOwn(n.vertices,e.vertexId))throw Error(`Vértice ausente.`);return t}),p=Se(f);if(p.status!==`ok`){l.push({faceId:d,code:p.status});continue}for(let e of p.triangles){let t=e.map(e=>({point:f[e],uv:u.corners[e]?.uv})),[n,l,p]=t;if(!n?.point||!l?.point||!p?.point)throw Error(`Triângulo incompleto.`);let m=j(n.point,l.point,p.point);o.push(...e);for(let e of t){if(!e.point||!e.uv)throw Error(`Canto incompleto.`);r.push(...e.point),i.push(...m),a.push(...e.uv)}s.push(d),c.push(u.materialId??null)}}return we({positions:Float32Array.from(r),normals:Float32Array.from(i),uvs:Float32Array.from(a),cornerIndices:Uint32Array.from(o),faceIds:s,materialIds:c,issues:l})}function we(e){o([e.positions,e.normals,e.uvs].every(e=>e.every(Number.isFinite)),`geometry`,`A geometria excede a precisão de desenho.`);let t=new Set,n=e.positions;for(let r=0;r<e.faceIds.length;r++){let i=r*9,a=(n[i+3]??0)-(n[i]??0),o=(n[i+4]??0)-(n[i+1]??0),s=(n[i+5]??0)-(n[i+2]??0),c=(n[i+6]??0)-(n[i]??0),l=(n[i+7]??0)-(n[i+1]??0),u=(n[i+8]??0)-(n[i+2]??0);o*u===s*l&&s*c===a*u&&a*l===o*c&&t.add(e.faceIds[r]??``)}if(!t.size)return e;let r=e.faceIds.flatMap((e,n)=>t.has(e)?[]:[n]),i=(e,t)=>{let n=new Float32Array(r.length*t);return r.forEach((r,i)=>{n.set(e.subarray(r*t,(r+1)*t),i*t)}),n},a=new Uint32Array(r.length*3);return r.forEach((t,n)=>{a.set(e.cornerIndices.subarray(t*3,t*3+3),n*3)}),{positions:i(e.positions,9),normals:i(e.normals,9),uvs:i(e.uvs,6),cornerIndices:a,faceIds:r.map(t=>e.faceIds[t]??``),materialIds:r.map(t=>e.materialIds[t]??null),issues:[...e.issues,...[...t].map(e=>({faceId:e,code:`precision`}))]}}function Te(e){return e===1?1:e<=.0031308?e*12.92:1.055*e**(1/2.4)-.055}function Ee(e){return e<=.04045?e/12.92:((e+.055)/1.055)**2.4}var De=t((()=>{}));De();let Oe=/^#?([0-9a-f]{6})$/i,ke=/^#?([0-9a-f]{3})$/i;function Ae(e){let t=e.trim(),n=Oe.exec(t);if(n?.[1])return`#${n[1].toLowerCase()}`;let r=ke.exec(t);if(r?.[1]){let[e,t,n]=r[1].toLowerCase();return`#${e}${e}${t}${t}${n}${n}`}return null}function je(e){let t=Ae(e)??`#000000`,n=Number.parseInt(t.slice(1),16);return[n>>16&255,n>>8&255,n&255]}function Me(e){return Ee(Math.min(1,Math.max(0,e/255)))}let Ne={appName:`Molda`,scene:{title:`Minha oficina 3D`,skinWeights:{title:`Força dos ossos nestes pontos`,choosePoints:`Escolha pontos, linhas ou faces da peça para ajustar seus pesos.`,mixed:`Estes pontos usam misturas diferentes. Escolha uma nova mistura somente se quiser usá-la em todos os pontos selecionados.`,same:`Estes pontos usam a mesma mistura. Cada força diz quanto o ponto acompanha aquele osso.`,displayHint:`Os números aparecem arredondados para facilitar a leitura. Abrir ou confirmar sem editar não arredonda os pesos guardados.`,chooseJoints:`Ossos desta mistura`,limit:`Escolha até quatro ossos. Desmarcar um remove sua força desta mistura.`,percent:e=>`Força de ${e} (%)`,normalize:`Ajustar o total para 100%`,equal:`Dividir a força por igual`,review:`Revisar mistura`,reviewing:`Confira antes de aplicar`,impact:e=>`Esta mistura será usada em ${e.toLocaleString(`pt-BR`)} ${e===1?`ponto`:`pontos`}. Os outros pontos não mudam.`,acceptMixed:`Quero usar a mesma mistura em todos estes pontos.`,apply:`Aplicar mistura`,cancel:`Cancelar revisão`,reset:`Voltar aos pesos guardados`,undo:`A mudança pode ser desfeita de uma vez na oficina.`,invalid:`Preencha uma força entre 0 e 100 para cada osso.`,total:`As forças precisam somar 100%. Edite os valores ou escolha ajustar o total.`,precision:`Uma força é pequena demais para o desenho. Ajuste o valor ou remova esse osso da mistura.`,changed:`Os pontos ou a criação mudaram. Escolha novamente antes de ajustar os pesos.`,interrupted:`O rascunho foi descartado ao interromper a edição. Os pesos guardados não mudaram.`,failed:`Não foi possível aplicar os pesos. Confira a seleção e tente novamente.`},weightMap:{title:`Ver força de um osso`,off:`Não mostrar forças`,zero:`0%: não acompanha`,full:`100%: acompanha por inteiro`,hint:`As cores dos pontos mostram os pesos guardados deste osso. O rascunho só muda o desenho depois de aplicar. O contorno azul continua marcando sua seleção.`,exact:`Para ler ou ajustar os valores, escolha os pontos e abra Força dos ossos nestes pontos.`},skinPaint:{title:`Pincel de forças`,off:`Só observar`,add:`Dar força`,subtract:`Tirar força`,radius:`Alcance (blocos)`,strength:`Intensidade (%)`,radiusInvalid:`Use um alcance maior que zero.`,hint:`Arraste sobre a peça. Soltar aplica um traço; Escape cancela. Desfazer retira o traço inteiro.`,previewHint:`Durante o traço, as cores mostram uma prévia. Os pesos só são guardados ao soltar. A pintura não muda as cores da sua criação.`,reachHint:`O círculo é uma referência do alcance em blocos. A força segue as faces ligadas, mesmo nas dobras; as cores mostram os pontos afetados. Repassar no mesmo traço não acumula força.`,through:`Ver pontos atrás da peça`,cancelled:`Traço cancelado. Os pesos guardados não mudaram.`,applied:e=>e?`Forças ajustadas em ${e.toLocaleString(`pt-BR`)} ${e===1?`ponto`:`pontos`}. Você pode desfazer.`:`Este traço não mudou os pesos.`,painting:e=>`Prévia: ${e.toLocaleString(`pt-BR`)} ${e===1?`ponto mudou`:`pontos mudaram`}.`,refusals:{"influence-limit":e=>`${e.toLocaleString(`pt-BR`)} pontos já usam quatro ossos. Ajuste a mistura pelos números para trocar um osso.`,"no-recipient":e=>`${e.toLocaleString(`pt-BR`)} pontos precisam de outro osso com força para dividir a mistura.`,precision:e=>`${e.toLocaleString(`pt-BR`)} pontos foram preservados para não perder uma força muito pequena. Ajuste a mistura pelos números.`}},skinBinding:{addJoint:`Adicionar osso ao vínculo`,removeJoint:`Retirar osso do vínculo`,chooseNewJoint:`Apoio para adicionar`,chooseNewJointPlaceholder:`Escolha um apoio`,noNewJoints:`Todos os apoios da criação já estão neste vínculo.`,addJointHint:`A posição atual deste apoio será sua posição inicial no vínculo. Os pesos e ossos antigos não mudam. Depois, ajuste os pesos dos pontos para o novo osso começar a movê-los.`,removeJointHint:`O osso sai só deste vínculo. Seu apoio, filhos e animações continuam na criação. Forças iguais a zero deste osso serão retiradas; os outros pesos não mudam.`,jointInUse:e=>`Este osso move ${e.toLocaleString(`pt-BR`)} ${e===1?`ponto`:`pontos`}. Ajuste seus pesos antes de retirá-lo.`,jointUnused:`Não move nenhum ponto desta peça.`,removeJointNamed:e=>`Retirar ${e} do vínculo`,confirmAddJoint:`Confirmar novo osso`,confirmRemoveJoint:`Confirmar retirada do osso`,open:`Ossos desta peça`,title:`Fazer a peça acompanhar os ossos`,bindingName:`Vínculo da peça`,intro:`Um osso puxa os pontos da peça. Use os grupos e pontos de apoio da sua criação para escolher onde ela vai dobrar.`,choose:`1. Escolha os ossos`,jointLimit:e=>`Você chegou ao limite de ${e} ossos. Desmarque um para escolher outro.`,chooseHint:`Só os itens marcados participam. Para dobrar entre dois apoios, organize um dentro do outro na lista da oficina.`,noJoints:`Ainda não há grupos ou pontos de apoio. Volte à oficina e crie os apoios antes de vincular a peça.`,method:`2. Como a peça acompanha`,methods:{segments:`Dobrar entre apoios`,rigid:`Seguir um apoio por ponto`},methodHints:{segments:`Divide a força entre as pontas do segmento mais próximo. É um começo geométrico, que pode precisar de ajustes.`,rigid:`Cada ponto segue somente o apoio mais próximo. Bom para movimentos sem mistura de forças.`},group:`Grupo`,locator:`Ponto de apoio`,prepare:`Sugerir pesos`,busy:`Calculando como os pontos acompanham os ossos…`,large:`Esta peça tem muitos pontos. Preparar e receber a sugestão pode pausar a interface por um momento.`,review:`3. Confira a sugestão`,summary:(e,t,n)=>`${e.toLocaleString(`pt-BR`)} pontos · ${t} ossos · até ${n} ${n===1?`osso`:`ossos`} por ponto`,noSegments:`Os apoios escolhidos não formam segmentos com comprimento. Nesta sugestão, cada ponto segue o apoio mais próximo.`,confirmHint:`A posição atual dos apoios será o começo do movimento. Nada muda até confirmar. Depois, mova os apoios na oficina para experimentar a dobra.`,apply:`Usar esses pesos`,linked:`Esta peça já acompanha seus ossos.`,linkedHint:`Mover os apoios muda a dobra. Editar forma-base muda o desenho da peça sem apagar seus pesos.`,joints:`Ossos do vínculo`,rebind:`Redefinir posição inicial`,rebindHint:`A peça volta a mostrar sua forma-base na posição atual dos apoios. Os pesos e movimentos ficam guardados, mas a forma como a peça acompanha esses movimentos pode mudar.`,confirmRebind:`Usar esta posição inicial`,remove:`Desvincular a peça`,removeHint:`A peça volta à forma-base. Os pesos deste vínculo serão removidos. Os apoios, a pintura e os movimentos continuam na criação.`,confirmRemove:`Confirmar desvinculação`,undoHint:`Você pode desfazer esta mudança na oficina.`,cancel:`Cancelar revisão`,cancelWork:`Cancelar cálculo`,close:`Voltar à oficina`,cancelled:`Cancelado. A peça continua como estava.`,changed:`A criação mudou. Confira a peça novamente antes de confirmar.`,interrupted:`A revisão foi interrompida ao sair desta janela. Prepare de novo quando quiser.`,failed:`Não foi possível preparar o vínculo. Tente de novo. Seu projeto continua como estava.`,locked:`Destrave a peça ou o grupo que a contém para mudar seu vínculo.`,exportHint:`O GLB pode levar os ossos e os pesos. Confira as mudanças na exportação antes de baixar a cópia. Seu projeto original não muda.`},photoExport:{png:`PNG: foto da criação`,presentation:`Apresentação: fotos para girar`,pngHint:`Uma foto de 1024 × 1024 pixels, sem grade, seleção ou imagem de referência.`,presentationHint:`Um arquivo HTML com 24 fotos para girar a criação. Abre no navegador sem internet; mostra a pose salva, sem tocar os movimentos.`,original:`Volte a Modelar e mostre todas as peças antes de preparar. O projeto e a miniatura da galeria continuam como estavam.`,unavailable:`Não consegui fotografar agora. Volte a Modelar, encerre as prévias, mostre todas as peças e tente de novo.`,preview:`Prévia da foto para exportar`,progress:(e,t)=>`Fotografando a criação: ${e} de ${t}`},glbExport:{open:`Exportar GLB`,format:`Formato da cópia`,formats:{glb:`GLB: modelo 3D`,gltf:`glTF: modelo 3D em JSON`,obj:`OBJ: formas e pinturas em ZIP`},prepareFile:`Preparar cópia`,downloadFile:`Baixar cópia`,objHint:`O OBJ leva formas paradas, cores e pinturas. Extraia o ZIP e mantenha os arquivos juntos.`,pendingPose:`Antes de exportar, escolha Gravar pose ajustada ou Cancelar pose. Sua prévia continua no modelo.`,title:`Levar minha criação`,intro:`O GLB é uma cópia 3D com as peças, a pintura e os movimentos. Vamos conferir o que muda nessa cópia antes de baixar.`,original:`Seu projeto no Molda não muda. Para guardar tudo e continuar editando depois, use também Baixar projeto na oficina.`,destination:`Para onde vai esta cópia`,destinationDownload:`Para outros programas`,destinationDownloadHint:`Uma cópia que qualquer programa de 3D abre. Pintura que se mexe fica parada no primeiro quadro.`,destinationStudio:`Para o Estúdio`,destinationStudioHint:`Leva a folha inteira da pintura que se mexe, para ela continuar se mexendo no Jogo 3D Avançado.`,prepare:`Preparar GLB`,validating:`Conferindo a criação…`,encoding:`Preparando peças, pintura e movimentos…`,ready:`Sua cópia está pronta para conferir.`,noChanges:`Nenhuma conversão com aviso foi necessária.`,clipsTitle:`Movimentos nesta cópia`,clipsHint:`Estes são os nomes para usar nos blocos de animação do Jogo 3D Avançado. No jogo, o bloco escolhe se o movimento repete ou toca uma vez.`,clipSummary:(e,t,n)=>`${e.toLocaleString(`pt-BR`,{maximumFractionDigits:3})} s · ${t} quadros por segundo · no Molda: ${n?`repetir`:`uma vez`}`,changes:`O que muda nesta cópia`,accept:`Li as mudanças e quero baixar esta cópia.`,download:`Baixar GLB`,downloaded:`Download iniciado. Seu projeto continua aqui.`,cancel:`Cancelar preparação`,close:`Voltar à oficina`,cancelled:`Preparação cancelada. Você pode tentar de novo.`,changed:`A criação mudou. Prepare uma nova cópia para levar a versão atual.`,interrupted:`A preparação foi interrompida ao sair desta janela. Prepare de novo quando quiser.`,failed:`Não foi possível preparar a cópia. Tente de novo ou guarde o projeto original.`,downloadFailed:`Não foi possível iniciar o download. Tente novamente.`,summary:(e,t,n)=>`${e} ${e===1?`peça`:`peças`} · ${t} ${t===1?`movimento`:`movimentos`} · ${(n/(n<1048576?1024:1048576)).toLocaleString(`pt-BR`,{maximumFractionDigits:2})} ${n<1048576?`KB`:`MB`}`,studio:{review:`Confira as mudanças antes de atualizar sua cópia no Estúdio.`,accept:`Aceitar mudanças e atualizar no Estúdio`,keep:`Manter a cópia anterior`,textureBudget:`A pintura desta cópia ocupa espaço demais para preparar o modelo. Reduza o tamanho das imagens ou reutilize os mesmos acabamentos.`,title:`Conferir para o Estúdio`,needsChanges:`Estúdio: esta cópia precisa de ajustes`,fits:`Uma cópia cabe nos limites de modelos do Estúdio.`,empty:`Esta cópia não tem peças visíveis para usar no jogo.`,tooComplex:`Esta cópia ultrapassa os limites de modelos do Estúdio. Você ainda pode baixar o GLB para outros programas.`,animated:`Para tocar os movimentos, use o Jogo 3D Avançado e seus blocos de animação. No Jogo 3D básico, o modelo fica parado.`,static:`Esta cópia não contém movimentos.`,skinned:`Para usar peças com ossos, escolha o Jogo 3D Avançado, mesmo se a cópia não tiver movimentos.`,scope:`Isso confere os limites de uma cópia, não a velocidade do jogo inteiro. Outras cópias, modelos e efeitos também têm custo.`,manual:`Para usar esta criação em um jogo, abra o projeto no Estúdio e escolha Trazer do Molda. Depois disso, as edições salvas aqui atualizam a cópia vinculada.`,limits:{bytes:(e,t)=>`Arquivo: ${(e/1048576).toLocaleString(`pt-BR`,{maximumFractionDigits:2})} MB; limite aproximado de ${(t/1048576).toLocaleString(`pt-BR`,{maximumFractionDigits:2})} MB. Reduza a resolução da pintura ou a quantidade de chaves de movimento numa cópia do projeto.`,meshes:(e,t)=>`O arquivo vira ${e} malhas no jogo; o limite é ${t}. Peças, espelhos e materiais diferentes podem virar malhas separadas.`,bones:(e,t)=>`A cópia usa ${e} ossos; o limite é ${t}. Os espelhos também precisam de ossos. Reduza os espelhos ou a quantidade de ossos numa cópia do projeto.`,triangles:(e,t)=>`Detalhes das formas: ${e} triângulos; o limite é ${t}.`,materials:(e,t)=>`Acabamentos: ${e} materiais; o limite é ${t}. Reutilize acabamentos iguais.`,drawCalls:(e,t)=>`O jogo precisa desenhar ${e} grupos separados; o limite por modelo é ${t}.`}},issues:{"obj-structure":e=>`No OBJ, grupos e espelhos viram formas independentes na posição salva. A organização editável continua no projeto Molda.`,"obj-static":e=>`Esta cópia OBJ fica parada na pose salva, sem ossos nem movimentos editáveis.`,"obj-material":e=>`O OBJ conserva cores e pinturas. Brilho, metal, relevo, transparência e pintura nos dois lados podem mudar no outro programa. Pinturas podem repetir nas bordas de UV.`,"flipbook-uv-first-frame":e=>`${e} ${e===1?`pintura fica parada`:`pinturas ficam paradas`} no primeiro quadro porque há faces com UV fora do quadro. Ajuste essas UVs para levar o movimento sem mostrar quadros vizinhos.`,"hidden-node":e=>`${e} ${e===1?`item escondido fica`:`itens escondidos ficam`} fora da cópia.`,"skin-dependency":e=>`${e} ${e===1?`item escondido continua`:`itens escondidos continuam`} como apoio dos ossos. Suas formas não aparecem na cópia.`,"skin-precision":e=>`Os números de ${e} ${e===1?`vínculo são arredondados`:`vínculos são arredondados`} para a precisão do GLB. O movimento pode ter pequenas diferenças. Os pesos e as poses do original não mudam.`,"skin-zero-slots":e=>`Em ${e} ${e===1?`vínculo`:`vínculos`}, referências a ossos com força de 0% são simplificadas na cópia. Nenhuma força positiva é retirada.`,"skin-render-space":e=>`${e} ${e===1?`peça articulada leva`:`peças articuladas levam`} apoios para conservar espelhos e iluminação no Estúdio. Outros programas podem desenhar o brilho e os lados dessas peças de forma diferente.`,"bend-limit-omitted":e=>`${e} ${e===1?`apoio perde`:`apoios perdem`} a regra editável de limite de dobra na cópia. As poses já gravadas continuam; a regra fica guardada no projeto Molda.`,"face-omitted":e=>`${e} ${e===1?`face não pode ser desenhada e fica`:`faces não podem ser desenhadas e ficam`} fora da cópia.`,"loose-geometry":e=>`${e} ${e===1?`forma tem`:`formas têm`} linhas ou pontos soltos que não aparecem no GLB.`,"flipbook-first-frame":e=>`${e} ${e===1?`pintura animada fica parada`:`pinturas animadas ficam paradas`} no primeiro quadro.`,"runtime-tangent-space":e=>`O relevo de ${e} ${e===1?`material pode`:`materiais pode`} parecer diferente, dependendo do programa que abrir a cópia.`,"animation-resampled":e=>`${e} ${e===1?`trajeto de movimento é aproximado`:`trajetos de movimento são aproximados`} por mais poses. Curvas e mudanças instantâneas podem ter pequenas diferenças.`,"clip-omitted":e=>`${e} ${e===1?`movimento vazio ou só com itens escondidos fica`:`movimentos vazios ou só com itens escondidos ficam`} fora da cópia.`,"clip-renamed":e=>`${e} ${e===1?`movimento com nome repetido ganha`:`movimentos com nomes repetidos ganham`} um número no nome desta cópia. Confira a lista de movimentos. Os nomes no projeto original não mudam.`}},modelMode:`Modelar`,animationMode:`Animar`,animationModes:`O que você quer fazer?`,animationTitle:`Movimentos da criação`,animationEmpty:`Crie um movimento. Depois, escolha uma peça e guarde poses em momentos diferentes.`,animationName:`Nome do movimento`,animationNewName:`Meu movimento`,animationCreate:`Criar movimento`,animationChoose:`Movimento escolhido`,animationDuplicate:`Copiar movimento`,animationDelete:`Excluir movimento`,animationRename:`Renomear movimento`,animationCopyName:e=>`${e.slice(0,40)} (cópia)`,animationTimeline:`Linha do tempo`,animationStrip:(e,t)=>`${e}: ${t} momentos com chaves`,animationStripHint:`Toque numa faixa para ir à chave mais próxima. No teclado, use as setas; Home e End vão à primeira e à última chave.`,animationKeyTools:`Ajustar várias chaves`,animationKeyToolsHint:`Escolha um intervalo nas peças selecionadas. Mover ou copiar nunca apaga uma chave que já está no destino.`,animationRangeStart:`Do tempo (segundos)`,animationRangeEnd:`Até o tempo (segundos)`,animationRangeChannel:`Tipos de chave`,animationAllChannels:`Todos os tipos`,animationOffset:`Deslocar quantos segundos?`,animationOffsetHint:`Um valor positivo leva as chaves para depois. Um valor negativo leva para antes.`,animationRangeCount:e=>`${e} ${e===1?`chave escolhida`:`chaves escolhidas`}`,animationRangeInvalid:`Confira o começo e o final do intervalo.`,animationKeysMove:`Mover chaves`,animationKeysCopy:`Copiar chaves`,animationKeysRemove:`Excluir chaves escolhidas`,animationPlay:`Reproduzir movimento`,animationPause:`Pausar movimento`,animationStart:`Ir ao começo`,animationEnd:`Ir ao final`,animationPrevious:`Chave anterior`,animationNext:`Próxima pose →`,animationTime:`Tempo do movimento`,animationSeconds:`Ir para o tempo (segundos)`,animationSeek:`Ir para esse momento`,animationTimeValue:(e,t)=>`${e.toLocaleString(`pt-BR`,{maximumFractionDigits:3})} de ${t.toLocaleString(`pt-BR`,{maximumFractionDigits:3})} segundos`,animationViewportHint:`Pause, escolha uma peça e use Mover, Girar ou Tamanho para experimentar uma pose.`,animationHint:`A forma original fica guardada. Grave chaves ou poses para guardar o movimento neste momento.`,animationPoseFailed:`Não foi possível ajustar essa pose. Tente novamente ou use os campos.`,animationPoseAdjust:`Ajuste da pose`,animationPoseRecord:`Marcar pose`,animationPoseCancel:`Descartar ajustes`,animationPoseAutoKey:`Gravar ao soltar as alças`,animationPoseAutoKeyHint:`Opcional: cada arrasto guarda uma pose e pode ser desfeito.`,animationPosePending:`Pose ainda não marcada. Ajuste as peças e use Marcar pose.`,animationPoseFieldsHint:`Grave ou cancele a pose em prévia para voltar aos campos.`,bendLimit:{title:`Até onde pode dobrar?`,hint:`0° é esticado. 90° faz uma quina. 180° dobra de volta sobre si.`,min:`Menor dobra (graus)`,max:`Maior dobra (graus)`,saved:(e,t)=>`Faixa guardada: ${e}° a ${t}°.`,unlimited:`Sem faixa escolhida: a assistência pode usar de 0° a 180°.`,scope:`Vale para Dobrar pela ponta neste apoio. Não muda poses já gravadas nem limita as alças de giro.`,save:`Guardar faixa de dobra`,remove:`Retirar faixa de dobra`,cancel:`Manter faixa guardada`,dirty:`Guarde ou descarte estas mudanças antes de experimentar outra pose.`},twoBone:{title:`Dobrar pela ponta`,drag:`Escolha Mover e arraste as setas no destino. Soltar mantém a prévia; Gravar pose ajustada guarda o resultado.`,pick:`Escolha uma ponta com dois apoios acima dela: um para a dobra e outro para o começo.`,hint:`Leve a ponta para outro lugar. O começo fica parado e os dois apoios giram para formar a dobra.`,chain:`Apoios desta articulação`,roles:[`Começo`,`Dobra`,`Ponta`],target:`Destino da ponta`,step:`Passo em blocos`,nudge:(e,t)=>`${t<0?`Diminuir`:`Aumentar`} ${[`lado X`,`altura Y`,`profundidade Z`][e]} da ponta`,axis:(e,t)=>`${e} ${[`X`,`Y`,`Z`][t]}`,world:`Os passos seguem os eixos da oficina, mesmo quando você gira a câmera.`,guide:`As linhas ligam os três apoios. O quadrado maior é o destino; quando fica separado da ponta, mostra o que falta alcançar.`,exact:`Escolher um destino exato`,useHint:`Indicar para onde dobrar`,bend:`Indicação da dobra`,bendHint:`A indicação orienta a dobra, mas não prende o apoio nesse ponto. Sem ela, usamos a pose atual ou um lado estável.`,preview:`Experimentar dobra`,record:`Confira no modelo e use Gravar pose ajustada para guardar. Você pode cancelar ou desfazer depois.`,precision:`Esse passo é pequeno demais para a posição atual. Experimente outro valor.`,reach:{"bend-limit":`O limite de dobra escolhido impede chegar ao destino. A prévia respeita essa faixa.`,reached:`A ponta chegou ao destino.`,"too-far":`O destino está longe demais. A prévia mostra até onde a ponta alcança.`,"too-close":`O destino está perto demais para esses comprimentos. A prévia mostra a dobra possível.`},bends:{hint:`Usamos sua indicação para orientar a dobra.`,pose:`Usamos o lado da pose original.`,axis:`Como os apoios estavam alinhados, escolhemos um lado estável para dobrar.`}},animationChanged:`A criação mudou. Confira a pose e tente gravar novamente.`,animationScaleHint:`1 mantém o tamanho. 2 dobra. Valores negativos viram a peça.`,animationRotationHint:`Para uma volta completa, guarde também poses no meio do movimento.`,animationPauseHint:`Pause para ajustar uma chave. Esc também pausa o movimento.`,animationPickHint:`Escolha uma única peça ou grupo para guardar seu movimento.`,animationLocked:`Essa peça ou uma peça dentro do grupo está travada. Volte a Modelar para destravar.`,animationLocalHint:`Este movimento importado usa posições locais absolutas.`,animationAffineHint:`Essa peça precisa de uma transformação local compatível para entrar neste movimento importado.`,animationChannel:`O que muda nesta chave?`,animationChannels:{translation:`Mover`,rotation:`Girar`,scale:`Tamanho`},animationAxes:{translation:[`Lado (X)`,`Altura (Y)`,`Profundidade (Z)`],rotation:[`Giro X (graus)`,`Giro Y (graus)`,`Giro Z (graus)`],scale:[`Tamanho X`,`Tamanho Y`,`Tamanho Z`]},animationCurve:`Como chegar à próxima chave?`,animationCurves:{step:`De uma vez`,linear:`Em ritmo constante`,smooth:`Começar e terminar devagar`},animationRecord:`Gravar chave`,animationRemoveKey:`Excluir chave deste momento`,animationKeyPresent:`Já existe uma chave deste tipo aqui. Gravar substitui essa chave.`,animationKeyNew:`Gravar cria uma chave deste tipo no momento escolhido.`,animationSettings:`Ajustar o movimento`,animationDuration:`Duração em segundos`,animationFps:`Quadros por segundo da grade`,animationLoop:`Repetir o movimento`,animationRetime:`Ajustar os tempos das chaves junto com a duração`,animationApply:`Aplicar ajustes`,animationReverse:`Inverter a ordem das poses`,animationReverseHint:`Troca começo e final. Nos saltos “De uma vez”, a pose continua parada até a próxima chave.`,animationPoseTitle:`Reutilizar uma pose`,poseSet:{title:`Reutilizar várias poses juntas`,copy:`Copiar poses da seleção`,hint:`Escolha todos os apoios ou peças que quer copiar, inclusive as dobras. Cada item escolhido guarda sua própria pose neste momento.`,empty:`Ainda não há um conjunto copiado.`,count:e=>`${e} poses copiadas.`,mapping:`Escolha uma linha para mudar seu destino. Começamos nos mesmos apoios; escolha outros para levar a pose a outro lado.`,label:(e,t,n=!1)=>n?`${e} (${t})`:e,pair:(e,t)=>`${e} → ${t}`,target:e=>`Destino da pose de ${e}`,missing:`Escolha um destino`,duplicate:`Duas poses estão no mesmo destino. Escolha um destino diferente para cada uma.`,chooseAll:`Escolha um destino existente para cada pose antes de ver a prévia.`,axis:`Como levar estas poses?`,unchanged:`Sem espelho`,mirror:e=>`Espelhar no eixo local ${e}`,preview:`Ver conjunto no modelo`,review:`Confira o conjunto no modelo. Gravar pose ajustada guarda todas as poses com um só desfazer. Cancelar pose retira a prévia.`,same:`Estas poses já estão gravadas neste momento. Você pode cancelar a prévia ou escolher outros destinos.`},animationPoseCopy:`Copiar pose desta peça`,animationPosePaste:`Colar pose nas peças escolhidas`,animationPoseMirror:`Colar pose espelhada`,animationPoseCopied:e=>`Pose copiada de ${e}.`,animationPoseClipboardEmpty:`Escolha uma peça e copie sua pose neste momento.`,animationPosePasteHint:`Colar grava posição, giro e tamanho no momento atual. Substitui as três chaves que já existirem aqui. Grupos escolhidos levam suas peças junto.`,animationPoseMirrorHint:`O espelho usa os eixos locais de cada peça, não os lados do personagem inteiro. A pose copiada fica guardada sem mudar.`,animationPoseAxis:`Eixo local do espelho`,animationPoseAxes:{x:`Lado (X)`,y:`Altura (Y)`,z:`Profundidade (Z)`},animationPoseIncompatible:`A pose copiada usa outro tipo de posição local. Escolha um movimento compatível.`,animationPresetTitle:`Experimentar um movimento pronto`,animationPresetKind:`Qual movimento?`,animationPresetNames:{bounce:`Pular`,sway:`Balançar`,spin:`Girar uma volta`},animationPresetHints:{bounce:`Vai até a altura escolhida e volta. Usa o eixo local da peça ou do grupo.`,sway:`Inclina para um lado e para o outro, voltando à pose original. O pivô da peça define onde ela gira.`,spin:`Faz voltas completas, com chaves intermediárias para manter o sentido do giro.`},animationPresetDistance:`Distância do pulo`,animationPresetAngle:`Inclinação em graus`,animationPresetTurns:`Número de voltas`,animationPresetAxis:`Eixo local do movimento`,animationPresetPrepare:`Preparar prévia`,animationPresetConfirm:`Guardar este movimento`,animationPresetCancel:`Cancelar prévia`,animationPresetReady:`Prévia pronta. Use Reproduzir movimento para experimentar. Nada foi salvo ainda.`,animationPresetEditingHint:`Você está experimentando um movimento pronto. Guarde ou cancele a prévia antes de editar chaves.`,animationPresetHint:`Escolha as peças ou um grupo. A prévia não altera a criação; guardar cria um movimento que você pode editar e desfazer.`,hierarchy:`Peças e grupos`,empty:`Comece com uma forma. Depois, junte as peças do seu jeito.`,choose:`Escolha uma peça no modelo ou na lista para ajustar.`,selection:e=>e===1?`1 item escolhido`:`${e} itens escolhidos`,select:e=>`Escolher ${e}`,group:`Agrupar`,ungroup:`Separar grupo`,groupName:`Grupo`,duplicate:`Duplicar`,convertMesh:`Transformar em malha`,convertMeshHint:`Troque a forma por uma malha de pontos e faces. Desfazer traz a forma de volta.`,meshCounts:(e,t)=>`${e} pontos e ${t} faces`,editFaces:`Editar malha`,editSkinBase:`Editar forma-base`,supportGuides:`Ver apoios`,supportGuidesHint:`Os pontos mostram os grupos e apoios originais, mesmo atrás das peças. Toque num ponto para escolher. Use a lista da oficina para escolher pelo nome.`,skinBaseHint:`Você está editando a forma-base, sem a dobra dos ossos. Ao terminar, a peça volta a mostrar a deformação. Os pesos continuam guardados.`,componentModes:{vertex:`Pontos`,edge:`Linhas`,face:`Faces`},componentModeLabel:`O que você quer ajustar?`,componentModeHint:`Trocar de tipo limpa a seleção, mas mantém sua criação.`,componentAreaHint:`Envolva os pontos com o contorno. Linhas e faces entram quando todos os seus pontos estão dentro.`,componentThrough:`Alcançar partes atrás`,componentTitles:{vertex:`Pontos da peça`,edge:`Linhas da peça`,face:`Faces da peça`},componentPickHints:{vertex:`Toque num ponto. Escolher várias junta pontos à seleção. Esc volta às peças.`,edge:`Toque numa linha da malha. Escolher várias junta linhas à seleção. Esc volta às peças.`},componentViewport:`Modelo 3D. Arraste para olhar. Toque para escolher uma parte da malha.`,componentTransformHint:`Use Mover, Girar ou Tamanho na seleção. Pontos ligados também ajustam as faces vizinhas, sem mover a peça inteira. Esc cancela o arrasto.`,componentCounts:{vertex:e=>e===1?`1 ponto escolhido`:`${e} pontos escolhidos`,edge:e=>e===1?`1 linha escolhida`:`${e} linhas escolhidas`},componentAll:{vertex:`Escolher todos os pontos`,edge:`Escolher todas as linhas`},componentNone:`Limpar partes escolhidas`,componentConnected:`Escolher partes ligadas`,componentMoreSelection:`Mais jeitos de escolher`,uvTitle:`Encaixar a pintura (UV)`,uvCanvasControl:`Escolher ou ajustar no mapa da pintura`,uvCorners:`Cantos e bordas da pintura`,uvCornerHint:`Cada canto pertence a uma face. Mover um canto muda o encaixe da pintura e pode abrir uma costura com a vizinha. Os pixels e a forma da peça não mudam.`,uvCornerEnable:`Mover cantos no mapa`,uvCornerChoose:`Canto da face principal`,uvCornerNumber:e=>`Canto ${e}`,uvCornerStep:`Passo das setas em U e V`,uvCornerAxis:e=>`${e} do canto`,uvCornerApply:`Aplicar posição do canto`,uvCornerKeyboard:`Arraste um canto pelo número. No teclado: espaço começa, setas movem pelo passo escolhido e espaço ou Enter confirma. Escape cancela. O contorno é uma prévia; a pintura 3D muda ao confirmar.`,uvStitch:`Alinhar a borda da face vizinha`,uvStitchHint:`A borda vai deste canto até o próximo. Escolha também a face vizinha: alinhar copia as duas posições desta borda para ela, sem mover o restante da ilha. Isso pode esticar a pintura da vizinha. Você pode desfazer.`,uvLoading:`Abrindo o mapa da pintura...`,uvHint:`Este mapa mostra como a pintura encaixa nas faces. A escolha aqui acompanha a peça em 3D. O quadrado marca uma imagem inteira.`,uvCanvas:`Mapa 2D do encaixe da pintura nas faces`,uvCanvasHint:`Toque para escolher. Toque de novo para alternar faces sobrepostas. Você também pode usar a lista abaixo.`,uvFace:`Face no mapa`,uvChooseFace:`Escolha uma face`,uvFaceNumber:e=>`Face ${e}`,uvIslands:(e,t)=>`${e} ilhas de pintura, ${t} linhas de contorno ou costura.`,uvSelectIslands:`Escolher ilhas inteiras`,uvTransform:`Ajustar o encaixe escolhido`,uvFields:{u:`Mover de lado (U)`,v:`Mover para cima (V)`,sizeU:`Largura ×`,sizeV:`Altura ×`,angle:`Girar em graus`},uvTransformHint:`Uma unidade equivale à imagem inteira. O giro e o tamanho usam o centro da seleção. A peça não muda de forma; só o encaixe da pintura.`,uvApplyTransform:`Aplicar encaixe`,uvFlip:{u:`Espelhar de lado`,v:`Espelhar de cima`},uvReorganize:`Projetar e organizar ilhas`,uvReorganizeHint:`Isso muda onde a pintura aparece nas faces. Os pixels não são redesenhados nem apagados. Desfazer restaura o encaixe anterior.`,uvProjection:`Olhar as faces de qual lado?`,uvProjections:{xy:`De frente (XY)`,xz:`De cima (XZ)`,yz:`Do lado (YZ)`,face:`Cada face plana separada`},uvProject:`Projetar faces escolhidas`,uvMargin:`Espaço entre ilhas (0 a 0,25)`,uvPackHint:`Organiza ilhas inteiras dentro do quadrado, mantendo suas proporções. Use uma margem menor se faltar espaço. Ilhas não escolhidas ficam no lugar e podem se sobrepor às novas posições.`,uvPack:`Organizar ilhas escolhidas`,appearanceTitle:`Materiais e camadas`,atlasTitle:`Juntar pinturas desta peça`,atlasHint:`Organiza duas ou mais imagens em uma pintura compartilhada, sem reduzir pixels. Só esta peça muda; as imagens originais ficam guardadas.`,atlasPrepare:`Preparar imagem compartilhada`,atlasBusy:`Organizando as pinturas… Você pode cancelar.`,atlasPreview:`Prévia da imagem compartilhada`,atlasSummary:(e,t,n)=>`${e} imagens → uma pintura de ${t} × ${n} pixels`,atlasConfirmHint:`As camadas visíveis e as cores de base viram uma camada de cores livres. Ela não acompanha futuras mudanças da paleta. Os acabamentos continuam separados. Confirme para ajustar os UVs; um desfazer recupera tudo.`,atlasConfirm:`Usar pintura compartilhada`,atlasCancel:`Descartar imagem compartilhada`,atlasFailed:`Não consegui juntar essas pinturas. Tente novamente.`,appearanceLoading:`Abrindo materiais e pintura...`,materialChoose:`Material desta peça`,materialEntry:(e,t)=>`${t}. ${e}`,materialShared:(e,t)=>`Este material atende ${e} peças. A imagem atende ${t} peças. Editar um recurso compartilhado atualiza todas elas, incluindo seus espelhos.`,materialLocked:`Há uma peça travada usando este recurso. Você pode fazer uma cópia só para a peça atual, se ela estiver destravada.`,materialCopy:`Copiar material e pintura só para esta peça`,materialFinish:`Jeito da superfície`,materialFinishHint:`O acabamento muda como a luz aparece. A pintura e suas cores continuam guardadas.`,materialPresets:{matte:`Fosco`,shiny:`Brilhante`,metal:`Metal`},materialMask:`Recortar transparência`,materialMaskHint:`Crie espaços vazados, como entre as folhas de uma árvore. As partes abaixo do limite desaparecem; as outras ficam opacas. A pintura continua guardada.`,materialMaskCutoff:`Limite do recorte`,materialMaskOpacity:`Força da opacidade (0 a 1)`,materialMaskRangeHint:`Comece com limite 0,5 e força 1. Limite 0 mostra tudo; acima de 1 esconde tudo.`,materialMaskApply:`Aplicar recorte`,materialMaskRemove:`Voltar à transparência suave`,materialName:`Nome do material`,materialFields:{roughness:`Fosco (0 a 1)`,metalness:`Metálico (0 a 1)`},materialImageKind:`O que você quer pintar?`,materialImageKinds:{color:`Cor`,normal:`Relevo na luz`,roughness:`Partes foscas`,metalness:`Partes de metal`},materialMapImage:`Imagem deste efeito`,materialMapHints:{normal:`Este mapa muda como a luz encontra a superfície, sem mover os pontos da peça. Use uma imagem de normais azulada. Apagar revela o fundo liso; não cria buracos.`,roughness:`Pinte em cinza: branco deixa a região mais fosca, preto mais brilhante. O mapa usa o canal verde; apagar revela branco. O ajuste Fosco acima limita a força do efeito.`,metalness:`Pinte em cinza: branco permite metal, preto não. O mapa usa o canal azul; apagar revela branco. Para aparecer, o ajuste Metálico acima precisa ser maior que zero.`},materialMapRgba:`Mapas usam cores livres. A camada começa transparente e revela o fundo neutro do efeito, sem mudar a paleta.`,materialMapImport:e=>`Esta imagem será usada em “${e}”, não como pintura de cor. Confira os canais do mapa; o leitor do navegador pode alterar perfis de cor do arquivo.`,materialMapFactor:e=>`Força máxima definida no acabamento: ${e}. O mapa multiplica esse valor, não o substitui.`,materialNormalStrength:`Força do relevo na luz (0 a 4)`,materialNormalFlipY:`Inverter relevo vertical (mapas DirectX)`,materialNormalApply:`Aplicar relevo na luz`,materialDoubleSided:`Mostrar os dois lados das faces`,materialApply:`Aplicar acabamento`,materialBase:`Cor por baixo da pintura`,materialKeepColor:`Manter a cor atual`,materialColor:(e,t)=>`${e}: ${t}`,materialBaseHint:`A cor de base aparece onde a pintura deixa transparência. Escolher uma cor da paleta cria um vínculo: mudanças nessa cor acompanham o material.`,materialApplyColor:`Aplicar cor de base`,materialImage:`Imagem de pintura`,materialNoImage:`Só a cor de base`,imageCreate:`Criar imagem em branco`,imageCreateHint:`Liga uma imagem nova a este material. A imagem anterior continua guardada na lista; você pode escolhê-la de novo ou usar Desfazer.`,imageName:`Nome da imagem`,imageDefaultName:`Minha pintura`,imageDimensions:{width:`Largura em pixels`,height:`Altura em pixels`},imageEncoding:`Como guardar as cores?`,imageEncodings:{indexed:`Cores ligadas à paleta`,rgba:`Cores livres com transparência`},imageCreateApply:`Criar e ligar imagem`,imageLayers:`Camadas da pintura`,imagePreview:`Prévia das camadas com a cor de base do material`,flipbookTitle:`Pintura que se mexe`,uvAutoTitle:`Abrir faces para pintar`,uvAutoMethod:`Como abrir o mapa?`,uvAutoFaces:`Cada face separada`,uvAutoConnected:`Desdobrar faces vizinhas`,uvUnfoldHint:`Faces planas vizinhas do mesmo material podem ficar juntas, como uma caixa de papel aberta. Cortes extras evitam sobreposição. Uma superfície pode precisar de vários grupos.`,uvPreserveCuts:`Manter os cortes que já existem`,uvPreserveCutsHint:`Mantém separadas as bordas que já eram cortes no mapa. Desmarque para tentar unir mais faces. Os cortes fora da escolha ficam como estão.`,uvCutTitle:`Escolher onde separar`,uvCutHint:`Escolha uma face no mapa e depois uma borda entre dois cantos. Marcar um corte não muda a criação: ele será usado ao preparar e confirmar o novo mapa.`,uvCutCanvas:`Mapa para escolher bordas de corte`,uvCutCanvasControl:`Escolher uma face para marcar cortes`,uvCutFace:`Face dentro da escolha`,uvCutFaceHint:e=>`Use um número de 1 a ${e} ou toque no mapa. Toques repetidos alternam faces sobrepostas. A escolha no 3D continua igual.`,uvCutEdge:`Borda para separar`,uvCutEdgeNumber:(e,t)=>`Entre os cantos ${e} e ${t}`,uvCutToggle:`Separar nesta borda`,uvCutClear:`Limpar cortes marcados`,uvCutCount:e=>`${e} cortes marcados para esta abertura. Eles só valem para a escolha atual.`,uvAutoHint:`Cada face plana ganha seu espaço, sem ficar por cima das outras escolhidas. Faces maiores recebem mais espaço de pintura. As faces que você não escolheu ficam no lugar.`,uvAutoMargin:`Espaço entre os grupos`,uvAutoPrepare:`Preparar novo mapa`,uvAutoBusy:`Organizando as faces… Você pode cancelar.`,uvAutoPreview:`Prévia do novo mapa de pintura`,uvAutoConfirmHint:e=>`${e} faces serão reorganizadas. A malha e os pixels ficam guardados, mas a pintura muda de lugar no modelo. As faces fora da escolha não mudam e ainda podem ficar sobrepostas ao novo mapa.`,uvAutoConfirm:`Usar este mapa`,uvAutoCancel:`Descartar novo mapa`,uvAutoFailed:`Não consegui preparar esse mapa. Tente um grupo menor de faces.`,flipbookHint:`Desenhe os quadros lado a lado ou importe uma folha pronta. Cada quadro aparece inteiro no modelo, sem mudar seus pixels ou UV.`,flipbookSettings:`Organizar os quadros`,flipbookWidth:`Largura de cada quadro`,flipbookHeight:`Altura de cada quadro`,flipbookSequence:`Ordem dos quadros`,flipbookSequenceHint:`Conte a partir de 1, da esquerda para a direita e de cima para baixo. Exemplo: 1, 2, 2, 3. Deixe vazio para usar todos em ordem.`,flipbookFps:`Quadros por segundo`,flipbookLoop:`Repetir a sequência`,flipbookApply:`Aplicar sequência`,flipbookRemove:`Voltar à imagem parada`,flipbookRemoveHint:`A folha e seus desenhos ficam guardados. Só a organização da animação é removida.`,flipbookPreview:`Prévia da pintura animada`,flipbookPlay:`Reproduzir pintura`,flipbookPause:`Pausar pintura`,flipbookPrevious:`Passo anterior`,flipbookNext:`Próximo passo`,flipbookChoose:`Passo da sequência`,flipbookStep:(e,t,n)=>`Passo ${e} de ${t} · quadro ${n}`,flipbookOption:(e,t)=>`${e} · quadro ${t}`,flipbookMotionHint:`A prévia só se move quando você pede. Sair da janela, editar ou fechar os controles pausa a reprodução.`,flipbookPaintHint:`No modelo 3D, você pinta só o quadro escolhido. A folha 2D abaixo continua mostrando todos os quadros.`,imageInfo:(e,t,n,r)=>`${e} × ${t} pixels, ${n} camadas. ${r?`Cores ligadas à paleta.`:`Cores livres com transparência.`} A lista começa pela camada de cima.`,imageLayerChoose:`Camada escolhida`,imageLayerName:`Nome da camada`,imageOpacity:`Quanto a camada aparece (0 a 1)`,imageLayerVisible:`Mostrar esta camada`,imageLayerApply:`Aplicar ajustes da camada`,imageLayerDown:`Descer camada`,imageLayerUp:`Subir camada`,imageNewLayer:`Nova camada`,imageLayerAdd:`Adicionar camada transparente`,imageLayerDuplicate:`Duplicar camada`,imageLayerRemove:`Apagar camada (pode desfazer)`,imageRgba:`Liberar cores desta imagem`,imageImportTitle:`Usar uma imagem do computador`,imageImportHint:`PNG ou JPEG, até 1024 × 1024 pixels. A imagem mantém seu tamanho e suas cores livres; não é reduzida à paleta. O arquivo é lido neste dispositivo.`,imageImportChoose:`Escolher PNG ou JPEG`,imageImportBusy:`Lendo a imagem…`,imageImportPreview:`Prévia da imagem escolhida`,imageImportConfirmHint:`Aplicar cria uma nova imagem e a vincula a este material, incluindo as peças que o compartilham. A imagem anterior fica na biblioteca. Os UVs não mudam. Você pode desfazer.`,imageImportConfirm:`Aplicar esta imagem ao material`,imageImportCancel:`Descartar importação`,imageImportStale:`A criação mudou. Escolha a imagem novamente para conferir onde aplicá-la.`,imageImportErrors:{size:`A imagem é grande demais. Escolha um arquivo de até 4 MiB e 1024 pixels em cada lado.`,format:`Escolha um PNG ou JPEG válido. Outros formatos ainda não são aceitos.`,animated:`Esta imagem tem animação. Escolha uma imagem parada para pintar.`,decode:`Não foi possível ler os pixels dessa imagem. Tente outro PNG ou JPEG.`},imageRgbaHint:`Conserva as cores atuais e a transparência de cada camada, mas desliga esta imagem da paleta. Depois, mudar a paleta não muda estes pixels. Desfazer restaura o vínculo.`,paintLayer:`Pintar nesta camada`,paintTitle:`Pintar a peça`,paintFailed:`Não consegui aplicar esse traço. Tente novamente.`,paintTargetChanged:`A camada, sua visibilidade ou seu vínculo mudou. Escolha onde pintar novamente.`,paintCanvas:`Pintar na imagem da camada`,paintCanvasHint:`Arraste para pintar. No teclado, use as setas para escolher um pixel e Espaço para pintar. Esc cancela o traço. A linha de baixo da imagem é a linha 1.`,paintCursor:(e,t)=>`Pixel escolhido: coluna ${e}, linha ${t}.`,paintPencil:`Pincel`,paintEraser:`Borracha`,paintPicker:`Pegar cor`,paintPickerHint:`Toque em um pixel para copiar sua cor nesta camada e voltar ao lápis. A cor não inclui as outras camadas nem a opacidade do material. Um pixel vazio da paleta escolhe a borracha.`,paintBrush:`Largura do traço`,paintBrushSize:e=>`${e} ${e===1?`pixel`:`pixels`}`,paintColor:`Cor do traço`,paintAlpha:`Quanto a cor aparece (0 a 255)`,paintFill:`Balde`,paintFillHint:`Toque para preencher a área conectada da mesma cor nesta camada. O balde pode alcançar outras faces que usam essa área da imagem.`,paintTolerance:`Aceitar cores parecidas (0 a 255)`,imageTaskBusy:`Ajustando a imagem… você pode cancelar.`,imageTaskCancel:`Cancelar ajuste da imagem`,imageTaskFailed:`Não consegui ajustar essa imagem. Sua pintura anterior foi mantida.`,paintShapes:`Formas e área de pintura`,paintShapeTools:{line:`Linha reta`,rectangle:`Retângulo`,ellipse:`Elipse`,select:`Escolher área`,gradient:`Gradiente`,stamp:`Carimbo`},paintShapeFilled:`Preencher a forma`,paintGradientNeedsRgba:`Gradientes e carimbos precisam de cores livres. Converta a imagem para RGBA; você pode desfazer a conversão.`,paintGradientHint:`Arraste do começo até o fim da mistura. O gradiente preenche a área selecionada, ou a imagem toda quando não há seleção.`,paintGradientEndColor:`Cor no fim do gradiente`,paintGradientEndAlpha:`Quanto a cor final aparece (0 a 255)`,paintStampMissing:`Escolha uma imagem ou copie a área selecionada antes de carimbar.`,paintStampHint:`Posicione pelo contorno e solte para carimbar uma vez. No teclado, espaço começa, setas movem e espaço confirma. O carimbo mistura sua transparência com a camada e respeita a área selecionada. Fora da imagem não pinta.`,paintStampCapture:`Copiar a área selecionada como carimbo`,paintStampCaptureHint:`A cópia usa só esta camada. Para carimbar em outro lugar, escolha “Pintar na imagem toda” após copiar.`,paintStampPreview:`Prévia do carimbo com giro e espelhamento`,paintStampScale:`Tamanho do carimbo`,paintStampRotation:`Girar o carimbo para a direita`,paintStampFlips:{flipX:`Espelhar da esquerda para a direita`,flipY:`Espelhar de cima para baixo`},paintStampClear:`Remover carimbo da ferramenta`,paintShapeHint:`Arraste para ver o contorno no quadro de pintura; solte para aplicar. Sair do quadro ou cruzar uma costura cancela o desenho.`,paintShapeKeyboard:`Use as setas. Espaço ou Enter marca o começo; mova até o fim e confirme novamente. Escape cancela.`,paintClearSelection:`Pintar na imagem toda`,paintSelectedArea:`A pintura está limitada à área marcada. Isso não recorta a imagem.`,paintFinish:`Voltar aos materiais`,paintHint:`A imagem e a peça usam a mesma pintura. Um traço tem um único desfazer. A borracha revela as camadas de baixo ou a cor de base.`,paintOnModel:`Pintar no modelo`,paintLook:`Olhar`,paintModelHint:`Arraste na peça escolhida para pintar. Use Olhar para girar a câmera e volte ao Pincel para continuar.`,paintLookHint:`Arraste para olhar e use dois dedos para aproximar ou afastar. Depois, escolha Pintar no modelo para continuar o traço.`,softMovement:`Mover vizinhos suavemente`,softMovementReach:`Alcance na oficina`,softMovementHint:`Use Mover. Os pontos próximos acompanham menos o arrasto; o alcance segue as linhas da peça e é medido na oficina. Partes sem ligação ficam no lugar. Desligue para girar ou mudar o tamanho.`,softMovementInvalid:`Use um alcance maior que zero.`,componentSelectionActions:{grow:`Pegar uma fileira a mais`,shrink:`Tirar uma fileira da seleção`,invert:`Trocar pelas partes não escolhidas`,ring:`Seguir lados opostos`,loop:`Seguir caminho de linhas`},componentSelectionHints:{grow:`Acrescenta as partes vizinhas uma vez. Você pode repetir para alcançar mais longe.`,shrink:`Retira as partes que tocam vizinhas não escolhidas. Não apaga nada do modelo.`,invert:`Escolhe o que ficou de fora e solta o que estava escolhido.`,ring:`Passa para o lado oposto de cada face de quatro pontos. Para nas bordas e nas ligações ambíguas.`,loop:`Segue a continuação das linhas, sem virar nas ligações com muitos caminhos. Para em triângulos e bordas.`},componentRemove:{vertex:`Apagar pontos e faces ligadas`,edge:`Apagar linhas e faces ligadas`},componentRemovalImpact:(e,t)=>`Retira também ${e===1?`1 face ligada`:`${e} faces ligadas`} e ${t===1?`1 linha solta`:`${t} linhas soltas`}. Desfazer restaura tudo.`,splitEdges:`Criar pontos no meio das linhas`,cutRing:`Cortar uma faixa ao meio`,cutRingHint:`Escolha uma linha. O corte segue pelo meio dos lados opostos das faces de quatro pontos. Para em outras formas. Desfazer traz a faixa inteira de volta.`,splitEdgesHint:`Divide cada linha escolhida em duas. Mantém as faces ligadas e a pintura. Desfazer traz as linhas de volta.`,dissolveEdges:`Tirar linhas sem abrir buracos`,dissolveEdgesHint:`Junta as faces planas dos dois lados das linhas escolhidas. A pintura precisa continuar igual entre elas. Os pontos ficam no lugar.`,connectPoints:{cut:`Cortar face entre os pontos`,line:`Ligar pontos com linha solta`},weldPoints:`Juntar pontos sobrepostos`,weldPointsHint:`Junta apenas os pontos escolhidos que estão exatamente no mesmo lugar. Não aproxima pontos nem muda a pintura.`,weldImpact:(e,t,n,r)=>`${e} pontos a menos em ${t} grupos. Atualiza ${n} faces e retira ${r} linhas soltas repetidas ou sem comprimento. Desfazer restaura tudo.`,weldEmpty:`Não há pontos escolhidos no mesmo lugar para juntar.`,connectPointsHints:{cut:`Escolha dois pontos de lados diferentes de uma face. Uma linha reta divide a face sem mudar sua pintura.`,line:`Escolha dois pontos para ligar. A linha ajuda a construir, mas não cria uma superfície nem muda a pintura.`},finishFaces:`Voltar às peças`,facesTitle:`Faces da peça`,faceHint:`Toque numa face. Shift escolhe várias. Esc volta às peças.`,faceTransformHint:`Use Mover, Girar ou Tamanho nas faces escolhidas. Os pontos ligados também ajustam as faces vizinhas. Esc cancela o arrasto.`,faceViewport:`Modelo 3D. Arraste para olhar. Toque para escolher uma face.`,faceCount:e=>e===1?`1 face escolhida`:`${e} faces escolhidas`,faceAll:`Escolher todas as faces`,faceNone:`Limpar faces escolhidas`,faceConnected:`Escolher faces ligadas`,faceActions:{merge:`Juntar faces escolhidas`,remove:`Apagar faces`,triangulate:`Dividir em triângulos`,flip:`Virar faces`,detach:`Soltar faces`},faceActionHints:{merge:`Tira as linhas entre faces planas ligadas. Mantém a pintura, os pontos e os buracos. Se a pintura mudar na ligação, as faces ficam separadas.`,remove:`Abre um buraco sem apagar a peça. Desfazer traz as faces de volta.`,triangulate:`Divide cada face em triângulos, mantendo sua pintura.`,flip:`Troca o lado de fora pelo lado de dentro. O lado de dentro aparece avermelhado.`,detach:`Solta os pontos de ligação sem mover nem criar outra peça.`},facePreview:{thickness:`Dar espessura`,extrude:`Puxar faces`,inset:`Criar borda`,subdivide:`Dividir faces em partes`},facePreviewHints:{thickness:`Transforma uma superfície plana solta em uma peça com espessura. Mantém os buracos e a pintura; as laterais novas repetem o material. A medida é da peça, antes da escala.`,subdivide:`Cria pontos no meio dos lados e no centro. Mantém a forma e a pintura, ajustando também os lados ligados. Zero volta ao início.`,extrude:`Puxa cada região plana para fora. Valores negativos empurram para dentro. A medida é da peça, antes da escala. Não recorta outras partes; as laterais novas repetem a pintura.`,inset:`Cria uma borda em cada face escolhida. A porcentagem aproxima os pontos do centro, sem mudar a pintura.`},extrudeAmount:`Quanto puxar`,thicknessAmount:`Espessura da peça`,insetAmount:`Borda em porcentagem`,subdivideAmount:`Quantidade de divisões`,previewHint:`Veja no modelo. Só confirme quando gostar do resultado.`,previewConfirm:`Confirmar ajuste`,previewCancel:`Cancelar ajuste`,previewChanged:`A criação mudou durante o ajuste. Escolha as faces novamente.`,surfaceWorking:`Calculando o ajuste. Você pode mudar o valor ou cancelar.`,surfaceWorkerFailed:`Não consegui abrir o cálculo separado. Sua criação foi mantida. Tente o ajuste novamente.`,remove:`Apagar seleção`,addSelection:`Escolher várias`,clearSelection:`Limpar seleção`,nodeName:`Nome da peça ou grupo`,rename:`Guardar nome`,visible:`Mostrar no modelo`,locked:`Travar mudanças`,move:`Mover`,rotate:`Girar`,scale:`Tamanho`,pivot:`Ponto de giro`,axesHint:`X: lados. Y: altura. Z: frente e trás.`,pivotHint:`Mude o ponto de giro sem mover a peça. Os valores são relativos à peça.`,scaleHint:`1 mantém o tamanho. 2 dobra. 0,5 deixa pela metade.`,apply:`Aplicar ajuste`,invalidNumber:`Preencha os três valores com números válidos.`,positiveScale:`Use um tamanho maior que zero. Para inverter, use Espelhar.`,organize:`Colocar dentro de um grupo`,root:`Fora dos grupos`,noGroups:`Agrupe algumas peças para organizar aqui.`,mirror:`Espelhar no X`,show:e=>`Mostrar filhos de ${e}`,hide:e=>`Recolher ${e}`,nodeKind:{mesh:`Peça`,group:`Grupo`,locator:`Ponto`},hiddenHint:`Oculto`,lockedHint:`Travado`,viewport:`Modelo 3D. Arraste para olhar. Toque para escolher uma peça.`,loading3d:`Abrindo o modelo 3D...`,failed3d:`Não consegui mostrar o 3D. Suas peças continuam na oficina. Tente abrir o 3D de novo.`,lost3d:`O desenho 3D foi interrompido. Aguardando a recuperação sem alterar suas peças.`,retry3d:`Abrir o 3D de novo`,drawIssues:e=>`${e} faces precisam de ajuste para desenhar. Seus pontos e pinturas continuam no arquivo.`,commandFailed:`Não consegui fazer essa mudança. Sua criação não foi alterada.`,cycle:`Esse grupo já está dentro da seleção. Escolha outro lugar.`,save:`Guardar agora`,backup:`Baixar projeto`,conflict:`Outra aba mudou esta criação. Baixe uma cópia das suas mudanças antes de abrir de novo.`,storage:{deleted:`Esta criação foi removida em outra aba. Suas mudanças continuam aqui. Use “Baixar projeto” para guardar uma cópia.`,unreadable:`Não consegui conferir a criação guardada. Suas mudanças continuam aqui. Use “Baixar projeto” para guardar uma cópia.`,unavailable:`Os avisos de outras abas estão indisponíveis. Ao guardar, ainda conferimos se outra aba mudou a criação.`,check:`Conferir de novo`},restore:{open:`Trazer uma cópia do Molda`,title:`Retomar uma cópia`,hint:`Escolha o arquivo .molda.json que você baixou desta oficina. Esta tela não abre ZIPs nem cópias da galeria antiga.`,file:`Arquivo da cópia`,reading:`Conferindo sua cópia…`,source:e=>`Arquivo escolhido: ${e}`,newIdentity:`Ao confirmar, será guardada uma nova criação. As peças, pinturas e movimentos serão mantidos. Nenhum projeto existente será substituído; a miniatura antiga não será usada.`,confirm:`Guardar como nova criação`,saving:`Guardando sua nova criação…`,cancel:`Voltar aos meus projetos`,readError:`Não consegui preparar a cópia agora. Tente novamente ou peça ajuda a um adulto. Seu arquivo não foi alterado.`,saveError:`Não consegui guardar esta cópia. Sua revisão continua aqui para tentar novamente.`},start:{title:`O que vamos construir?`,intro:`Monte suas ideias com peças, pinte e dê movimento. Você pode mudar tudo do seu jeito.`,newTitle:`Comece uma criação`,empty:`Começar do zero`,emptyHint:`A bancada começa vazia. Você escolhe as primeiras peças.`,nameTitle:`Dê um nome à sua ideia`,name:`Nome da criação`,nameError:e=>`Escreva um nome de até ${e} caracteres.`,create:`Criar e abrir a oficina`,creating:`Guardando sua nova criação...`,createError:`Não consegui criar o projeto. Seu nome e sua escolha continuam aqui. Tente de novo.`,chooseAgain:`Escolher outro começo`,recent:`Continue de onde parou`,localOnly:`Projetos desta oficina, guardados neste navegador. Os mais recentes vêm primeiro.`,refresh:`Atualizar projetos`,loading:`Procurando seus projetos...`,noProjects:`Sua primeira criação vai aparecer aqui depois que você começar.`,listError:`Não consegui atualizar a lista. Tente “Atualizar projetos” de novo.`,listIssues:e=>`${e} ${e===1?`projeto precisa`:`projetos precisam`} de conferência para aparecer aqui. Nenhum arquivo foi alterado.`,open:e=>`Continuar ${e}`,unknownDate:`Data indisponível`,pages:`Páginas dos projetos`,previous:`Anteriores`,next:`Próximos`,page:(e,t)=>`Página ${e} de ${t}`},exit:{open:`Meus projetos`,title:`Voltar aos projetos?`,hint:`As mudanças aplicadas serão guardadas. Ajustes em prévia e poses que você ainda não gravou serão cancelados.`,stay:`Ficar na oficina`,save:`Guardar e voltar`,saving:`Guardando antes de sair...`,failed:`Não consegui guardar. Você pode ficar na oficina ou baixar uma cópia antes de sair.`,discard:`Sair sem guardar`},development:`Oficina em desenvolvimento. A sincronização com o Estúdio ainda não está ligada aqui.`,starting:`Abrindo a oficina...`,openError:`Não consegui abrir essa criação. O arquivo original continua guardado.`,createBox:`Adicionar caixa`,boxName:`Caixa`,add:`Adicionar forma ou ponto`,selectTool:`Escolher`,selectBox:`Caixa de seleção`,selectLasso:`Laço`,selectThrough:`Alcançar peças atrás`,areaHint:`Cerque os pontos de giro das peças. Esc cancela.`,gizmoHint:`Arraste uma alça. Esc cancela o ajuste.`,addLocator:`Ponto de apoio`,locatorName:`Apoio`,dimensions:`Medidas da forma`,curveDetail:`Detalhes da curva`,planeCut:`Cortar a peça por um plano`,bevel:`Chanfrar quinas`,pathCreate:`Criar tubo pelo caminho`,pathCreateTitle:`Tubo a partir das linhas`,pathCreateHint:`Escolha linhas ligadas, sem bifurcações. Para formar um laço, marque Caminho fechado. Elas serão copiadas para um tubo novo; a peça original continua igual.`,pathName:`Tubo`,meshCheck:`Conferir a malha`,meshCheckHint:`São observações, não ordens: uma borda aberta ou um ponto solto pode fazer parte da sua ideia. Escolha a região para olhar. Reparos mostram uma prévia e só entram no histórico ao confirmar.`,meshCheckRun:`Conferir agora`,meshCheckBusy:`Conferindo a malha...`,meshCheckClear:`Não encontrei esses problemas. Isso não garante que a peça esteja pronta para todos os jogos.`,meshCheckFailed:`Não consegui conferir essa malha. Tente novamente.`,meshCheckChanged:`A peça mudou durante a conferência. Confira novamente antes de reparar.`,meshCheckPreview:e=>`Prévia do reparo de ${e} itens. Confira o resultado antes de confirmar. Cancelar restaura a peça.`,meshCheckSelect:e=>`Escolher: ${e}`,meshCheckKinds:{"invalid-faces":`Faces que não podem ser desenhadas`,"duplicate-faces":`Faces repetidas com a mesma pintura`,"prepare-faces":`Faces que precisam de preparo para algumas ferramentas`,"conflicting-winding":`Lados com orientação diferente`,"ambiguous-edges":`Linhas com mais de duas faces`,"open-edges":`Bordas abertas`,"overlapping-points":`Pontos no mesmo lugar`,"unused-points":`Pontos sem ligações`,"empty-lines":`Linhas sem comprimento`,"duplicate-lines":`Linhas soltas repetidas`},meshCheckHints:{"invalid-faces":`Essas faces se cruzam ou não têm área. Você pode ajustar seus pontos ou retirar só as faces; os pontos ficam guardados.`,"duplicate-faces":`Há cópias com os mesmos pontos, orientação, UV e material. Retirar as cópias mantém a primeira face de cada conjunto.`,"prepare-faces":`Estas faces precisam ser divididas para alguns ajustes manterem a pintura no lugar. A divisão usa os mesmos triângulos que você já vê.`,"conflicting-winding":`Os dois lados percorrem a linha na mesma direção. Confira as faces antes de decidir qual virar; não vou escolher por você.`,"ambiguous-edges":`Mais de duas faces usam a mesma linha. Isso pode ser intencional. Escolha a ligação para decidir quais faces manter.`,"open-edges":`Só uma face usa cada uma destas linhas. Superfícies e tubos abertos podem estar certos assim.`,"overlapping-points":`Estes pontos têm exatamente a mesma posição. Escolha-os para examinar a opção de unir pontos; não aproximo pontos diferentes.`,"unused-points":`Nenhuma face ou linha usa estes pontos. Você pode guardá-los para construir depois ou retirar só eles.`,"empty-lines":`As pontas destas linhas soltas estão no mesmo lugar. Retirar as linhas não apaga pontos nem faces.`,"duplicate-lines":`Estas linhas soltas repetem o mesmo par de pontos. O reparo mantém a primeira de cada conjunto, sem alterar faces.`},meshCheckFixes:{"invalid-faces":`Prévia: retirar essas faces`,"duplicate-faces":`Prévia: retirar cópias de faces`,"prepare-faces":`Prévia: dividir para preparar`,"unused-points":`Prévia: retirar pontos sem ligações`,"empty-lines":`Prévia: retirar linhas sem comprimento`,"duplicate-lines":`Prévia: retirar cópias de linhas`},pathSettings:`Caminho e formato do tubo`,pathSettingsHint:`O raio mede do centro até a borda. Use de 3 a 64 lados; menos lados deixam seu jogo mais leve. Curvas muito apertadas podem fazer o tubo se atravessar.`,pathRadius:`Raio do tubo`,pathAround:`Lados do tubo`,pathCaps:`Fechar as pontas`,pathClosed:`Caminho fechado`,movementStep:`Passo do movimento`,movementFree:`Livre`,showGrid:`Mostrar grade`,applyPathSettings:`Aplicar formato do tubo`,pathPoint:`Ponto do caminho`,pathPointName:e=>`Ponto ${e}`,pathPointPosition:`Posição do ponto`,pathPointHint:`Posição local do centro do tubo nesse ponto. O tubo acompanha o caminho; os ajustes só entram ao aplicar.`,bevelHint:`Escolha uma ou mais linhas nas quinas de uma peça fechada. Cada quina é aparada com uma face plana, sem alcançar as outras. Quinas que se encostam precisam ser feitas separadas. A nova face usa o material de um dos lados, e as linhas soltas são mantidas.`,bevelDepth:`Profundidade do chanfro na peça`,applyBevel:`Aplicar chanfro`,planeCutHint:`Cria linhas de corte na peça inteira, sem apagar nenhum lado. A posição usa as medidas locais da peça, antes de girar ou mudar sua escala. Desfazer volta tudo de uma vez.`,planeCutAxis:`Direção do corte`,planeCutAxes:[`Largura`,`Altura`,`Profundidade`],planeCutPosition:`Posição do corte na peça`,applyPlaneCut:`Aplicar corte na peça`,curveDetailHint:`Mais divisões deixam a curva mais redonda. Menos divisões deixam seu jogo mais leve. A pintura continua na mesma superfície.`,curveDetailFields:{around:`Lados da curva`,down:`Faixas da esfera`},curveDetailInvalid:`Use de 3 a 64 lados e, na esfera, de 2 a 32 faixas. Só números inteiros.`,curveDetailCost:e=>`Esta peça terá ${e} triângulos. Cada espelho desenha outra cópia.`,applyCurveDetail:`Aplicar detalhes`,dimensionsHint:`Largura X, altura Y e profundidade Z da forma, antes de girar ou mudar sua escala.`,mirrors:`Espelhos`,mirrorHint:`O espelho acompanha sua peça. Escolha X, Y ou Z e onde o espelho fica na oficina.`,mirrorOffset:`Posição do espelho`,addMirror:`Criar espelho`,removeMirror:(e,t)=>`Retirar espelho ${e} em ${t}`,demoName:`Minha construção`,backupError:`Não consegui baixar o projeto. Tente novamente antes de fechar a oficina.`},gallery:{recoveryTitle:`Estas criações continuam guardadas`,recoveryHint:`Atualize o Molda para tentar abrir. Você também pode baixar uma cópia de segurança.`,recoveryNewer:`Feita em uma versão mais nova do Molda.`,recoveryInvalid:`Não consegui abrir este arquivo. Não alterei o original.`,recoveryDownload:`Baixar cópia de segurança`,recoveryDownloading:`Preparando cópia...`,recoveryDownloadAria:e=>`Baixar cópia de segurança de ${e}`,recoveryFailed:`Não consegui preparar a cópia. O original continua guardado; atualize o Molda e tente de novo.`,title:`Minhas criações 3D`,subtitle:`Modelos, texturas e céus para os seus jogos 3D.`,create:`Criar novo`,empty:`Nada por aqui ainda. Toque em "Criar novo" para montar a sua primeira criação!`,emptyCta:`Começar minha primeira criação`,loading:`Abrindo a sua galeria...`,reloadPage:`Recarregar página`,loadError:`Não consegui abrir a sua galeria. Tente de novo daqui a pouco.`,retry:`Tentar de novo`,open:`Abrir`,preview:e=>`Prévia de ${e}`,previewUnavailable:`Abra a criação para ver de perto.`,creationGone:`Essa criação não está mais aqui.`,rename:`Renomear`,duplicate:`Duplicar`,remove:`Apagar`,removeConfirmTitle:`Apagar esta criação?`,removeConfirmBody:`Ela vai sumir da galeria. Não dá para desfazer.`,removeConfirm:`Apagar`,cancel:`Cancelar`,storageBudget:`Sua galeria chegou ao limite de 96 MB. Apague uma criação grande para continuar salvando.`,downloadAll:`Baixar tudo`,downloadSkippedScene:e=>e===1?`Uma criação da oficina nova ficou de fora: guarde ela pelo "Baixar projeto", dentro da oficina.`:`${e} criações da oficina nova ficaram de fora: guarde cada uma pelo "Baixar projeto", dentro da oficina.`,downloadPreparing:`Preparando o seu pacote... Os céus demoram um pouquinho.`,downloadCancelled:`Parei de preparar o pacote.`,downloadReady:`Baixei a sua galeria! Procure o .zip na pasta de downloads.`,downloadFailed:`Não consegui montar o pacote agora. Tente de novo daqui a pouco.`,importJson:`Trazer de volta`,importHint:`Escolha o .zip ou o .molda.json que você baixou antes.`,imported:e=>e===1?`Trouxe 1 criação de volta!`:`Trouxe ${e} criações de volta!`,importedPartial:e=>`Trouxe ${e} criações. Não consegui trazer todas; conserve o backup e confira o espaço disponível. As criações que já estavam aqui continuam guardadas.`,importedNone:`Esse arquivo não tinha nenhuma criação que eu conseguisse ler.`,importFailed:`Não consegui ler esse arquivo. Ele veio do "Baixar tudo" do Molda (.zip ou .molda.json)?`,restoreTooLarge:`Esse backup é grande demais. Escolha um arquivo de até 32 MB.`,restoreZipMissing:`Esse .zip não tem a galeria do Molda.`,restoreZipDuplicate:`Esse .zip tem mais de uma galeria do Molda e não é seguro trazê-lo de volta.`,readme:{intro:[`Suas criações 3D do Molda! 🧊`,``,`Cada pasta tem um tipo de criação, pronta para o Estúdio ou para qualquer editor 3D:`,`  modelos/   arquivos .glb  → no Jogo 3D, o bloco "Criar o objeto ... com o modelo"`,`  texturas/  arquivos .png  → o bloco "Vestir ... com a imagem"`,`  ceus/      arquivos .hdr  → o bloco "Usar o céu 360°"`,``,`No Estúdio, o jeito mais fácil continua sendo o botão "Trazer do Molda" do painel de imagens.`,`Para voltar com tudo para o Molda, use o botão "Trazer de volta" e escolha este .zip.`,`Conserve galeria.molda.json e a pasta projetos/: juntos, eles guardam toda a galeria.`,`Trazer de volta restaura as duas gerações em novas cópias, sem substituir suas criações.`],project:(e,t)=>`• Criação da oficina nova "${e}": projetos/${t}.molda.json`,model:(e,t,n,r)=>`• Modelo "${e}": modelos/${t}.glb (${n===1?`1 peça`:`${n} peças`}, ${r} triângulos)`,texture:(e,t,n)=>`• Textura "${e}": texturas/${t}.png (${n} × ${n} pixels)`,sky:(e,t,n,r)=>`• Céu "${e}": ceus/${t}.hdr (360°, ${n} × ${r})`,skipped:(e,t)=>`• ${e} "${t}" ficou fora dos arquivos prontos (sem peças ou grande demais para o Estúdio), mas está no backup.`},search:`Buscar criação`,searchPlaceholder:`Buscar por nome ou tipo`,searchClear:`Limpar busca`,searchClearAll:`Limpar busca e filtros`,searchEmpty:`Nenhuma criação combina com essa busca.`,loadMore:`Mostrar mais`,syncing:`Buscando na sua conta as criações que ainda não chegaram...`,filterKind:`Tipo`,filterAll:`Todos`,filterAria:{all:`Mostrar todos os tipos`,model:`Mostrar só modelos`,texture:`Mostrar só texturas`,sky:`Mostrar só céus`},resultCount:(e,t)=>e===t?e===1?`1 criação`:`${e} criações`:`${e} de ${t}`,openStudio:`Abrir o Estúdio`,studioHint:`No Estúdio, procure "Trazer do Molda" no painel de imagens.`,cardMenu:e=>`Mais opções de ${e}`,updated:`Mexido`},kinds:{model:{title:`Modelo`,plural:`Modelos`,description:`Monte peças e pinte a pele direto no modelo.`,emoji:`🧊`,file:`.glb`},texture:{title:`Textura`,plural:`Texturas`,description:`Uma folha de pixels para vestir cubos e bolas.`,emoji:`🧱`,file:`.png`},sky:{title:`Céu`,plural:`Céus`,description:`Um céu 360° que ilumina a cena inteira.`,emoji:`🌤️`,file:`.hdr`}},shapes:{box:`Caixa`,wedge:`Rampa`,cylinder:`Cilindro`,sphere:`Bola`,mesh:`Malha`},skyPresets:{dia:`Dia`,entardecer:`Entardecer`,noite:`Noite`,nublado:`Nublado`,alienigena:`Alienígena`,custom:`Do seu jeito`},newAsset:{title:`Criar novo`,stepKind:`O que você quer criar?`,stepOptions:`Como vai ser?`,stepName:`Que nome vai ter?`,progress:(e,t)=>`Passo ${e} de ${t}`,texelsLabel:`Texels por bloco`,texelsHint:`Quantos pontinhos de tinta cabem em cada bloco da grade. Dá para mudar depois.`,texelsOptions:{2:`Poucos`,4:`Normal`,8:`Muitos`},sizeLabel:`Tamanho da folha`,sizeHint:`Em pixels. 32 é um bom começo.`,presetLabel:`Comece com`,presetHint:`Você ajusta o sol, as cores e as nuvens depois.`,nameLabel:`Nome`,namePlaceholder:`ex: nave, casa, grama`,nameHint:`Só letras, números e hífen. É o nome que o Estúdio vai usar.`,nameInvalid:`Use só letras, números e hífen.`,nameTaken:`Já existe uma criação com esse nome.`,back:`Voltar`,next:`Continuar`,create:`Criar`,cancel:`Cancelar`},templates:{card:{emoji:`✨`,title:`Modelos prontos`,description:`Comece de um modelo pronto e mude do seu jeito.`},stepTitle:`Escolha um modelo para começar`,practiceHint:`Comece por onde quiser. Cada modelo tem uma experiência curta para tentar na oficina.`,levels:{1:`Primeiras formas`,2:`Cores e detalhes`,3:`Malhas e movimentos`},items:{personagem:{title:`Personagem`,description:`Um boneco de blocos com o rosto já pintado.`,level:2,challenge:`Experimente: pinte outra expressão no rosto e troque a cor da roupa.`},carro:{title:`Carro`,description:`Rodas, vidros e faróis. Pinte do seu jeito.`,level:1,challenge:`Experimente: duplique uma roda, mova a cópia e desfaça para comparar.`},arvore:{title:`Árvore`,description:`Tronco, copa de bolas e frutinhas.`,level:1,challenge:`Experimente: aumente uma parte da copa e mude a posição de uma fruta.`},casa:{title:`Casa`,description:`Paredes, telhado de duas águas, porta e janelas.`,level:2,challenge:`Experimente: pinte uma janela e crie uma nova camada para os detalhes.`},nave:{title:`Nave espacial`,description:`Asas, motores e uma cabine de vidro.`,level:3,challenge:`Experimente: agrupe a nave, abra Animar e teste o movimento Balançar.`},cristal:{title:`Cristais`,description:`Três cristais de malha numa pedra: pontas, arestas e faces para mexer.`,level:3,challenge:`Experimente: entre em Editar malha, escolha uma ponta e mude a forma do cristal.`}}},rename:{title:`Renomear`,label:`Novo nome`,save:`Salvar`,cancel:`Cancelar`,open:`Feche a criação antes de renomear.`,changed:`A criação mudou em outra janela. Confira e tente renomear de novo.`},editor:{loading:`Preparando a sua oficina...`,reloadPage:`Recarregar página`,loadError:`Não consegui carregar as ferramentas. Sua criação continua guardada. Tente de novo; se continuar, atualize a página.`,back:`Voltar`,backToGallery:`Voltar para a galeria`,undo:`Desfazer`,redo:`Refazer`,saved:`Salvo`,saving:`Salvando...`,dirty:`Mudanças por salvar`,saveError:`Não consegui salvar. Sua galeria pode ter chegado ao limite.`,studioSyncFailed:`Salvei no Molda, mas não consegui atualizar no Estúdio. Tente salvar de novo.`,download:`Baixar`,modelSummary:e=>e===1?`1 peça`:`${e} peças`,textureSummary:e=>`${e} × ${e} pixels`,skyPresetLabel:`Tipo de céu`,model:{mode:{build:`Montar`,paint:`Pintar`},toolbox:`Ferramentas`,addGroup:`Adicionar`,add:{box:`Caixa`,wedge:`Rampa`,cylinder:`Cilindro`,sphere:`Bola`,mesh:`Malha`},tools:{move:`Mover`,rotate:`Girar`,scale:`Tamanho`,snap:`Grudar`},duplicate:`Duplicar`,remove:`Apagar`,mirror:`Espelhar no X`,snapHalf:`Encaixe de meio bloco`,parts:`Peças`,partsCount:(e,t)=>`${e}/${t}`,partsEmpty:`Nenhuma peça. Adicione uma caixa para começar.`,twinTag:`espelho`,partsFull:`Chegou ao limite de peças. Apague alguma para adicionar outra.`,trianglesFull:`O modelo chegou ao limite de triângulos. Simplifique alguma malha para continuar.`,placeHint:`Agora toque no chão ou numa peça para colocar a forma.`,snap:{source:`Toque no ponto da peça que vai grudar.`,target:`Agora toque no ponto de outra peça.`,selectPart:`Escolha uma peça antes de usar Grudar.`,locked:`Destranque todas as peças escolhidas antes de usar Grudar.`,hidden:`Mostre a peça principal antes de usar Grudar.`,unavailable:`Não encontrei um ponto para grudar nessa peça.`,errors:{"invalid-source":`A peça de origem mudou. Comece o Grudar de novo.`,"locked-source":`Uma das peças escolhidas está trancada. Destranque e tente de novo.`,"invalid-target":`Toque em um ponto de outra peça visível.`,"stale-anchor":`Uma das peças mudou. Comece o Grudar de novo.`,"outside-grid":`Esse encaixe levaria a peça para fora da grade.`,"mirror-failure":`Não há espaço para mover a peça e o espelho juntos.`,"no-move":`Esses pontos já estão juntos.`}},colors:`Cores`,addColor:`Nova cor`,addColorSelectPart:`Toque numa peça primeiro para dar uma cor nova a ela.`,paletteLabel:`Paleta`,colorsFull:`A paleta já tem o máximo de cores extras.`,properties:`Propriedades`,noSelection:`Toque numa peça para ver as propriedades.`,twinSelected:`Esta peça é o espelho de outra: mexa na peça original.`,name:`Nome`,shape:`Forma`,position:`Posição`,size:`Tamanho`,rotation:`Giro`,axis:{x:`X`,y:`Y`,z:`Z`},dims:{w:`Largura`,h:`Altura`,d:`Fundo`},views:{free:`Livre`,front:`Frente`,back:`Trás`,left:`Esquerda`,right:`Direita`,top:`Cima`,frame:`Enquadrar`,selection:`Enquadrar seleção`},viewControls:`Olhar o modelo`,isolation:{toggle:`Isolar seleção`,active:`Mostrando só a seleção`,showAll:`Mostrar tudo`},inspector:{title:`Peças e propriedades`,open:`Peças e cores`,close:`Recolher peças e propriedades`},viewHint:{free:`Arraste para girar. Use dois dedos para mover ou aproximar.`,flat:`Vista reta, sem perspectiva. Arraste para mover; aproxime com dois dedos.`},grid:`Grade`,edges:`Ver arestas`,lock:`Trancar`,unlock:`Destrancar`,hide:`Esconder`,show:`Mostrar`,lockedTag:`trancada`,hiddenTag:`escondida`,lockedHint:`Essa peça está trancada. Destranque na lista de peças para mexer nela.`,pivot:`Pivô`,pivotCenter:`Pivô no centro`,partsAdditive:`Somar à seleção`,selectedParts:e=>`${e} peças escolhidas`,arrange:{title:`Arrumar`,floor:`Pôr no chão`,center:`Centralizar no palco`,align:`Alinhar pelo centro`,alignAxis:e=>`Alinhar no ${e}`,alignSelection:`Escolha pelo menos duas peças para alinhar.`,repeat:`Repetir em linha`,direction:`Direção`,repeatDirection:e=>`Repetir em linha: ${e}`,directions:{"+x":`Para a direita`,"-x":`Para a esquerda`,"+y":`Para cima`,"-y":`Para baixo`,"+z":`Para a frente`,"-z":`Para trás`},count:`Quantidade de cópias`,gap:`Espaço em encaixes`,errors:{"invalid-selection":`Escolha uma ou mais peças para arrumar.`,"invalid-repeat":`Escolha de 1 a 8 cópias e um espaço de 0 a 16.`,locked:`Destranque todas as peças escolhidas antes de arrumar.`,"outside-grid":`Esse arranjo levaria uma peça para fora da grade.`,"parts-full":`Não cabem todas essas cópias no limite de peças.`,"triangles-full":`Não cabem todas essas cópias no limite de triângulos.`}},help:{button:`Ajuda desta tela`,title:`Ajuda desta tela`,actions:`Ações disponíveis`,shortcut:`Atalho`,unavailable:e=>`Agora não: ${e}`,contexts:{build:`Montar`,paint:`Pintar`,"mesh-vertex":`Editar pontos`,"mesh-edge":`Editar arestas`,"mesh-face":`Editar faces`,"face-paint":`Pintar de perto`},gestures:{build:`Toque numa peça para escolher. Use Somar à seleção ou segure Shift para escolher várias; arraste as alças para transformar.`,paint:`Escolha uma ferramenta e toque numa face. Pintar de perto amplia somente a face que você tocar.`,"mesh-vertex":`Toque nos pontos. Use Somar à seleção ou segure Shift para manter os pontos já escolhidos.`,"mesh-edge":`Toque nas arestas. Use Somar à seleção ou segure Shift para manter as arestas já escolhidas.`,"mesh-face":`Toque nas faces. Use Somar à seleção ou segure Shift para manter as faces já escolhidas.`,"face-paint":`Pinte dentro da área da face ampliada; a área cinza fica protegida.`}},status:(e,t,n)=>`${e}/${t} peças · ${n} triângulos`,unsupported:`Não consegui abrir o 3D neste navegador. Tente no Chrome ou no Edge mais recentes.`,panelsToggle:`Peças e propriedades`,thumbPending:`Preparando a miniatura...`,statusAtlas:e=>`atlas ${e}×${e}`,statusTriangles:(e,t)=>`${e}/${t} triângulos`,reference:{title:`Imagem de apoio`,choose:`Escolher imagem`,replace:`Trocar imagem`,hint:`Use um desenho ou foto como guia. A imagem fica presa à tela, não faz parte do modelo e sai quando você fecha a criação.`,formats:`PNG ou JPG sem animação, até 4 MB e 4 milhões de pixels.`,loading:`Preparando a imagem...`,view:`Mostrar nesta vista`,opacity:`Visibilidade`,scale:`Tamanho`,x:`Mover para os lados`,y:`Mover para cima ou para baixo`,flip:`Espelhar imagem`,visible:`Mostrar imagem`,reset:`Centralizar imagem`,remove:`Tirar imagem`,done:`Voltar ao modelo`,failures:{size:`Essa imagem é grande demais. Escolha uma menor, de até 4 MB e 4 milhões de pixels.`,format:`Escolha um arquivo PNG ou JPG. Este arquivo não pode ser usado como imagem de apoio.`,animated:`Escolha uma imagem parada. Imagens animadas não servem como apoio.`,decode:`Não consegui abrir essa imagem. Tente outro arquivo PNG ou JPG.`}},mesh:{edit:`Editar malha`,convert:`Transformar em malha`,open:`Editar ou transformar em malha`,converted:`Virou malha: agora dá para mexer nos pontos, nas arestas e nas faces.`,convertedLostSkins:e=>e===1?`Virou malha. A pintura de 1 face não coube na forma nova e saiu.`:`Virou malha. A pintura de ${e} faces não coube na forma nova e saiu.`,toolbox:`Editar malha`,modes:{vertex:`Pontos`,edge:`Arestas`,face:`Faces`},additive:`Somar à seleção`,selection:{title:`Escolher mais`,hint:`Estas ações só mudam o que está escolhido. Seu modelo continua igual.`,labels:{all:`Escolher tudo`,none:`Limpar seleção`,connected:`Escolher conectados`,grow:`Expandir seleção`,shrink:`Reduzir seleção`,invert:`Inverter seleção`,ring:`Anel de arestas`,loop:`Caminho de arestas`},help:{all:`Escolhe todos os itens do tipo atual: pontos, arestas ou faces.`,none:`Solta a seleção sem apagar nada.`,connected:`Segue as ligações da malha a partir do que você escolheu.`,grow:`Acrescenta os vizinhos de quem está escolhido.`,shrink:`Retira os vizinhos da borda da seleção.`,invert:`Escolhe quem ficou de fora e solta quem estava escolhido.`,ring:`Segue os lados opostos das faces de quatro pontos. Para nas bordas e nas bifurcações.`,loop:`Segue um caminho contínuo de arestas. Para onde houver uma borda, triângulo ou bifurcação.`}},deleteSelection:`Apagar seleção`,done:`Pronto`,hint:`Toque num ponto, numa aresta ou numa face. Arraste a alça para mover.`,counts:(e,t,n,r=0)=>`${e} pontos · ${t} faces${r>0?` · ${r} arestas soltas`:``} · ${n} triângulos`,selected:(e,t)=>`${e} ${t===`vertex`?e===1?`ponto`:`pontos`:t===`edge`?e===1?`aresta`:`arestas`:e===1?`face`:`faces`}`,nothingSelected:`Nada escolhido.`,emptied:`A malha ficou sem faces: a peça foi apagada.`,cannotMove:`Não dá para mover para fora da grade.`,tools:{extrude:`Puxar`,loopCut:`Loop cut`,merge:`Juntar pontos`,createFace:`Criar face ou aresta`,inset:`Encolher dentro`,flip:`Virar face`,split:`Dividir em triângulos`},toolHints:{extrude:`Escolha faces (ou arestas) e toque em Puxar.`,extrudeEdges:`Escolha uma ou mais arestas para puxar.`,extrudeFaces:`Escolha uma ou mais faces para puxar.`,loopCut:`Escolha UMA aresta e toque em Loop cut.`,merge:`Escolha dois pontos ou mais para juntar.`,createFace:`Escolha de 2 a 4 pontos para criar uma aresta, dividir ou fechar uma face.`,inset:`Escolha uma face reta para encolher dentro.`,flip:`Escolha faces para virar.`,split:`Escolha faces de 4 pontos para dividir em triângulos.`,loopCutQuad:`Loop cut precisa de uma aresta solta ou de uma faixa de faces de 4 pontos.`,faceExists:`Essa face ou aresta já existe.`},cutOffGrid:`O corte caiu fora do encaixe: os pontos novos não estão na grade.`,toolsLegend:`Ferramentas de malha`,modeHints:{vertex:`Escolha de 2 a 4 pontos e use Criar face ou aresta.`,edge:`Escolha uma aresta para usar Loop cut ou Puxar.`,face:`Escolha faces para puxar, encolher, virar ou dividir.`},selectAll:`Escolher todos os pontos`,adjust:`Ajustar`,distance:`Distância`,cuts:`Quantidade de cortes`,cutPosition:`Posição do corte, em porcentagem`,direction:`Direção`,directions:{auto:`Auto`,x:`+X`,"-x":`−X`,y:`+Y`,"-y":`−Y`,z:`+Z`,"-z":`−Z`},closeAdjust:`Fechar ajustes`,insetAmount:`Quanto encolher, em porcentagem`,tooMany:`A malha ficou grande demais: apague alguma coisa antes.`,snapHalfOn:`O corte caiu no meio de um bloco: liguei o encaixe de meio bloco.`,issues:{overlap:`Dois pontos ficaram no mesmo lugar.`,"non-planar":`Uma face ficou torta.`,concave:`Uma face ficou com um buraco para dentro.`,flipped:`Uma face ficou virada para dentro.`},fixes:{merge:`Juntar`,split:`Dividir`,flip:`Virar`,undo:`Desfazer`,keep:`Deixar`,stale:`O modelo mudou depois do aviso. Nada foi mexido.`}},paint:{tools:{pencil:`Lápis`,eraser:`Borracha`,fillFace:`Balde na face`,fillPart:`Balde na peça`,picker:`Conta-gotas`,rotateSkin:`Girar a pele`,faceEditor:`Pintar de perto`},faceEditor:{title:`Pintar de perto`,hint:`Toque na face que você quer ampliar.`,stage:`Face ampliada para pintar`,outside:`A área cinza fica fora da face e não recebe tinta.`,done:`Pronto`,stale:`Essa face mudou ou foi apagada. Escolha outra para pintar.`},mirror:`Espelho de pintura`,sizeLabel:`Tamanho do lápis`,sizes:{1:`Fino`,2:`Médio`,3:`Grosso`},texelsLabel:`Texels por bloco`,texelsHint:`Trocar re-desenha as peles no tamanho novo.`,atlasFull:`Modelo grande demais para pintar tudo. Diminua os texels por bloco ou tire peças.`,activeColor:`Cor do lápis`,removeColor:`Apagar esta cor`,removeColorBase:`As 16 cores da paleta são fixas. Só as cores que você adicionou podem ser apagadas.`,removedColor:`Cor apagada.`,apply:{button:`Vestir com textura`,title:`Vestir a peça com uma textura`,pick:`Suas texturas`,empty:`Você ainda não tem texturas. Crie uma na galeria e volte aqui.`,modeLabel:`Como vestir`,modeTile:`Repetir`,modeStretch:`Esticar`,apply:`Vestir`,loadFailed:`Não consegui abrir essa textura. Tente de novo ou escolha outra.`,applied:`Peça vestida!`,selectPart:`Toque numa peça primeiro.`}},download:{glb:`Baixar .glb`,ready:`Baixei o modelo! Procure na pasta de downloads.`,tooBig:`O modelo ficou grande demais para o Estúdio. Diminua os texels por bloco ou tire peças.`,empty:`Adicione uma peça antes de baixar.`,failed:`Não consegui preparar o arquivo agora.`}},texture:{stage:`Folha de pixels`,tiled:`Repetida 3×3`,preview3d:`Prévia 3D`,tools:{pencil:`Pincel`,eraser:`Borracha`,fill:`Balde`,picker:`Pegar cor`,line:`Linha`,rectangle:`Retângulo`,ellipse:`Elipse`},fillShape:`Preencher forma`,shapeHint:`Arraste para desenhar. Solte para guardar ou aperte Esc para cancelar. Com Pintar pela borda, o traço continua no outro lado da folha.`,seamless:`Pintar pela borda`,shiftHalf:`Deslocar só a prévia`,transparentHint:`A borracha deixa o pixel transparente. No jogo, transparente vira preto.`,unsupported:`Sem prévia 3D neste navegador.`,download:{png:`Baixar .png`,ready:`Baixei a textura! Procure na pasta de downloads.`,tooBig:`A textura ficou grande demais para o Estúdio.`,failed:`Não consegui preparar o arquivo agora.`}},sky:{preview:`Prévia do céu`,controls:`Controles do céu`,presetsPanel:`Céu de partida`,sun:`Sol`,elevation:`Altura do sol`,azimuth:`Direção do sol`,size:`Tamanho do sol`,intensity:`Brilho do sol`,colors:`Cores`,top:`Topo`,horizon:`Horizonte`,ground:`Chão`,clouds:`Nuvens`,amount:`Quantidade`,softness:`Suavidade`,shuffle:`Sortear nuvens`,stars:`Estrelas`,exposure:`Exposição`,degrees:e=>`${e}°`,percent:e=>`${Math.round(e*100)}%`,unsupported:`Não consegui abrir a prévia 3D neste navegador. O céu continua sendo salvo e baixado normalmente.`,download:{hdr:`Baixar .hdr`,preparing:`Preparando o céu...`,encoding:`Montando o arquivo do céu...`,cancel:`Cancelar download`,cancelled:`Parei o download. Seu céu continua aqui.`,changed:`O céu mudou. Toque em Baixar para preparar a nova versão.`,ready:`Baixei o céu! Procure na pasta de downloads.`,tooBig:`O céu ficou grande demais para o Estúdio.`,failed:`Não consegui preparar o arquivo agora.`}},comingSoon:{model:`A bancada de montar e pintar chega no próximo passo do Molda.`,texture:`A folha de pintar chega no próximo passo do Molda.`,sky:`Os controles do sol, das cores e das nuvens chegam no próximo passo do Molda.`},notFound:`Essa criação não está mais aqui. Escolha outra na sua galeria.`},toast:{created:e=>`"${e}" criado!`,renamed:`Renomeado!`,duplicated:`Duplicado!`,removed:`Apagado.`,saveFailed:`Não consegui salvar a criação.`},a11y:{galleryGrid:`Suas criações`,assetCard:(e,t)=>`${t} ${e}`,closeDialog:`Fechar`,kindFilter:`Filtrar por tipo`,newAssetKind:e=>`Criar ${e.toLowerCase()}`,openTemplates:`Escolher um modelo pronto`,templateCard:e=>`Modelo pronto ${e}`,skyThumb:e=>`Céu ${e.toLowerCase()}`,textureThumb:`Prévia da textura`,modelThumb:`Prévia do modelo`,editorStatus:`Estado do salvamento`,viewport:`Palco 3D`,partItem:(e,t)=>`${e}, ${t.toLowerCase()}`,partLock:e=>`Trancar ${e}`,partHide:e=>`Esconder ${e}`,colorSwatch:(e,t)=>`Cor ${e} ${t}`,decrease:e=>`Diminuir ${e.toLowerCase()}`,increase:e=>`Aumentar ${e.toLowerCase()}`,paletteSelect:`Escolher a paleta`}};function Pe(e,t,n){if(!(e instanceof Uint8Array)||!Number.isSafeInteger(t)||t<1||!Number.isSafeInteger(n)||n<1||e.length!==t*n*4)throw RangeError(`RGBA rows do not match their dimensions`);if(n===1)return;let r=t*4,i=new Uint8Array(r);for(let t=0;t<Math.floor(n/2);t++){let a=t*r,o=(n-1-t)*r;i.set(e.subarray(a,a+r)),e.copyWithin(a,o,o+r),e.set(i,o)}}function Fe(e){return typeof e==`string`&&/^[A-Za-z0-9_-]{1,64}$/.test(e)}let Ie=[1];Ie[Ie.length-1];let Le={id:`arcade`,name:`Arcade`,colors:[``,`#ffffff`,`#ff2121`,`#ff93c4`,`#ff8135`,`#fff609`,`#249ca3`,`#78dc52`,`#003fad`,`#87f2ff`,`#8e2ec4`,`#a4839f`,`#5c406c`,`#e5cdc4`,`#91463d`,`#000000`]},Re=[Le,{id:`pastel`,name:`Doces`,colors:[``,`#fffaf5`,`#ffb3ba`,`#ffd6e0`,`#ffdfba`,`#fff5ba`,`#a8e6cf`,`#baffc9`,`#a3c4f3`,`#bae1ff`,`#d0b3ff`,`#e0c3fc`,`#b28dff`,`#f1e3d3`,`#c9ada7`,`#4a4e69`]},{id:`cinzas`,name:`Lápis e carvão`,colors:[``,`#ffffff`,`#f2f2f2`,`#e0e0e0`,`#cccccc`,`#b8b8b8`,`#a3a3a3`,`#8f8f8f`,`#7a7a7a`,`#666666`,`#525252`,`#3d3d3d`,`#292929`,`#1a1a1a`,`#0d0d0d`,`#000000`]}];function ze(e){return Re.find(t=>t.id===e)??Le}function Be(e){return typeof e==`string`&&Re.some(t=>t.id===e)}function Ve(e){return e===1||e===.5}function He(e){let t=e.paletteId===`custom`&&e.customPalette?e.customPalette.colors:ze(e.paletteId).colors;return e.extraColors&&e.extraColors.length>0?[...t,...e.extraColors]:t}-F.gridHalf,-F.gridHalf,F.gridHalf,F.gridHeight,F.gridHalf;function Ue(e){return He(e).map((e,t)=>{if(t===0||!e)return[0,0,0,0];let[n,r,i]=je(e);return[n/255,r/255,i/255,1]})}function We(e,t){if(e.baseColor.kind===`rgba`)return[...e.baseColor.value];let n=t[e.baseColor.index];if(!n)throw Error(`Cor de material ausente.`);return[...n]}function Ge(e,t,n,r,i=!1){let{x0:a,y0:o,x1:s,y1:c}=r;if(![a,o,s,c].every(Number.isSafeInteger)||a<0||o<0||s<a||c<o||s>=e.width||c>=e.height)throw RangeError(`Região de pintura fora da imagem.`);let l=s-a+1,u=new Uint8Array(l*(c-o+1)*4),d=e.layers.filter(e=>e.visible&&e.opacity>0),f=o*e.width+a,p=f+l,m=e.width-l;for(let r=0;r<u.length;r+=4,f++){f===p&&(f+=m,p=f+l);let a=n[3],o=n[0]*a,s=n[1]*a,c=n[2]*a,h=n;for(let n of d){let r;if(e.encoding===`indexed`){let e=n.pixels[f],i=e===void 0?void 0:t[e];if(!i)throw Error(`Pixel com índice de cor ausente.`);r=i}else{let e=f*4,t=n.pixels[e],i=n.pixels[e+1],a=n.pixels[e+2],o=n.pixels[e+3];if(t===void 0||i===void 0||a===void 0||o===void 0)throw Error(`Pixel RGBA incompleto.`);r=[t/255,i/255,a/255,o/255]}let l=r[3]*n.opacity;i&&e.encoding===`rgba`&&(h=r),o=r[0]*l+o*(1-l),s=r[1]*l+s*(1-l),c=r[2]*l+c*(1-l),a=l+a*(1-l)}a>0?(u[r]=Math.round(o/a*255),u[r+1]=Math.round(s/a*255),u[r+2]=Math.round(c/a*255),u[r+3]=Math.round(a*255)):i&&(u[r]=Math.round(h[0]*255),u[r+1]=Math.round(h[1]*255),u[r+2]=Math.round(h[2]*255))}return u}_();let Ke={cells:256,sequence:256,minFps:.1,maxFps:60};function qe(e,t){let n=s(e,`flipbook`,[`frameWidth`,`frameHeight`,`frames`,`fps`,`loop`]),r=d(n.frameWidth,`frameWidth`,1,t.width,!0),i=d(n.frameHeight,`frameHeight`,1,t.height,!0);o(t.width%r===0&&t.height%i===0,`frames`,`Os quadros precisam preencher a imagem sem sobras. Nenhum pixel será cortado.`);let a=t.width/r*(t.height/i);o(a<=Ke.cells,`frames`,`Use uma folha com até 256 quadros.`);let l=c(n.frames,`frames`,Ke.sequence).map(e=>d(e,`frame`,0,a-1,!0));return o(l.length>0,`frames`,`Escolha pelo menos um quadro para a sequência.`),{frameWidth:r,frameHeight:i,frames:l,fps:d(n.fps,`fps`,Ke.minFps,Ke.maxFps),loop:f(n.loop,`loop`)}}function Je(e,t){let n=e.flipbook;o(n,`flipbook`,`Esta imagem não tem quadros configurados.`);let r=e.width/n.frameWidth;d(t,`frame`,0,r*(e.height/n.frameHeight)-1,!0);let i=t%r*n.frameWidth,a=e.height-(Math.floor(t/r)+1)*n.frameHeight;return{x0:i,y0:a,x1:i+n.frameWidth-1,y1:a+n.frameHeight-1}}let L={nodes:512,renderedParts:F.maxParts,geometries:F.maxParts,vertices:F.maxParts*F.maxMeshVertices,looseEdges:F.maxParts*F.maxMeshLooseEdges,triangles:F.maxTriangles,materials:F.maxTriangles+F.maxParts*7,images:F.maxTriangles,imageSide:1024,layersPerImage:32,pixelBytes:32*1024*1024,faceCorners:64,animationClips:64,animationTracks:4096,animationKeys:65536,animationSeconds:600};function Ye(e,t){return Pt(e,t||{},0,0)}function Xe(e,t){t||={};var n=Nt();n.p(e);var r=Pt(e,t,t.dictionary?6:2,4);return It(r,t),V(r,r.length-4,n.d()),r}function Ze(e,t){if(t){for(var n=new R(e.length),r=0;r<e.length;++r)n[r]=e.charCodeAt(r);return n}if(Rt)return Rt.encode(e);for(var i=e.length,a=new R(e.length+(e.length>>1)),o=0,s=function(e){a[o++]=e},r=0;r<i;++r){if(o+5>a.length){var c=new R(o+8+(i-r<<1));c.set(a),a=c}var l=e.charCodeAt(r);l<128||t?s(l):l<2048?(s(192|l>>6),s(128|l&63)):l>55295&&l<57344?(l=65536+(l&1047552)|e.charCodeAt(++r)&1023,s(240|l>>18),s(128|l>>12&63),s(128|l>>6&63),s(128|l&63)):(s(224|l>>12),s(128|l>>6&63),s(128|l&63))}return _t(a,0,o)}function Qe(e,t){t||={};var n={},r=[];Lt(e,``,n,t);var i=0,a=0;for(var o in n){var s=n[o],c=s[0],l=s[1],u=l.level==0?0:8,d=Ze(o),f=d.length,p=l.comment,m=p&&Ze(p),h=m&&m.length,g=Bt(l.extra);f>65535&&yt(11);var _=u?Ye(c,l):c,v=_.length,y=Mt();y.p(c),r.push(Ft(l,{size:c.length,crc:y.d(),c:_,f:d,m,u:f!=o.length||m&&p.length!=h,o:i,compression:u})),i+=30+f+g+v,a+=76+2*(f+g)+(h||0)+v}for(var b=new R(a+22),x=i,S=a-i,C=0;C<r.length;++C){var d=r[C];Vt(b,d.o,d,d.f,d.u,d.c.length);var w=30+d.f.length+Bt(d.extra);b.set(d.c,d.o+w),Vt(b,i,d,d.f,d.u,d.c.length,d.o,d.m),i+=16+w+(d.m?d.m.length:0)}return Ht(b,i,r.length,S,x),b}var R,z,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,B,ut,dt,ft,pt,mt,ht,gt,_t,vt,yt,bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,V,It,Lt,Rt,zt,Bt,Vt,Ht,Ut=t((()=>{for(R=Uint8Array,z=Uint16Array,$e=Int32Array,et=new R([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),tt=new R([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),nt=new R([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),rt=function(e,t){for(var n=new z(31),r=0;r<31;++r)n[r]=t+=1<<e[r-1];for(var i=new $e(n[30]),r=1;r<30;++r)for(var a=n[r];a<n[r+1];++a)i[a]=a-n[r]<<5|r;return{b:n,r:i}},it=rt(et,2),at=it.b,ot=it.r,at[28]=258,ot[258]=28,st=rt(tt,0),st.b,ct=st.r,lt=new z(32768),B=0;B<32768;++B)ut=(B&43690)>>1|(B&21845)<<1,ut=(ut&52428)>>2|(ut&13107)<<2,ut=(ut&61680)>>4|(ut&3855)<<4,lt[B]=((ut&65280)>>8|(ut&255)<<8)>>1;for(dt=(function(e,t,n){for(var r=e.length,i=0,a=new z(t);i<r;++i)e[i]&&++a[e[i]-1];var o=new z(t);for(i=1;i<t;++i)o[i]=o[i-1]+a[i-1]<<1;var s;if(n){s=new z(1<<t);var c=15-t;for(i=0;i<r;++i)if(e[i])for(var l=i<<4|e[i],u=t-e[i],d=o[e[i]-1]++<<u,f=d|(1<<u)-1;d<=f;++d)s[lt[d]>>c]=l}else for(s=new z(r),i=0;i<r;++i)e[i]&&(s[i]=lt[o[e[i]-1]++]>>15-e[i]);return s}),ft=new R(288),B=0;B<144;++B)ft[B]=8;for(B=144;B<256;++B)ft[B]=9;for(B=256;B<280;++B)ft[B]=7;for(B=280;B<288;++B)ft[B]=8;for(pt=new R(32),B=0;B<32;++B)pt[B]=5;mt=dt(ft,9,0),ht=dt(pt,5,0),gt=function(e){return(e+7)/8|0},_t=function(e,t,n){return(t==null||t<0)&&(t=0),(n==null||n>e.length)&&(n=e.length),new R(e.subarray(t,n))},vt=[`unexpected EOF`,`invalid block type`,`invalid length/literal`,`invalid distance`,`stream finished`,`no stream handler`,,`no callback`,`invalid UTF-8 data`,`extra field too long`,`date not in range 1980-2099`,`filename too long`,`stream finishing`,`invalid zip data`],yt=function(e,t,n){var r=Error(t||vt[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,yt),!n)throw r;return r},bt=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8},xt=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8,e[r+2]|=n>>16},St=function(e,t){for(var n=[],r=0;r<e.length;++r)e[r]&&n.push({s:r,f:e[r]});var i=n.length,a=n.slice();if(!i)return{t:kt,l:0};if(i==1){var o=new R(n[0].s+1);return o[n[0].s]=1,{t:o,l:1}}n.sort(function(e,t){return e.f-t.f}),n.push({s:-1,f:25001});var s=n[0],c=n[1],l=0,u=1,d=2;for(n[0]={s:-1,f:s.f+c.f,l:s,r:c};u!=i-1;)s=n[n[l].f<n[d].f?l++:d++],c=n[l!=u&&n[l].f<n[d].f?l++:d++],n[u++]={s:-1,f:s.f+c.f,l:s,r:c};for(var f=a[0].s,r=1;r<i;++r)a[r].s>f&&(f=a[r].s);var p=new z(f+1),m=Ct(n[u-1],p,0);if(m>t){var r=0,h=0,g=m-t,_=1<<g;for(a.sort(function(e,t){return p[t.s]-p[e.s]||e.f-t.f});r<i;++r){var v=a[r].s;if(p[v]>t)h+=_-(1<<m-p[v]),p[v]=t;else break}for(h>>=g;h>0;){var y=a[r].s;p[y]<t?h-=1<<t-p[y]++-1:++r}for(;r>=0&&h;--r){var b=a[r].s;p[b]==t&&(--p[b],++h)}m=t}return{t:new R(p),l:m}},Ct=function(e,t,n){return e.s==-1?Math.max(Ct(e.l,t,n+1),Ct(e.r,t,n+1)):t[e.s]=n},wt=function(e){for(var t=e.length;t&&!e[--t];);for(var n=new z(++t),r=0,i=e[0],a=1,o=function(e){n[r++]=e},s=1;s<=t;++s)if(e[s]==i&&s!=t)++a;else{if(!i&&a>2){for(;a>138;a-=138)o(32754);a>2&&(o(a>10?a-11<<5|28690:a-3<<5|12305),a=0)}else if(a>3){for(o(i),--a;a>6;a-=6)o(8304);a>2&&(o(a-3<<5|8208),a=0)}for(;a--;)o(i);a=1,i=e[s]}return{c:n.subarray(0,r),n:t}},Tt=function(e,t){for(var n=0,r=0;r<t.length;++r)n+=e[r]*t[r];return n},Et=function(e,t,n){var r=n.length,i=gt(t+2);e[i]=r&255,e[i+1]=r>>8,e[i+2]=e[i]^255,e[i+3]=e[i+1]^255;for(var a=0;a<r;++a)e[i+a+4]=n[a];return(i+4+r)*8},Dt=function(e,t,n,r,i,a,o,s,c,l,u){bt(t,u++,n),++i[256];for(var d=St(i,15),f=d.t,p=d.l,m=St(a,15),h=m.t,g=m.l,_=wt(f),v=_.c,y=_.n,b=wt(h),x=b.c,S=b.n,C=new z(19),w=0;w<v.length;++w)++C[v[w]&31];for(var w=0;w<x.length;++w)++C[x[w]&31];for(var T=St(C,7),E=T.t,D=T.l,O=19;O>4&&!E[nt[O-1]];--O);var k=l+5<<3,A=Tt(i,ft)+Tt(a,pt)+o,j=Tt(i,f)+Tt(a,h)+o+14+3*O+Tt(C,E)+2*C[16]+3*C[17]+7*C[18];if(c>=0&&k<=A&&k<=j)return Et(t,u,e.subarray(c,c+l));var M,N,P,ee;if(bt(t,u,1+(j<A)),u+=2,j<A){M=dt(f,p,0),N=f,P=dt(h,g,0),ee=h;var te=dt(E,D,0);bt(t,u,y-257),bt(t,u+5,S-1),bt(t,u+10,O-4),u+=14;for(var w=0;w<O;++w)bt(t,u+3*w,E[nt[w]]);u+=3*O;for(var ne=[v,x],F=0;F<2;++F)for(var re=ne[F],w=0;w<re.length;++w){var ie=re[w]&31;bt(t,u,te[ie]),u+=E[ie],ie>15&&(bt(t,u,re[w]>>5&127),u+=re[w]>>12)}}else M=mt,N=ft,P=ht,ee=pt;for(var w=0;w<s;++w){var I=r[w];if(I>255){var ie=I>>18&31;xt(t,u,M[ie+257]),u+=N[ie+257],ie>7&&(bt(t,u,I>>23&31),u+=et[ie]);var ae=I&31;xt(t,u,P[ae]),u+=ee[ae],ae>3&&(xt(t,u,I>>5&8191),u+=tt[ae])}else xt(t,u,M[I]),u+=N[I]}return xt(t,u,M[256]),u+N[256]},Ot=new $e([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),kt=new R(0),At=function(e,t,n,r,i,a){var o=a.z||e.length,s=new R(r+o+5*(1+Math.ceil(o/7e3))+i),c=s.subarray(r,s.length-i),l=a.l,u=(a.r||0)&7;if(t){u&&(c[0]=a.r>>3);for(var d=Ot[t-1],f=d>>13,p=d&8191,m=(1<<n)-1,h=a.p||new z(32768),g=a.h||new z(m+1),_=Math.ceil(n/3),v=2*_,y=function(t){return(e[t]^e[t+1]<<_^e[t+2]<<v)&m},b=new $e(25e3),x=new z(288),S=new z(32),C=0,w=0,T=a.i||0,E=0,D=a.w||0,O=0;T+2<o;++T){var k=y(T),A=T&32767,j=g[k];if(h[A]=j,g[k]=A,D<=T){var M=o-T;if((C>7e3||E>24576)&&(M>423||!l)){u=Dt(e,c,0,b,x,S,w,E,O,T-O,u),E=C=w=0,O=T;for(var N=0;N<286;++N)x[N]=0;for(var N=0;N<30;++N)S[N]=0}var P=2,ee=0,te=p,ne=A-j&32767;if(M>2&&k==y(T-ne))for(var F=Math.min(f,M)-1,re=Math.min(32767,T),ie=Math.min(258,M);ne<=re&&--te&&A!=j;){if(e[T+P]==e[T+P-ne]){for(var I=0;I<ie&&e[T+I]==e[T+I-ne];++I);if(I>P){if(P=I,ee=ne,I>F)break;for(var ae=Math.min(ne,I-2),oe=0,N=0;N<ae;++N){var se=T-ne+N&32767,ce=se-h[se]&32767;ce>oe&&(oe=ce,j=se)}}}A=j,j=h[A],ne+=A-j&32767}if(ee){b[E++]=268435456|ot[P]<<18|ct[ee];var le=ot[P]&31,ue=ct[ee]&31;w+=et[le]+tt[ue],++x[257+le],++S[ue],D=T+P,++C}else b[E++]=e[T],++x[e[T]]}}for(T=Math.max(T,D);T<o;++T)b[E++]=e[T],++x[e[T]];u=Dt(e,c,l,b,x,S,w,E,O,T-O,u),l||(a.r=u&7|c[u/8|0]<<3,u-=7,a.h=g,a.p=h,a.i=T,a.w=D)}else{for(var T=a.w||0;T<o+l;T+=65535){var de=T+65535;de>=o&&(c[u/8|0]=l,de=o),u=Et(c,u+1,e.subarray(T,de))}a.i=o}return _t(s,0,r+gt(u)+i)},jt=(function(){for(var e=new Int32Array(256),t=0;t<256;++t){for(var n=t,r=9;--r;)n=(n&1&&-306674912)^n>>>1;e[t]=n}return e})(),Mt=function(){var e=-1;return{p:function(t){for(var n=e,r=0;r<t.length;++r)n=jt[n&255^t[r]]^n>>>8;e=n},d:function(){return~e}}},Nt=function(){var e=1,t=0;return{p:function(n){for(var r=e,i=t,a=n.length|0,o=0;o!=a;){for(var s=Math.min(o+2655,a);o<s;++o)i+=r+=n[o];r=(r&65535)+15*(r>>16),i=(i&65535)+15*(i>>16)}e=r,t=i},d:function(){return e%=65521,t%=65521,(e&255)<<24|(e&65280)<<8|(t&255)<<8|t>>8}}},Pt=function(e,t,n,r,i){if(!i&&(i={l:1},t.dictionary)){var a=t.dictionary.subarray(-32768),o=new R(a.length+e.length);o.set(a),o.set(e,a.length),e=o,i.w=a.length}return At(e,t.level==null?6:t.level,t.mem==null?i.l?Math.ceil(Math.max(8,Math.min(13,Math.log(e.length)))*1.5):20:12+t.mem,n,r,i)},Ft=function(e,t){var n={};for(var r in e)n[r]=e[r];for(var r in t)n[r]=t[r];return n},V=function(e,t,n){for(;n;++t)e[t]=n,n>>>=8},It=function(e,t){var n=t.level,r=n==0?0:n<6?1:n==9?3:2;if(e[0]=120,e[1]=r<<6|(t.dictionary&&32),e[1]|=31-(e[0]<<8|e[1])%31,t.dictionary){var i=Nt();i.p(t.dictionary),V(e,2,i.d())}},Lt=function(e,t,n,r){for(var i in e){var a=e[i],o=t+i,s=r;Array.isArray(a)&&(s=Ft(r,a[1]),a=a[0]),ArrayBuffer.isView(a)?n[o]=[a,s]:(n[o+=`/`]=[new R(0),s],Lt(a,o,n,r))}},Rt=typeof TextEncoder<`u`&&new TextEncoder,zt=typeof TextDecoder<`u`&&new TextDecoder;try{zt.decode(kt,{stream:!0})}catch{}Bt=function(e){var t=0;if(e)for(var n in e){var r=e[n].length;r>65535&&yt(9),t+=r+4}return t},Vt=function(e,t,n,r,i,a,o,s){var c=r.length,l=n.extra,u=s&&s.length,d=Bt(l);V(e,t,o==null?67324752:33639248),t+=4,o!=null&&(e[t++]=20,e[t++]=n.os),e[t]=20,t+=2,e[t++]=n.flag<<1|(a<0&&8),e[t++]=i&&8,e[t++]=n.compression&255,e[t++]=n.compression>>8;var f=new Date(n.mtime==null?Date.now():n.mtime),p=f.getFullYear()-1980;if((p<0||p>119)&&yt(10),V(e,t,p<<25|f.getMonth()+1<<21|f.getDate()<<16|f.getHours()<<11|f.getMinutes()<<5|f.getSeconds()>>1),t+=4,a!=-1&&(V(e,t,n.crc),V(e,t+4,a<0?-a-2:a),V(e,t+8,n.size)),V(e,t+12,c),V(e,t+14,d),t+=16,o!=null&&(V(e,t,u),V(e,t+6,n.attrs),V(e,t+10,o),t+=14),e.set(r,t),t+=c,d)for(var m in l){var h=l[m],g=h.length;V(e,t,+m),V(e,t+2,g),e.set(h,t+4),t+=4+g}return u&&(e.set(s,t),t+=u),t},Ht=function(e,t,n,r,i){V(e,t,101010256),V(e,t+8,n),V(e,t+10,n),V(e,t+12,r),V(e,t+16,i)}}));Ut();let Wt=Uint8Array.from([137,80,78,71,13,10,26,10]),Gt=(()=>{let e=new Uint32Array(256);for(let t=0;t<256;t+=1){let n=t;for(let e=0;e<8;e+=1)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e})();function Kt(e,t=0){let n=t^4294967295;for(let t=0;t<e.length;t+=1)n=Gt[(n^e[t])&255]^n>>>8;return(n^4294967295)>>>0}function qt(e,t){let n=new Uint8Array(12+t.length),r=new DataView(n.buffer);r.setUint32(0,t.length);for(let t=0;t<4;t+=1)n[4+t]=e.charCodeAt(t);return n.set(t,8),r.setUint32(8+t.length,Kt(n.subarray(4,8+t.length))),n}function Jt(e,t,n){if(e.length!==t*n*4)throw Error(`encodePng: tamanho do RGBA não bate`);let r=new Uint8Array(13),i=new DataView(r.buffer);i.setUint32(0,t),i.setUint32(4,n),r[8]=8,r[9]=6,r[10]=0,r[11]=0,r[12]=0;let a=t*4,o=new Uint8Array((a+1)*n);for(let t=0;t<n;t+=1)o[t*(a+1)]=0,o.set(e.subarray(t*a,(t+1)*a),t*(a+1)+1);let s=Xe(o,{level:6}),c=[Wt,qt(`IHDR`,r),qt(`IDAT`,s),qt(`IEND`,new Uint8Array)],l=c.reduce((e,t)=>e+t.length,0),u=new Uint8Array(l),d=0;for(let e of c)u.set(e,d),d+=e.length;return u}function Yt(e){let t=e.flipbook;return t?{contract:1,sourceId:e.id,columns:e.width/t.frameWidth,rows:e.height/t.frameHeight,frames:[...t.frames],fps:t.fps,loop:t.loop}:null}function Xt(e,t){return{offset:[t%e.columns/e.columns,Math.floor(t/e.columns)/e.rows],scale:[1/e.columns,1/e.rows]}}_();function Zt(e,t=!1){return{width:(t?e?.width:e?.flipbook?.frameWidth)??e?.width??1,height:(t?e?.height:e?.flipbook?.frameHeight)??e?.height??1}}function Qt(e,t){let n=e,r=t;for(;r;)[n,r]=[r,n%r];let i=e/n*t;return o(i<=L.imageSide,`export.texture`,`Os mapas de rugosidade e metal precisam de tamanhos compatíveis para caber juntos no GLB.`),i}var $t=class{hierarchy;binary;issues;animatedPaint;materials=[];textures=[];images=[];samplers=[{magFilter:9728,minFilter:9728,wrapS:33071,wrapT:33071}];pixelBytes=0;textureTransform=!1;animatedPaints=0;palette;materialIds=new Map;textureIds=new Map;flipbooks=new Set;staticPaints=new Set;omitAnimatedPaint(e){this.staticPaints.add(e)}constructor(e,t,n,r=!1){this.hierarchy=e,this.binary=t,this.issues=n,this.animatedPaint=r,this.palette=Ue(e.source)}image(e){return e===void 0?void 0:this.hierarchy.index.images.get(e)}raster(e,t,n=!1,r=!1){let i=e.flipbook&&!r?Je(e,e.flipbook.frames[0]):{x0:0,y0:0,x1:e.width-1,y1:e.height-1};return e.flipbook&&!r&&!this.flipbooks.has(e.id)&&(this.flipbooks.add(e.id),this.issues.push({code:`flipbook-first-frame`,sourceId:e.id})),Ge(e,this.palette,t,i,n)}texture(e,t,n,r){let i=this.textureIds.get(e);if(i)return i;o(this.pixelBytes+t*n*4<=L.pixelBytes,`export.textures`,Ne.scene.glbExport.studio.textureBudget);let a=r();Pe(a,t,n);let s=this.textures.length,c={index:s,transparent:a.some((e,t)=>t%4==3&&e<255)};return this.images.push({bufferView:this.binary.addView(Jt(a,t,n)),mimeType:`image/png`}),this.textures.push({source:s,sampler:0}),this.textureIds.set(e,c),this.pixelBytes+=t*n*4,c}get(e){let t=this.materialIds.get(e);if(t!==void 0)return t;let n=this.hierarchy.index.materials.get(e),r=We(n,this.palette),i=this.image(n.colorImageId),a={name:n.name,pbrMetallicRoughness:{baseColorFactor:i?[1,1,1,1]:[Me(r[0]*255),Me(r[1]*255),Me(r[2]*255),r[3]],metallicFactor:n.metalness,roughnessFactor:n.roughness},alphaMode:r[3]<1?`BLEND`:`OPAQUE`,doubleSided:n.doubleSided};if(i){let t=this.staticPaints.has(e),o=this.animatedPaint&&i.flipbook!==void 0&&!t;t&&i.flipbook&&!this.flipbooks.has(i.id)&&(this.flipbooks.add(i.id),this.issues.push({code:`flipbook-uv-first-frame`,sourceId:i.id}));let{width:s,height:c}=Zt(i,o),l=n.alphaMask!==void 0,u=this.texture(JSON.stringify([`color`,i.id,r,l,o]),s,c,()=>this.raster(i,r,l,o));a.pbrMetallicRoughness.baseColorTexture={index:u.index},a.alphaMode=u.transparent?`BLEND`:`OPAQUE`;let d=o?Yt(i):null;d&&(a.pbrMetallicRoughness.baseColorTexture.extensions={KHR_texture_transform:Xt(d,d.frames[0])},a.extras={molda:{flipbook:d}},this.textureTransform=!0,this.animatedPaints+=1)}n.alphaMask&&(a.alphaMode=`MASK`,a.alphaCutoff=n.alphaMask.cutoff,a.pbrMetallicRoughness.baseColorFactor[3]*=n.alphaMask.opacity);let o=this.image(n.normalImageId);if(o){this.issues.push({code:`runtime-tangent-space`,sourceId:n.id});let{width:e,height:t}=Zt(o);a.normalTexture={index:this.texture(JSON.stringify([`normal`,o.id,n.normalFlipY===!0]),e,t,()=>{let e=this.raster(o,[128/255,128/255,1,1]);if(!n.normalFlipY)for(let t=1;t<e.length;t+=4)e[t]=255-e[t];return e}).index,scale:n.normalStrength??1}}let s=this.image(n.roughnessImageId),c=this.image(n.metalnessImageId);if(s||c){let e=Zt(s),t=Zt(c),n=Qt(e.width,t.width),r=Qt(e.height,t.height),i=this.texture(JSON.stringify([`surface`,s?.id,c?.id]),n,r,()=>{let i=s?this.raster(s,[1,1,1,1]):null,a=c?this.raster(c,[1,1,1,1]):null,o=new Uint8Array(n*r*4).fill(255);for(let s=0;s<r;s++)for(let c=0;c<n;c++){let l=(s*n+c)*4;i&&(o[l+1]=i[(Math.floor(s*e.height/r)*e.width+Math.floor(c*e.width/n))*4+1]),a&&(o[l+2]=a[(Math.floor(s*t.height/r)*t.width+Math.floor(c*t.width/n))*4+2])}return o});a.pbrMetallicRoughness.metallicRoughnessTexture={index:i.index}}let l=this.materials.length;return this.materials.push(a),this.materialIds.set(e,l),l}};_();function en(e,t){let n=h(e.animations??[],`animations`);o(n.size<=L.animationClips,`animations`,`Há clipes demais nesta criação.`);let r=new Set,i=0,a=0;for(let e of n.values()){let n=new Set;i+=e.tracks.length,o(i<=L.animationTracks,`animations`,`Há trilhas demais nesta criação.`);for(let i of e.tracks){let s=`animations.${e.id}.${i.nodeId}.${i.channel}`,c=t.nodes.get(i.nodeId);o(c,s,`A peça animada não existe.`),o(e.space!==`local`||c.transform.kind===`trs`,s,`Esse clipe usa a posição local original. Converta o movimento antes de mudar a organização ou o pivô.`);let l=JSON.stringify([i.nodeId,i.channel]);o(!n.has(l),s,`Essa peça já tem uma trilha desse movimento.`),n.add(l),r.add(i.nodeId),a+=i.keys.length,o(i.keys.length>0&&a<=L.animationKeys,s,`Chaves fora do orçamento da criação.`)}}return{animations:n,animatedNodes:r,animationTrackCount:i,animationKeyCount:a}}function tn(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}function nn(e,t){if(e.length!==t)return!1;for(let t of e)if(!Number.isFinite(t))return!1;return!0}function rn(e){if(e.kind===`affine`){let t=e.matrix;if(!nn(t,16)||t[3]!==0||t[7]!==0||t[11]!==0||t[15]!==1)throw TypeError(`A transformação precisa ser uma matriz afim finita.`);return[...t]}let{translation:t,rotation:n,scale:r}=e;if(!nn(t,3)||!nn(n,4)||!nn(r,3)||Math.abs(Math.hypot(...n)-1)>1e-6)throw TypeError(`A transformação precisa de valores finitos e rotação unitária.`);let[i,a,o,s]=n,c=2*i*i,l=2*a*a,u=2*o*o,d=2*i*a,f=2*i*o,p=2*a*o,m=2*s*i,h=2*s*a,g=2*s*o,_=[(1-l-u)*r[0],(d+g)*r[0],(f-h)*r[0],0,(d-g)*r[1],(1-c-u)*r[1],(p+m)*r[1],0,(f+h)*r[2],(p-m)*r[2],(1-c-l)*r[2],0,...t,1];if(!_.every(Number.isFinite))throw RangeError(`A transformação excedeu o limite numérico.`);return _}function an(e,t){let n=tn();for(let r=0;r<4;r+=1)for(let i=0;i<3;i+=1)n[r*4+i]=e[i]*t[r*4]+e[4+i]*t[r*4+1]+e[8+i]*t[r*4+2]+(r===3?e[12+i]:0);if(!n.every(Number.isFinite))throw RangeError(`A transformação excedeu o limite numérico.`);return n}function on(e){let[t,n,r,,i,a,o,,s,c,l]=e,u=sn(e),d=Math.hypot(t,n,r)*Math.hypot(i,a,o)*Math.hypot(s,c,l);if(!Number.isFinite(u)||Math.abs(u)<=d*1e-12)return null;let f=[(a*l-c*o)/u,(c*r-n*l)/u,(n*o-a*r)/u,0,(s*o-i*l)/u,(t*l-s*r)/u,(i*r-t*o)/u,0,(i*c-s*a)/u,(s*n-t*c)/u,(t*a-i*n)/u,0,0,0,0,1],p=ln(f,[e[12],e[13],e[14]]);return f[12]=-p[0],f[13]=-p[1],f[14]=-p[2],f.every(Number.isFinite)?f:null}function sn(e){let[t,n,r,,i,a,o,,s,c,l]=e;return t*(a*l-c*o)-i*(n*l-c*r)+s*(n*o-a*r)}function cn(e,[t,n,r]){return[e[0]*t+e[4]*n+e[8]*r+e[12],e[1]*t+e[5]*n+e[9]*r+e[13],e[2]*t+e[6]*n+e[10]*r+e[14]]}function ln(e,[t,n,r]){return[e[0]*t+e[4]*n+e[8]*r,e[1]*t+e[5]*n+e[9]*r,e[2]*t+e[6]*n+e[10]*r]}var un=class extends Error{code;nodeId;constructor(e,t){super(`Scene graph ${e}: ${t}`),this.code=e,this.nodeId=t,this.name=`SceneGraphError`}};function dn(e){let t=new Map,n=[],r=new Map,i=new Map;for(let n of e){if(typeof n.id!=`string`||!n.id)throw new un(`invalid-id`,n.id);if(t.has(n.id))throw new un(`duplicate-id`,n.id);t.set(n.id,n),i.set(n.id,rn(n.transform))}for(let i of e)if(i.parentId===null)n.push(i.id);else{if(!t.has(i.parentId))throw new un(`missing-parent`,i.id);let e=r.get(i.parentId)??[];e.push(i.id),r.set(i.parentId,e)}let a=[...n],o=new Map;for(let e=0;e<a.length;e+=1){let n=a[e],s=t.get(n),c=i.get(n),l=s.parentId===null?null:o.get(s.parentId);o.set(n,l?an(l,c):c);for(let e of r.get(n)??[])a.push(e)}if(a.length!==e.length)throw new un(`cycle`,e.find(e=>!o.has(e.id))?.id??``);return{nodes:t,roots:n,children:r,order:a,worldMatrices:o}}_();function fn(e,t=`animation`,n={tracks:0,keys:0}){let r=s(e,t,[`id`,`name`,`duration`,`fps`,`loop`,`space`,`tracks`]),i=d(r.duration,`${t}.duration`,Number.MIN_VALUE,L.animationSeconds),a=c(r.tracks,`${t}.tracks`,L.animationTracks-n.tracks);n.tracks+=a.length;let h=new Set;return{id:u(r.id,`${t}.id`),name:l(r.name,`${t}.name`),duration:i,fps:d(r.fps,`${t}.fps`,1,120,!0),loop:f(r.loop,`${t}.loop`),space:m(r.space,[`local-delta`,`local`],`${t}.space`),tracks:a.map((e,r)=>{let a=`${t}.tracks[${r}]`,l=s(e,a,[`nodeId`,`channel`,`keys`]),f=u(l.nodeId,`${a}.nodeId`),g=m(l.channel,[`translation`,`rotation`,`scale`],`${a}.channel`),_=JSON.stringify([f,g]);o(!h.has(_),a,`Essa peça já tem uma trilha desse movimento.`),h.add(_);let v=c(l.keys,`${a}.keys`,L.animationKeys-n.keys);n.keys+=v.length,o(v.length>0,`${a}.keys`,`A trilha precisa de pelo menos uma chave.`);let y=-1,b=(e,t,n)=>{let r=`${a}.keys[${t}]`,c=s(e,r,[`time`,`value`,`interpolation`]),l=d(c.time,`${r}.time`,0,i);o(l>y,`${r}.time`,`As chaves precisam estar em ordem, sem tempos repetidos.`),y=l;let u=p(c.value,n,`${r}.value`);return n===4&&o(Math.abs(Math.hypot(...u)-1)<=1e-6,`${r}.value`,`Rotação inválida.`),{time:l,value:u,interpolation:m(c.interpolation,[`step`,`linear`,`smooth`],`${r}.interpolation`)}};return g===`rotation`?{nodeId:f,channel:g,keys:v.map((e,t)=>b(e,t,4))}:{nodeId:f,channel:g,keys:v.map((e,t)=>b(e,t,3))}})}}function pn(e){let t={tracks:0,keys:0},n=c(e,`animations`,L.animationClips).map((e,n)=>fn(e,`animations[${n}]`,t));return h(n,`animations`),n}_();function mn(e){let t=Math.hypot(...e);return e.map(e=>e/t)}function hn(e,t,n){let r=mn(e),i=mn(t),a=r.reduce((e,t,n)=>e+t*i[n],0),o=a<0?-1:1;a=Math.min(1,Math.abs(a));let s=Math.acos(a),c=Math.sin(s),l=1-a*a<=2**-52,u=l?1-n:Math.sin((1-n)*s)/c,d=l?n:Math.sin(n*s)/c;return mn(r.map((e,t)=>u*e+d*o*i[t]))}function gn(e,t){d(t,`time`);let n=0,r=e.keys.length;for(;n<r;){let i=n+r>>>1;e.keys[i].time<=t?n=i+1:r=i}let i=Math.max(0,n-1),a=e.keys[i];o(a,`track`,`A trilha precisa de pelo menos uma chave.`);let s=e.keys[i+1];if(!s||t<=a.time||a.interpolation===`step`)return e.channel===`rotation`?mn(a.value):[...a.value];let c=(t-a.time)/(s.time-a.time);return a.interpolation===`smooth`&&(c=c*c*(3-2*c)),e.channel===`rotation`?hn(a.value,s.value,c):a.value.map((e,t)=>e===s.value[t]?e:(1-c)*e+c*s.value[t])}_();let _n=Math.PI/1800;function vn(e,t){o(e.keys+t<=262144,`export.animation.keys`,`A conversão geraria chaves demais no GLB. Simplifique os movimentos antes de exportar.`),e.keys+=t}function yn(e,t){let n=Math.hypot(...e)*Math.hypot(...t);return 2*Math.acos(Math.min(1,Math.abs(e.reduce((e,n,r)=>e+n*t[r],0)/n)))}function bn(e){let t=new DataView(new ArrayBuffer(4));return t.setFloat32(0,e,!0),t.setUint32(0,t.getUint32(0,!0)-1,!0),t.getFloat32(0,!0)}function xn(e,t){if(e.channel!==`rotation`)return t.value;let n=Math.hypot(...t.value);return t.value.map(e=>e/n)}function Sn(e,t,n){let r=Math.fround(t);o(Number.isFinite(r)&&r>0,`export.animation.duration`,`A duração do movimento não cabe na precisão do GLB.`);let i=-1;for(let t of e.keys){let e=Math.fround(t.time);o(Number.isFinite(e)&&e>i&&e>=0&&e<=r,`export.animation.time`,`Duas chaves ficariam no mesmo instante, ou fora do movimento, na precisão do GLB.`),i=e}let a=new Set(e.keys.slice(0,-1).map(e=>e.interpolation)),s=!a.size||a.size===1&&a.has(`step`),c=!s&&(a.has(`step`)||e.channel===`rotation`&&a.has(`smooth`)),l=s?`STEP`:c||!a.has(`smooth`)?`LINEAR`:`CUBICSPLINE`,u=[],d=(e,t,r)=>{vn(n,1),o(!u.length||e>u[u.length-1].time,`export.animation.time`,`As amostras do movimento não cabem em instantes distintos no GLB.`),u.push({time:e,value:t,curve:r})},f=e.keys[0];Math.fround(f.time)>0&&d(0,xn(e,f),`step`);for(let[t,n]of e.keys.entries()){let r=e.keys[t+1],i=Math.fround(n.time);if(d(i,xn(e,n),n.interpolation),!c||!r)continue;let a=Math.fround(r.time);if(n.interpolation===`step`){let t=bn(a);o(t>i,`export.animation.step`,`Há uma pausa curta demais para combinar essas curvas no GLB sem perder uma chave.`),d(t,xn(e,n),`linear`)}else if(n.interpolation===`smooth`){let t=e.channel===`rotation`?yn(n.value,r.value):1,i=e.channel===`rotation`?_n:.0009765625,s=Math.max(1,Math.ceil(Math.sqrt(.75*t/i)));for(let t=1;t<s;t++){let i=n.time+(r.time-n.time)*(t/s),c=Math.fround(i);o(c<a,`export.animation.time`,`As amostras do movimento não cabem em instantes distintos no GLB.`),d(c,gn(e,i),`linear`)}}}let p=u[u.length-1];p.time<r&&(p.curve=`step`,d(r,p.value,`step`));let m=e.channel===`rotation`?4:3,h=l===`CUBICSPLINE`,g=new Float32Array(u.length*m*(h?3:1));for(let[e,t]of u.entries()){let n=e*m*(h?3:1);if(g.set(t.value,n+(h?m:0)),!h)continue;let r=u[e-1],i=u[e+1];for(let e=0;e<m;e++)r?.curve===`linear`&&(g[n+e]=(t.value[e]-r.value[e])/(t.time-r.time)),i&&t.curve===`linear`&&(g[n+2*m+e]=(i.value[e]-t.value[e])/(i.time-t.time))}return o(g.every(Number.isFinite),`export.animation.value`,`Os valores ou curvas do movimento não cabem na precisão do GLB.`),{times:Float32Array.from(u.map(e=>e.time)),output:g,interpolation:l,resampled:c,components:m,samples:u.length}}_();function Cn(e,t,n){if(!n.has(e))return e;for(let r=2;;r++){let i=` (${r})`,a=e.slice(0,128-i.length).replace(/[\uD800-\uDBFF]$/,``)+i;if(!t.has(a)&&!n.has(a))return a}}function wn(e,t,n){let r=[],i=new Set(Array.from(e.index.animations.values(),e=>e.name)),a=new Set,s={keys:0,channels:0};for(let c of e.index.animations.values()){let l={name:c.name,channels:[],samplers:[],extras:{molda:{sourceId:c.id,duration:c.duration,fps:c.fps,loop:c.loop,space:c.space}}};for(let r of c.tracks){let i=e.targets.get(r.nodeId);if(!i?.length)continue;o(s.channels+i.length<=65536,`export.animation.channels`,`Os grupos e espelhos gerariam canais demais nos movimentos do GLB.`),s.channels+=i.length;let a=Sn(r,c.duration,s);a.resampled&&n.push({code:`animation-resampled`,sourceId:c.id,nodeId:r.nodeId,channel:r.channel,samples:a.samples});let u=l.samplers.length;l.samplers.push({input:t.floats(a.times,`SCALAR`,!0),output:t.floats(a.output,r.channel===`rotation`?`VEC4`:`VEC3`),interpolation:a.interpolation});for(let e of i){let t=c.space===`local`?e.local:e.delta;o(t!==null,`export.animation.target`,`Alvo de movimento ausente no GLB.`),l.channels.push({sampler:u,target:{node:t,path:r.channel}})}}if(l.channels.length){let e=Cn(c.name,i,a);a.add(e),e!==c.name&&(l.name=e,l.extras.molda.originalName=c.name,n.push({code:`clip-renamed`,sourceId:c.id,originalName:c.name,name:e})),r.push(l)}else n.push({code:`clip-omitted`,sourceId:c.id,reason:c.tracks.length?`hidden`:`empty`})}return{animations:r,keys:s.keys,channels:s.channels}}_();function Tn(e,t,n,r=Ce(e)){for(let t of r.issues)n.push({code:`face-omitted`,sourceId:e.id,faceId:t.faceId,reason:t.code});if(e.kind===`mesh`){let t=new Set(Object.values(e.faces).flatMap(e=>e.corners.map(e=>e.vertexId))),r=Object.keys(e.vertices).filter(e=>!t.has(e)).length;(r||e.looseEdges.length)&&n.push({code:`loose-geometry`,sourceId:e.id,edges:e.looseEdges.length,vertices:r})}if(!r.faceIds.length)return null;o(r.positions.length/3<65535,`export.geometry`,`A malha ultrapassa o orçamento de índices do GLB.`);let i={POSITION:t.floats(r.positions,`VEC3`,!0,34962),NORMAL:t.floats(r.normals,`VEC3`,!1,34962),TEXCOORD_0:t.floats(r.uvs.map((e,t)=>t%2==0?e:1-e),`VEC2`,!1,34962)},a=new Map;for(let[e,t]of r.materialIds.entries()){let n=a.get(t)??[];n.push(e*3,e*3+1,e*3+2),a.set(t,n)}return{built:r,triangles:r.faceIds.length,groups:[...a].map(([e,n])=>({materialId:e,indices:t.indices(Uint16Array.from(n)),attributes:i}))}}_();function En(e,t=`bendLimit`){let n=s(e,t,[`min`,`max`]),r=d(n.min,`${t}.min`,0,180),i=d(n.max,`${t}.max`,0,180);return o(r<=i,t,`A menor dobra não pode ultrapassar a maior dobra.`),{min:r,max:i}}let Dn=Object.values({color:`colorImageId`,normal:`normalImageId`,roughness:`roughnessImageId`,metalness:`metalnessImageId`}),On={bindings:L.renderedParts,joints:256,influences:4,weightedVertices:L.vertices},kn=1e-8;_();function An(e,t,n){let r=h(e,`skins`),i=new Map,a=new Set;o(r.size<=On.bindings,`skins`,`Há vínculos demais nesta criação.`);let s=0;for(let e of r.values()){let r=`skins.${e.id}`,c=t.nodes.get(e.nodeId),l=c?.kind===`mesh`?n.get(c.geometryId):void 0;o(l?.kind===`mesh`,r,`O vínculo precisa de uma malha com pontos editáveis.`),o(!i.has(e.nodeId),r,`Esta peça já tem um vínculo de esqueleto.`),o(on(t.worldMatrices.get(e.nodeId)),r,`A pose da peça vinculada não pode ser invertida com segurança.`),i.set(e.nodeId,e);let u=new Set;o(e.joints.length>0&&e.joints.length<=On.joints,r,`Ossos fora do orçamento.`);for(let n of e.joints){let e=t.nodes.get(n.nodeId);o(e&&e.kind!==`mesh`,r,`Osso ausente ou de tipo incompatível. Desvincule a peça antes de remover seu osso.`),o(!u.has(n.nodeId),r,`Osso repetido no vínculo.`),u.add(n.nodeId),a.add(n.nodeId)}let d=Object.keys(e.weights);s+=d.length,o(s<=On.weightedVertices,r,`Os pontos vinculados ultrapassam o orçamento da criação.`);let f=Object.keys(l.vertices);o(d.length>0&&d.length===f.length,r,`Cada ponto da malha precisa de pesos. Desvincule a peça antes de mudar sua topologia.`);let p=d.every((e,t)=>e===f[t]),m=Object.values(e.weights);for(let e=0;e<d.length;e++){let t=d[e];o(p||Object.hasOwn(l.vertices,t),r,`Os pesos apontam para um ponto ausente.`);let n=m[e];o(n.length>0&&n.length<=On.influences,r,`Influências fora do orçamento.`);for(let e of n)o(u.has(e.jointId),r,`Os pesos apontam para um osso fora do vínculo.`)}}return{skins:r,skinsByNode:i,skinJointNodes:a,skinVertexCount:s}}_();function jn(e){let t=dn(e.nodes),n=en(e,t),r=h(e.geometries,`geometries`),i=h(e.materials,`materials`),a=h(e.images,`images`),s=h(e.mirrors,`mirrors`),c=An(e.skins??[],t,r),l=new Map,u=0,d=0;for(let e of r.values())if(e.kind===`mesh`){u+=Object.keys(e.vertices).length,d+=e.looseEdges.length;let t=0;for(let[n,r]of Object.entries(e.faces)){t+=r.corners.length-2;for(let t of r.corners)o(Object.hasOwn(e.vertices,t.vertexId),`geometries.${e.id}.${n}`,`Vértice ausente.`);r.materialId!==void 0&&o(i.has(r.materialId),`geometries.${e.id}.${n}`,`Material ausente.`)}for(let t of e.looseEdges)o(t[0]!==t[1]&&t.every(t=>Object.hasOwn(e.vertices,t)),`geometries.${e.id}.looseEdges`,`Aresta inválida.`);l.set(e.id,t)}else{e.kind===`path`&&(u+=e.points.length),l.set(e.id,_e(e));for(let t of Object.values(e.surfaces))t.materialId!==void 0&&o(i.has(t.materialId),`geometries.${e.id}`,`Material ausente.`)}o([...l.values()].reduce((e,t)=>e+t,0)<=L.triangles,`geometries`,`A geometria guardada ultrapassa o tamanho permitido para uma criação.`),o(u<=L.vertices&&d<=L.looseEdges,`geometries`,`Geometria fora do orçamento.`);for(let e of i.values())for(let t of Dn){let n=e[t];if(n===void 0)continue;let r=a.get(n);o(r,`materials.${e.id}.${t}`,`Imagem ausente.`),o(t===`colorImageId`||r.encoding===`rgba`,`materials.${e.id}.${t}`,`Mapas de detalhes precisam de cores livres, sem vínculo com a paleta.`)}let f=0,p=0;for(let e of t.nodes.values())e.kind!==`mesh`&&e.bendLimit!==void 0&&En(e.bendLimit,`nodes.${e.id}.bendLimit`),e.kind===`mesh`&&(o(r.has(e.geometryId)&&i.has(e.materialId),`nodes.${e.id}`,`Geometria ou material ausente.`),f+=1,p+=l.get(e.geometryId)??0);for(let e of s.values()){let n=t.nodes.get(e.sourceId);o(!t.nodes.has(e.id)&&n?.kind===`mesh`,`mirrors.${e.id}`,`Espelho sem origem válida ou com identidade repetida.`),f+=1,p+=l.get(n.geometryId)??0}return o(f<=L.renderedParts&&p<=L.triangles,`nodes`,`Modelo fora do orçamento de desenho.`),{...n,...c,scene:t,geometries:r,materials:i,images:a,mirrors:s,vertexCount:u,triangleCount:p,renderedParts:f}}function Mn(e){let t=sn(e);return t<0?-1:+(t>0)}function Nn(e){let t=new Map;for(let n of e.order){let r=e.nodes.get(n);if(!r)throw Error(`Índice de cena incompleto.`);let i=r.parentId===null?void 0:t.get(r.parentId);t.set(n,{hidden:r.hidden||i?.hidden===!0,locked:r.locked||i?.locked===!0})}return t}function Pn(e,t=e.scene.worldMatrices){let n=Nn(e.scene),r=new Map;for(let i of e.scene.order){let a=e.scene.nodes.get(i),o=t.get(i);if(!a||!o)throw Error(`Índice de cena incompleto.`);let s=n.get(i);if(!s)throw Error(`Flags ausentes no índice.`);a.kind===`mesh`&&r.set(i,{id:i,name:a.name,sourceNodeId:i,geometryId:a.geometryId,materialId:a.materialId,worldMatrix:o,...s,orientation:Mn(o)})}for(let t of e.mirrors.values()){let e=r.get(t.sourceId);if(!e)throw Error(`O espelho não tem uma peça de origem válida.`);let n=t.axis===`x`?0:t.axis===`y`?1:2,i=tn();i[n*5]=-1,i[12+n]=2*t.offset;let a=an(i,e.worldMatrix);r.set(t.id,{...e,id:t.id,name:t.name,worldMatrix:a,orientation:Mn(a)})}return[...r.values()]}function Fn(e,t,n){let[r,i,a]=e,[o,s,c]=t,[l,u,d]=n,f=r+s+d,p;if(f>0){let e=2*Math.sqrt(f+1);p=[(c-u)/e,(l-a)/e,(i-o)/e,e/4]}else if(r>s&&r>d){let e=2*Math.sqrt(1+r-s-d);p=[e/4,(o+i)/e,(l+a)/e,(c-u)/e]}else if(s>d){let e=2*Math.sqrt(1+s-r-d);p=[(o+i)/e,e/4,(u+c)/e,(l-a)/e]}else{let e=2*Math.sqrt(1+d-r-s);p=[(l+a)/e,(u+c)/e,e/4,(i-o)/e]}let m=Math.hypot(...p);if(!Number.isFinite(m)||m===0)throw RangeError(`Base de rotação inválida.`);return p.map(e=>e/m)}_();let In=1e-12,Ln=`Esses eixos não puderam ser convertidos para GLB com precisão. O projeto original continua intacto.`,Rn=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],zn=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]];function Bn(e){let t=Math.hypot(...e);return o(t>0&&Number.isFinite(t),`transform`,Ln),e.map(e=>e/t)}function Vn(e,t,n,r,i){let a=e[t],o=e[n];e[t]=a.map((e,t)=>r*e-i*o[t]),e[n]=a.map((e,t)=>i*e+r*o[t])}function Hn(e){rn({kind:`affine`,matrix:e});let t=[0,1,2].map(t=>[e[t*4],e[t*4+1],e[t*4+2]]),n=[[1,0,0],[0,1,0],[0,0,1]];for(let e=0;e<32;e++){let e=!1;for(let[r,i]of[[0,1],[0,2],[1,2]]){let a=t[r],s=t[i],c=Math.hypot(...a),l=Math.hypot(...s);if(o(Number.isFinite(c)&&Number.isFinite(l),`transform`,Ln),c===0||l===0)continue;let u=Rn(Bn(a),Bn(s));if(Math.abs(u)<=8*2**-52)continue;let d=Math.max(c,l),f=c/d,p=l/d,m=u*f*p,h=p*p-f*f,g=h+(h<0?-1:1)*Math.hypot(h,2*m);if(m===0||g===0)continue;let _=2*m/g,v=1/Math.hypot(1,_),y=v*_;Vn(t,r,i,v,y),Vn(n,r,i,v,y),e=!0}if(!e)break}let r=t.map(e=>Math.hypot(...e)),i=Math.max(...r),a=t.map((e,t)=>r[t]===0?[0,0,0]:Bn(e));for(let e=0;e<3;e++)for(let t=e+1;t<3;t++){if(Math.abs(Rn(a[e],a[t]))<=In)continue;let n=r[e]<=r[t]?e:t;o(r[n]<=i*64*2**-52,`transform`,Ln),r[n]=0,a[n]=[0,0,0]}let s=[0,1,2].filter(e=>r[e]!==0);if(s.length===0)a.splice(0,3,[1,0,0],[0,1,0],[0,0,1]);else if(s.length===1){let e=s[0],t=a[e],n=[[1,0,0],[0,1,0],[0,0,1]].reduce((e,n)=>Math.abs(Rn(n,t))<Math.abs(Rn(e,t))?n:e),r=Rn(n,t);a[(e+1)%3]=Bn(n.map((e,n)=>e-r*t[n])),a[(e+2)%3]=Bn(zn(t,a[(e+1)%3]))}else if(s.length===2){let e=[0,1,2].find(e=>r[e]===0);a[e]=Bn(zn(a[(e+1)%3],a[(e+2)%3]))}Rn(a[0],zn(a[1],a[2]))<0&&(r[0]=-r[0],a[0]=a[0].map(e=>-e));let c={kind:`trs`,translation:[e[12],e[13],e[14]],rotation:Fn(a[0],a[1],a[2]),scale:r},l=[0,1,2].map(e=>[n[0][e],n[1][e],n[2][e]]),u={kind:`trs`,translation:[0,0,0],rotation:Fn(l[0],l[1],l[2]),scale:[1,1,1]},d=an(rn(c),rn(u));for(let t=0;t<3;t++){let n=Math.hypot(e[t*4],e[t*4+1],e[t*4+2]);for(let r=0;r<3;r++){let i=Math.abs(d[t*4+r]-e[t*4+r]);o(n===0?i===0:i/n<=In,`transform`,Ln)}}return[c,u]}_();function Un(e){let t=jn(e),n=Nn(t.scene),r=[...t.skins.values()].filter(e=>!n.get(e.nodeId).hidden),i=new Set;for(let e of r)for(let n of e.joints){let e=n.nodeId;for(;e!==null&&!i.has(e);)i.add(e),e=t.scene.nodes.get(e).parentId}let a=t.scene.order.filter(e=>n.get(e).hidden),s=a.filter(e=>!i.has(e)),c=a.filter(e=>i.has(e)),l=new Set((e.animations??[]).filter(e=>e.space===`local-delta`).flatMap(e=>e.tracks.map(e=>e.nodeId))),u=[],d=new Map,f=[],p=0;function m(e){p+=e,o(p<=16384,`export.nodes`,`Os grupos e espelhos gerariam nós demais no GLB. Reduza a quantidade de espelhos ou a profundidade dos grupos.`)}function h(e){let n=`sourceId`in e?t.scene.nodes.get(e.sourceId):null;return m(n?(n.transform.kind===`affine`?2:1)+ +!!l.has(n.id):1),u.push(e),u.length-1}let g=r.length?h({skinRoot:!0}):null;for(let e of t.scene.order){if(n.get(e).hidden&&!i.has(e))continue;let r=t.scene.nodes.get(e);d.set(e,h({sourceId:e,parent:r.parentId===null?g:d.get(r.parentId),mesh:r.kind===`mesh`&&!n.get(e).hidden&&!t.skinsByNode.has(e)}))}for(let e of r)m(1),f.push({binding:e,parent:d.get(e.nodeId),joints:e.joints.map(e=>d.get(e.nodeId)),skeleton:g});let _=new Map;for(let e of t.mirrors.values()){if(n.get(e.sourceId).hidden)continue;let r=JSON.stringify([e.axis,e.offset]),i=_.get(r);i||(i={root:h({reflection:e}),ancestors:new Map},_.set(r,i));let a=i;function v(e){let n=[],r=e;for(;r!==null&&!a.ancestors.has(r);)n.push(r),r=t.scene.nodes.get(r).parentId;let i=r===null?a.root:a.ancestors.get(r);for(let e of n.reverse())i=h({sourceId:e,parent:i,mesh:!1}),a.ancestors.set(e,i);return i}let o=t.skinsByNode.get(e.sourceId);if(o){let t=o.joints.map(e=>v(e.nodeId)),n=v(o.nodeId);m(1),f.push({binding:o,parent:n,joints:t,skeleton:a.root,mirrorId:e.id})}else{let n=v(t.scene.nodes.get(e.sourceId).parentId);h({sourceId:e.sourceId,parent:n,mesh:!0,mirrorId:e.id})}}let y=[],b=[],x=[],S=new Map,C=new Map,w=new Map;function T(e,t){let n=y.length;if(y.push(e),t===null)b.push(n);else{let e=y[t].children??[];e.push(n),y[t].children=e}return n}for(let n of u){if(`skinRoot`in n){x.push(T({name:`Esqueletos`,translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1],extras:{molda:{sourceId:e.id,role:`skin-root`}}},null));continue}if(`reflection`in n){let e=n.reflection,t=e.axis===`x`?0:e.axis===`y`?1:2,r=[0,0,0],i=[1,1,1];r[t]=2*e.offset,i[t]=-1,o(Number.isFinite(r[t]),`export.mirror`,`A posição do espelho excede a precisão do GLB.`),x.push(T({name:`Espelho`,translation:r,rotation:[0,0,0,1],scale:i,extras:{molda:{sourceId:e.id,role:`reflection`}}},null));continue}let r=t.scene.nodes.get(n.sourceId),i=w.get(r.id);i||(i=r.transform.kind===`trs`?[r.transform]:Hn(r.transform.matrix),w.set(r.id,i));let a=n.parent===null?null:x[n.parent],s=r.transform.kind===`trs`?y.length:null,c=l.has(r.id),u={sourceId:r.id,...n.mirrorId?{mirrorId:n.mirrorId}:{}};for(let[e,t]of i.entries())a=T({name:`${r.name} [base ${e+1}]`,translation:[...t.translation],rotation:[...t.rotation],scale:[...t.scale],extras:{molda:{...u,role:e===0?`base`:`factor`}}},a);let f=c?T({name:`${r.name} [pose]`,translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1],extras:{molda:{...u,role:`base`}}},a):null,p=f??a,m=!(`mirrorId`in n)&&d.get(r.id)===x.length;y[p].name=n.mirrorId?t.mirrors.get(n.mirrorId).name:r.name,y[p].extras.molda.role=m||n.mesh?`node`:`mirror-ancestor`,x.push(p);let h=S.get(r.id)??[];if(h.push({local:s,delta:f,leaf:p}),S.set(r.id,h),n.mesh){let e=C.get(r.id)??[];e.push(p),C.set(r.id,e)}}let E=new Map;for(let e of f){let n=e.binding.nodeId,r=t.scene.nodes.get(n),i=T({name:e.mirrorId?t.mirrors.get(e.mirrorId).name:r.name,translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1],extras:{molda:{sourceId:n,role:`skin-draw`,...e.mirrorId?{mirrorId:e.mirrorId}:{}}}},x[e.parent]),a=C.get(n)??[];a.push(i),C.set(n,a),E.set(i,{...e,parent:x[e.parent],joints:e.joints.map(e=>x[e]),skeleton:x[e.skeleton]})}return{source:e,index:t,nodes:y,roots:b,targets:S,meshes:C,skins:E,excluded:s,retained:c}}var Wn=class extends Error{issues;constructor(e){super(`Este GLB precisa converter ou deixar itens de fora. Confira as mudanças antes de baixar.`),this.issues=e,this.name=`SceneGlbLossError`}};_();function Gn(e,t,n){let r=n.positions.length/3;o(Number.isSafeInteger(r)&&r===n.cornerIndices.length&&r===n.faceIds.length*3,`skin`,`O desenho não corresponde aos cantos da malha.`);let i=new Uint16Array(r*4),a=new Float32Array(r*4),s=new Map(e.vertexIds.map((e,t)=>[e,t])),c=Array.from({length:e.joints.length},()=>null),l=0;for(let u=0;u<r;u++){let r=t.faces[n.faceIds[Math.floor(u/3)]]?.corners[n.cornerIndices[u]]?.vertexId,d=r===void 0?void 0:s.get(r);o(d!==void 0,`skin`,`O desenho aponta para um ponto fora do vínculo.`);let f=[n.positions[u*3],n.positions[u*3+1],n.positions[u*3+2]];o(f.every((t,n)=>Number.isFinite(t)&&t===Math.fround(e.positions[d*3+n])),`skin`,`Os pontos do vínculo pertencem a outro desenho.`);let p=0;for(let t=0;t<4;t++){let n=d*4+t,r=u*4+t,s=Math.fround(e.weights[n]),l=e.jointIndices[n];if(o(Number.isFinite(s)&&(s>0||e.weights[n]===0),`skin`,`Um peso não cabe na precisão de desenho sem perder seu osso.`),a[r]=s,i[r]=l,p+=s,s===0)continue;let m=c[l];if(m)for(let e=0;e<3;e++)m.min[e]=Math.min(m.min[e],f[e]),m.max[e]=Math.max(m.max[e],f[e]);else c[l]={min:[...f],max:[...f]}}l=Math.max(l,Math.abs(p-1))}return{indices:i,weights:a,clusters:c,maximumWeightError:l}}_();function Kn(e,t){let n=c(e,t,On.influences);o(n.length>0,t,`Escolha pelo menos um osso para este ponto.`);let r=new Set;return n.map((e,n)=>{let i=`${t}[${n}]`,a=s(e,i,[`jointId`,`weight`]),c=u(a.jointId,`${i}.jointId`);return o(!r.has(c),i,`O mesmo osso aparece duas vezes neste ponto.`),r.add(c),{jointId:c,weight:d(a.weight,`${i}.weight`,0)}})}_();function qn(e,t){let n=Kn(e,t),r=0;for(let e of n)o(e.weight<=1,t,`Normalizar os pesos deve ser uma escolha explícita.`),r+=e.weight;return o(Math.abs(r-1)<=kn,t,`Os pesos deste ponto precisam somar um.`),n}function Jn(e){let t=c(e,`skins`,On.bindings),n=0,r=t.map((e,t)=>{let r=`skins[${t}]`,i=s(e,r,[`id`,`name`,`nodeId`,`joints`,`weights`]),a=s(i.weights,`${r}.weights`),d=Object.keys(a);n+=d.length,o(n<=On.weightedVertices,r,`Os pontos vinculados ultrapassam o orçamento da criação.`),o(d.length>0,r,`Cada ponto da malha precisa de pesos.`);let f=c(i.joints,`${r}.joints`,On.joints),m=new Set;o(f.length>0,r,`Escolha pelo menos um osso.`);let h=f.map((e,t)=>{let n=`${r}.joints[${t}]`,i=s(e,n,[`nodeId`,`inverseBindMatrix`]),a=u(i.nodeId,`${n}.nodeId`),c=p(i.inverseBindMatrix,16,`${n}.inverseBindMatrix`);return o(!m.has(a),n,`Osso repetido no vínculo.`),m.add(a),rn({kind:`affine`,matrix:c}),o(on(c),n,`A pose de vínculo não pode ser invertida com segurança.`),{nodeId:a,inverseBindMatrix:c}}),g=Object.fromEntries(d.map(e=>[u(e,`${r}.weights`),qn(a[e],`${r}.weights.${e}`)]));return{id:u(i.id,`${r}.id`),name:l(i.name,`${r}.name`),nodeId:u(i.nodeId,`${r}.nodeId`),joints:h,weights:g}});return h(r,`skins`),r}function Yn(e,t){let n=Object.keys(t.vertices),r=new Float64Array(n.length*3),i=new Uint16Array(n.length*4),a=new Float64Array(n.length*4),o=new Map(e.joints.map((e,t)=>[e.nodeId,t]));for(let[s,c]of n.entries()){r.set(t.vertices[c],s*3);for(let[t,n]of e.weights[c].entries())i[s*4+t]=o.get(n.jointId),a[s*4+t]=n.weight}return{nodeId:e.nodeId,joints:e.joints.map(e=>({...e,inverseBindMatrix:[...e.inverseBindMatrix]})),vertexIds:n,positions:r,jointIndices:i,weights:a}}_();function Xn(e,t,n,r,i){let a=Yn(e,t),s=Gn(a,t,n),c=new Float32Array(e.joints.length*16),l=!1,u=!1;for(let e=0;e<a.weights.length;e+=4){let t=0;for(let n=e;n<e+4;n++){let e=a.weights[n];o(Number.isFinite(e)&&e>=0&&e<=1,`export.skin`,`O vínculo contém um peso inválido.`),t+=e,l||=e!==Math.fround(e)}o(Math.abs(t-1)<=kn,`export.skin`,`Os pesos de um ponto não somam 100%.`)}for(let[t,n]of e.joints.entries()){let e=rn({kind:`affine`,matrix:n.inverseBindMatrix});for(let t=0;t<16;t++){let n=Math.fround(e[t]);l||=n!==e[t],e[t]=n}o(e.every(Number.isFinite)&&on(e),`export.skin`,`A pose guardada de um osso não cabe na precisão do GLB. O vínculo original foi preservado.`),c.set(e,t*16)}for(let e=0;e<s.weights.length;e++)s.weights[e]===0&&s.indices[e]!==0&&(u=!0,s.indices[e]=0);return l&&i.push({code:`skin-precision`,sourceId:e.id}),u&&i.push({code:`skin-zero-slots`,sourceId:e.id}),i.push({code:`skin-render-space`,sourceId:e.id}),{inverseBindMatrices:r.floats(c,`MAT4`),attributes:{JOINTS_0:r.joints(s.indices),WEIGHTS_0:r.floats(s.weights,`VEC4`,!1,34962)}}}_(),w(),b();function Zn(e,t={}){let n=Un(e),r=n.excluded.map(e=>({code:`hidden-node`,sourceId:e}));for(let e of n.retained)r.push({code:`skin-dependency`,sourceId:e});for(let t of e.nodes)t.kind!==`mesh`&&t.bendLimit!==void 0&&r.push({code:`bend-limit-omitted`,sourceId:t.id});let i=new C,a=new $t(n,i,r,t.animatedPaint===!0),s=new Map;if(t.animatedPaint&&e.images.some(e=>e.flipbook))for(let[e]of n.meshes){let t=n.index.scene.nodes.get(e);if(t.kind!==`mesh`)continue;let r=s.get(t.geometryId);r||(r=Ce(n.index.geometries.get(t.geometryId)),s.set(t.geometryId,r));for(let e=0;e<r.materialIds.length;e++)for(let n=0;n<6;n++){let i=r.uvs[e*6+n];if(i<0||i>1){a.omitAnimatedPaint(r.materialIds[e]??t.materialId);break}}}let c=new Map,l=[],u=[],d=new Map,f=new Map,p=0,m=0,h=0;for(let[e,t]of n.meshes){let g=n.index.scene.nodes.get(e);if(g.kind!==`mesh`)throw Error(`Nó de malha esperado.`);c.has(g.geometryId)||c.set(g.geometryId,Tn(n.index.geometries.get(g.geometryId),i,r,s.get(g.geometryId)));let _=c.get(g.geometryId);if(!_)continue;let v=n.index.skinsByNode.get(e),y=n.index.geometries.get(g.geometryId),b=null;v&&(o(y.kind===`mesh`,`export.skin`,`Malha de esqueleto inválida.`),b=Xn(v,y,_.built,i,r));let x=JSON.stringify([g.geometryId,_.groups.map(e=>e.materialId??g.materialId),...v?[v.id]:[]]),S=f.get(x);S===void 0&&(S=l.length,f.set(x,S),l.push({name:g.name,primitives:_.groups.map(e=>({attributes:b?{...e.attributes,...b.attributes}:e.attributes,indices:e.indices,material:a.get(e.materialId??g.materialId),mode:4}))}));for(let e of t){n.nodes[e].mesh=S;let t=n.skins.get(e);if(t&&b){let r=JSON.stringify([t.binding.id,t.joints]),i=d.get(r);i===void 0&&(i=u.length,d.set(r,i),u.push({name:t.binding.name,joints:t.joints,skeleton:t.skeleton,inverseBindMatrices:b.inverseBindMatrices,extras:{molda:{sourceId:t.binding.id}}})),n.nodes[e].skin=i}}p+=_.triangles*t.length,m+=_.groups.length*t.length,h+=t.length}let g=wn(n,i,r);if(r.length&&!t.allowLosses)throw new Wn(r);let _=y({asset:{version:`2.0`,generator:`Molda`},...a.textureTransform?{extensionsUsed:[`KHR_texture_transform`],extensionsRequired:[`KHR_texture_transform`]}:{},scene:0,scenes:[{name:e.name,...n.roots.length?{nodes:n.roots}:{}}],...n.nodes.length?{nodes:n.nodes}:{},...l.length?{meshes:l}:{},...u.length?{skins:u}:{},...g.animations.length?{animations:g.animations}:{},...a.materials.length?{materials:a.materials}:{},...a.images.length?{images:a.images,textures:a.textures,samplers:a.samplers}:{},...i.byteLength?{accessors:i.accessors,bufferViews:i.views,buffers:[{byteLength:i.byteLength}]}:{},extras:{molda:{sourceId:e.id,formatVersion:e.formatVersion}}},i.segments,x),v=new Set;for(let e of u)for(let t of e.joints)v.add(t);return{bytes:_,issues:r,clips:g.animations.map(({name:e,extras:{molda:t}})=>({id:t.sourceId,name:e,duration:t.duration,fps:t.fps,loop:t.loop})),stats:{nodes:n.nodes.length,bones:v.size,meshes:l.length,materials:a.materials.length,textures:a.textures.length,pixelBytes:a.pixelBytes,triangles:p,drawCalls:m,renderedParts:h,animatedPaints:a.animatedPaints,clips:g.animations.length,animationKeys:g.keys,animationChannels:g.channels}}}
/**
* @license
* Copyright 2010-2026 Three.js Authors
* SPDX-License-Identifier: MIT
*/
function Qn(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function $n(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function er(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function H(...e){e=er(e);let t=`THREE.`+e.shift();if(Pr)Pr(`warn`,t,...e);else{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function U(...e){e=er(e);let t=`THREE.`+e.shift();if(Pr)Pr(`error`,t,...e);else{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function tr(...e){let t=e.join(` `);t in Nr||(Nr[t]=!0,H(...e))}function nr(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(G[e&255]+G[e>>8&255]+G[e>>16&255]+G[e>>24&255]+`-`+G[t&255]+G[t>>8&255]+`-`+G[t>>16&15|64]+G[t>>24&255]+`-`+G[n&63|128]+G[n>>8&255]+`-`+G[n>>16&255]+G[n>>24&255]+G[r&255]+G[r>>8&255]+G[r>>16&255]+G[r>>24&255]).toLowerCase()}function W(e,t,n){return Math.max(t,Math.min(n,e))}function rr(e,t){return(e%t+t)%t}function ir(e,t,n){return(1-n)*e+n*t}function ar(){let e={enabled:!0,workingColorSpace:kr,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=or(e.r),e.g=or(e.g),e.b=or(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=sr(e.r),e.g=sr(e.g),e.b=sr(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?Ar:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return tr(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return tr(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[kr]:{primaries:t,whitePoint:r,transfer:Ar,toXYZ:Vr,fromXYZ:Hr,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Or},outputColorSpaceConfig:{drawingBufferColorSpace:Or}},[Or]:{primaries:t,whitePoint:r,transfer:jr,toXYZ:Vr,fromXYZ:Hr,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Or}}}),e}function or(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function sr(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}function cr(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?Gr.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(H(`Texture: Unable to serialize Texture.`),{})}function lr(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}function ur(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(fr(i))i.isRenderTargetTexture?(H(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i))if(fr(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice();else t[n][r]=i}}return t}function dr(e){let t={};for(let n=0;n<e.length;n++){let r=ur(e[n]);for(let e in r)t[e]=r[e]}return t}function fr(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function pr(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}var mr,hr,gr,_r,vr,yr,br,xr,Sr,Cr,wr,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,G,Ir,Lr,K,Rr,zr,q,Br,Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni,ri,J,ii,ai,oi,si,ci,li,ui,di,fi,pi,mi,hi,gi,_i,vi,yi,bi,xi,Si,Ci,wi,Ti,Ei,Y,X,Di,Oi,ki,Ai,ji,Mi,Ni,Pi,Fi,Ii,Li,Ri,zi,Bi,Vi,Hi,Ui,Wi,Gi,Ki,qi,Ji,Yi,Xi,Zi,Qi,$i,Z,ea=t((()=>{mr=1e3,hr=1001,gr=1002,_r=1006,vr=1008,yr=1009,br=1023,xr=2300,Sr=2301,Cr=2302,wr=2303,Tr=2400,Er=2401,Dr=2402,Or=`srgb`,kr=`srgb-linear`,Ar=`linear`,jr=`srgb`,Mr=2e3,Nr={},Pr=null,Fr=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},G=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),Math.PI/180,180/Math.PI,Ir=class e{static{e.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=W(this.x,e.x,t.x),this.y=W(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=W(this.x,e,t),this.y=W(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(W(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(W(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Lr=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:H(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(W(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},K=class e{static{e.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(zr.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(zr.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=W(this.x,e.x,t.x),this.y=W(this.y,e.y,t.y),this.z=W(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=W(this.x,e,t),this.y=W(this.y,e,t),this.z=W(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(W(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Rr.copy(this).projectOnVector(e),this.sub(Rr)}reflect(e){return this.sub(Rr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(W(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Rr=new K,zr=new Lr,q=class e{static{e.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Br.makeScale(e,t)),this}rotate(e){return this.premultiply(Br.makeRotation(-e)),this}translate(e,t){return this.premultiply(Br.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Br=new q,Vr=new q().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Hr=new q().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715),Ur=ar(),Gr=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Wr===void 0&&(Wr=$n(`canvas`)),Wr.width=e.width,Wr.height=e.height;let t=Wr.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Wr}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=$n(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=or(i[e]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(or(t[e]/255)*255):t[e]=or(t[e]);return{data:t,width:e.width,height:e.height}}else return H(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Kr=0,qr=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Kr++}),this.uuid=nr(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(cr(r[t].image)):e.push(cr(r[t]))}else e=cr(r);n.url=e}return t||(e.images[this.uuid]=n),n}},Jr=0,Yr=new K,Xr=class e extends Fr{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=hr,i=hr,a=_r,o=vr,s=br,c=yr,l=e.DEFAULT_ANISOTROPY,u=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Jr++}),this.uuid=nr(),this.name=``,this.source=new qr(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=a,this.minFilter=o,this.anisotropy=l,this.format=s,this.internalFormat=null,this.type=c,this.offset=new Ir(0,0),this.repeat=new Ir(1,1),this.center=new Ir(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new q,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Yr).x}get height(){return this.source.getSize(Yr).y}get depth(){return this.source.getSize(Yr).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){H(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){H(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case mr:e.x-=Math.floor(e.x);break;case hr:e.x=e.x<0?0:1;break;case gr:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case mr:e.y-=Math.floor(e.y);break;case hr:e.y=e.y<0?0:1;break;case gr:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}},Xr.DEFAULT_IMAGE=null,Xr.DEFAULT_MAPPING=300,Xr.DEFAULT_ANISOTROPY=1,class e{static{e.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=W(this.x,e.x,t.x),this.y=W(this.y,e.y,t.y),this.z=W(this.z,e.z,t.z),this.w=W(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=W(this.x,e,t),this.y=W(this.y,e,t),this.z=W(this.z,e,t),this.w=W(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(W(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Zr=class e{static{e.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();let t=this.elements,n=e.elements,r=1/Qr.setFromMatrixColumn(e,0).length(),i=1/Qr.setFromMatrixColumn(e,1).length(),a=1/Qr.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(ei,e,ti)}lookAt(e,t,n){let r=this.elements;return J.subVectors(e,t),J.lengthSq()===0&&(J.z=1),J.normalize(),ni.crossVectors(n,J),ni.lengthSq()===0&&(Math.abs(n.z)===1?J.x+=1e-4:J.z+=1e-4,J.normalize(),ni.crossVectors(n,J)),ni.normalize(),ri.crossVectors(J,ni),r[0]=ni.x,r[4]=ri.x,r[8]=J.x,r[1]=ni.y,r[5]=ri.y,r[9]=J.y,r[2]=ni.z,r[6]=ri.z,r[10]=J.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],M=r[14],N=r[3],P=r[7],ee=r[11],te=r[15];return i[0]=a*x+o*T+s*k+c*N,i[4]=a*S+o*E+s*A+c*P,i[8]=a*C+o*D+s*j+c*ee,i[12]=a*w+o*O+s*M+c*te,i[1]=l*x+u*T+d*k+f*N,i[5]=l*S+u*E+d*A+f*P,i[9]=l*C+u*D+d*j+f*ee,i[13]=l*w+u*O+d*M+f*te,i[2]=p*x+m*T+h*k+g*N,i[6]=p*S+m*E+h*A+g*P,i[10]=p*C+m*D+h*j+g*ee,i[14]=p*w+m*O+h*M+g*te,i[3]=_*x+v*T+y*k+b*N,i[7]=_*S+v*E+y*A+b*P,i[11]=_*C+v*D+y*j+b*ee,i[15]=_*w+v*O+y*M+b*te,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinant();if(i===0)return n.set(1,1,1),t.identity(),this;let a=Qr.set(r[0],r[1],r[2]).length(),o=Qr.set(r[4],r[5],r[6]).length(),s=Qr.set(r[8],r[9],r[10]).length();i<0&&(a=-a),$r.copy(this);let c=1/a,l=1/o,u=1/s;return $r.elements[0]*=c,$r.elements[1]*=c,$r.elements[2]*=c,$r.elements[4]*=l,$r.elements[5]*=l,$r.elements[6]*=l,$r.elements[8]*=u,$r.elements[9]*=u,$r.elements[10]*=u,t.setFromRotationMatrix($r),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=Mr,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=Mr,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Qr=new K,$r=new Zr,ei=new K(0,0,0),ti=new K(1,1,1),ni=new K,ri=new K,J=new K,ii=new Zr,ai=new Lr,oi=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(W(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-W(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(W(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-W(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(W(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-W(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:H(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return ii.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ii,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ai.setFromEuler(this),this.setFromQuaternion(ai,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}},oi.DEFAULT_ORDER=`XYZ`,si=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!=0}},ci=0,li=new K,ui=new Lr,di=new Zr,fi=new K,pi=new K,mi=new K,hi=new Lr,gi=new K(1,0,0),_i=new K(0,1,0),vi=new K(0,0,1),yi={type:`added`},bi={type:`removed`},xi={type:`childadded`,child:null},Si={type:`childremoved`,child:null},Ci=class e extends Fr{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:ci++}),this.uuid=nr(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new K,n=new oi,r=new Lr,i=new K(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Zr},normalMatrix:{value:new q}}),this.matrix=new Zr,this.matrixWorld=new Zr,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new si,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ui.setFromAxisAngle(e,t),this.quaternion.multiply(ui),this}rotateOnWorldAxis(e,t){return ui.setFromAxisAngle(e,t),this.quaternion.premultiply(ui),this}rotateX(e){return this.rotateOnAxis(gi,e)}rotateY(e){return this.rotateOnAxis(_i,e)}rotateZ(e){return this.rotateOnAxis(vi,e)}translateOnAxis(e,t){return li.copy(e).applyQuaternion(this.quaternion),this.position.add(li.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(gi,e)}translateY(e){return this.translateOnAxis(_i,e)}translateZ(e){return this.translateOnAxis(vi,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(di.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?fi.copy(e):fi.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),pi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?di.lookAt(pi,fi,this.up):di.lookAt(fi,pi,this.up),this.quaternion.setFromRotationMatrix(di),r&&(di.extractRotation(r.matrixWorld),ui.setFromRotationMatrix(di),this.quaternion.premultiply(ui.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(U(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(yi),xi.child=e,this.dispatchEvent(xi),xi.child=null):U(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(bi),Si.child=e,this.dispatchEvent(Si),Si.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),di.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),di.multiply(e.parent.matrixWorld)),e.applyMatrix4(di),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(yi),xi.child=e,this.dispatchEvent(xi),xi.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pi,e,mi),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pi,hi,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let e=this.children;for(let t=0,n=e.length;t<n;t++)e[t].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==``&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material);if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}},Ci.DEFAULT_UP=new K(0,1,0),Ci.DEFAULT_MATRIX_AUTO_UPDATE=!0,Ci.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0,wi={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ti={h:0,s:0,l:0},Ei={h:0,s:0,l:0},Y=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Or){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ur.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Ur.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ur.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Ur.workingColorSpace){if(e=rr(e,1),t=W(t,0,1),n=W(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=lr(i,r,e+1/3),this.g=lr(i,r,e),this.b=lr(i,r,e-1/3)}return Ur.colorSpaceToWorking(this,r),this}setStyle(e,t=Or){function n(t){t!==void 0&&parseFloat(t)<1&&H(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:H(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);H(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Or){let n=wi[e.toLowerCase()];return n===void 0?H(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=or(e.r),this.g=or(e.g),this.b=or(e.b),this}copyLinearToSRGB(e){return this.r=sr(e.r),this.g=sr(e.g),this.b=sr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Or){return Ur.workingToColorSpace(X.copy(this),e),Math.round(W(X.r*255,0,255))*65536+Math.round(W(X.g*255,0,255))*256+Math.round(W(X.b*255,0,255))}getHexString(e=Or){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ur.workingColorSpace){Ur.workingToColorSpace(X.copy(this),t);let n=X.r,r=X.g,i=X.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4;break}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Ur.workingColorSpace){return Ur.workingToColorSpace(X.copy(this),t),e.r=X.r,e.g=X.g,e.b=X.b,e}getStyle(e=Or){Ur.workingToColorSpace(X.copy(this),e);let t=X.r,n=X.g,r=X.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Ti),this.setHSL(Ti.h+e,Ti.s+t,Ti.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Ti),e.getHSL(Ei);let n=ir(Ti.h,Ei.h,t),r=ir(Ti.s,Ei.s,t),i=ir(Ti.l,Ei.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},X=new Y,Y.NAMES=wi,Di=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`call to abstract method`)}intervalChanged_(){}},Oi=class extends Di{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Tr,endingEnd:Tr}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Er:i=e,o=2*t-n;break;case Dr:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case Er:a=e,s=2*n-t;break;case Dr:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},ki=class extends Di{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},Ai=class extends Di{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},ji=class extends Di{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.settings||this.DefaultSettings_,u=l.inTangents,d=l.outTangents;if(!u||!d){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let f=o*2,p=e-1;for(let l=0;l!==o;++l){let o=a[c+l],m=a[s+l],h=p*f+l*2,g=d[h],_=d[h+1],v=e*f+l*2,y=u[v],b=u[v+1],x=(n-t)/(r-t),S,C,w,T,E;for(let e=0;e<8;e++){S=x*x,C=S*x,w=1-x,T=w*w,E=T*w;let e=E*t+3*T*x*g+3*w*S*y+C*r-n;if(Math.abs(e)<1e-10)break;let i=3*T*(g-t)+6*w*x*(y-g)+3*S*(r-y);if(Math.abs(i)<1e-10)break;x-=e/i,x=Math.max(0,Math.min(1,x))}i[l]=E*o+3*T*x*_+3*w*S*b+C*m}return i}},Mi=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=pr(t,this.TimeBufferType),this.values=pr(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:pr(e.times,Array),values:pr(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Ai(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new ki(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Oi(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new ji(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.settings=this.settings),t}setInterpolation(e){let t;switch(e){case xr:t=this.InterpolantFactoryMethodDiscrete;break;case Sr:t=this.InterpolantFactoryMethodLinear;break;case Cr:t=this.InterpolantFactoryMethodSmooth;break;case wr:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t);return H(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return xr;case this.InterpolantFactoryMethodLinear:return Sr;case this.InterpolantFactoryMethodSmooth:return Cr;case this.InterpolantFactoryMethodBezier:return wr}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(U(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(U(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){U(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){U(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&Qn(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){U(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Cr,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0]))if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}},Mi.prototype.ValueTypeName=``,Mi.prototype.TimeBufferType=Float32Array,Mi.prototype.ValueBufferType=Float32Array,Mi.prototype.DefaultInterpolation=Sr,Ni=class extends Mi{constructor(e,t,n){super(e,t,n)}},Ni.prototype.ValueTypeName=`bool`,Ni.prototype.ValueBufferType=Array,Ni.prototype.DefaultInterpolation=xr,Ni.prototype.InterpolantFactoryMethodLinear=void 0,Ni.prototype.InterpolantFactoryMethodSmooth=void 0,Pi=class extends Mi{constructor(e,t,n,r){super(e,t,n,r)}},Pi.prototype.ValueTypeName=`color`,Fi=class extends Mi{constructor(e,t,n,r){super(e,t,n,r)}},Fi.prototype.ValueTypeName=`number`,Ii=class extends Di{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Lr.slerpFlat(i,0,a,c-o,a,c,s);return i}},Li=class extends Mi{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new Ii(this.times,this.values,this.getValueSize(),e)}},Li.prototype.ValueTypeName=`quaternion`,Li.prototype.InterpolantFactoryMethodSmooth=void 0,Ri=class extends Mi{constructor(e,t,n){super(e,t,n)}},Ri.prototype.ValueTypeName=`string`,Ri.prototype.ValueBufferType=Array,Ri.prototype.DefaultInterpolation=xr,Ri.prototype.InterpolantFactoryMethodLinear=void 0,Ri.prototype.InterpolantFactoryMethodSmooth=void 0,zi=class extends Mi{constructor(e,t,n,r){super(e,t,n,r)}},zi.prototype.ValueTypeName=`vector`,Bi=class{constructor(e,t,n){let r=this,i=!1,a=0,o=0,s,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(e){o++,i===!1&&r.onStart!==void 0&&r.onStart(e,a,o),i=!0},this.itemEnd=function(e){a++,r.onProgress!==void 0&&r.onProgress(e,a,o),a===o&&(i=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(e){r.onError!==void 0&&r.onError(e)},this.resolveURL=function(e){return s?s(e):e},this.setURLModifier=function(e){return s=e,this},this.addHandler=function(e,t){return c.push(e,t),this},this.removeHandler=function(e){let t=c.indexOf(e);return t!==-1&&c.splice(t,2),this},this.getHandler=function(e){for(let t=0,n=c.length;t<n;t+=2){let n=c[t],r=c[t+1];if(n.global&&(n.lastIndex=0),n.test(e))return r}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||=new AbortController,this._abortController}},Vi=new Bi,Hi=class{constructor(e){this.manager=e===void 0?Vi:e,this.crossOrigin=`anonymous`,this.withCredentials=!1,this.path=``,this.resourcePath=``,this.requestHeader={},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(r,i){n.load(e,r,t,i)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}},Hi.DEFAULT_MATERIAL_NAME=`__DEFAULT`,Ui=`\\[\\]\\.:\\/`,Wi=RegExp(`[\\[\\]\\.:\\/]`,`g`),Gi=`[^\\[\\]\\.:\\/]`,Ki=`[^`+Ui.replace(`\\.`,``)+`]`,qi=`((?:WC+[\\/:])*)`.replace(`WC`,Gi),Ji=`(WCOD+)?`.replace(`WCOD`,Ki),Yi=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,Gi),Xi=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,Gi),Zi=RegExp(`^`+qi+Ji+Yi+Xi+`$`),Qi=[`material`,`materials`,`bones`,`map`],$i=class{constructor(e,t,n){let r=n||Z.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Z=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(Wi,``)}static parseTrackName(e){let t=Zi.exec(e);if(t===null)throw Error(`PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);Qi.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){H(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){U(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){U(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){U(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){U(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){U(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){U(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){U(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;U(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){U(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){U(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}},Z.Composite=$i,Z.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},Z.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},Z.prototype.GetterByBindingType=[Z.prototype._getValue_direct,Z.prototype._getValue_array,Z.prototype._getValue_arrayElement,Z.prototype._getValue_toArray],Z.prototype.SetterByBindingTypeAndVersioning=[[Z.prototype._setValue_direct,Z.prototype._setValue_direct_setNeedsUpdate,Z.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Z.prototype._setValue_array,Z.prototype._setValue_array_setNeedsUpdate,Z.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Z.prototype._setValue_arrayElement,Z.prototype._setValue_arrayElement_setNeedsUpdate,Z.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Z.prototype._setValue_fromArray,Z.prototype._setValue_fromArray_setNeedsUpdate,Z.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]],class e{static{e.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`184`}})),typeof window<`u`&&(window.__THREE__?H(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`184`)})),Q,$,ta,na,ra,ia=t((()=>{
/**
* @license
* Copyright 2010-2026 Three.js Authors
* SPDX-License-Identifier: MIT
*/
ea(),Q={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = inverseTransformDirection( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},$={common:{diffuse:{value:new Y(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new q}},envmap:{envMap:{value:null},envMapRotation:{value:new q},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new q}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new q}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new q},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new q},normalScale:{value:new Ir(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new q},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new q}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new q}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new q}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Y(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new K},probesMax:{value:new K},probesResolution:{value:new K}},points:{diffuse:{value:new Y(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0},uvTransform:{value:new q}},sprite:{diffuse:{value:new Y(16777215)},opacity:{value:1},center:{value:new Ir(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}}},ta={basic:{uniforms:dr([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.fog]),vertexShader:Q.meshbasic_vert,fragmentShader:Q.meshbasic_frag},lambert:{uniforms:dr([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.fog,$.lights,{emissive:{value:new Y(0)},envMapIntensity:{value:1}}]),vertexShader:Q.meshlambert_vert,fragmentShader:Q.meshlambert_frag},phong:{uniforms:dr([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.fog,$.lights,{emissive:{value:new Y(0)},specular:{value:new Y(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Q.meshphong_vert,fragmentShader:Q.meshphong_frag},standard:{uniforms:dr([$.common,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.roughnessmap,$.metalnessmap,$.fog,$.lights,{emissive:{value:new Y(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Q.meshphysical_vert,fragmentShader:Q.meshphysical_frag},toon:{uniforms:dr([$.common,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.gradientmap,$.fog,$.lights,{emissive:{value:new Y(0)}}]),vertexShader:Q.meshtoon_vert,fragmentShader:Q.meshtoon_frag},matcap:{uniforms:dr([$.common,$.bumpmap,$.normalmap,$.displacementmap,$.fog,{matcap:{value:null}}]),vertexShader:Q.meshmatcap_vert,fragmentShader:Q.meshmatcap_frag},points:{uniforms:dr([$.points,$.fog]),vertexShader:Q.points_vert,fragmentShader:Q.points_frag},dashed:{uniforms:dr([$.common,$.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Q.linedashed_vert,fragmentShader:Q.linedashed_frag},depth:{uniforms:dr([$.common,$.displacementmap]),vertexShader:Q.depth_vert,fragmentShader:Q.depth_frag},normal:{uniforms:dr([$.common,$.bumpmap,$.normalmap,$.displacementmap,{opacity:{value:1}}]),vertexShader:Q.meshnormal_vert,fragmentShader:Q.meshnormal_frag},sprite:{uniforms:dr([$.sprite,$.fog]),vertexShader:Q.sprite_vert,fragmentShader:Q.sprite_frag},background:{uniforms:{uvTransform:{value:new q},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Q.background_vert,fragmentShader:Q.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new q}},vertexShader:Q.backgroundCube_vert,fragmentShader:Q.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Q.cube_vert,fragmentShader:Q.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Q.equirect_vert,fragmentShader:Q.equirect_frag},distance:{uniforms:dr([$.common,$.displacementmap,{referencePosition:{value:new K},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Q.distance_vert,fragmentShader:Q.distance_frag},shadow:{uniforms:dr([$.lights,$.fog,{color:{value:new Y(0)},opacity:{value:1}}]),vertexShader:Q.shadow_vert,fragmentShader:Q.shadow_frag}},ta.physical={uniforms:dr([ta.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new q},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new q},clearcoatNormalScale:{value:new Ir(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new q},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new q},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new q},sheen:{value:0},sheenColor:{value:new Y(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new q},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new q},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new q},transmissionSamplerSize:{value:new Ir},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new q},attenuationDistance:{value:0},attenuationColor:{value:new Y(0)},specularColor:{value:new Y(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new q},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new q},anisotropyVector:{value:new Ir},anisotropyMap:{value:null},anisotropyMapTransform:{value:new q}}]),vertexShader:Q.meshphysical_vert,fragmentShader:Q.meshphysical_frag},na=new q,na.set(-1,0,0,0,1,0,0,0,1),ra=new q,ra.set(-1,0,0,0,1,0,0,0,1),new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183])})),aa=n({sceneGlbToObj:()=>oa});function oa(e,t){let n=20+new DataView(e.buffer).getUint32(12,!0),r=JSON.parse(new TextDecoder().decode(e.subarray(20,n))),i=new DataView(e.buffer,Math.min(n+8,e.byteLength)),a=[{code:`obj-structure`,sourceId:t}];(r.animations?.length||r.skins?.length)&&a.push({code:`obj-static`,sourceId:t}),r.materials?.some(e=>e.pbrMetallicRoughness.baseColorTexture||e.normalTexture||e.pbrMetallicRoughness.metallicRoughnessTexture||e.pbrMetallicRoughness.metallicFactor!==0||e.pbrMetallicRoughness.roughnessFactor!==1||e.alphaMode===`MASK`||e.doubleSided)&&a.push({code:`obj-material`,sourceId:t});let s={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},c=e=>{let t=r.accessors[e],n=r.bufferViews[t.bufferView],a=s[t.type],c=t.componentType===5123?2:4;o(t.componentType===5126||t.componentType===5123||t.componentType===5125,`export`,`Componente de malha inválido.`);let l=n.byteOffset+(t.byteOffset??0);return{count:t.count,get:(e,n=0)=>{let r=l+(e*a+n)*c;return t.componentType===5126?i.getFloat32(r,!0):c===2?i.getUint16(r,!0):i.getUint32(r,!0)}}},l=new Map,u=(e,t)=>{let n=r.nodes[e],i=new Zr().compose(new K().fromArray(n.translation),new Lr().fromArray(n.rotation),new K().fromArray(n.scale)).premultiply(t);l.set(e,i);for(let e of n.children??[])u(e,i)};for(let e of r.scenes[r.scene].nodes??[])u(e,new Zr);let d={},f=new TextEncoder,p=[];for(let[t,i]of(r.materials??[]).entries()){let a=i.pbrMetallicRoughness,o=a.baseColorFactor;if(p.push(`newmtl acabamento_${t}`,`Kd ${o.slice(0,3).map(Te).join(` `)}`,`d ${o[3]}`,`Ks 0 0 0`,`illum 2`),a.baseColorTexture){let t=r.textures[a.baseColorTexture.index].source,i=`pintura_${t}.png`;if(!d[i]){let a=r.bufferViews[r.images[t].bufferView];d[i]=e.subarray(n+8+a.byteOffset,n+8+a.byteOffset+a.byteLength)}p.push(`map_Kd ${i}`)}p.push(``)}let m=[`# Molda: formas na pose salva`,`mtllib modelo.mtl`],h=0,g=0,_=e=>{g+=e.length+1,o(g<=x*2,`export`,`A malha ficou grande demais para OBJ. Reduza os detalhes das formas.`),m.push(e)},v=new K,y=new K,b=new q;for(let[e,t]of l){let n=r.nodes[e];if(n.mesh===void 0)continue;_(`o peca_${e}`);let i=n.skin===void 0?void 0:r.skins[n.skin],a=i?c(i.inverseBindMatrices):void 0,o=i?.joints.map((e,t)=>l.get(e).clone().multiply(new Zr().fromArray(Array.from({length:16},(e,n)=>a.get(t,n)))));for(let e of r.meshes[n.mesh].primitives){let n=e.attributes,r=c(n.POSITION),i=c(n.NORMAL),a=c(n.TEXCOORD_0),s=c(e.indices),l=o?c(n.JOINTS_0):void 0,u=o?c(n.WEIGHTS_0):void 0,d=new Zr,f=t.determinant()<0;for(let e=0;e<r.count;e++){let n=t;if(o&&l&&u){d.elements.fill(0);for(let t=0;t<4;t++){let n=u.get(e,t);if(!n)continue;let r=o[l.get(e,t)];for(let e=0;e<16;e++)d.elements[e]+=r.elements[e]*n}n=d,e===0&&(f=n.determinant()<0)}v.set(r.get(e,0),r.get(e,1),r.get(e,2)).applyMatrix4(n),y.set(i.get(e,0),i.get(e,1),i.get(e,2)).applyNormalMatrix(b.getNormalMatrix(n)),_(`v ${v.x} ${v.y} ${v.z}`),_(`vt ${a.get(e,0)} ${1-a.get(e,1)}`),_(`vn ${y.x} ${y.y} ${y.z}`)}_(`usemtl acabamento_${e.material}`);for(let e=0;e<s.count;e+=3)_(`f ${(f?[0,2,1]:[0,1,2]).map(t=>{let n=h+s.get(e+t)+1;return`${n}/${n}/${n}`}).join(` `)}`);h+=r.count}}return d[`modelo.obj`]=f.encode(`${m.join(`
`)}\n`),d[`modelo.mtl`]=f.encode(p.join(`
`)),d[`LEIA-ME.txt`]=f.encode(`Extraia todos os arquivos para a mesma pasta. Abra modelo.obj e mantenha modelo.mtl e as pinturas ao lado dele. Esta cópia tem formas estáticas na pose salva. Para continuar editando ossos, movimentos e camadas, guarde também o projeto Molda.
`),{bytes:Qe(d,{level:6}),issues:a}}var sa=t((()=>{Ut(),ia(),De(),_(),w()}));_();async function ca(e,t={}){let n=t.format??`glb`,r=Zn(e,{allowLosses:!0,animatedPaint:n===`obj`?!1:t.animatedPaint});if(n!==`glb`){let t=20+new DataView(r.bytes.buffer).getUint32(12,!0);if(n===`gltf`){let e=JSON.parse(new TextDecoder().decode(r.bytes.subarray(20,t)));if(e.buffers?.length){let n=e.buffers[0];n.uri=`data:application/octet-stream;base64,${i(r.bytes.subarray(t+8,t+8+n.byteLength))}`}r.bytes=new TextEncoder().encode(JSON.stringify(e))}else{let{sceneGlbToObj:t}=await Promise.resolve().then(()=>(sa(),aa)),n=t(r.bytes,e.id);r.bytes=n.bytes,r.issues.push(...n.issues),r.clips=[],r.stats={...r.stats,bones:0,clips:0,animationKeys:0,animationChannels:0}}}if(o(r.bytes.byteLength<=T,`export`,`A cópia ficou grande demais. Reduza a quantidade de peças ou o tamanho das pinturas.`),r.issues.length&&!t.allowLosses)throw new Wn(r.issues);return r}_();function la(e,t){let n=s(e,t,[`cutoff`,`opacity`]);return{cutoff:d(n.cutoff,`${t}.cutoff`,0),opacity:d(n.opacity,`${t}.opacity`,0,1)}}_();function ua(e){let t=new Map;for(let n of e.geometries.values()){let e=n.kind===`mesh`?Object.values(n.vertices):n.kind===`path`?n.points.flatMap(({position:e})=>[e.map(e=>e-n.radius),e.map(e=>e+n.radius)]):[n.from,n.to];if(e.length===0){t.set(n.id,null);continue}let r=[1/0,1/0,1/0],i=[-1/0,-1/0,-1/0];for(let t of e)for(let e=0;e<3;e+=1)r[e]=Math.min(r[e],t[e]),i[e]=Math.max(i[e],t[e]);t.set(n.id,{min:r,max:i})}return{geometries:e.geometries,localBounds:t}}function da(e,t={},n=ua(e)){o(n.geometries===e.geometries,`bounds`,`Os limites pertencem a outra revisão da geometria.`);let{localBounds:r}=n,i=[1/0,1/0,1/0],a=[-1/0,-1/0,-1/0],s=!1;if(t.includeLocators||t.includeGroupOrigins){let n=Nn(e.scene);for(let r of e.scene.order){let c=e.scene.nodes.get(r);if(!c||!(c.kind===`locator`&&t.includeLocators||c.kind===`group`&&t.includeGroupOrigins)||t.nodeIds&&!t.nodeIds.has(r)||t.includeHidden===!1&&n.get(r)?.hidden)continue;let l=e.scene.worldMatrices.get(r);if(!l)continue;let u=cn(l,[0,0,0]);o(u.every(Number.isFinite),`nodes.${r}`,`O ponto excede o limite numérico.`);for(let e=0;e<3;e++)i[e]=Math.min(i[e],u[e]),a[e]=Math.max(a[e],u[e]);s=!0}}for(let n of Pn(e)){if(t.includeHidden===!1&&n.hidden||t.nodeIds&&!t.nodeIds.has(n.sourceNodeId)||t.includeMirrors===!1&&n.id!==n.sourceNodeId)continue;let e=t.nodeLocalBounds?.has(n.sourceNodeId)?t.nodeLocalBounds.get(n.sourceNodeId):r.get(n.geometryId);if(e)for(let t of[e.min[0],e.max[0]])for(let r of[e.min[1],e.max[1]])for(let c of[e.min[2],e.max[2]]){let e=cn(n.worldMatrix,[t,r,c]);o(e.every(Number.isFinite),`nodes.${n.id}`,`A posição da peça excede o limite numérico.`),s=!0;for(let t=0;t<3;t+=1)i[t]=Math.min(i[t],e[t]),a[t]=Math.max(a[t],e[t])}}return s?{min:i,max:a}:null}_();function fa(e,t){return e.materialId===void 0?{}:{materialId:u(e.materialId,`${t}.materialId`)}}function pa(e,t){let n=s(e,t,[`origin`,`u`,`v`]);return{origin:p(n.origin,2,`${t}.origin`),u:p(n.u,2,`${t}.u`),v:p(n.v,2,`${t}.v`)}}function ma(e,t=`geometry`,n={vertices:0,triangles:0,edges:0}){let r=m(s(e,t).kind,[`box`,`wedge`,`cylinder`,`sphere`,`mesh`,`path`],`${t}.kind`),i=s(e,t,[`id`,`kind`,...r===`mesh`?[`vertices`,`faces`,`looseEdges`]:r===`path`?[`points`,`radius`,`around`,`endCaps`,`closed`,`surfaces`]:[`from`,`to`,`surfaces`],...r===`cylinder`||r===`sphere`?[`tessellation`]:[]]),a=u(i.id,`${t}.id`);if(r===`path`){let e={id:a,kind:r,...N({points:i.points,radius:i.radius,around:i.around,endCaps:i.endCaps,closed:i.closed}),surfaces:ha(i.surfaces,t,[`side`,`top`,`bottom`])};return n.triangles+=ee(e.points.length,e),n.vertices+=e.points.length,o(n.vertices<=L.vertices,t,`Vértices fora do orçamento.`),o(n.triangles<=L.triangles,t,`Geometria fora do orçamento.`),e}if(r!==`mesh`){let e=p(i.from,3,`${t}.from`),s=p(i.to,3,`${t}.to`);o(e.every((e,t)=>e<s[t]),t,`Dimensões da forma inválidas.`);let c={id:a,from:e,to:s,surfaces:ha(i.surfaces,t,I[r])},l=r===`cylinder`?{...c,kind:r,...i.tessellation===void 0?{}:{tessellation:se(`cylinder`,i.tessellation)}}:r===`sphere`?{...c,kind:r,...i.tessellation===void 0?{}:{tessellation:se(`sphere`,i.tessellation)}}:{...c,kind:r};return n.triangles+=le(l),o(n.triangles<=L.triangles,t,`Geometria fora do orçamento.`),l}let l=s(i.vertices,`${t}.vertices`);n.vertices+=Object.keys(l).length,o(n.vertices<=L.vertices,t,`Vértices fora do orçamento.`);let d=s(i.faces,`${t}.faces`);o(Object.keys(d).length<=L.triangles-n.triangles,t,`Faces fora do orçamento.`);let f=Object.fromEntries(Object.entries(d).map(([e,r])=>{let i=`${t}.faces.${u(e,t)}`,a=s(r,i,[`corners`,`materialId`]),d=c(a.corners,`${i}.corners`,L.faceCorners);o(d.length>=3,i,`A face precisa de pelo menos três cantos.`),n.triangles+=d.length-2,o(n.triangles<=L.triangles,t,`Triângulos fora do orçamento.`);let f=d.map((e,t)=>{let n=`${i}.corners[${t}]`,r=s(e,n,[`vertexId`,`uv`]),a=u(r.vertexId,`${n}.vertexId`);return o(Object.hasOwn(l,a),n,`Vértice ausente.`),{vertexId:a,uv:p(r.uv,2,`${n}.uv`)}});return o(new Set(f.map(e=>e.vertexId)).size===f.length,i,`Vértice repetido na face.`),[e,{corners:f,...fa(a,i)}]})),h=c(i.looseEdges,`${t}.looseEdges`,L.looseEdges-n.edges);return n.edges+=h.length,{id:a,kind:r,faces:f,vertices:Object.fromEntries(Object.entries(l).map(([e,n])=>[u(e,t),p(n,3,`${t}.vertices.${e}`)])),looseEdges:h.map((e,n)=>{let r=c(e,`${t}.looseEdges[${n}]`,2);o(r.length===2,t,`A aresta precisa de dois vértices.`);let i=u(r[0],t),a=u(r[1],t);return o(i!==a&&Object.hasOwn(l,i)&&Object.hasOwn(l,a),t,`Aresta inválida.`),[i,a]})}}function ha(e,t,n){let r=s(e,`${t}.surfaces`,n);return Object.fromEntries(Object.entries(r).map(([e,n])=>{let r=`${t}.surfaces.${e}`,i=s(n,r,[`materialId`,`uv`]);return[e,{...fa(i,r),uv:pa(i.uv,`${r}.uv`)}]}))}_();function ga(e){return o(Fe(e),`id`,`Identificador de criação inválido.`),e}function _a(e,t){let n=m(s(e,t).kind,[`trs`,`affine`],`${t}.kind`),r=s(e,t,n===`trs`?[`kind`,`translation`,`rotation`,`scale`]:[`kind`,`matrix`]),i=n===`trs`?{kind:n,translation:p(r.translation,3,`${t}.translation`),rotation:p(r.rotation,4,`${t}.rotation`),scale:p(r.scale,3,`${t}.scale`)}:{kind:n,matrix:p(r.matrix,16,`${t}.matrix`)};return rn(i),i}function va(e,t){let n=m(s(e,t).kind,[`mesh`,`group`,`locator`],`${t}.kind`),r=s(e,t,[`id`,`name`,`parentId`,`transform`,`kind`,`hidden`,`locked`,...n===`mesh`?[`geometryId`,`materialId`]:[`bendLimit`]]),i={id:u(r.id,`${t}.id`),name:l(r.name,`${t}.name`),parentId:r.parentId===null?null:u(r.parentId,`${t}.parentId`),transform:_a(r.transform,`${t}.transform`),hidden:f(r.hidden,`${t}.hidden`),locked:f(r.locked,`${t}.locked`)};return n===`mesh`?{...i,kind:n,geometryId:u(r.geometryId,`${t}.geometryId`),materialId:u(r.materialId,`${t}.materialId`)}:{...i,kind:n,...r.bendLimit===void 0?{}:{bendLimit:En(r.bendLimit,`${t}.bendLimit`)}}}function ya(e,t,n){let r=s(e,t,[`id`,`name`,`baseColor`,...Dn,`normalStrength`,`normalFlipY`,`alphaMask`,`roughness`,`metalness`,`doubleSided`]),i=m(s(r.baseColor,`${t}.baseColor`).kind,[`palette`,`rgba`],`${t}.baseColor.kind`),a=s(r.baseColor,`${t}.baseColor`,[`kind`,i===`palette`?`index`:`value`]),o=i===`palette`?{kind:i,index:d(a.index,`${t}.baseColor.index`,1,n-1,!0)}:{kind:i,value:p(a.value,4,`${t}.baseColor.value`).map(e=>d(e,t,0,1))};return{id:u(r.id,`${t}.id`),name:l(r.name,`${t}.name`),baseColor:o,...Object.fromEntries(Dn.flatMap(e=>r[e]===void 0?[]:[[e,u(r[e],`${t}.${e}`)]])),...r.normalStrength===void 0?{}:{normalStrength:d(r.normalStrength,`${t}.normalStrength`,0,4)},...r.normalFlipY===void 0?{}:{normalFlipY:f(r.normalFlipY,`${t}.normalFlipY`)},...r.alphaMask===void 0?{}:{alphaMask:la(r.alphaMask,`${t}.alphaMask`)},roughness:d(r.roughness,`${t}.roughness`,0,1),metalness:d(r.metalness,`${t}.metalness`,0,1),doubleSided:f(r.doubleSided,`${t}.doubleSided`)}}function ba(e,t,n,r){return xa(e,t,n,(e,t,n,i)=>{let s;if(e instanceof Uint8Array?(o(e.byteLength===t,n,`Quantidade de pixels inválida.`),s=new Uint8Array(e)):(o(typeof e==`string`&&e.length===Math.ceil(t/3)*4,n,`Bitmap base64 inválido.`),s=a(e)),o(s!==null&&s.length===t,n,`Quantidade de pixels inválida.`),i===`indexed`)for(let e of s)o(e<r,n,`Índice de cor ausente.`);return s})}function xa(e,t,n,r){let i=s(e,t,[`id`,`name`,`width`,`height`,`encoding`,`layers`,`flipbook`]),a=d(i.width,`${t}.width`,1,L.imageSide,!0),p=d(i.height,`${t}.height`,1,L.imageSide,!0),g=i.flipbook===void 0?void 0:qe(i.flipbook,{width:a,height:p}),_=m(i.encoding,[`indexed`,`rgba`],`${t}.encoding`),v=a*p*(_===`rgba`?4:1),y=c(i.layers,`${t}.layers`,L.layersPerImage);n.layers+=y.length,n.pixels+=v*y.length,o(y.length>0&&n.layers<=L.images&&n.pixels<=L.pixelBytes,t,`Camadas fora do orçamento.`);let b=y.map((e,n)=>{let i=`${t}.layers[${n}]`,a=s(e,i,[`id`,`name`,`visible`,`opacity`,`pixels`]),o=r(a.pixels,v,`${i}.pixels`,_);return{id:u(a.id,`${i}.id`),name:l(a.name,`${i}.name`),pixels:o,visible:f(a.visible,`${i}.visible`),opacity:d(a.opacity,`${i}.opacity`,0,1)}});return h(b,`${t}.layers`),{id:u(i.id,`${t}.id`),name:l(i.name,`${t}.name`),width:a,height:p,encoding:_,layers:b,...g?{flipbook:g}:{}}}function Sa(e){o(e.paletteId===`custom`||Be(e.paletteId),`paletteId`,`Paleta desconhecida.`);let t={paletteId:e.paletteId},n=(e,t,n=!1)=>{let r=l(e,t,7,n);return o(n&&r===``||/^#[a-fA-F0-9]{6}$/.test(r),t,`Cor inválida.`),r};if(e.customPalette!==void 0||e.paletteId===`custom`){let r=s(e.customPalette,`customPalette`,[`name`,`colors`]),i=c(r.colors,`customPalette.colors`,16).map(e=>n(e,`customPalette.colors`,!0));o(i.length===16&&i[0]===``&&i.some(Boolean),`customPalette.colors`,`Paleta vazia ou sem índice reservado.`),t.customPalette={name:l(r.name,`customPalette.name`,F.maxNameChars),colors:i}}return e.extraColors!==void 0&&(t.extraColors=c(e.extraColors,`extraColors`,F.maxExtraColors).map(e=>n(e,`extraColors`))),t}function Ca(e){let t=wa(e,(e,t)=>{let n={pixels:0,layers:0};return c(e,`images`,L.images).map((e,r)=>ba(e,`images[${r}]`,n,t))});if(t.status!==`valid`)return t;try{return da(jn(t.document)),t}catch(t){return{status:`invalid`,raw:e,path:t instanceof g?t.path:`$`,message:t instanceof Error?t.message:`Documento inválido.`}}}function wa(e,t){try{let n=s(e,`$`),r=d(n.formatVersion,`formatVersion`,1,2**53-1,!0);if(r!==2)return{status:`unsupported`,version:r,raw:e};s(n,`$`,[`id`,`name`,`createdAt`,`updatedAt`,`thumb`,`formatVersion`,`kind`,`paletteId`,`customPalette`,`extraColors`,`settings`,`nodes`,`geometries`,`materials`,`images`,`mirrors`,`animations`,`skins`]),o(n.kind===`model`,`kind`,`Tipo de criação desconhecido.`);let i=s(n.settings,`settings`,[`texelsPerUnit`,`snap`,`mirrorX`]);o(re(i.texelsPerUnit)&&Ve(i.snap),`settings`,`Configuração de grade inválida.`);let a=Sa(n),p=16+(a.extraColors?.length??0),h={vertices:0,triangles:0,edges:0,pixels:0,layers:0},g=n.animations===void 0?void 0:pn(n.animations),_={id:ga(n.id),name:l(n.name,`name`,F.maxNameChars),createdAt:d(n.createdAt,`createdAt`),updatedAt:d(n.updatedAt,`updatedAt`),...n.thumb===void 0?{}:{thumb:l(n.thumb,`thumb`,F.maxThumbChars)},kind:`model`,formatVersion:2,...g===void 0?{}:{animations:g},...n.skins===void 0?{}:{skins:Jn(n.skins)},...a,settings:{texelsPerUnit:i.texelsPerUnit,snap:i.snap,mirrorX:f(i.mirrorX,`settings.mirrorX`)},nodes:c(n.nodes,`nodes`,L.nodes).map((e,t)=>va(e,`nodes[${t}]`)),geometries:c(n.geometries,`geometries`,L.geometries).map((e,t)=>ma(e,`geometries[${t}]`,h)),materials:c(n.materials,`materials`,L.materials).map((e,t)=>ya(e,`materials[${t}]`,p)),images:t(n.images,p),mirrors:c(n.mirrors,`mirrors`,L.renderedParts).map((e,t)=>{let n=`mirrors[${t}]`,r=s(e,n,[`id`,`name`,`sourceId`,`axis`,`offset`]);return{id:u(r.id,`${n}.id`),name:l(r.name,`${n}.name`),sourceId:u(r.sourceId,`${n}.sourceId`),axis:m(r.axis,[`x`,`y`,`z`],`${n}.axis`),offset:d(r.offset,`${n}.offset`)}})};return _.thumb!==void 0&&o(_.thumb.startsWith(`data:image/`),`thumb`,`Miniatura inválida.`),{status:`valid`,document:_}}catch(t){return{status:`invalid`,raw:e,path:t instanceof g?t.path:`$`,message:t instanceof Error?t.message:`Documento inválido.`}}}_(),L.nodes*2+L.triangles+L.geometries+L.materials+L.images+L.animationTracks+L.animationClips+On.bindings*3;function Ta(e){let t=s(e,`request`);return o(Fe(t.documentId),`documentId`,`Identificador de criação inválido.`),{documentId:t.documentId,revision:d(t.revision,`revision`,0,2**53-1,!0),animatedPaint:f(t.animatedPaint,`animatedPaint`),...t.format===void 0?{}:{format:m(t.format,[`glb`,`gltf`,`obj`],`format`)}}}function Ea(e){let t=s(e,`request`,[`documentId`,`revision`,`animatedPaint`,`format`,`document`]),n=Ta(t),r=Ca(t.document);return o(r.status===`valid`,`document`,r.status===`invalid`?r.message:`Formato de criação não suportado.`),o(r.document.id===n.documentId,`documentId`,`Essa criação não pertence ao pedido.`),{...n,document:r.document}}L.renderedParts,L.materials,L.materials*3,L.pixelBytes,L.triangles,L.triangles,L.renderedParts,L.materials,L.animationClips;function Da(e,t){return{documentId:e.documentId,revision:e.revision,animatedPaint:e.animatedPaint,...e.format===void 0?{}:{format:e.format},type:`result`,result:t}}_();let Oa=[`step`,`linear`,`smooth`];function ka(e){let t=s(e,`animations`,[`clips`,`values`,`curves`]),{values:n,curves:r}=t;o(r instanceof Uint8Array&&r.buffer instanceof ArrayBuffer&&r.byteOffset===0&&r.byteLength===r.buffer.byteLength&&r.length<=L.animationKeys,`curves`,`Curvas fora do orçamento.`),o(n instanceof Float64Array&&n.buffer instanceof ArrayBuffer&&n.byteOffset===0&&n.byteLength===n.buffer.byteLength&&n.length===r.length*5,`values`,`Valores de animação inválidos.`);let i=0,a=0,l=c(t.clips,`clips`,L.animationClips).map(e=>{let t=s(e,`clip`,[`id`,`name`,`duration`,`fps`,`loop`,`space`,`tracks`]),l=c(t.tracks,`tracks`,L.animationTracks-a);return a+=l.length,{...t,tracks:l.map(e=>{let t=s(e,`track`,[`nodeId`,`channel`,`keyCount`]),a=d(t.keyCount,`keyCount`,1,r.length-i,!0),c=m(t.channel,[`translation`,`rotation`,`scale`],`channel`),l=Array.from({length:a},()=>{let e=i*5,t=Oa[r[i++]];return o(t!==void 0,`curve`,`Curva inválida.`),c!==`rotation`&&o(n[e+4]===0,`value`,`Componente extra de chave.`),{time:n[e],interpolation:t,value:c===`rotation`?[n[e+1],n[e+2],n[e+3],n[e+4]]:[n[e+1],n[e+2],n[e+3]]}});return{nodeId:t.nodeId,channel:c,keys:l}})}});return o(i===r.length,`keys`,`Chaves sem trilha.`),l}function Aa(e){let t=s(e,`request`,[`version`,`documentId`,`revision`,`animatedPaint`,`format`,`document`,`animations`]);o(t.version===1,`version`,`Transporte de exportação não suportado.`);let n=s(t.document,`document`);return o(!Object.hasOwn(n,`animations`),`animations`,`Animações duplicadas no transporte.`),Ea({documentId:t.documentId,revision:t.revision,animatedPaint:t.animatedPaint,...t.format===void 0?{}:{format:t.format},document:{...n,...t.animations===void 0?{}:{animations:ka(t.animations)}}})}let ja={type:`loaded`};function Ma(){self.postMessage(ja)}_(),self.onmessage=async e=>{let t=null;try{t=Ta(e.data),self.postMessage({...t,type:`progress`,progress:`validating`});let n=Aa(e.data);self.postMessage({...t,type:`progress`,progress:`encoding`});let r=await ca(n.document,{allowLosses:!0,format:n.format,animatedPaint:n.animatedPaint});self.postMessage(Da(t,r),[r.bytes.buffer])}catch(e){if(!t)throw e;self.postMessage({...t,type:`error`,message:e instanceof g||e instanceof RangeError?e.message:`Não consegui preparar esse GLB. Seu projeto continua na oficina.`})}},Ma()})();