#!/usr/bin/env python3
"""Generate two native Jogo 3D projects with existing gallery GLB placeholders.

The user will create the definitive art and its variants in Blender.
No procedural art configuration or appearance-choice variables are shipped.
"""
from pathlib import Path
import json
import textwrap

OUT = Path(__file__).resolve().parent


def prepared_art():
    return '''
const cena = SZGame3D.createFullscreenScene("#020617");
SZGame3D.setSky(cena, "#020617", "#312e81");
SZGame3D.setFog(cena, "#0b1030", 30, 75);
SZGame3D.setCameraPosition(cena, 0, 8, 12);
const alvoCamera = SZGame3D.createModel(cena);
SZGame3D.setPosition(alvoCamera, 0, 1, -12);
SZGame3D.cameraLookAt(cena, alvoCamera);
const nave = SZGame3D.createModelFile(cena, "patrulha-nave-provisoria", 3);
SZGame3D.setPosition(nave, 0, 1, 0);
const moldeAsteroide = SZGame3D.createModelFile(cena, "patrulha-asteroide-provisorio", 1.8);
SZGame3D.setVisible(moldeAsteroide, "hide");
const moldeTiro = SZGame3D.createModelFile(cena, "patrulha-laser-provisorio", 0.9);
SZGame3D.setVisible(moldeTiro, "hide");
const tiros = SZGame3D.createGroup();
const asteroides = SZGame3D.createGroup();
let naveX = 0;
let alvoAtivo = true;
'''.strip()


MOVEMENT = '''
if (SZGame3D.keyDown("ArrowLeft")) {
  naveX = naveX - 7 * SZGame3D.dt(cena);
}
if (SZGame3D.keyDown("ArrowRight")) {
  naveX = naveX + 7 * SZGame3D.dt(cena);
}
if (naveX < -5.2) { naveX = -5.2; }
if (naveX > 5.2) { naveX = 5.2; }
SZGame3D.setPosition(nave, naveX, 1, 0);
SZGame3D.forEachInGroup(tiros, (tiro) => {
  SZGame3D.setVelocity(tiro, 0, 0, velocidadeTiros);
});
SZGame3D.updateGroupNoGravity(tiros);
SZGame3D.forEachInGroup(asteroides, (asteroide) => {
  SZGame3D.setVelocity(asteroide, 0, 0, velocidadeAsteroides);
});
SZGame3D.updateGroupNoGravity(asteroides);
'''.strip()


