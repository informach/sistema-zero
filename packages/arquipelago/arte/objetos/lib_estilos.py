"""As outras versões da galeria (31/10/2026): cada objeto à venda ganha a `retro` e a `moderna`.

- `retro`: formas arredondadas e cores pastéis. É a versão da Faísca: TODAS as cores saem da paleta
  "Doces" do Pinta (`packages/pinta/src/core/palette.ts`, `PASTEL`), a mesma que a criança tem no
  Pinta. Os materiais novos têm o nome da cor (`docesRosa`, `docesMenta`...); os que o jogo procura
  pelo nome (`luz`, `tela`, `agua`, `fogo`, `pinta*`...) e os translúcidos guardam o nome e só
  trocam a cor por uma da paleta.
- `moderna`: linhas retas (quinas vivas ou chanfradas, nada redondo no corpo), UMA cor forte por
  objeto (`modernaAzul`, `modernaVermelho`...) e madeira clara (`modernaMadeira`), com branco,
  grafite e aço de apoio. O miolo que funciona (comida, peixes, fósseis) fica como no clássico.

As duas têm a mesma caixa do clássico e as mesmas peças que funcionam: os mesmos nós com o mesmo
pivô, as mesmas âncoras, os mesmos clipes e os mesmos materiais funcionais. Por isso cada script de
estilo importa o script clássico e reaproveita as funções dele (miolo, peixes, chamas, clipes); só o
"corpo" muda. Os clássicos não são regravados (o exportador não sai byte a byte igual de uma vez
para outra), então os scripts de estilo NUNCA chamam o `rodar` do clássico.
"""
import os

from lib_objetos import *  # noqa: F401,F403

# A paleta "Doces" do Pinta, na ordem de lá (o índice 0 é o transparente). Conferida pelo teste
# `tests/galeria-variantes.test.ts`, que lê o arquivo do Pinta.
DOCES = {
    'docesBranco': '#fffaf5',
    'docesRosa': '#ffb3ba',
    'docesRosaClaro': '#ffd6e0',
    'docesPessego': '#ffdfba',
    'docesAmarelo': '#fff5ba',
    'docesMenta': '#a8e6cf',
    'docesVerde': '#baffc9',
    'docesAzul': '#a3c4f3',
    'docesCeu': '#bae1ff',
    'docesLilas': '#d0b3ff',
    'docesLavanda': '#e0c3fc',
    'docesRoxo': '#b28dff',
    'docesCreme': '#f1e3d3',
    'docesCastanho': '#c9ada7',
    'docesNoite': '#4a4e69',
}

MODERNA = {
    'modernaMadeira': ('#e4c9a0', 0.75, None, 0),
    'modernaMadeiraVeio': ('#cfae7e', 0.75, None, 0),
    'modernaBranco': ('#f4f3ef', 0.5, None, 0),
    'modernaGrafite': ('#2c3038', 0.45, None, 0),
    'modernaAco': ('#c4c9ce', 0.3, None, 0),
    # a cor forte (uma por objeto)
    'modernaAzul': ('#1f5fd6', 0.4, None, 0),
    'modernaVermelho': ('#e23b3b', 0.4, None, 0),
    'modernaVerde': ('#0f9d76', 0.4, None, 0),
    'modernaLaranja': ('#ef6a1f', 0.45, None, 0),
    'modernaAmarelo': ('#f5b21a', 0.4, None, 0),
    'modernaRoxo': ('#6a3fd6', 0.4, None, 0),
    'modernaPetroleo': ('#0e7c86', 0.4, None, 0),
    'modernaRosa': ('#e5407e', 0.4, None, 0),
}

lib_q.PALETTE.update({k: (v, 0.5, None, 0) for k, v in DOCES.items()})
lib_q.PALETTE.update(MODERNA)

# Os materiais que o jogo procura pelo nome (README): nunca mudam de nome.
FUNCIONAIS = ('luz', 'tela', 'agua', 'vidro', 'vidroForno', 'fogo', 'brasa', 'chama', 'placaFace', 'bolha',
              'pintaFrente', 'pintaLadoEsq', 'pintaLadoDir', 'pintaTopo')
# Translúcidos (a lib dá o alfa pelo nome): também guardam o nome.
TRANSLUCIDOS = ('prateleira', 'gaveta', 'garrafa', 'gelatina')
PINTAS = ('pintaFrente', 'pintaLadoEsq', 'pintaLadoDir', 'pintaTopo')

