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
game=module.carregar_cenario(folder/'pygame/cenario.png')
verify(game.pouso,1)
# The facade returns support without owning/mutating the game's body.
body=pygame.FRect(40,10,4,4)
support=game.pouso(body,body.move(0,90))
assert abs(support.y-36.25)<0.0001,support
assert body==pygame.FRect(40,10,4,4),body
cases=json.loads((folder/'pygame/platform-probes.json').read_text(encoding='utf-8'))['cases']
for case in cases:
    game.carregar(case['scene']['id'])
    before=pygame.FRect(*(case['previous'][key] for key in ('x','y','width','height')))
    desired=pygame.FRect(*(case['desired'][key] for key in ('x','y','width','height')))
    actual=game.pouso(before,desired,case['gravity'])
    expected=case['result']
    assert (actual is None)==(expected is None),(case['name'],actual,expected)
    if expected is not None:
        assert all(abs(getattr(actual,key)-expected[key])<0.0001 for key in ('x','y','width','height')),(case['name'],actual,expected)
# Execute the shipped game, including falling and the top-down branch.
sys.path.insert(0,str(folder/'pygame'))
main_spec=importlib.util.spec_from_file_location('portable_game',folder/'pygame/main.py')
main_module=importlib.util.module_from_spec(main_spec)
main_spec.loader.exec_module(main_module)
game.carregar('qa-platform-physics')
player=main_module.Jogo(game)
player.corpo=pygame.FRect(40,10,4,4)
player.mover(0,0,0.6)
assert abs(player.corpo.y-36.25)<0.0001 and player.no_chao,player.corpo
game.carregar('invisivel')
player=main_module.Jogo(game)
assert not player.plataforma
player.corpo=pygame.FRect(40,10,4,4)
player.mover(0,1,0.75)
assert abs(player.corpo.y-100)<0.0001,player.corpo
print(json.dumps({'pygame':pygame.version.ver,'png':results,'portable':True,'topDownUnchanged':True,'geometryCases':len(cases)}))
game.descartar()
pygame.quit()