def source(initial=False):
    text = prepared_art() + '\n'
    if initial:
        text += '''
let velocidadeTiros = 0;
let velocidadeAsteroides = 0;
let estado = "inicio";
SZGame3D.setScreenText("fim", "Vamos tentar outra vez?", "Sua nave pode abrir esta rota. Volte ao início para uma nova patrulha.", "Voltar ao início");
SZGame3D.setScreenText("vitoria", "Rota liberada!", "Você abriu passagem por 20 asteroides. A patrulha pode continuar!", "Voltar ao início");
SZGame3D.hudText("top-center", "PATRULHA ESPACIAL | Projeto inicial");
SZGame3D.hudText("bottom-center", "ENTER: começar | SETAS: mover");
SZGame3D.onKey("Enter", () => {
  if (estado === "inicio") {
    estado = "jogando";
    SZGame3D.hudText("top-center", "PATRULHA ESPACIAL | Conheça a nave");
    SZGame3D.hudText("bottom-center", "SETAS: mover | Tiros, asteroides e regras serão construídos nas aulas.");
  }
});
SZGame3D.animate(cena, () => {
  if (estado === "jogando") {
'''
        text += textwrap.indent(MOVEMENT, '    ')
        text += '''
    SZGame3D.forEachInGroup(asteroides, (asteroide) => {
      alvoAtivo = true;
      SZGame3D.forEachInGroup(tiros, (tiro) => {
        if (alvoAtivo) {
        }
      });
    });
  }
});
'''
    else:
        text += '''
let velocidadeTiros = -22;
let velocidadeAsteroides = 7;
let pontos = 0;
let estado = "inicio";
SZGame3D.setLife(nave, 3);
SZGame3D.setScreenText("fim", "Vamos tentar outra vez?", "Sua nave pode abrir esta rota. Volte ao início para uma nova patrulha.", "Voltar ao início");
SZGame3D.setScreenText("vitoria", "Rota liberada!", "Você abriu passagem por 20 asteroides. A patrulha pode continuar!", "Voltar ao início");
SZGame3D.hudText("top-center", "PATRULHA ESPACIAL | Abra uma rota entre os asteroides");
SZGame3D.hudText("top-right", "Acertos: 0 / 20");
SZGame3D.hudText("bottom-center", "ENTER: começar | SETAS: mover | ESPAÇO: um tiro por aperto");
SZGame3D.onKey("Enter", () => {
  if (estado === "inicio") {
    estado = "jogando";
    SZGame3D.hudText("top-center", "Abra a rota: acerte 20 asteroides e proteja sua nave");
    SZGame3D.hudText("bottom-center", "SETAS: mover | ESPAÇO: atirar | Asteroide que passa não tira vida");
  }
});
SZGame3D.onKey("Space", () => {
  if (estado === "jogando") {
    SZGame3D.spawnCopy(tiros, moldeTiro, SZGame3D.getPos(nave, "x"), 1, -1.6);
    SZGame3D.playNote(880, 60);
  }
});
SZGame3D.onTouchGroup(nave, asteroides, (asteroideQueBateu) => {
  if (estado === "jogando") {
    SZGame3D.removeFromGroup(asteroides, asteroideQueBateu);
    SZGame3D.hurt(nave, 1);
    SZGame3D.playEffect("hit");
  }
});
SZGame3D.animate(cena, () => {
  if (estado === "jogando") {
    if (SZGame3D.lifeOf(nave) <= 0) {
      estado = "derrota";
      SZGame3D.hudText("bottom-center", "");
      SZGame3D.endGame("perdeu");
    } else {
      if (pontos >= 20) {
        estado = "vitoria";
        SZGame3D.hudText("bottom-center", "");
        SZGame3D.playEffect("coin");
        SZGame3D.endGame("ganhou");
      }
    }
  }
  if (estado === "jogando") {
'''
        text += textwrap.indent(MOVEMENT, '    ')
        text += '''
    SZGame3D.forEachInGroup(asteroides, (asteroide) => {
      alvoAtivo = true;
      SZGame3D.forEachInGroup(tiros, (tiro) => {
        if (alvoAtivo) {
          if (SZGame3D.collides(tiro, asteroide)) {
            SZGame3D.removeFromGroup(asteroides, asteroide);
            SZGame3D.removeFromGroup(tiros, tiro);
            pontos = pontos + 1;
            alvoAtivo = false;
            SZGame3D.playEffect("coin");
            SZGame3D.hudText("top-right", "Acertos: " + pontos + " / 20");
          }
        }
      });
    });
    SZGame3D.pruneArea(tiros, "z", -36, 3);
    SZGame3D.pruneArea(asteroides, "z", -36, 6);
  }
});
SZGame3D.everySecondsLoop(1.5, () => {
  if (estado === "jogando") {
    SZGame3D.spawnCopy(asteroides, moldeAsteroide, Math.random() * 10.4 - 5.2, 1, -28);
  }
});
'''
    return text.strip() + '\n'


def main():
    manifest = []
    for initial, stem, title in [
        (False, 'patrulha-espacial-3d-completo', 'Patrulha Espacial 3D | Jogo completo'),
        (True, 'patrulha-espacial-3d-inicial', 'Patrulha Espacial 3D | Projeto inicial'),
    ]:
        path = OUT / f'{stem}.source.js'
        path.write_text(source(initial), encoding='utf-8')
        manifest.append(dict(stem=stem, source=path.name, name=title, initial=initial, assetsFile='assets.json'))
    (OUT / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'files': [x['source'] for x in manifest], 'embeddedModels': 3, 'source': 'Existing Patrulha Espacial gallery models; definitive art and variants by Helena in Blender'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