# Na retro, a cor de cada material que guarda o nome (cor, rugosidade, emissão, força). O que acende
# continua com força 1, como no clássico, e a cor da emissão também é da paleta.
FUNCIONAIS_DOCES = {
    'luz': ('#fff5ba', 0.4, '#fff5ba', 1.0),
    'tela': ('#4a4e69', 0.25, '#a3c4f3', 1.0),
    'agua': ('#bae1ff', 0.1, None, 0),
    'vidro': ('#fffaf5', 0.3, None, 0),
    'vidroForno': ('#bae1ff', 0.6, None, 0),
    'fogo': ('#ffb3ba', 0.4, '#ffb3ba', 1.0),
    'brasa': ('#ffdfba', 0.4, '#fff5ba', 1.0),
    'chama': ('#fff5ba', 0.4, '#fff5ba', 1.0),
    'placaFace': ('#f1e3d3', 0.85, None, 0),
    'bolha': ('#fffaf5', 0.2, None, 0),
    'prateleira': ('#bae1ff', 0.1, None, 0),
    'gaveta': ('#baffc9', 0.15, None, 0),
    'garrafa': ('#a8e6cf', 0.2, None, 0),
    'gelatina': ('#ffb3ba', 0.2, None, 0),
}

_ORIGINAL = {}


def comecar(estilo, cor_pinta, pintas=PINTAS):
    """Antes de montar uma versão: devolve a paleta ao que o script clássico deixou e aplica a do
    estilo. `cor_pinta` é a chave da cor das faces do Pinta (a cor da peça sem pintura)."""
    if not _ORIGINAL:
        _ORIGINAL.update(lib_q.PALETTE)
    lib_q.PALETTE.clear()
    lib_q.PALETTE.update(_ORIGINAL)
    if estilo == 'retro':
        lib_q.PALETTE.update(FUNCIONAIS_DOCES)
    cor = lib_q.PALETTE[cor_pinta]
    for face in pintas:
        lib_q.PALETTE[face] = (cor[0], cor[1], None, 0)


def _rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def doce_mais_perto(cor):
    """A cor da paleta Doces mais perto de `cor` (distância com o peso do olho no verde)."""
    r, g, b = _rgb(cor)

    def dist(k):
        r2, g2, b2 = _rgb(DOCES[k])
        rm = (r + r2) / 2
        return (2 + rm / 256) * (r - r2) ** 2 + 4 * (g - g2) ** 2 + (2 + (255 - rm) / 256) * (b - b2) ** 2
    return min(DOCES, key=dist)


def _objetos(nos):
    for val in nos.values():
        for o in (val[0] if isinstance(val, tuple) else val):
            if o is not None and o.type == 'MESH':
                yield o


def repintar(nos, mapa=None, estilo='moderna'):
    """Troca os materiais do miolo reaproveitado do clássico pelos do estilo, pelo nome.

    - `moderna`: só troca o que está no `mapa` (o resto do miolo fica como no clássico);
    - `retro`: TODO material que não é funcional, translúcido nem `doces*` vira uma cor da paleta
      Doces: a do `mapa`, ou a mais perto da cor do clássico. Devolve as trocas (para o relatório)."""
    mapa = dict(mapa or {})
    trocas = {}
    for o in _objetos(nos):
        for i, m in enumerate(o.data.materials):
            if m is None:
                continue
            nome = m.name
            novo = mapa.get(nome)
            if estilo == 'retro' and novo is None:
                if nome in FUNCIONAIS or nome in TRANSLUCIDOS or nome in DOCES:
                    continue
                novo = doce_mais_perto(lib_q.PALETTE[nome][0])
            if novo and novo != nome:
                o.data.materials[i] = lib_q.mat(novo)
                trocas[nome] = novo
    return trocas


def conferir_doces(nos):
    """A retro só pode ter cores da paleta Doces (a cor de base e a da emissão)."""
    validas = {c.lower() for c in DOCES.values()}
    for o in _objetos(nos):
        for m in o.data.materials:
            cor, _r, emi, _f = lib_q.PALETTE[m.name]
            assert cor.lower() in validas, f'{m.name}: {cor} fora da paleta Doces'
            assert emi is None or emi.lower() in validas, f'{m.name}: emissão {emi} fora da paleta Doces'


def apagar(objs):
    """Tira da cena peças que o clássico montou e o estilo troca (o corpo, o puxador)."""
    for o in objs:
        if o is not None and o.name in bpy.data.objects:
            bpy.data.objects.remove(o)


_EIXOS_DA_FACE = {
    # normal (Blender): (eixo u, eixo v) de quem olha a face de fora (README, "Faces que recebem imagem")
    '-Y': ((1, 0, 0), (0, 0, 1)),
    '-X': ((0, -1, 0), (0, 0, 1)),
    '+X': ((0, 1, 0), (0, 0, 1)),
    '+Z': ((1, 0, 0), (0, 1, 0)),
}
_NORMAIS = {'-Y': (0, -1, 0), '-X': (-1, 0, 0), '+X': (1, 0, 0), '+Z': (0, 0, 1)}


