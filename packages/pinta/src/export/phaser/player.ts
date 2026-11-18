export const phaserPlayer = `
class PintaGame extends Phaser.Scene {
  preload() {
    for(const scene of Object.values(PINTA_MAPS)) {
      for(const image of [...scene.tilesets,...(scene.art||[])]) this.load.image(image.image,image.image);
    }
    this.load.tilemapTiledJSON('tiled',PINTA_TILED);
  }
  create() {
    this.tiled=this.make.tilemap({key:'tiled'});
    this.surface=this.textures.createCanvas('pinta-view',640,480);
    this.add.image(0,0,'pinta-view').setOrigin(0);
    const hero=this.add.rectangle(0,0,12,12,0x4ade80).setOrigin(0).setVisible(false);
    this.physics.add.existing(hero);this.hero=hero;
    this.keys=this.input.keyboard.createCursorKeys();
    let collision=null;
    this.maps=createMap2D({
      meta:name=>{const scene=PINTA_MAPS[name]||Object.values(PINTA_MAPS).find(s=>s.id===name||s.name===name);return scene?{scene}:null;},
      context:()=>this.surface.context,width:()=>640,height:()=>480,
      camera:()=>({x:Math.max(0,hero.x-320),y:Math.max(0,hero.y-240)}),screen:ctx=>ctx.setTransform(1,0,0,1,0,0),
      image:url=>this.textures.get(url).getSourceImage(),warn:message=>console.warn(message),
      collision:(name,scene,rows)=>{
        if(collision)collision.destroy(true);collision=this.physics.add.staticGroup();
        this.physics.world.setBounds(0,0,scene.cols*scene.tileSize,scene.rows*scene.tileSize);
        for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(rows[y][x]>=0){
          const cell=this.add.rectangle((x+0.5)*scene.tileSize,(y+0.5)*scene.tileSize,scene.tileSize,scene.tileSize).setVisible(false);
          this.physics.add.existing(cell,true);if(rows[y][x]===1){cell.body.checkCollision.down=false;cell.body.checkCollision.left=false;cell.body.checkCollision.right=false;}
          collision.add(cell);
        }
        return collision;
      },collide:(sprite,group)=>this.physics.collide(sprite,group)
    });
    this.maps.createMapScene('mapa',PINTA_START);
    hero.setPosition(this.maps.mapSpawn('mapa','x'),this.maps.mapSpawn('mapa','y'));hero.body.reset(hero.x,hero.y);hero.body.setCollideWorldBounds(true);
    window.pintaGame=this;
  }
  update() {
    const hero=this.hero,keys=this.keys;if(!hero)return;
    hero.body.setVelocity((keys.right.isDown-keys.left.isDown)*120,(keys.down.isDown-keys.up.isDown)*120);
    this.maps.collideMapScene(hero,'mapa');
    for(const door of this.maps.mapObjects('mapa','door'))this.maps.useMapDoor('mapa',hero,door);
    const ctx=this.surface.context;ctx.clearRect(0,0,640,480);ctx.fillStyle='#e8edf4';ctx.fillRect(0,0,640,480);
    this.maps.drawMapScene('mapa','back');
    ctx.fillStyle='#4ade80';ctx.fillRect(hero.x-Math.max(0,hero.x-320),hero.y-Math.max(0,hero.y-240),hero.width,hero.height);
    this.maps.drawMapScene('mapa','front');this.surface.refresh();
  }
}
new Phaser.Game({type:Phaser.CANVAS,width:640,height:480,backgroundColor:'#e8edf4',parent:'jogo',physics:{default:'arcade',arcade:{gravity:{y:0}}},scene:PintaGame});
`
