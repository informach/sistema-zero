"""PNG portátil real e API pública pinta.Mapa usada pelos projetos Python do Estúdio."""
import json
from pathlib import Path
import sys
import pygame

repo = Path(__file__).resolve().parents[4]
runtime = Path(sys.argv[2]) if len(sys.argv) > 2 else repo / 'packages/studio/src/runtime/python/pygame/py'
sys.path.insert(0, str(runtime))
import pinta

pygame.init()
try:
    pygame.display.set_mode((160,128))
    mapa = pinta.carregar_mapa(str(Path(sys.argv[1]).resolve()))
    layer_id = mapa.cena['layers'][0]['id']
    ref = mapa.propriedade_camada(layer_id, 'resource')
    surface = mapa.recurso_imagem(ref)
    assert surface.get_at((8,8)) == (255,255,0,255)
    assert mapa.propriedade_camada(layer_id, 'score') == 0
    ts = mapa.cena['tilesets'][0]['id']
    assert mapa.propriedade_peca(ts,0,'allowed') is False
    assert mapa.propriedade_peca(ts,0,'empty') == ''
    obj = mapa.objeto_por_id(mapa.propriedade_peca(ts,0,'related'))
    assert obj.nome == 'Árvore QA'
    assert obj is mapa.objeto_por_id(obj.id)
    assert mapa.objeto_por_id('missing') is None
    assert mapa.recurso_imagem('missing') is None
    scale = mapa.cena['tileSize'] / 16
    screen = pygame.Surface((int(160*scale),int(128*scale)),pygame.SRCALPHA)
    old_clock = pygame.time.get_ticks
    try:
        for elapsed,color in [(0,(255,0,0,255)),(300,(0,255,0,255)),(600,(0,0,255,255))]:
            pygame.time.get_ticks = lambda: mapa._cena.inicio_animacao + elapsed
            screen.fill((0,0,0,0))
            mapa.desenhar(screen)
            assert screen.get_at((int(24*scale),int(24*scale))) == color
    finally:
        pygame.time.get_ticks = old_clock
    print(json.dumps({'studio_python_references':True,'scene':mapa.cena['version'],'scale':scale}))
finally:
    pygame.quit()
