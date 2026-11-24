/**
 * Sem estado de motor: os hosts emprestam desenho, câmera e a colisão que já existe.
 *
 * As áreas ("Quando entrar em área") são conferidas a cada quadro pelo relógio do host
 * (`host.frame`), e também ao desenhar e ao colidir, para o jogo que não desenha a camada de
 * trás receber os eventos do mesmo jeito. Entrar conta uma vez só, por mais que se confira.
 * Cenas 1/2 preservam a colisão em grade. Cena 3 consulta a geometria autoral
 * compartilhada e entrega ao host a resolução contínua do corpo inteiro.
 *
 * Num mundo com portas (lote 8 da conclusão do plano do Estúdio, 22/11/2026, o jogo D):
 * - as cenas preparadas (metadados, objetos e grade) ficam num cache de até 8, e voltar a uma
 *   cena visitada não a prepara de novo; ativar uma cena copia os objetos e refaz só a colisão
 *   (o host de cada motor guarda a dele pelo nome do cenário);
 * - os destinos das portas da cena ativa são preparados um por quadro (`host.frame`), com as
 *   imagens decodificadas, sem aviso: o destino quebrado só avisa quando a criança usa a porta,
 *   e o jogador fica onde está;
 * - as áreas de cada evento são conferidas de novo só quando o retângulo do corpo muda: desenhar
 *   as duas camadas e colidir no mesmo lugar conferem uma vez.
 * ⚠️ O relógio das áreas (`watch`) e a pré-carga (`ahead`) vivem na MESMA geração (`turn`), que só
 * o `reset` troca: um relógio que abrisse geração nova mataria a pré-carga (revisão do lote 8).
 */
import { sceneObjectTransformSource } from './pinta-scene-transform.generated'

