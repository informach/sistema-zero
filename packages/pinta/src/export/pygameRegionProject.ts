import type { PintaRegionSceneWire } from '@sistemazero/core/studio/pinta-region-scene'
import { buildPygamePintaScenesModule } from './pythonScenesModuleSource'
import type { prepareRegionScenePackage } from './regionScenePackage'
import { encodeRegionSceneWorldPng } from './regionSceneWorldPng'

/** The desktop module reads the same complete PNG-5 as Studio's Python reader. It receives only
 * Scene 4 maps: the package refuses a projected world before writing any file. */
export async function writeRegionPygameFiles(
  world: Awaited<ReturnType<typeof prepareRegionScenePackage>>,
  scenes: ReadonlyMap<string, PintaRegionSceneWire>,
): Promise<string[]> {
  const { png } = await encodeRegionSceneWorldPng(world.rootId, scenes)
  world.put('cenario.png', png)
  world.put('requirements.txt', 'pygame-ce==2.5.8\n')
  world.put('pinta_cenario.py', buildPygamePintaScenesModule())
  world.put('main.py', pygameRegionMain)
  return [
    'Instale com python -m pip install -r requirements.txt e rode python main.py.',
    'Use as setas para andar. Em cenários com plataformas, ↑ pula e a aterrissagem ocorre por cima.',
    'cenario.png guarda os mapas, as imagens e os vínculos. pinta_cenario.py pode abri-lo em outro projeto.',
  ]
}

const pygameRegionMain = `import argparse
from pathlib import Path
from math import ceil

import pygame
from pinta_cenario import carregar_cenario, objeto_intersecta_corpo


class Jogo:
    def __init__(self, cena):
        self.cena = cena
        self.acabou_de_entrar = False
        self.iniciar_lugar()

    def iniciar_lugar(self):
        self.corpo = pygame.FRect(0, 0, 12, 12)
        self.corpo.center = self.cena.ponto_inicial()
        self.velocidade_y = 0
        self.no_chao = False
        lugar = self.cena.cena
        self.plataforma = (lugar.fisica == 'precise'
                           and next(lugar._colliders(lugar.limites, platforms=True), None) is not None)

    def mover_eixo(self, delta, eixo):
        passos = max(1, ceil(abs(delta)))
        for _ in range(passos):
            novo = self.corpo.move(delta / passos if eixo == 0 else 0,
                                  delta / passos if eixo == 1 else 0)
            if self.cena.bloqueado(novo):
                return False
            self.corpo = novo
        return True

    def mover(self, horizontal, vertical, dt):
        antes = self.corpo.copy()
        self.mover_eixo(horizontal * 120 * dt, 0)
        if self.plataforma:
            if vertical < 0 and self.no_chao:
                self.velocidade_y = -250
            self.velocidade_y = min(500, self.velocidade_y + 500 * dt)
            livre = self.mover_eixo(self.velocidade_y * dt, 1)
            apoio = self.cena.pouso(antes, self.corpo) if self.velocidade_y >= 0 else None
            self.no_chao = apoio is not None or not livre and self.velocidade_y > 0
            if apoio is not None:
                self.corpo = apoio
            if not livre or apoio is not None:
                self.velocidade_y = 0
        else:
            self.mover_eixo(vertical * 120 * dt, 1)
        porta = next((porta for porta in self.cena.objetos('door')
                      if porta.get('role') == 'door' and objeto_intersecta_corpo(porta, self.corpo)), None)
        if porta is None:
            self.acabou_de_entrar = False
        elif not self.acabou_de_entrar:
            destino = self.cena.abrir_destino(porta)
            if destino is not None:
                with destino:
                    self.cena.carregar(destino.cena.mapa_id)
                self.iniciar_lugar()
                self.acabou_de_entrar = True

    def desenhar(self, tela):
        x, y, largura, altura = self.cena.limites
        camera_x = max(x, min(self.corpo.centerx - tela.get_width() / 2,
                              x + largura - tela.get_width()))
        camera_y = max(y, min(self.corpo.centery - tela.get_height() / 2,
                              y + altura - tela.get_height()))
        deslocamento = (-camera_x, -camera_y)
        tela.fill('#e8edf4')
        self.cena.desenhar(tela, deslocamento)
        pygame.draw.rect(tela, '#4ade80', self.corpo.move(*deslocamento))
        self.cena.desenhar(tela, deslocamento, frente=True)


def main():
    parser = argparse.ArgumentParser(description='Meu cenário regional do Pinta')
    parser.add_argument('--frames', type=int, default=0)
    parser.add_argument('--screenshot')
    args = parser.parse_args()
    pasta = Path(__file__).resolve().parent
    pygame.init()
    try:
        tela = pygame.display.set_mode((640, 480))
        pygame.display.set_caption('Meu cenário do Pinta')
        relogio = pygame.time.Clock()
        with carregar_cenario(pasta / 'cenario.png') as cena:
            jogo = Jogo(cena)
            quadros = 0
            rodando = True
            while rodando:
                dt = min(relogio.tick(60) / 1000, 0.05)
                for event in pygame.event.get():
                    if event.type == pygame.QUIT or event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                        rodando = False
                keys = pygame.key.get_pressed()
                jogo.mover(keys[pygame.K_RIGHT] - keys[pygame.K_LEFT],
                           keys[pygame.K_DOWN] - keys[pygame.K_UP], dt)
                jogo.desenhar(tela)
                pygame.display.flip()
                quadros += 1
                if args.frames and quadros >= args.frames:
                    rodando = False
            if args.screenshot:
                pygame.image.save(tela, args.screenshot)
            print(f'Pinta: {cena.cena.mapa_id} / {quadros} quadros')
    finally:
        pygame.quit()


if __name__ == '__main__':
    main()
`
