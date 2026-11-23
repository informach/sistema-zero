/**
 * O relevo de mundo grande no Raylib 3D do Estúdio (plano "Mundos de 2 km", lote 6, 23/11/2026):
 * um mundo de 2 km com colinas, compilado em campo pela autoria e pelo compilador de verdade e
 * trazido para o projeto Python pelo importador do Estúdio (o módulo `cenario_…` e os caminhos dos
 * materiais). O programa dá quatro voltas num quadrado de 1,6 km de lado; em cada canto espera o
 * relevo completar em volta, escreve o que contou e espera a prova apertar N, para ela ler os objetos
 * de GPU vivos do quadro. Fica no servidor de qualificação local; nada disto entra num artefato.
 */
export const RAYLIB_RELEVO_FIXTURE = 'raylib-relevo-2km'

export const programaDoRelevo = (modulo: string) => `import cenario
import ${modulo} as mundo
from pyray import *
from _szraylib import _rt

# Ensaio do relevo de mundo grande: quatro voltas num quadrado de 1,6 km, 25 m por quadro.
init_window(480, 320, 'Relevo')
camera = Camera3D(Vector3(-800, 80, -740), Vector3(-800, 0, -800), Vector3(0, 1, 0), 60,
                  CAMERA_PERSPECTIVE)
lugar = cenario.carregar(mundo)
CANTOS = [(-800, -800), (800, -800), (800, 800), (-800, 800)]


def olhar(x, z, dx, dz):
    h = lugar.altura(x, z) or 0
    camera.position = Vector3(x - dx * 60, h + 40, z - dz * 60)
    camera.target = Vector3(x, h, z)


def quadro():
    begin_drawing()
    clear_background(SKYBLUE)
    begin_mode_3d(camera)
    lugar.desenhar()
    end_mode_3d()
    end_drawing()


def parar(volta, canto, x, z):
    # Espera o relevo completo em volta e escreve o que contou; depois espera o N desenhando o
    # mesmo estado (a prova lê ali os objetos de GPU vivos do quadro).
    while lugar.estado_do_relevo()['faltam'] and not window_should_close():
        lugar.atualizar(float(x), float(z), camera=camera)
        quadro()
    e = lugar.estado_do_relevo()
    print('parada', volta, canto, 'desenhados', e['desenhados'], 'completos', e['completos'],
          'grossos', e['grossos'], 'faltam', e['faltam'], 'guardados', e['guardados'],
          'altura', 'ok' if lugar.altura(x, z) is not None else 'sem-chao', 'fim')
    while not is_key_pressed(KEY_N) and not window_should_close():
        quadro()


for volta in range(1, 5):
    for canto in range(4):
        (x0, z0), (x1, z1) = CANTOS[canto], CANTOS[(canto + 1) % 4]
        dx, dz = (x1 - x0) / 1600, (z1 - z0) / 1600
        for passo in range(1, 65):
            x, z = x0 + dx * 25 * passo, z0 + dz * 25 * passo
            olhar(x, z, dx, dz)
            lugar.atualizar(float(x), float(z), camera=camera)
            quadro()
        parar(volta, canto, x1, z1)
lugar.descartar()
close_window()
`