def pintar_face(o, material, normal, filtro=None):
    """Põe `material` nas faces de `o` viradas para `normal` ('-Y', '-X', '+X' ou '+Z') e dá a elas as
    coordenadas de textura de 0 a 1. `filtro(centro)` escolhe só algumas (a face de fora)."""
    nx, ny, nz = _NORMAIS[normal]
    pintar_por(o, lambda c, n: material if n.x * nx + n.y * ny + n.z * nz > 0.999 and (filtro is None or filtro(c))
               else None)
    eu, ev = _EIXOS_DA_FACE[normal]
    uv_plano(o, {material}, eu, ev)
    return o


def placa_pintavel(material, normal, centro, largura, altura, m, espessura=0.014, saliencia=0.006):
    """Placa fina de quina viva encostada numa parede plana: a frente (do tamanho exato da face do
    Pinta, `largura` × `altura`) leva `material`, as bordas ficam em `m`. `centro` é o ponto da parede
    onde ela fica; a frente sai `saliencia` para fora (mais que os 3 mm da busca de faces coplanares)
    e o resto entra na parede, sem face encostada."""
    nx, ny, nz = _NORMAIS[normal]
    if normal in ('-Y',):
        size = (largura, espessura, altura)
    elif normal in ('-X', '+X'):
        size = (espessura, largura, altura)
    else:
        size = (largura, altura, espessura)
    d = saliencia - espessura / 2
    loc = (centro[0] + nx * d, centro[1] + ny * d, centro[2] + nz * d)
    o = box(size, loc, m, bevel=0.0)
    bpy.context.view_layer.update()
    return pintar_face(o, material, normal)


def fileira(n, inicio, fim):
    """n valores igualmente espaçados de `inicio` a `fim` (com as pontas)."""
    if n == 1:
        return [(inicio + fim) / 2]
    return [inicio + (fim - inicio) * k / (n - 1) for k in range(n)]


def arredondar_contorno(pts, raio, n=5):
    """Contorno (x, y) com cada quina trocada por um arco de `raio` (as formas da retro)."""
    from mathutils import Vector as V
    novo = []
    k = len(pts)
    for i in range(k):
        a, b, c = V(pts[i - 1]), V(pts[i]), V(pts[(i + 1) % k])
        u, w = (a - b), (c - b)
        la, lc = u.length, w.length
        u.normalize()
        w.normalize()
        ang = math.acos(max(-1.0, min(1.0, u.dot(w))))
        if ang > math.radians(175) or ang < 1e-3:
            novo.append(tuple(b))
            continue
        t = min(raio / math.tan(ang / 2), la * 0.45, lc * 0.45)
        r = t * math.tan(ang / 2)
        p0, p1 = b + u * t, b + w * t
        bis = (u + w).normalized()
        centro = b + bis * (r / math.sin(ang / 2))
        a0 = math.atan2(p0.y - centro.y, p0.x - centro.x)
        a1 = math.atan2(p1.y - centro.y, p1.x - centro.x)
        da = a1 - a0
        while da > math.pi:
            da -= 2 * math.pi
        while da < -math.pi:
            da += 2 * math.pi
        for j in range(n + 1):
            aa = a0 + da * j / n
            novo.append((centro.x + r * math.cos(aa), centro.y + r * math.sin(aa)))
    return novo


def caixa_viva(size, loc, m, chanfro=0.0):
    """Caixa da moderna: quina viva, ou um chanfro reto (uma faceta) do tamanho dado."""
    return box(size, loc, m, bevel=chanfro, segs=1) if chanfro > 0 else box(size, loc, m, bevel=0.0)


def rodar_estilos(pid, montar):
    """Exporta `<pid>-retro` e `<pid>-moderna`; `montar(estilo)` devolve os argumentos de `exportar`
    (como os scripts clássicos). `ESTILO=retro` (ou `moderna`) na linha de comando faz só um."""
    so = os.environ.get('ESTILO')
    itens = [(f'{pid}-{e}', (lambda e=e: montar(e))) for e in ('retro', 'moderna') if not so or so == e]
    rodar(itens)


def contorno_de_quinas_redondas(x0, x1, y0, y1, r, n=5):
    """Retângulo (x, y) de quinas redondas, fechado, no sentido anti-horário."""
    cantos = [(x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)]
    pts = []
    for cx, cy, a0 in cantos:
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def debrum(pts, plano, m, r=0.012, seg=8):
    """Friso redondo fechado (o debrum da retro) pelos pontos `pts`; `plano(u, v)` leva cada ponto
    do contorno para o espaço do Blender."""
    caminho = [plano(u, v) for u, v in pts]
    caminho.append(caminho[0])
    o = tube(caminho, [r] * len(caminho), m, seg=seg, cap=False)
    return o