export const mapTwoDSource = `
${sceneObjectTransformSource}
function createMap2D(host) {
  var maps=new Map(),pictures=new Map(),warnings=new Set(),cache=new Map(),queue=[],turn=0,ticking=false,pumping=false;
  function withId(list,id){return(list||[]).find(v=>v.id===id);}function warn(text){if(!warnings.has(text)){warnings.add(text);host.warn(text);}}
  function metadata(image,byId){var value=host.meta(image,byId);return value&&value.scene&&[1,2,3].includes(value.scene.version)?value.scene:null;}
  function effective(layers,l){var e={visible:l.visible,opacity:l.opacity==null?1:l.opacity,x:l.offsetX||0,y:l.offsetY||0,px:l.parallaxX==null?1:l.parallaxX,py:l.parallaxY==null?1:l.parallaxY},p=l.parentId;for(var n=0;p&&n<32;n++){var g=withId(layers,p);if(!g)break;e.visible=e.visible&&g.visible;e.opacity*=g.opacity==null?1:g.opacity;e.x+=g.offsetX||0;e.y+=g.offsetY||0;e.px*=g.parallaxX==null?1:g.parallaxX;e.py*=g.parallaxY==null?1:g.parallaxY;p=g.parentId;}return e;}
  function image(url){if(!url)return null;var img=pictures.get(url);if(!img){img=host.image(url);pictures.set(url,img);}return img&&img.complete&&img.naturalWidth?img:null;}
  function directObjects(s){var result=[];s.layers.forEach(function(l){if(l.kind!=='objects')return;var e=effective(s.layers,l);if(e.visible)l.objects.forEach(function(o){result.push(Object.assign({},o,{x:o.x+e.x,y:o.y+e.y}));});});return result;}
  function objects(s){var result=directObjects(s);result.slice().forEach(function(o){var set=withId(s.sets,o.setId);if(!set)return;var children=directObjects({layers:set.layers}),ids=children.map(n=>n.id);children.forEach(function(n){result.push(transformSceneSetObject(o,n,set.cols*s.tileSize,set.rows*s.tileSize,ids));});});return result;}
  function solidRows(s){var rows=Array.from({length:s.rows},function(){return Array(s.cols).fill(-1);});s.layers.forEach(function(l){if(l.kind!=='tiles')return;var e=effective(s.layers,l),ts=withId(s.tilesets,l.tilesetId);if(!e.visible||!ts)return;for(var i=0;i<l.cells.length;i++){var value=l.cells[i];if(value<0)continue;var tile=value&4095,c=Math.floor(i%s.cols+e.x/s.tileSize),r=Math.floor(Math.floor(i/s.cols)+e.y/s.tileSize);if(r<0||c<0||r>=s.rows||c>=s.cols)continue;if(l.collision||ts.solid.indexOf(tile)>=0)rows[r][c]=0;else if(rows[r][c]!==0&&ts.platform.indexOf(tile)>=0)rows[r][c]=1;}});return rows;}
  function setRows(s){var rows=solidRows(s);directObjects(s).forEach(function(o){var set=withId(s.sets,o.setId),w=o.width,h=o.height;if(!set||!w||!h)return;var cells=solidRows(Object.assign({},s,{cols:set.cols,rows:set.rows,layers:set.layers})),z=s.tileSize,a=(o.rotation||0)*Math.PI/180,C=Math.cos(a),S=Math.sin(a),xs=[0,w*C,-h*S,w*C-h*S],ys=[0,w*S,h*C,w*S+h*C],c0=Math.max(0,Math.floor((o.x+Math.min(...xs))/z)),c1=Math.min(s.cols,Math.ceil((o.x+Math.max(...xs))/z)),r0=Math.max(0,Math.floor((o.y+Math.min(...ys))/z)),r1=Math.min(s.rows,Math.ceil((o.y+Math.max(...ys))/z));for(var r=r0;r<r1;r++)for(var c=c0;c<c1;c++){var dx=(c+.5)*z-o.x,dy=(r+.5)*z-o.y,x=dx*C+dy*S,y=-dx*S+dy*C;if(o.flipX)x=w-x;if(o.flipY)y=h-y;if(x<0||y<0||x>=w||y>=h)continue;var value=cells[Math.floor(y/h*set.rows)][Math.floor(x/w*set.cols)];if(value>=0&&(rows[r][c]<0||value===0))rows[r][c]=value;}});return rows;}
  function load(asset,byId,quiet){var key=(byId?'#':'')+asset,c=cache.get(key);if(c){cache.delete(key);cache.set(key,c);return c;}var s=metadata(asset,byId);if(!s){if(!quiet)warn('O desenho '+asset+' precisa de uma cena completa do Pinta. Traga o mapa de novo.');return null;}if(s.version===3&&!host.precise){if(!quiet)warn('Este motor precisa ser atualizado para jogar este cenário.');return null;}c={key:key,scene:s,objects:objects(s),rows:s.version===3?[]:setRows(s)};cache.set(key,c);for(var k of cache.keys())if(cache.size>8&&![...maps.values()].some(m=>m.key===k))cache.delete(k);s.tilesets.concat(s.art||[]).forEach(function(v){image(v.image);var i=pictures.get(v.image);if(i&&i.decode)i.decode().catch(()=>{});});return c;}
  function prepare(name,asset,byId){var c=load(asset,byId);if(!c)return null;var s=c.scene,m={scene:s,asset:asset,key:c.key,started:Date.now(),objects:c.objects.map(o=>Object.assign({},o)),events:maps.has(name)?maps.get(name).events:[],collider:host.collision(name,s,c.rows,asset)};m.events.forEach(e=>{e.at=null;});maps.set(name,m);ahead(m);return m;}
  function ahead(m){m.objects.forEach(function(o){var d=property(o,'destino')||property(o,'destination'),r=o.properties&&(o.properties.destino||o.properties.destination);if(typeof d==='string')queue.push([d,r&&r.type==='asset']);});if(pumping||!host.frame||!queue.length)return;pumping=true;var mine=turn;host.frame(function next(){if(mine!==turn)return;var q=queue.shift();if(q)load(q[0],q[1],true);if(queue.length)host.frame(next);else pumping=false;});}
  function pick(name){var m=maps.get(name);if(!m)warn('Crie o cenário '+name+' antes de usar seus blocos.');return m;}
  function animated(ts,tile,time){var frames=ts.animations&&ts.animations[tile];if(!frames||!frames.length)return tile;var at=time%frames.reduce((n,f)=>n+f.duration,0);for(var i=0;i<frames.length;i++){at-=frames[i].duration;if(at<0)return frames[i].tile;}return tile;}
  function drawTile(ctx,img,ts,cell,x,y,size,time){var tile=animated(ts,cell&4095,time),h=cell&4096?-1:1,v=cell&8192?-1:1;ctx.save();ctx.translate(x+size/2,y+size/2);if(cell&16384)ctx.transform(0,v,h,0,0,0);else ctx.scale(h,v);ctx.drawImage(img,tile%ts.columns*size,Math.floor(tile/ts.columns)*size,size,size,-size/2,-size/2,size,size);ctx.restore();}
  function near(o,e,c){var x=o.x+e.x-c.x*e.px,y=o.y+e.y-c.y*e.py,r=Math.hypot(o.width,o.height);return x+r>=0&&y+r>=0&&x-r<=host.width()&&y-r<=host.height()}function paint(ctx,s,layers,cols,rows,pass,cam,time,depth){
    if(depth>1)return;
    layers.forEach(function(l){var e=effective(layers,l);if(!e.visible||!e.opacity)return;ctx.save();ctx.globalAlpha*=e.opacity;
      if(l.kind==='tiles'&&!l.collision&&!!l.front===(pass==='front')){var ts=withId(s.tilesets,l.tilesetId),img=ts&&image(ts.image),size=s.tileSize;if(img){var dx=e.x-cam.x*e.px,dy=e.y-cam.y*e.py,c0=Math.max(0,Math.floor(-dx/size)),r0=Math.max(0,Math.floor(-dy/size)),c1=Math.min(cols,Math.ceil((host.width()-dx)/size)),r1=Math.min(rows,Math.ceil((host.height()-dy)/size));for(var r=r0;r<r1;r++)for(var c=c0;c<c1;c++){var cell=l.cells[r*cols+c];if(cell>=0)drawTile(ctx,img,ts,cell,c*size+dx,r*size+dy,size,time);}}}
      if(l.kind==='objects')l.objects.forEach(function(o){if(!depth&&!o.setId&&!near(o,e,cam))return;
        if(o.setId){var set=withId(s.sets,o.setId);if(set){ctx.save();ctx.translate(o.x+e.x-cam.x*e.px,o.y+e.y-cam.y*e.py);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.scale(o.width/(set.cols*s.tileSize),o.height/(set.rows*s.tileSize));ctx.scale(o.flipX?-1:1,o.flipY?-1:1);if(o.flipX)ctx.translate(-set.cols*s.tileSize,0);if(o.flipY)ctx.translate(0,-set.rows*s.tileSize);paint(ctx,s,set.layers,set.cols,set.rows,pass,{x:0,y:0},time,depth+1);ctx.restore();}}
        else if(o.art&&pass==='back'){var art=withId(s.art,o.art.assetId),ts=withId(s.tilesets,o.art.assetId),img=image(art?art.image:ts?ts.image:'');if(img){ctx.save();ctx.translate(o.x+e.x-cam.x*e.px,o.y+e.y-cam.y*e.py);ctx.rotate((o.rotation||0)*Math.PI/180);if(o.flipX||o.flipY){ctx.translate(o.flipX?o.width:0,o.flipY?o.height:0);ctx.scale(o.flipX?-1:1,o.flipY?-1:1);}if(ts){var tile=s.version>=2?animated(ts,o.art.tile||0,time):o.art.tile||0;ctx.drawImage(img,tile%ts.columns*s.tileSize,Math.floor(tile/ts.columns)*s.tileSize,s.tileSize,s.tileSize,0,0,o.width,o.height);}else{var crop=sceneArtFrame(art,o.art.animationId,time);ctx.drawImage(img,crop.x,crop.y,crop.width,crop.height,0,0,o.width,o.height);}ctx.restore();}}
      });ctx.restore();
    });
  }
  function inside(sprite,o){if(!sprite||!o)return false;var x=sprite.x+(sprite.w||sprite.width||0)/2-o.x,y=sprite.y+(sprite.h||sprite.height||0)/2-o.y,a=-(o.rotation||0)*Math.PI/180,px=x*Math.cos(a)-y*Math.sin(a),py=x*Math.sin(a)+y*Math.cos(a);if(o.shape==='point')return Math.hypot(px,py)<=1;if(o.shape==='ellipse')return Math.pow((px-o.width/2)/(o.width/2||.001),2)+Math.pow((py-o.height/2)/(o.height/2||.001),2)<=1;if((o.shape==='polygon'||o.shape==='polyline')&&o.points&&o.points.length){var yes=false;for(var i=0,j=o.points.length-1;i<o.points.length;j=i++){var p=o.points[i],q=o.points[j];if(o.shape!=='polyline'&&(p.y>py)!==(q.y>py)&&px<(q.x-p.x)*(py-p.y)/(q.y-p.y)+p.x)yes=!yes;if(o.shape==='polyline'&&i===0)continue;var dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,((px-p.x)*dx+(py-p.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(px-p.x-t*dx,py-p.y-t*dy)<=1)return true;}return yes;}return px>=0&&py>=0&&px<=o.width&&py<=o.height;}
  function property(o,key){var v=o&&o.properties&&Object.prototype.hasOwnProperty.call(o.properties,key)?o.properties[key]:null;return v&&typeof v==='object'&&'value'in v?v.value:v;}
  function areas(m){m.events.forEach(function(event){var p=event.sprite,k=p?[p.x,p.y,p.w,p.h,p.width,p.height].join():'';if(k===event.at)return;event.at=k;m.objects.filter(function(o){return !event.type||o.type===event.type||o.role===event.type;}).forEach(function(o){var hit=inside(event.sprite,o);if(hit&&!event.inside.has(o.id))event.callback(o);if(hit)event.inside.add(o.id);else event.inside.delete(o.id);});});}
  function watch(){if(ticking||!host.frame)return;ticking=true;var mine=turn;(function step(){if(mine!==turn)return;maps.forEach(areas);host.frame(step);})();}
  function spawn(m){return m.objects.find(o=>o.role==='start'||o.type==='inicio')||{x:m.scene.tileSize/2,y:m.scene.tileSize/2};}
  return {
    reset:function(){maps.clear();pictures.clear();warnings.clear();cache.clear();queue.length=0;turn++;ticking=false;pumping=false;},
    createMapScene:function(name,asset){prepare(String(name),String(asset));},
    drawMapScene:function(name,pass){var m=pick(name),ctx=host.context();if(!m||!ctx)return;ctx.save();host.screen(ctx);ctx.imageSmoothingEnabled=false;paint(ctx,m.scene,m.scene.layers,m.scene.cols,m.scene.rows,pass,host.camera(),m.scene.version>=2?Date.now()-m.started:Date.now(),0);ctx.restore();areas(m);},
    collideMapScene:function(sprite,name){var m=pick(name);if(m){if(m.scene.version===3)host.precise(sprite,m.scene,m.collider,sceneMoveBox,scenePlatformLanding);else host.collide(sprite,m.collider);areas(m);}},
    mapObjects:function(name,type){var m=pick(name);return m?m.objects.filter(o=>!type||o.type===type||o.role===type):[];},
    mapObjectNamed:function(name,text){var m=pick(name);return m?m.objects.find(o=>o.name===text)||null:null;},
    mapObjectById:function(name,id){var m=pick(name);return m?m.objects.find(o=>o.id===id)||null:null;},
    mapResourceImage:function(name,id){var m=pick(name),s=m&&m.scene,a=s&&withId([...(s.art||[]),...s.tilesets],id);return a?a.image:null;},
    mapLayerProperty:function(name,id,key){var m=pick(name);return property(m&&m.scene.layers.find(l=>l.id===id),key);},
    mapTileProperty:function(name,id,tile,key){var m=pick(name),ts=m&&withId(m.scene.tilesets,id);return ts&&Number.isInteger(tile)&&tile>=0&&tile<ts.count?property({properties:ts.tileProperties&&ts.tileProperties[tile]},key):null;},
    mapObjectProperty:property,
    mapObjectField:function(o,key){return o&&Object.prototype.hasOwnProperty.call(o,key)?o[key]:null;},
    mapInArea:inside,
    mapArea:function(name,sprite,type,callback){var m=pick(name);if(m&&typeof callback==='function'){m.events.push({sprite:sprite,type:type,callback:callback,inside:new Set()});watch();}},
    useMapDoor:function(name,sprite,o){if(!inside(sprite,o))return;var destination=property(o,'destino')||property(o,'destination');if(typeof destination!=='string')return;var ref=o.properties.destino||o.properties.destination,m=prepare(name,destination,ref&&ref.type==='asset');if(m){var p=spawn(m);sprite.x=p.x;sprite.y=p.y;if(sprite.body&&typeof sprite.body.reset==='function')sprite.body.reset(p.x,p.y);}},
    mapSpawn:function(name,axis){var m=pick(name);return m?spawn(m)[axis]||0:0;},
    mapSize:function(name,axis){var m=pick(name);return m?(axis==='width'?m.scene.cols:m.scene.rows)*m.scene.tileSize:0;}
  };
}
`
