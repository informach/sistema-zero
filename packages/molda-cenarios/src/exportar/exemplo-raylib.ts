/** Código fixo; o único parâmetro é um identificador Python gerado/validado. */
export function exemploRaylib(modulo: string) {
  if (!/^cenario_[a-z0-9_]+$/.test(modulo)) throw Error('O nome do módulo Python é inválido.')
  return `"""Inspecione o cenário com câmera livre. WASD/setas: mover; mouse: olhar; Esc: sair.
Use lugar.altura/tem_chao/colide_caixa para conectar as regras do seu jogo.
Água permanece estática neste destino.
"""
import math
import pyray as p
from ${modulo} import carregar

p.init_window(960, 640, 'Cenário do Molda')
p.set_target_fps(60)
lugar = None
try:
    lugar = carregar()
    inicios = [m for m in lugar.dados['marcadores'] if m.get('configuracao', {}).get('tipo') == 'inicio']
    inicio = next((m for m in inicios if m['configuracao'].get('principal')), inicios[0] if inicios else None)
    pos = inicio['posicao'] if inicio else {'x': 0, 'y': 0, 'z': 0}
    giro = inicio['giro'] if inicio else 0
    chao = lugar.altura(pos['x'], pos['z'])
    olho = (chao if chao is not None else pos['y']) + 1.16
    camera = p.Camera3D(p.Vector3(pos['x'], olho, pos['z']),
                        p.Vector3(pos['x'] + math.sin(giro), olho, pos['z'] - math.cos(giro)),
                        p.Vector3(0, 1, 0), 60, p.CAMERA_PERSPECTIVE)
    p.disable_cursor()
    while not p.window_should_close():
        p.update_camera(camera, p.CAMERA_FREE)
        p.begin_drawing()
        p.clear_background(p.Color(163, 205, 233, 255))
        p.begin_mode_3d(camera)
        lugar.desenhar()
        p.end_mode_3d()
        p.draw_text('Camera livre | WASD: mover | Mouse: olhar | Esc: sair', 12, 12, 18, p.DARKBLUE)
        p.end_drawing()
finally:
    if lugar is not None:
        lugar.descartar()
    p.close_window()
`
}

export const MODULO_DE_DADOS_RAYLIB = `"""Dados do cenário: a mesma revisão compilada do Molda, em cenario.json."""
import os
from cenario import carregar as _carregar


def carregar():
    return _carregar(os.path.join(os.path.dirname(__file__), 'cenario.json'))
`
