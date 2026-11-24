"""Real Pygame-ce: one-way support in native PNG 4 and the portable package."""
import importlib.util
import json
import os
import sys
from pathlib import Path

os.environ['SDL_VIDEODRIVER'] = 'dummy'
os.environ['SDL_AUDIODRIVER'] = 'dummy'
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = '1'
sys.path.insert(0,str(Path(__file__).resolve().parents[2] / 'src/runtime/python/pygame/py'))
import pygame
import pinta

pygame.init()
pygame.display.set_mode((320,240))
folder=Path(sys.argv[1]).resolve()

def verify(landing, scale):
    def body(x,y,w=4,h=4):
        return pygame.FRect(x*scale,y*scale,w*scale,h*scale)
    before, after=body(40,10),body(40,100)
    original_before,original_after=before.copy(),after.copy()
    support=landing(before,after)
    assert support is not None and abs(support.y/scale-36.25)<0.0001,support
    assert before==original_before and after==original_after
    assert landing(support,support)==support
    assert landing(body(40,100),body(40,10)) is None
    assert landing(body(40,40),body(40,100)) is None
    assert landing(before,after,0) is None
    inverted=landing(body(40,100),body(40,10),-1)
    assert inverted is not None and abs(inverted.y/scale-42.25)<0.0001,inverted
    assert landing(body(36,10),body(36,100)) is None
    assert landing(body(44,10),body(44,100)) is None
    assert landing(body(40,10),body(40,100),float('nan')) is None
    for _ in range(50):
        desired=support.move(0,0.01*scale)
        support=landing(support,desired)
        assert support is not None and abs(support.bottom/scale-40.25)<0.0001,support
    return 60

results=[]
for scale in (1,2):
    world=pinta.Mapa(folder/f'platforms-{scale}x.png')
    assert world.versao==4 and world.cena['version']==3
    results.append({'scale':scale,'checks':verify(world.pouso,scale)})

spec=importlib.util.spec_from_file_location('portable_platforms',folder/'pygame/pinta_cenario.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
game=module.Mundo(folder/'pygame','plataformas-precisas')
verify(game.pouso,1)
game.jogador=pygame.FRect(40,10,4,4)
game.mover(0,90,gravidade=1)
assert abs(game.jogador.y-36.25)<0.0001,game.jogador
game.jogador=pygame.FRect(40,10,4,4)
game.mover(0,90)
assert game.jogador.y==100,game.jogador
cases=json.loads((folder/'pygame/platform-probes.json').read_text(encoding='utf-8'))['cases']
for case in cases:
    game.carregar(case['scene']['name'])
    before=pygame.FRect(*(case['previous'][key] for key in ('x','y','width','height')))
    desired=pygame.FRect(*(case['desired'][key] for key in ('x','y','width','height')))
    actual=game.pouso(before,desired,case['gravity'])
    expected=case['result']
    assert (actual is None)==(expected is None),(case['name'],actual,expected)
    if expected is not None:
        assert all(abs(getattr(actual,key)-expected[key])<0.0001 for key in ('x','y','width','height')),(case['name'],actual,expected)
print(json.dumps({'pygame':pygame.version.ver,'png':results,'portable':True,'topDownUnchanged':True,'geometryCases':len(cases)}))
pygame.quit()
