import {
  CELL_FLAGS_MASK,
  CELL_FLIP_D,
  CELL_FLIP_H,
  CELL_FLIP_V,
  CELL_MAX_TILES,
} from '../tiles/cell'

/**
 * O Python embutido lê a célula com as MESMAS máscaras do `tiles/cell.ts`: os números entram no
 * texto a partir das constantes de lá, nunca escritos à mão.
 */
const PECA = CELL_MAX_TILES - 1
export const pygameSceneModule = `"""Cenários do Pinta: dados editáveis em maps.json; imagens locais, sem rede."""
import json
import math
from pathlib import Path
import pygame

class Mundo:
    def __init__(self, raiz, nome):
        self.raiz = Path(raiz)
        self.mapas = json.loads((self.raiz / 'maps.json').read_text(encoding='utf-8'))
        self.imagens, self.pecas = {}, {}
        self.carregar(nome)

    def carregar(self, nome):
        self.nome, self.dados = nome, self.mapas[nome]
        self.tamanho = self.dados['tileSize']
        self.objetos = []
        self.solidos, self.plataformas = [], []
        for camada in self.dados['layers']:
            e = self.efetiva(self.dados['layers'], camada)
            if not e['visible']:
                continue
            if camada['kind'] == 'objects':
                self.objetos.extend(dict(o, x=o['x'] + e['x'], y=o['y'] + e['y']) for o in camada['objects'])
            if camada['kind'] != 'tiles':
                continue
            ts = next(t for t in self.dados['tilesets'] if t['id'] == camada['tilesetId'])
            for i, celula in enumerate(camada['cells']):
                if celula < 0:
                    continue
                tile = celula & ${PECA}
                rect = pygame.FRect(i % self.dados['cols'] * self.tamanho + e['x'], i // self.dados['cols'] * self.tamanho + e['y'], self.tamanho, self.tamanho)
                if camada.get('collision') or tile in ts['solid']:
                    self.solidos.append(rect)
                elif tile in ts['platform']:
                    self.plataformas.append(rect)
        for instancia in list(self.objetos):
            conjunto = next((s for s in self.dados.get('sets', []) if s['id'] == instancia.get('setId')), None)
            if not conjunto:
                continue
            def ponto(x, y):
                sx = instancia['width'] / (conjunto['cols'] * self.tamanho)
                sy = instancia['height'] / (conjunto['rows'] * self.tamanho)
                x = (conjunto['cols'] * self.tamanho - x if instancia.get('flipX') else x) * sx
                y = (conjunto['rows'] * self.tamanho - y if instancia.get('flipY') else y) * sy
                p = pygame.Vector2(x, y).rotate(instancia.get('rotation', 0))
                return p.x + instancia['x'], p.y + instancia['y']
            for camada in conjunto['layers']:
                e = self.efetiva(conjunto['layers'], camada)
                if not e['visible']:
                    continue
                if camada['kind'] == 'objects':
                    for objeto in camada['objects']:
                        x, y = ponto(objeto['x'] + e['x'], objeto['y'] + e['y'])
                        self.objetos.append(dict(objeto, id=instancia['id'] + '/' + objeto['id'], x=x, y=y, width=objeto['width'] * instancia['width'] / (conjunto['cols'] * self.tamanho), height=objeto['height'] * instancia['height'] / (conjunto['rows'] * self.tamanho), rotation=instancia.get('rotation', 0) + objeto.get('rotation', 0)))
                elif camada['kind'] == 'tiles':
                    ts = next(t for t in self.dados['tilesets'] if t['id'] == camada['tilesetId'])
                    for i, celula in enumerate(camada['cells']):
                        if celula < 0:
                            continue
                        tile = celula & ${PECA}
                        if not (camada.get('collision') or tile in ts['solid'] or tile in ts['platform']):
                            continue
                        x = i % conjunto['cols'] * self.tamanho + e['x']
                        y = i // conjunto['cols'] * self.tamanho + e['y']
                        corners = [ponto(x + dx, y + dy) for dx, dy in [(0, 0), (self.tamanho, 0), (0, self.tamanho), (self.tamanho, self.tamanho)]]
                        xs, ys = [p[0] for p in corners], [p[1] for p in corners]
                        rect = pygame.FRect(min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))
                        (self.solidos if camada.get('collision') or tile in ts['solid'] else self.plataformas).append(rect)
        inicio = next((o for o in self.objetos if o.get('role') == 'start'), {'x': self.tamanho / 2, 'y': self.tamanho / 2})
        self.jogador = pygame.FRect(inicio['x'], inicio['y'], self.tamanho * 0.65, self.tamanho * 0.65)

    @staticmethod
    def efetiva(camadas, camada):
        e = {'visible': camada.get('visible', True), 'opacity': camada.get('opacity', 1), 'x': camada.get('offsetX', 0), 'y': camada.get('offsetY', 0), 'px': camada.get('parallaxX', 1), 'py': camada.get('parallaxY', 1)}
        pai = camada.get('parentId')
        for _ in range(32):
            if not pai:
                break
            grupo = next((c for c in camadas if c['id'] == pai), None)
            if not grupo:
                break
            e['visible'] = e['visible'] and grupo.get('visible', True)
            e['opacity'] *= grupo.get('opacity', 1)
            e['x'] += grupo.get('offsetX', 0)
            e['y'] += grupo.get('offsetY', 0)
            e['px'] *= grupo.get('parallaxX', 1)
            e['py'] *= grupo.get('parallaxY', 1)
            pai = grupo.get('parentId')
        return e

    def imagem(self, caminho):
        if caminho not in self.imagens:
            self.imagens[caminho] = pygame.image.load(str(self.raiz / caminho)).convert_alpha()
        return self.imagens[caminho]

    def peca(self, ts, celula, tempo):
        tile, flags = celula & ${PECA}, celula & ${CELL_FLAGS_MASK}
        quadros = ts.get('animations', {}).get(str(tile), [])
        total = sum(q['duration'] for q in quadros)
        if quadros and total > 0:
            atual = tempo % total
            for q in quadros:
                atual -= q['duration']
                if atual < 0:
                    tile = q['tile']
                    break
        chave = ts['id'], tile, flags
        if chave not in self.pecas:
            t = self.tamanho
            imagem = self.imagem(ts['image']).subsurface((tile % ts['columns'] * t, tile // ts['columns'] * t, t, t))
            if flags & ${CELL_FLIP_D}:
                imagem = pygame.transform.flip(pygame.transform.rotate(imagem, 90), False, True)
            self.pecas[chave] = pygame.transform.flip(imagem, bool(flags & ${CELL_FLIP_H}), bool(flags & ${CELL_FLIP_V}))
        return self.pecas[chave]

    def desenhar(self, tela, frente=False, camadas=None, cols=None, deslocamento=(0, 0), profundidade=0, camera=None, personagem=True):
        if profundidade > 1:
            return
        camadas = self.dados['layers'] if camadas is None else camadas
        cols = self.dados['cols'] if cols is None else cols
        if camera is None:
            camera = (max(0, self.jogador.centerx - tela.get_width() / 2), max(0, self.jogador.centery - tela.get_height() / 2)) if not profundidade else (0, 0)
        tempo = pygame.time.get_ticks()
        for camada in camadas:
            e = self.efetiva(camadas, camada)
            if not e['visible'] or not e['opacity']:
                continue
            dx = e['x'] + deslocamento[0] - camera[0] * e['px']
            dy = e['y'] + deslocamento[1] - camera[1] * e['py']
            if camada['kind'] == 'tiles' and not camada.get('collision') and bool(camada.get('front')) == frente:
                ts = next(t for t in self.dados['tilesets'] if t['id'] == camada['tilesetId'])
                for i, celula in enumerate(camada['cells']):
                    x, y = i % cols * self.tamanho + dx, i // cols * self.tamanho + dy
                    if celula < 0 or x < -self.tamanho or y < -self.tamanho or x > tela.get_width() or y > tela.get_height():
                        continue
                    imagem = self.peca(ts, celula, tempo)
                    if e['opacity'] < 1:
                        imagem = imagem.copy()
                        imagem.set_alpha(round(e['opacity'] * 255))
                    tela.blit(imagem, (x, y))
            elif camada['kind'] == 'objects':
                for o in camada['objects']:
                    if o.get('setId'):
                        conjunto = next((s for s in self.dados.get('sets', []) if s['id'] == o['setId']), None)
                        if conjunto:
                            superficie = pygame.Surface((conjunto['cols'] * self.tamanho, conjunto['rows'] * self.tamanho), pygame.SRCALPHA)
                            self.desenhar(superficie, frente, conjunto['layers'], conjunto['cols'], (0, 0), profundidade + 1)
                            superficie = pygame.transform.scale(superficie, (max(1, round(o['width'])), max(1, round(o['height']))))
                            superficie = pygame.transform.flip(superficie, bool(o.get('flipX')), bool(o.get('flipY')))
                            pivot = pygame.Vector2(superficie.get_width() / 2, superficie.get_height() / 2).rotate(o.get('rotation', 0))
                            if o.get('rotation'):
                                superficie = pygame.transform.rotate(superficie, -o['rotation'])
                            superficie.set_alpha(round(e['opacity'] * 255))
                            tela.blit(superficie, (o['x'] + dx + pivot.x - superficie.get_width() / 2, o['y'] + dy + pivot.y - superficie.get_height() / 2))
                    elif o.get('art') and not frente:
                        arte = next((a for a in self.dados.get('art', []) if a['id'] == o['art']['assetId']), None)
                        ts = next((t for t in self.dados['tilesets'] if t['id'] == o['art']['assetId']), None)
                        imagem = self.imagem(arte['image']) if arte else self.peca(ts, o['art'].get('tile', 0), tempo) if ts else None
                        if imagem and o['width'] > 0 and o['height'] > 0:
                            imagem = pygame.transform.scale(imagem, (round(o['width']), round(o['height'])))
                            imagem = pygame.transform.flip(imagem, bool(o.get('flipX')), bool(o.get('flipY')))
                            pivot = pygame.Vector2(imagem.get_width() / 2, imagem.get_height() / 2).rotate(o.get('rotation', 0))
                            if o.get('rotation'):
                                imagem = pygame.transform.rotate(imagem, -o['rotation'])
                            imagem.set_alpha(round(e['opacity'] * 255))
                            tela.blit(imagem, (o['x'] + dx + pivot.x - imagem.get_width() / 2, o['y'] + dy + pivot.y - imagem.get_height() / 2))
        if personagem and not frente and not profundidade:
            pygame.draw.rect(tela, '#4ade80', self.jogador.move(-camera[0], -camera[1]))

    @staticmethod
    def propriedade(objeto, chave):
        valor = objeto.get('properties', {}).get(chave)
        return valor.get('value') if isinstance(valor, dict) else valor

    @staticmethod
    def contem(objeto, x, y):
        p = pygame.Vector2(x - objeto['x'], y - objeto['y']).rotate(-objeto.get('rotation', 0))
        if objeto.get('flipX'):
            p.x = objeto['width'] - p.x
        if objeto.get('flipY'):
            p.y = objeto['height'] - p.y
        if objeto.get('shape') == 'ellipse':
            return ((p.x - objeto['width'] / 2) / max(.001, objeto['width'] / 2)) ** 2 + ((p.y - objeto['height'] / 2) / max(.001, objeto['height'] / 2)) ** 2 <= 1
        points = objeto.get('points', [])
        if objeto.get('shape') == 'polygon' and points:
            inside = False
            for a, b in zip(points, points[1:] + points[:1]):
                if (a['y'] > p.y) != (b['y'] > p.y) and p.x < (b['x'] - a['x']) * (p.y - a['y']) / (b['y'] - a['y']) + a['x']:
                    inside = not inside
            return inside
        return pygame.FRect(0, 0, objeto['width'], objeto['height']).collidepoint(p)

    def mover(self, dx, dy):
        passos = max(1, math.ceil(max(abs(dx), abs(dy)) / max(1, self.tamanho / 4)))
        for _ in range(passos):
            for eixo, delta in [('x', dx / passos), ('y', dy / passos)]:
                antes = self.jogador.copy()
                setattr(self.jogador, eixo, getattr(self.jogador, eixo) + delta)
                if any(self.jogador.colliderect(r) for r in self.solidos):
                    self.jogador = antes
        self.jogador.clamp_ip(pygame.FRect(0, 0, self.dados['cols'] * self.tamanho, self.dados['rows'] * self.tamanho))
        for porta in self.objetos:
            if porta.get('role') == 'door' and self.contem(porta, *self.jogador.center):
                destino = self.propriedade(porta, 'destino') or self.propriedade(porta, 'destination')
                destino = next((k for k, v in self.mapas.items() if k == destino or v['id'] == destino), destino)
                if destino in self.mapas:
                    self.carregar(destino)
                    break
`
export const pygameMain = `import argparse
import json
from pathlib import Path
import pygame
from pinta_cenario import Mundo

parser = argparse.ArgumentParser(description='Meu jogo do Pinta')
parser.add_argument('--frames', type=int, default=0, help='Encerrar depois deste número de quadros')
parser.add_argument('--screenshot', help='Guardar a última imagem em PNG')
args = parser.parse_args()
pygame.init()
tela = pygame.display.set_mode((640, 480))
pygame.display.set_caption('Meu mapa do Pinta')
raiz = Path(__file__).parent
mundo = Mundo(raiz, json.loads((raiz / 'start.json').read_text(encoding='utf-8')))
clock = pygame.time.Clock()
frames = 0
rodando = True
while rodando:
    dt = min(clock.tick(60) / 1000, 0.05)
    for event in pygame.event.get():
        if event.type == pygame.QUIT or event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            rodando = False
    keys = pygame.key.get_pressed()
    mundo.mover((keys[pygame.K_RIGHT] - keys[pygame.K_LEFT]) * 120 * dt, (keys[pygame.K_DOWN] - keys[pygame.K_UP]) * 120 * dt)
    tela.fill('#e8edf4')
    mundo.desenhar(tela)
    mundo.desenhar(tela, frente=True)
    pygame.display.flip()
    frames += 1
    if args.frames and frames >= args.frames:
        rodando = False
if args.screenshot:
    pygame.image.save(tela, args.screenshot)
print(f'Pinta: {mundo.nome} / {len(mundo.dados["layers"])} camadas / {frames} quadros')
pygame.quit()
`
