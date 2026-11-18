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

def quadro_arte(arte, animation_id, tempo):
    sprite = arte.get('sprite')
    if not sprite:
        return (0, 0, arte['width'], arte['height'])
    animation = next((a for a in sprite['animations'] if a['id'] == animation_id), None)
    tile = sprite['animations'][0]['frames'][0]['tile']
    if animation:
        frames = animation['frames']
        total = sum(f['duration'] for f in frames)
        at = max(0, tempo) % total if animation['loop'] else min(max(0, tempo), total)
        tile = frames[-1]['tile']
        for frame in frames:
            at -= frame['duration']
            if at < 0:
                tile = frame['tile']
                break
    w, h = sprite['frameWidth'], sprite['frameHeight']
    return (tile % sprite['columns'] * w, tile // sprite['columns'] * h, w, h)

def transformar_objeto_conjunto(parent, child, largura, altura, ids):
    """A mesma base afim de transformSceneSetObject; a geometria não usa flips da arte."""
    sx, sy = parent['width'] / largura, parent['height'] / altura
    a, b = math.radians(parent.get('rotation', 0)), math.radians(child.get('rotation', 0))
    mx, my = -sx if parent.get('flipX') else sx, -sy if parent.get('flipY') else sy
    def vector(x, y):
        return (x * mx * math.cos(a) - y * my * math.sin(a), x * mx * math.sin(a) + y * my * math.cos(a))
    u, v = vector(math.cos(b), math.sin(b)), vector(-math.sin(b), math.cos(b))
    ux, vy = math.hypot(*u), math.hypot(*v)
    reflected = u[0] * v[1] - u[1] * v[0] < 0
    p, origin = vector(child['x'], child['y']), vector(-largura if parent.get('flipX') else 0, -altura if parent.get('flipY') else 0)
    result = dict(child, id=parent['id'] + '/' + child['id'] if child['id'] in ids else child['id'],
                  x=parent['x'] + p[0] + origin[0] + (v[0] * child['height'] if reflected else 0),
                  y=parent['y'] + p[1] + origin[1] + (v[1] * child['height'] if reflected else 0),
                  width=child['width'] * ux, height=child['height'] * vy,
                  rotation=math.degrees(math.atan2(u[1], u[0])), flipX=bool(child.get('flipX')), flipY=bool(child.get('flipY')) != reflected)
    result['properties'] = {key: dict(value, value=parent['id'] + '/' + str(value['value'])) if isinstance(value, dict) and value.get('type') == 'object' and str(value['value']) in ids else value for key, value in child.get('properties', {}).items()}
    if 'points' in child:
        result['points'] = [{'x': point['x'] * ux, 'y': (child['height'] - point['y'] if reflected else point['y']) * vy} for point in child['points']]
    if abs(u[0] * v[0] + u[1] * v[1]) <= 1e-8 * ux * vy:
        return result
    def world(x, y):
        return (parent['x'] + p[0] + origin[0] + u[0] * x + v[0] * y, parent['y'] + p[1] + origin[1] + u[1] * x + v[1] * y)
    if child.get('shape') == 'ellipse':
        bx, by, cx, cy = u[0] * child['width'] / 2, u[1] * child['width'] / 2, v[0] * child['height'] / 2, v[1] * child['height'] / 2
        xx, yy, xy = bx * bx + cx * cx, by * by + cy * cy, bx * by + cx * cy
        delta = math.hypot(xx - yy, 2 * xy)
        rx, ry = math.sqrt(max(0, (xx + yy + delta) / 2)), math.sqrt(max(0, (xx + yy - delta) / 2))
        theta, center = math.atan2(2 * xy, xx - yy) / 2, world(child['width'] / 2, child['height'] / 2)
        result.update(x=center[0] - rx * math.cos(theta) + ry * math.sin(theta), y=center[1] - rx * math.sin(theta) - ry * math.cos(theta), width=rx * 2, height=ry * 2, rotation=math.degrees(theta), flipX=False, flipY=False)
    else:
        at = world(0, 0)
        points = child.get('points', [{'x': 0, 'y': 0}, {'x': child['width'], 'y': 0}, {'x': child['width'], 'y': child['height']}, {'x': 0, 'y': child['height']}])
        result.update(x=at[0], y=at[1], rotation=0, shape=child.get('shape') if child.get('shape') in ('polyline', 'point') else 'polygon',
                      points=[{'x': u[0] * point['x'] + v[0] * point['y'], 'y': u[1] * point['x'] + v[1] * point['y']} for point in points], flipX=bool(child.get('flipX')), flipY=bool(child.get('flipY')))
    return result

class Mundo:
    def __init__(self, raiz, nome):
        self.raiz = Path(raiz)
        self.mapas = json.loads((self.raiz / 'maps.json').read_text(encoding='utf-8'))
        self.imagens, self.pecas = {}, {}
        self.carregar(nome)

    def carregar(self, nome):
        self.nome, self.dados = nome, self.mapas[nome]
        self.inicio_animacao = pygame.time.get_ticks()
        self.tamanho = self.dados['tileSize']
        self.objetos = []
        self.solidos, self.plataformas = [], []
        self.solidos_transformados = []
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
        self._solidos_planos = list(self.solidos)
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
                        ids = [o['id'] for l in conjunto['layers'] for o in l.get('objects', [])]
                        self.objetos.append(transformar_objeto_conjunto(instancia, dict(objeto, x=objeto['x'] + e['x'], y=objeto['y'] + e['y']), conjunto['cols'] * self.tamanho, conjunto['rows'] * self.tamanho, ids))
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
                        corners = [ponto(x + dx, y + dy) for dx, dy in [(0, 0), (self.tamanho, 0), (self.tamanho, self.tamanho), (0, self.tamanho)]]
                        xs, ys = [p[0] for p in corners], [p[1] for p in corners]
                        rect = pygame.FRect(min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))
                        (self.solidos if camada.get('collision') or tile in ts['solid'] else self.plataformas).append(rect)
                        if camada.get('collision') or tile in ts['solid']:
                            self.solidos_transformados.append(corners)
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
        tempo = pygame.time.get_ticks() - self.inicio_animacao if self.dados.get('version') == 2 else pygame.time.get_ticks()
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
                        imagem = self.imagem(arte['image']).subsurface(quadro_arte(arte, o['art'].get('animationId'), tempo)) if arte else self.peca(ts, o['art'].get('tile', 0), tempo) if ts else None
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
        valor = (objeto or {}).get('properties', {}).get(chave)
        return valor.get('value') if isinstance(valor, dict) else valor

    def objeto_por_id(self, referencia):
        return next((o for o in self.objetos if o['id'] == referencia), None)

    def recurso_imagem(self, referencia):
        recurso = next((a for a in self.dados.get('art', []) + self.dados['tilesets'] if a['id'] == referencia), None)
        return recurso['image'] if recurso else None

    def propriedade_camada(self, referencia, chave):
        return self.propriedade(next((l for l in self.dados['layers'] if l['id'] == referencia), None), chave)

    def propriedade_peca(self, referencia, peca, chave):
        ts = next((t for t in self.dados['tilesets'] if t['id'] == referencia), None)
        if not ts or isinstance(peca, bool) or not isinstance(peca, (int, float)) or not math.isfinite(peca) or peca != int(peca) or not 0 <= peca < ts['count']:
            return None
        return self.propriedade({'properties': ts.get('tileProperties', {}).get(str(int(peca)), {})}, chave)

    @staticmethod
    def contem(objeto, x, y):
        p = pygame.Vector2(x - objeto['x'], y - objeto['y']).rotate(-objeto.get('rotation', 0))
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
                if self.bloqueado(self.jogador):
                    self.jogador = antes
        self.jogador.clamp_ip(pygame.FRect(0, 0, self.dados['cols'] * self.tamanho, self.dados['rows'] * self.tamanho))
        for porta in self.objetos:
            if porta.get('role') == 'door' and self.contem(porta, *self.jogador.center):
                destino = self.propriedade(porta, 'destino') or self.propriedade(porta, 'destination')
                destino = next((k for k, v in self.mapas.items() if k == destino or v['id'] == destino), destino)
                if destino in self.mapas:
                    self.carregar(destino)
                    break

    def bloqueado(self, rect):
        if any(rect.colliderect(other) for other in self._solidos_planos):
            return True
        # Separating axes of the player rectangle and the actual transformed tile.
        # A rotated tile's bounding Rect is kept in solidos for the legacy API only.
        box = [rect.topleft, rect.topright, rect.bottomright, rect.bottomleft]
        for polygon in self.solidos_transformados:
            axes = [(1, 0), (0, 1)] + [(b[1] - a[1], a[0] - b[0]) for a, b in zip(polygon, polygon[1:] + polygon[:1])]
            def separated(axis):
                first = [x * axis[0] + y * axis[1] for x, y in box]
                second = [x * axis[0] + y * axis[1] for x, y in polygon]
                return max(first) <= min(second) or max(second) <= min(first)
            if not any(separated(axis) for axis in axes):
                return True
        return False
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
