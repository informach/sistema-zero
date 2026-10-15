
SZGame2D.setupStage(480,300,"#18384b");
SZGame2D.fitScreen(100);
SZGame2D.defineShape("azul",function(ctx){
 SZGame2D.paintCircle(ctx,50,50,36,"#53d0e1");
 SZGame2D.paintCircle(ctx,63,42,6,"#172a46");
 SZGame2D.paintRect(ctx,22,78,18,12,"#2ba8c6");
 SZGame2D.paintRect(ctx,60,78,18,12,"#2ba8c6");
});
SZGame2D.defineShape("amarelo",function(ctx){
 SZGame2D.paintCircle(ctx,50,50,34,"#ffdb56");
 SZGame2D.paintCircle(ctx,35,42,6,"#172a46");
 SZGame2D.paintTriangle(ctx,60,10,78,32,50,28,"#f2ad36");
});
const azul=SZGame2D.createShapeSprite("azul",{x:70,y:140,w:100,h:100});
const amarelo=SZGame2D.createShapeSprite("amarelo",{x:310,y:60,w:100,h:100});
SZGame2D.setHealth(amarelo,20);
let ataque=5;
SZGame2D.onKey("Space",function(){SZGame2D.changeHealth(amarelo,0-ataque);});
SZGame2D.gameLoop(function update(){
 SZGame2D.clear();
 SZGame2D.drawSprite(ctx,azul);
 SZGame2D.drawSprite(ctx,amarelo);
 SZGame2D.drawBar(ctx,SZGame2D.getHealth(amarelo),20,305,40,110,10,"#6bdca3");
 SZGame2D.drawLabel(ctx,"ESPAÇO para testar",30,270,"#ffffff",16,"left");
});