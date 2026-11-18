/**
 * Sem estado de motor: os hosts emprestam desenho, câmera e a colisão que já existe.
 *
 * As áreas ("Quando entrar em área") são conferidas a cada quadro pelo relógio do host
 * (`host.frame`), e também ao desenhar e ao colidir, para o jogo que não desenha a camada de
 * trás receber os eventos do mesmo jeito. Entrar conta uma vez só, por mais que se confira.
 */
export const mapTwoDSource = `
function createMap2D(host) {
  var maps=new Map(),pictures=new Map(),warnings=new Set(),turn=0,ticking=false;
  function warn(text){if(!warnings.has(text)){warnings.add(text);host.warn(text);}}
  function metadata(image){var value=host.meta(image);return value&&value.scene&&value.scene.version===1?value.scene:null;}
  function effective(layers,l){var e={visible:l.visible,opacity:l.opacity==null?1:l.opacity,x:l.offsetX||0,y:l.offsetY||0,px:l.parallaxX==null?1:l.parallaxX,py:l.parallaxY==null?1:l.parallaxY},p=l.parentId;for(var n=0;p&&n<32;n++){var g=layers.find(function(v){return v.id===p;});if(!g)break;e.visible=e.visible&&g.visible;e.opacity*=g.opacity==null?1:g.opacity;e.x+=g.offsetX||0;e.y+=g.offsetY||0;e.px*=g.parallaxX==null?1:g.parallaxX;e.py*=g.parallaxY==null?1:g.parallaxY;p=g.parentId;}return e;}
  function image(url){if(!url)return null;var img=pictures.get(url);if(!img){img=host.image(url);pictures.set(url,img);}return img&&img.complete&&img.naturalWidth?img:null;}
  function directObjects(s){var result=[];s.layers.forEach(function(l){if(l.kind!=='objects')return;var e=effective(s.layers,l);if(e.visible)l.objects.forEach(function(o){result.push(Object.assign({},o,{x:o.x+e.x,y:o.y+e.y}));});});return result;}
  function setPoint(o,set,size,x,y){var a=(o.rotation||0)*Math.PI/180,px=(o.flipX?set.cols*size-x:x)*o.width/(set.cols*size),py=(o.flipY?set.rows*size-y:y)*o.height/(set.rows*size);return{x:o.x+px*Math.cos(a)-py*Math.sin(a),y:o.y+px*Math.sin(a)+py*Math.cos(a)};}
  function objects(s){var result=directObjects(s);result.slice().forEach(function(o){var set=(s.sets||[]).find(function(v){return v.id===o.setId;});if(!set)return;directObjects({layers:set.layers}).forEach(function(n){var p=setPoint(o,set,s.tileSize,n.x,n.y),properties={};Object.keys(n.properties||{}).forEach(function(k){var v=n.properties[k];properties[k]=v&&typeof v==='object'&&v.type==='object'?Object.assign({},v,{value:o.id+'/'+v.value}):v;});result.push(Object.assign({},n,{properties:properties,id:o.id+'/'+n.id,x:p.x,y:p.y,width:n.width*o.width/(set.cols*s.tileSize),height:n.height*o.height/(set.rows*s.tileSize),rotation:(o.rotation||0)+(!!o.flipX!==!!o.flipY?-(n.rotation||0):(n.rotation||0)),flipX:!!o.flipX!==!!n.flipX,flipY:!!o.flipY!==!!n.flipY}));});});return result;}
  function solidRows(s){var rows=Array.from({length:s.rows},function(){return Array(s.cols).fill(-1);});s.layers.forEach(function(l){if(l.kind!=='tiles')return;var e=effective(s.layers,l),ts=s.tilesets.find(function(t){return t.id===l.tilesetId;});if(!e.visible||!ts)return;for(var i=0;i<l.cells.length;i++){var value=l.cells[i];if(value<0)continue;var tile=value&4095,c=Math.floor(i%s.cols+e.x/s.tileSize),r=Math.floor(Math.floor(i/s.cols)+e.y/s.tileSize);if(r<0||c<0||r>=s.rows||c>=s.cols)continue;if(l.collision||ts.solid.indexOf(tile)>=0)rows[r][c]=0;else if(rows[r][c]!==0&&ts.platform.indexOf(tile)>=0)rows[r][c]=1;}});return rows;}
  function setRows(s){var rows=solidRows(s);directObjects(s).forEach(function(o){var set=(s.sets||[]).find(function(v){return v.id===o.setId;});if(!set)return;var cells=solidRows(Object.assign({},s,{cols:set.cols,rows:set.rows,layers:set.layers}));for(var r=0;r<set.rows;r++)for(var c=0;c<set.cols;c++){if(cells[r][c]<0)continue;var p=setPoint(o,set,s.tileSize,(c+.5)*s.tileSize,(r+.5)*s.tileSize),x=Math.floor(p.x/s.tileSize),y=Math.floor(p.y/s.tileSize);if(x>=0&&y>=0&&x<s.cols&&y<s.rows&&(rows[y][x]<0||cells[r][c]===0))rows[y][x]=cells[r][c];}});return rows;}
  function prepare(name,asset){var s=metadata(asset);if(!s){warn('O desenho '+asset+' precisa de uma cena completa do Pinta. Traga o mapa de novo.');return null;}var m={scene:s,asset:asset,objects:objects(s),events:maps.has(name)?maps.get(name).events:[],collider:host.collision(name,s,setRows(s),asset)};maps.set(name,m);return m;}
  function pick(name){var m=maps.get(name);if(!m)warn('Crie o cenário '+name+' antes de usar seus blocos.');return m;}
  function animated(ts,tile,time){var frames=ts.animations&&ts.animations[tile];if(!frames||!frames.length)return tile;var at=time%frames.reduce(function(n,f){return n+f.duration;},0);for(var i=0;i<frames.length;i++){at-=frames[i].duration;if(at<0)return frames[i].tile;}return tile;}
  function drawTile(ctx,img,ts,cell,x,y,size,time){var tile=animated(ts,cell&4095,time),h=cell&4096?-1:1,v=cell&8192?-1:1;ctx.save();ctx.translate(x+size/2,y+size/2);if(cell&16384)ctx.transform(0,v,h,0,0,0);else ctx.scale(h,v);ctx.drawImage(img,tile%ts.columns*size,Math.floor(tile/ts.columns)*size,size,size,-size/2,-size/2,size,size);ctx.restore();}
  function paint(ctx,s,layers,cols,rows,pass,cam,time,depth){
    if(depth>1)return;
    layers.forEach(function(l){var e=effective(layers,l);if(!e.visible||!e.opacity)return;ctx.save();ctx.globalAlpha*=e.opacity;
      if(l.kind==='tiles'&&!l.collision&&!!l.front===(pass==='front')){var ts=s.tilesets.find(function(t){return t.id===l.tilesetId;}),img=ts&&image(ts.image),size=s.tileSize;if(img){var dx=e.x-cam.x*e.px,dy=e.y-cam.y*e.py,c0=Math.max(0,Math.floor(-dx/size)),r0=Math.max(0,Math.floor(-dy/size)),c1=Math.min(cols,Math.ceil((host.width()-dx)/size)),r1=Math.min(rows,Math.ceil((host.height()-dy)/size));for(var r=r0;r<r1;r++)for(var c=c0;c<c1;c++){var cell=l.cells[r*cols+c];if(cell>=0)drawTile(ctx,img,ts,cell,c*size+dx,r*size+dy,size,time);}}}
      if(l.kind==='objects')l.objects.forEach(function(o){
        if(o.setId){var set=(s.sets||[]).find(function(v){return v.id===o.setId;});if(set){ctx.save();ctx.translate(o.x+e.x-cam.x*e.px,o.y+e.y-cam.y*e.py);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.scale(o.width/(set.cols*s.tileSize),o.height/(set.rows*s.tileSize));ctx.scale(o.flipX?-1:1,o.flipY?-1:1);if(o.flipX)ctx.translate(-set.cols*s.tileSize,0);if(o.flipY)ctx.translate(0,-set.rows*s.tileSize);paint(ctx,s,set.layers,set.cols,set.rows,pass,{x:0,y:0},time,depth+1);ctx.restore();}}
        else if(o.art&&pass==='back'){var art=(s.art||[]).find(function(v){return v.id===o.art.assetId;}),ts=s.tilesets.find(function(v){return v.id===o.art.assetId;}),img=image(art?art.image:ts?ts.image:'');if(img){ctx.save();ctx.translate(o.x+e.x-cam.x*e.px,o.y+e.y-cam.y*e.py);ctx.rotate((o.rotation||0)*Math.PI/180);if(o.flipX||o.flipY){ctx.translate(o.flipX?o.width:0,o.flipY?o.height:0);ctx.scale(o.flipX?-1:1,o.flipY?-1:1);}if(ts){var tile=o.art.tile||0;ctx.drawImage(img,tile%ts.columns*s.tileSize,Math.floor(tile/ts.columns)*s.tileSize,s.tileSize,s.tileSize,0,0,o.width,o.height);}else ctx.drawImage(img,0,0,o.width,o.height);ctx.restore();}}
      });ctx.restore();
    });
  }
  function inside(sprite,o){if(!sprite||!o)return false;var x=sprite.x+(sprite.w||sprite.width||0)/2-o.x,y=sprite.y+(sprite.h||sprite.height||0)/2-o.y,a=-(o.rotation||0)*Math.PI/180,px=x*Math.cos(a)-y*Math.sin(a),py=x*Math.sin(a)+y*Math.cos(a);if(o.shape==='ellipse')return Math.pow((px-o.width/2)/(o.width/2||1),2)+Math.pow((py-o.height/2)/(o.height/2||1),2)<=1;if(o.shape==='polygon'&&o.points&&o.points.length){var yes=false;for(var i=0,j=o.points.length-1;i<o.points.length;j=i++){var p=o.points[i],q=o.points[j];if((p.y>py)!==(q.y>py)&&px<(q.x-p.x)*(py-p.y)/(q.y-p.y)+p.x)yes=!yes;}return yes;}return px>=0&&py>=0&&px<=o.width&&py<=o.height;}
  function property(o,key){var v=o&&o.properties&&Object.prototype.hasOwnProperty.call(o.properties,key)?o.properties[key]:null;return v&&typeof v==='object'&&'value'in v?v.value:v;}
  function areas(m){m.events.forEach(function(event){m.objects.filter(function(o){return !event.type||o.type===event.type||o.role===event.type;}).forEach(function(o){var hit=inside(event.sprite,o);if(hit&&!event.inside.has(o.id))event.callback(o);if(hit)event.inside.add(o.id);else event.inside.delete(o.id);});});}
  function watch(){if(ticking||!host.frame)return;ticking=true;var mine=++turn;(function step(){if(mine!==turn)return;maps.forEach(areas);host.frame(step);})();}
  function spawn(m){return m.objects.find(function(o){return o.role==='start'||o.type==='inicio';})||{x:m.scene.tileSize/2,y:m.scene.tileSize/2};}
  return {
    reset:function(){maps.clear();pictures.clear();warnings.clear();turn++;ticking=false;},
    createMapScene:function(name,asset){prepare(String(name),String(asset));},
    drawMapScene:function(name,pass){var m=pick(name),ctx=host.context();if(!m||!ctx)return;ctx.save();host.screen(ctx);ctx.imageSmoothingEnabled=false;paint(ctx,m.scene,m.scene.layers,m.scene.cols,m.scene.rows,pass,host.camera(),Date.now(),0);ctx.restore();areas(m);},
    collideMapScene:function(sprite,name){var m=pick(name);if(m){host.collide(sprite,m.collider);areas(m);}},
    mapObjects:function(name,type){var m=pick(name);return m?m.objects.filter(function(o){return !type||o.type===type||o.role===type;}):[];},
    mapObjectNamed:function(name,text){var m=pick(name);return m?m.objects.find(function(o){return o.name===text;})||null:null;},
    mapObjectProperty:property,
    mapObjectField:function(o,key){return o&&Object.prototype.hasOwnProperty.call(o,key)?o[key]:null;},
    mapInArea:inside,
    mapArea:function(name,sprite,type,callback){var m=pick(name);if(m&&typeof callback==='function'){m.events.push({sprite:sprite,type:type,callback:callback,inside:new Set()});watch();}},
    useMapDoor:function(name,sprite,o){if(!inside(sprite,o))return;var destination=property(o,'destino')||property(o,'destination');if(typeof destination!=='string')return;var m=prepare(name,destination);if(m){var p=spawn(m);sprite.x=p.x;sprite.y=p.y;if(sprite.body&&typeof sprite.body.reset==='function')sprite.body.reset(p.x,p.y);}},
    mapSpawn:function(name,axis){var m=pick(name);return m?spawn(m)[axis]||0:0;},
    mapSize:function(name,axis){var m=pick(name);return m?(axis==='width'?m.scene.cols:m.scene.rows)*m.scene.tileSize:0;}
  };
}
`
