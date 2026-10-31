"""Kit de construir a casa: paredes, portas, janelas, quinas, pisos e telhado modulares.

Tudo casa com a grade do quarto (1 unidade por célula, paredes de 4) e com a casca da casa
(`arte/mundo/casa.py`: lambri com frisos, rodapé, alicerce, janelas com veneziana, porta 2,2 × 3,0).
Contrato de cada nó, medidas e regras de montagem no README desta pasta.

- `casa-paredes.glb`: paredes de 1, 2 e 3 células nas famílias `lambri` (lado de fora da casa,
  -Y) e `lisa` (entre dois cômodos), em pé (altura 4) e cortadas (altura 1), e as quinas.
- `casa-portas.glb`: as folhas `porta` e `porta-interna`, com o pivô na dobradiça e os clipes
  `abrir` e `abrir-interna`.
- `casa-pisos.glb`: pisos de 1 × 1 (tábua, ladrilho, azulejo, grama e grama com pedras).
- `casa-telhado.glb`: água, meia água, beiral com calha, cumeeira, oitões, testeiras e a vigia.
- `casa-andar.glb` (pedido E04, 31/10/2026): o segundo andar. Pisos de cima (`piso-andar-*`, topo em
  4,10 e a face de baixo de forro), a `escada-interna` de 14 degraus (colisores `col-escada-reta-*`
  e âncoras `escada-1-*`), o `piso-andar-vao` (o guarda-corpo em volta do vão da escada, com
  `col-guarda-vao-*`) e o `guarda-corpo-andar` (com `col-guarda-andar-1`). Colisores e âncoras vão
  como nós de primeiro nível no referencial da peça (como nas ilhas).

Sem pisca-pisca (README de arte/mundo): as peças que se repetem não têm tampa onde encostam na
vizinha, toda superfície com vão é uma malha em grade, e todas as paredes usam as mesmas linhas
(`CORTES_Y` e uma coluna a cada meia célula), então duas vizinhas casam vértice a vértice.
"""
import random
from contextlib import contextmanager

from lib_casa import *
from lib_casa import _objeto, _orientar

FRISOS = [0.75, 1.25, 1.75, 2.25, 2.75, 3.25]

# Perfis (y, z) das faixas do lado de fora (y negativo) e do rodapé de dentro. A face de trás de
# cada faixa fica 2 cm DENTRO da parede (nunca no plano dela) e não é desenhada.
ALICERCE = ([(-0.08, -0.3), (-0.19, -0.3), (-0.19, 0.24), (-0.15, 0.28), (-0.08, 0.28)],
            [None, 'alicerce', 'alicerce', 'alicerce', None])
RODAPE_FORA = ([(-0.08, 0.33), (-0.15, 0.33), (-0.15, 0.485), (-0.135, 0.5), (-0.08, 0.5)],
               ['acabamento', 'acabamento', 'acabamento', 'acabamento', None])
FRISO_DE_CIMA = ([(-0.08, 3.72), (-0.14, 3.72), (-0.16, 3.74), (-0.16, 3.95), (-0.08, 3.95)],
                 ['acabamento', 'acabamento', 'acabamento', 'acabamento', None])


# A parede do andar (`no_andar`) começa no topo do piso de cima e não tem alicerce: a cinta cobre por
# fora a linha entre as duas paredes (de 3,955 a 4,17 no térreo; aqui, de -0,145 a 0,07 do pé), 5 mm
# acima do friso de cima da parede de baixo (no mesmo plano dele piscaria).
CINTA = ([(-0.08, -0.145), (-0.15, -0.145), (-0.15, 0.05), (-0.13, 0.07), (-0.08, 0.07)],
         ['acabamento', 'acabamento', 'acabamento', 'acabamento', None])
_SEM_BASE = False   # ligado só dentro de `no_andar()`


def friso(z):
    return ([(-0.08, z - 0.025), (-0.13, z - 0.025), (-0.13, z + 0.025), (-0.08, z + 0.025)],
            ['paredeSombra', 'paredeSombra', 'paredeSombra', None])


def rodape_dentro(lado=1):
    """Rodapé de dentro, no lado +Y (ou -Y com `lado` = -1), do pé da parede até 0,16."""
    s = lado
    return ([(s * 0.08, Z0), (s * 0.14, Z0), (s * 0.14, 0.14), (s * 0.12, 0.16), (s * 0.08, 0.16)],
            [None, 'rodape', 'rodape', 'rodape', None])


def faixa(perfil, u0, u1, paradas=(), nome='faixa'):
    """Uma faixa (perfil, materiais) de u0 a u1, interrompida nos trechos `paradas` [(a, b)]. As pontas
    em u0 e u1 ficam abertas (a vizinha continua a faixa); onde ela para num vão, ganha tampa."""
    pts, mats = perfil
    trechos = []
    a = u0
    for p0, p1 in sorted(paradas):
        if p1 <= a or p0 >= u1:
            continue
        if p0 > a:
            trechos.append((a, p0))
        a = max(a, p1)
    if a < u1:
        trechos.append((a, u1))
    out = []
    for t0, t1 in trechos:
        if t1 - t0 < 0.02:
            continue
        out.append(extrudar(pts, t0, t1, mats, tampas=(t0 > u0 + 1e-6, t1 < u1 - 1e-6), nome=nome))
    return out


def meias_celulas(largura):
    n = int(round(largura / 0.5))
    return [-largura / 2 + 0.5 * k for k in range(1, n)]


# ---------------------------------------------------------------- paredes
def parede(largura, familia, altura=H, vaos=(), paradas_frisos=None, paradas_baixo=(), paradas_rodape=(),
           extras_u=()):
    """Uma parede de `largura` células, origem no meio da base, sobre a linha da grade (y = 0).

    `familia` 'lambri': frente (-Y) é o lado de fora, com alicerce, rodapé, frisos e friso de cima da
    casa; o verso (+Y) é o lado de dentro (`paredeDentro`) com rodapé. 'lisa': as duas faces são de
    dentro (`paredeVerso` na frente, `paredeDentro` no verso), com rodapé dos dois lados.
    `paradas_frisos(z)` devolve os trechos onde o friso da altura z para (janelas)."""
    u0, u1 = -largura / 2, largura / 2
    lambri = familia == 'lambri'
    frente = 'parede' if lambri else 'paredeVerso'
    cortes = CORTES_Y if altura == H else CORTES_Y_BAIXA
    p = [parede_grade(u0, u1, -T / 2, T / 2, Z0, altura, list(vaos), frente, 'paredeDentro', 'paredeTopo', frente,
                      cortes_y=cortes, cortes_u=list(meias_celulas(largura)) + list(extras_u))]
    p += faixa(rodape_dentro(1), u0, u1, paradas_rodape, 'rodape')
    if lambri and _SEM_BASE:
        # Parede do andar: sem alicerce nem rodapé de fora; a cinta cobre a linha do piso de cima.
        p += faixa(CINTA, u0, u1, (), 'cinta')
    elif lambri:
        p += faixa(ALICERCE, u0, u1, paradas_baixo, 'alicerce')
        p += faixa(RODAPE_FORA, u0, u1, paradas_baixo, 'rodape-fora')
    if lambri:
        for z in FRISOS:
            if z + 0.03 > altura:
                continue
            p += faixa(friso(z), u0, u1, paradas_frisos(z) if paradas_frisos else paradas_baixo if z < 3.2 else (),
                       'friso')
        if altura == H:
            p += faixa(FRISO_DE_CIMA, u0, u1, (), 'friso-de-cima')
    else:
        p += faixa(rodape_dentro(-1), u0, u1, paradas_rodape, 'rodape')
    return p


# Molduras: perfil (o, d) puxado em volta do vão. `o` < 0 entra no vão (forra o vão inteiro, sem degrau
# fino visto de lado), `d` é a profundidade em y (passa da parede dos dois lados).
MOLDURA = [(-0.06, -0.15), (0.10, -0.15), (0.12, -0.13), (0.12, 0.12), (0.10, 0.14), (-0.06, 0.14)]
BATENTE = [(-0.06, -0.17), (0.14, -0.17), (0.16, -0.15), (0.16, 0.15), (0.14, 0.17), (-0.06, 0.17)]


def parede_porta(familia, altura=H):
    """Três células com o vão da porta (2,2 × 3,0, o da casa) no meio, batente, soleira e, no lambri,
    o degrau de pedra e a cornija por fora. A folha é o nó `porta` (ou `porta-interna`) do
    `casa-portas.glb`, posta com a mesma posição e giro desta parede."""
    lambri = familia == 'lambri'
    m_bat = 'batente' if lambri else 'acabamento'
    meio = PORTA_L / 2
    vao = (0.0, PORTA_L, Z0, PORTA_A)
    parar = [(-meio - 0.1, meio + 0.1)]
    p = parede(3, familia, altura, [vao], paradas_frisos=lambda z: parar if z < 3.2 else [(-1.32, 1.32)],
               paradas_baixo=parar, paradas_rodape=parar)
    if altura == H:
        p.append(varrer([(meio, Z0), (meio, PORTA_A), (-meio, PORTA_A), (-meio, Z0)], False, BATENTE, m_bat,
                        nome='batente'))
    else:
        topo = altura + 0.02
        p.append(varrer([(meio, Z0), (meio, topo)], False, BATENTE, m_bat, nome='batente'))
        p.append(varrer([(-meio, topo), (-meio, Z0)], False, BATENTE, m_bat, nome='batente'))
    # Soleira: 3 cm acima do piso, 2 cm dentro de cada batente.
    p.append(sem_fundo(caixa(-meio - 0.02 + 0.06, meio + 0.02 - 0.06, -0.15, 0.15, Z0, 0.03, 'batente', bevel=0.01)))
    if lambri:
        # Degrau de pedra por fora (topo 5 cm acima do piso) e cornija em cima do batente.
        p.append(sem_fundo(caixa(-1.25, 1.25, -0.5, -0.13, -0.3, 0.05, 'alicerce', bevel=0.03)))
        if altura == H:
            p.append(caixa(-1.38, 1.38, -0.22, -0.08, 3.12, 3.3, 'acabamento', bevel=0.02))
    return p


def vidro_e_cruz(w, b, t, cruz=True):
    """Vidro (entra 2 cm na moldura) e a cruz do caixilho (entra 1 cm)."""
    p = [caixa(-w / 2 + 0.04, w / 2 - 0.04, -0.01, 0.01, b + 0.04, t - 0.04, 'vidroJanela')]
    if cruz:
        p.append(caixa(-0.025, 0.025, -0.03, 0.03, b + 0.05, t - 0.05, 'acabamento'))
        p.append(caixa(-w / 2 + 0.05, w / 2 - 0.05, -0.025, 0.025, (b + t) / 2 - 0.025, (b + t) / 2 + 0.025,
                       'acabamento'))
    return p


def peitoris(w):
    """Peitoril de fora e o de dentro, embaixo da moldura."""
    return [caixa(-w / 2 - 0.2, w / 2 + 0.2, -0.27, -0.08, JAN_B - 0.17, JAN_B - 0.1, 'acabamento', bevel=0.015),
            caixa(-w / 2 - 0.1, w / 2 + 0.1, 0.08, 0.22, JAN_B - 0.15, JAN_B - 0.09, 'acabamento', bevel=0.012)]


def floreira(w, z0, seed):
    """Floreira azul com terra, folhagem e flores, presa na parede por duas mãos-francesas."""
    p = []
    zt = z0 + 0.26
    p.append(loft_ret([(0, 0), (0, 0.26), (0.03, 0.26), (0.03, 0.21), (0.031, 0.21)], w, 0.28, 0.05,
                      ['floreira', 'floreira', 'floreira', 'terra'], seg=2, pos=(0, -0.34, z0), topo=True, base=True,
                      liso=False, nome='floreira'))
    for s in (-1, 1):
        o = prism([(-0.08, zt - 0.27), (-0.08, z0 - 0.2), (-0.2, z0 + 0.01)], 0.05, (0, 0, 0), 'floreira')
        o.rotation_euler = (0, 0, R(90))
        o.location.x = s * (w / 2 - 0.2)
        p.append(o)
    rnd = random.Random(seed)
    cores = ['petalaRosa', 'petalaAmarela', 'petalaBranca', 'petalaLilas', 'petalaRosa', 'petalaAmarela']
    n = max(3, int(w / 0.3))
    for k in range(n):
        x = (k - (n - 1) / 2) * (w - 0.12) / n
        p.append(uvball(0.12, (x, -0.34, zt - 0.02), 'copa' if k % 2 else 'copaClara', seg=8, ring=5,
                        scale=(1.1, 0.9, 0.75)))
        p += florzinha((x + rnd.uniform(-0.04, 0.04), -0.36 + rnd.uniform(-0.04, 0.04), zt + 0.08), cores[k % 6],
                       r=0.07, seed=k)
    return p


def janela_grande(familia, seed=1):
    """Três células, vão de 1,5 × 1,2 (peitoril em 1,6, verga em 2,8). No lambri: venezianas abertas
    com ripas e floreira com flores, como as janelas da casa."""
    lambri = familia == 'lambri'
    w = 1.5
    vao = (0.0, w, JAN_B, JAN_T)
    zona = (JAN_B - 0.15, JAN_T + 0.15)

    def pf(z):
        return [(-1.05, 1.05)] if zona[0] < z < zona[1] else []

    p = parede(3, familia, H, [vao], paradas_frisos=pf)
    p.append(varrer([(-w / 2, JAN_B), (w / 2, JAN_B), (w / 2, JAN_T), (-w / 2, JAN_T)], True, MOLDURA, 'acabamento'))
    p += vidro_e_cruz(w, JAN_B, JAN_T)
    p += peitoris(w)
    if lambri:
        for s in (-1, 1):
            x0, x1 = sorted((s * (w / 2 + 0.13), s * (w / 2 + 0.53)))
            p.append(caixa(x0, x1, -0.165, -0.115, JAN_B - 0.06, JAN_T + 0.06, 'floreira', bevel=0.012))
            for k in range(6):
                z = JAN_B + 0.06 + k * 0.205
                p.append(caixa(x0 + 0.04, x1 - 0.04, -0.195, -0.16, z, z + 0.05, 'ripa'))
        p += floreira(w + 0.1, 1.1, seed)
    return p


def _arco(cx, cz, r, a0, a1, passo=15):
    n = int(round(abs(a1 - a0) / passo))
    return [(cx + r * math.cos(R(a0 + (a1 - a0) * k / n)), cz + r * math.sin(R(a0 + (a1 - a0) * k / n)))
            for k in range(n + 1)]


def tampao(cantos_e_arcos, y0, y1, mfrente, mverso, mborda, nome='tampao'):
    """Tampão no plano da parede (frente em y0, verso em y1) feito de triângulos [(a, b, c)] em (x, z),
    com a borda curva (lista de pontos em (x, z)) forrada para dentro do vão. Fecha os cantos do vão
    retangular em volta de um arco ou de um círculo, rente às faces da parede."""
    tris, borda = cantos_e_arcos
    bm = bmesh.new()
    vs = {}
    nomes = [mfrente, mverso] + ([mborda] if mborda not in (mfrente, mverso) else [])

    def V(p, k):
        chave = (round(p[0], 6), round(p[1], 6), k)
        if chave not in vs:
            vs[chave] = bm.verts.new((p[0], (y0, y1)[k], p[1]))
        return vs[chave]

    for tri in tris:
        f = bm.faces.new([V(p, 0) for p in tri])
        _orientar(f, (0, -1, 0))
        f.material_index = 0
        f = bm.faces.new([V(p, 1) for p in tri])
        _orientar(f, (0, 1, 0))
        f.material_index = 1
    for linha in borda:
        for a, b in zip(linha, linha[1:]):
            f = bm.faces.new([V(a, 0), V(b, 0), V(b, 1), V(a, 1)])
            f.material_index = nomes.index(mborda)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _objeto(nome, bm, nomes)


def janela_arco(familia):
    """Duas células, vão de 1,0 × 1,2 com o alto em arco (raio 0,5 a partir de 2,3), bandeira com
    raios e pedra-chave. Os cantos do vão acima do arco são um tampão rente à parede."""
    lambri = familia == 'lambri'
    frente = 'parede' if lambri else 'paredeVerso'
    w, r, cz = 1.0, 0.5, RED_B
    vao = (0.0, w, JAN_B, JAN_T)
    meio_frame = r + 0.03

    def pf(z):
        if not (JAN_B - 0.15 < z < JAN_T + 0.15):
            return []
        if z <= cz:
            return [(-meio_frame, meio_frame)]
        dz = z - cz
        if dz >= meio_frame:
            return []
        x = math.sqrt(meio_frame ** 2 - dz ** 2)
        return [(-x, x)]

    p = parede(2, familia, H, [vao], paradas_frisos=pf)
    tris, bordas = [], []
    for s in (-1, 1):
        arco = _arco(0, cz, r, 90 if s < 0 else 90, 180 if s < 0 else 0)
        canto = (s * w / 2, JAN_T)
        for a, b in zip(arco, arco[1:]):
            tris.append((canto, a, b))
        bordas.append(arco)
    p.append(tampao((tris, bordas), -T / 2, T / 2, frente, 'paredeDentro', frente, 'tampao'))
    caminho = [(-w / 2, JAN_B), (w / 2, JAN_B)] + _arco(0, cz, r, 0, 180)
    p.append(varrer(caminho, True, MOLDURA, 'acabamento'))
    # Vidro: o contorno do vão 4 cm para dentro (2 cm dentro da moldura).
    g = w / 2 - 0.04
    contorno = [(-g, JAN_B + 0.04), (g, JAN_B + 0.04)] + _arco(0, cz, r - 0.04, 0, 180)
    p.append(prism(contorno, 0.02, (0, 0, 0), 'vidroJanela'))
    p.append(caixa(-0.025, 0.025, -0.03, 0.03, JAN_B + 0.05, JAN_T - 0.05, 'acabamento'))
    p.append(caixa(-w / 2 + 0.05, w / 2 - 0.05, -0.025, 0.025, cz - 0.025, cz + 0.025, 'acabamento'))
    for a in (45, 135):
        o = box((r - 0.07, 0.05, 0.04), (0, 0, 0), 'acabamento', bevel=0)
        o.rotation_euler = (0, R(-a), 0)
        o.location = ((r - 0.07) / 2 * math.cos(R(a)), 0, cz + (r - 0.07) / 2 * math.sin(R(a)))
        p.append(o)
    p += peitoris(w)
    ch = prism([(-0.07, JAN_T - 0.02), (0.07, JAN_T - 0.02), (0.1, JAN_T + 0.18), (-0.1, JAN_T + 0.18)], 0.06,
               (0, -0.16, 0), 'acabamento')
    p.append(ch)
    return p


def janela_redonda(familia):
    """Uma célula, vigia redonda (vão quadrado de 0,5 em 2,3 a 2,8, vidro de raio 0,18) com cruz."""
    lambri = familia == 'lambri'
    frente = 'parede' if lambri else 'paredeVerso'
    cz, h, rf = (RED_B + JAN_T) / 2, 0.25, 0.2
    vao = (0.0, 2 * h, RED_B, JAN_T)
    meio_frame = rf + 0.025

    def pf(z):
        dz = abs(z - cz)
        if dz >= meio_frame:
            return []
        x = math.sqrt(meio_frame ** 2 - dz ** 2)
        return [(-x, x)]

    p = parede(1, familia, H, [vao], paradas_frisos=pf)
    circ = _arco(0, cz, rf, 0, 360)[:-1]   # 24 pontos, um a cada 15°
    ang = lambda k: 15 * k  # noqa: E731
    cantos = {45: (h, cz + h), 135: (-h, cz + h), 225: (-h, cz - h), 315: (h, cz - h)}
    tris = []
    lados = [(315, 45), (45, 135), (135, 225), (225, 315)]
    for a0, a1 in lados:
        ca, cb = cantos[a0 % 360], cantos[a1 % 360]
        meio = (a0 + (a1 - a0 + 360) % 360 / 2) % 360
        ks = [(a0 + 15 * i) % 360 for i in range(int(((a1 - a0) % 360) / 15) + 1)]
        pt = {k: circ[k // 15] for k in ks}
        km = ks.index(meio)
        for a, b in zip(ks[:km], ks[1:km + 1]):
            tris.append((ca, pt[a], pt[b]))
        for a, b in zip(ks[km:], ks[km + 1:]):
            tris.append((cb, pt[a], pt[b]))
        if meio in (90, 270):
            # Em cima e embaixo a parede tem a coluna do meio da célula (x = 0): o lado do tampão ganha
            # o mesmo vértice, senão sobraria uma emenda em T.
            m = (0.0, ca[1])
            tris.append((ca, pt[meio], m))
            tris.append((m, pt[meio], cb))
        else:
            tris.append((ca, pt[meio], cb))
    p.append(tampao((tris, [circ + [circ[0]]]), -T / 2, T / 2, frente, 'paredeDentro', frente, 'tampao'))
    perfil = [(-0.04, -0.16), (0.07, -0.16), (0.09, -0.14), (0.09, 0.12), (0.07, 0.14), (-0.04, 0.14)]
    p.append(varrer(circ, True, perfil, 'acabamento'))
    p.append(cyl(rf - 0.02, 0.02, (0, 0, cz), 'vidroJanela', verts=24, rot=(R(90), 0, 0), smooth_sides=False))
    p.append(caixa(-0.02, 0.02, -0.03, 0.03, cz - rf + 0.03, cz + rf - 0.03, 'acabamento'))
    p.append(caixa(-rf + 0.03, rf - 0.03, -0.025, 0.025, cz - 0.02, cz + 0.02, 'acabamento'))
    return p


def quina(familia, altura=H):
    """Peça do canto, centrada no ponto da grade: vai em toda ponta de parede e em toda dobra em L.
    Lambri: pilar branco de 0,34 (os da casa) num bloco de alicerce de 0,44. Lisa: pilar arredondado
    de 0,30 que cobre a ponta da parede e os dois rodapés."""
    if familia == 'lambri':
        return [caixa(-0.17, 0.17, -0.17, 0.17, 0.2, altura + 0.04, 'acabamento', bevel=0.04, segs=2),
                sem_fundo(caixa(-0.22, 0.22, -0.22, 0.22, -0.3, 0.32, 'alicerce', bevel=0.05, segs=1))]
    return [sem_fundo(caixa(-0.15, 0.15, -0.15, 0.15, Z0, altura + 0.03, 'acabamento', bevel=0.05, segs=2))]


def paredes():
    nos = {}
    notas = {}
    for fam in ('lambri', 'lisa'):
        nos[f'parede-{fam}'] = parede(1, fam)
        nos[f'parede-{fam}-baixa'] = parede(1, fam, HB)
        nos[f'parede-porta-{fam}'] = parede_porta(fam)
        nos[f'parede-porta-{fam}-baixa'] = parede_porta(fam, HB)
        nos[f'parede-janela-grande-{fam}'] = janela_grande(fam)
        nos[f'parede-janela-arco-{fam}'] = janela_arco(fam)
        nos[f'parede-janela-redonda-{fam}'] = janela_redonda(fam)
        nos[f'quina-{fam}'] = quina(fam)
        nos[f'quina-{fam}-baixa'] = quina(fam, HB)
    for nome in nos:
        if nome.startswith('parede-'):
            larg = 3 if ('porta' in nome or 'grande' in nome) else 2 if 'arco' in nome else 1
            notas[nome] = f'{larg} célula(s); origem no meio da base, na linha da grade'
        else:
            notas[nome] = 'origem no ponto da grade'
    return nos, notas


# ---------------------------------------------------------------- portas
def folha(cor, cor_clara, janela):
    """Folha de 2,04 × 2,87 × 0,08 fechada no vão (o mesmo referencial da parede da porta)."""
    x0, x1, z0, z1 = -1.02, 1.02, 0.05, 2.92
    p = []
    vaos = [(0.0, 0.6, 2.15, 2.75)] if janela else []
    p.append(parede_grade(x0, x1, -0.04, 0.04, z0, z1, vaos, cor, cor, cor, cor, tampas=True, fundo=True,
                          nome='folha'))
    if janela:
        cz, rf = 2.45, 0.24
        circ = _arco(0, cz, rf, 0, 360)[:-1]
        cantos = {45: (0.3, cz + 0.3), 135: (-0.3, cz + 0.3), 225: (-0.3, cz - 0.3), 315: (0.3, cz - 0.3)}
        tris = []
        for a0, a1 in [(315, 45), (45, 135), (135, 225), (225, 315)]:
            ks = [(a0 + 15 * i) % 360 for i in range(7)]
            pt = {k: circ[k // 15] for k in ks}
            for a, b in zip(ks[:3], ks[1:4]):
                tris.append((cantos[a0], pt[a], pt[b]))
            for a, b in zip(ks[3:], ks[4:]):
                tris.append((cantos[a1], pt[a], pt[b]))
            tris.append((cantos[a0], pt[ks[3]], cantos[a1]))
        p.append(tampao((tris, [circ + [circ[0]]]), -0.04, 0.04, cor, cor, cor))
        perfil = [(-0.04, -0.065), (0.07, -0.065), (0.08, -0.055), (0.08, 0.055), (0.07, 0.065), (-0.04, 0.065)]
        p.append(varrer(circ, True, perfil, 'batente'))
        p.append(cyl(rf - 0.02, 0.016, (0, 0, cz), 'vidroJanela', verts=24, rot=(R(90), 0, 0), smooth_sides=False))
        p.append(caixa(-0.018, 0.018, -0.025, 0.025, cz - rf + 0.03, cz + rf - 0.03, 'batente'))
        p.append(caixa(-rf + 0.03, rf - 0.03, -0.022, 0.022, cz - 0.018, cz + 0.018, 'batente'))
        almofadas = [(-0.48, 0.25, 1.2), (0.48, 0.25, 1.2), (-0.48, 1.4, 1.95), (0.48, 1.4, 1.95)]
    else:
        almofadas = [(-0.48, 0.25, 1.2), (0.48, 0.25, 1.2), (-0.48, 1.4, 2.7), (0.48, 1.4, 2.7)]
    for s in (-1, 1):
        for x, zb, zt in almofadas:
            y0, y1 = sorted((s * 0.03, s * 0.065))
            p.append(caixa(x - 0.36, x + 0.36, y0, y1, zb, zt, cor_clara, bevel=0.02, segs=2))
        # Maçaneta dos dois lados.
        p.append(cyl(0.07, 0.04, (0.8, s * 0.06, 1.45), 'macaneta', verts=12, rot=(R(90), 0, 0)))
        p.append(uvball(0.085, (0.8, s * 0.13, 1.45), 'macaneta', seg=12, ring=8))
    for z in (0.45, 1.5, 2.5):
        p.append(caixa(-1.0, -0.87, -0.052, -0.035, z - 0.07, z + 0.07, 'metalEscuro', bevel=0.005))
    return p


def portas():
    pivo = (-1.02, -0.04, 0.0)
    abrir = {'rotation_euler': [(0, (0, 0, 0)), (7, (0, 0, R(-62))), (18, (0, 0, R(-100)))]}
    return {
        'porta': (folha('portaMadeira', 'portaMadeiraClara', True), pivo),
        'porta-interna': (folha('portaPintada', 'portaPintadaClara', False), pivo),
    }, {'abrir': {'porta': abrir}, 'abrir-interna': {'porta-interna': abrir}}


# ---------------------------------------------------------------- pisos
def piso_tabua():
    p = []
    juntas = [-0.18, 0.27, -0.38, 0.06]
    cores = ['tabua', 'tabuaClara', 'tabua', 'tabuaEscura']
    for r in range(4):
        y0, y1 = -0.5 + 0.25 * r, -0.25 + 0.25 * r
        for x0, x1 in ((-0.5, juntas[r]), (juntas[r], 0.5)):
            pol = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
            ch = [True, x1 < 0.5, True, x0 > -0.5]
            p.append(bloco(pol, Z0, 0.0, 0.012, cores[r], chanfrar=ch, nome='tabua'))
    return p


def piso_ladrilho():
    p = []
    for i in range(2):
        for j in range(2):
            x0, y0 = -0.5 + 0.5 * i, -0.5 + 0.5 * j
            m = 'ladrilhoClaro' if (i + j) % 2 == 0 else 'ladrilhoCor'
            p.append(bloco([(x0, y0), (x0 + 0.5, y0), (x0 + 0.5, y0 + 0.5), (x0, y0 + 0.5)], Z0, 0.0, 0.015, m))
    return p


def piso_azulejo():
    """Octógonos brancos sobre a base verde-água: os quadradinhos aparecem nos cantos, 1,5 cm abaixo."""
    p = [bloco([(-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)], Z0, -0.015, 0.0, 'azulejoCor',
               chanfrar=[False] * 4, tampa_lados=[False] * 4, nome='base')]
    c = 0.11
    for i in range(2):
        for j in range(2):
            x0, y0 = -0.5 + 0.5 * i, -0.5 + 0.5 * j
            x1, y1 = x0 + 0.5, y0 + 0.5
            pol = [(x0 + c, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1 - c), (x1 - c, y1), (x0 + c, y1), (x0, y1 - c),
                   (x0, y0 + c)]
            p.append(bloco(pol, -0.03, 0.0, 0.01, 'azulejo', nome='octogono'))
    return p


def _grama(seed, tufos=3, flores=1):
    """Tapete de grama do quintal: topo 2 cm abaixo do piso da casa (a altura do chão da ilha), com um
    calombo de 1,2 cm no meio (as bordas ficam retas e casam com a vizinha) e tufos de capim."""
    zt = -0.02
    bm = bmesh.new()
    g = {}
    for i in range(3):
        for j in range(3):
            z = zt + (0.012 if (i, j) == (1, 1) else 0.0)
            g[(i, j)] = bm.verts.new((-0.5 + 0.5 * i, -0.5 + 0.5 * j, z))
    for i in range(2):
        for j in range(2):
            bm.faces.new((g[(i, j)], g[(i + 1, j)], g[(i + 1, j + 1)], g[(i, j + 1)]))
    # Sem lados: o topo fica na altura do chão da ilha, que aparece por baixo (lados aqui dariam emenda
    # em T com os lados dos pisos da casa, que vão até 0).
    for f in bm.faces:
        _orientar(f, (0, 0, 1))
    o = _objeto('grama', bm, ['grama'])
    for pf in o.data.polygons:
        pf.use_smooth = pf.normal.z > 0.5
    p = [o]
    rnd = random.Random(seed)
    lugares = [(-0.24, -0.18), (0.22, 0.2), (0.18, -0.26), (-0.2, 0.26)]
    for k in range(tufos):
        cx, cy = lugares[k]
        for b in range(5):
            a = R(72 * b + rnd.uniform(-20, 20))
            h = rnd.uniform(0.09, 0.15)
            c = cone(0.022, h, (0, 0, 0), 'tufo' if b % 2 else 'tufoClaro', verts=4)
            c.rotation_euler = (R(rnd.uniform(12, 24)) * math.cos(a), R(rnd.uniform(12, 24)) * math.sin(a), a)
            c.location = (cx + 0.03 * math.cos(a), cy + 0.03 * math.sin(a), zt + h / 2 - 0.01)
            p.append(c)
    for k in range(flores):
        cx, cy = (0.02, 0.05) if k == 0 else (-0.3, -0.32)
        p.append(cyl(0.008, 0.12, (cx, cy, zt + 0.05), 'tufo', verts=5))
        p += florzinha((cx, cy, zt + 0.12), 'petalaBranca' if k == 0 else 'petalaAmarela', r=0.05, seed=k, seg=6,
                       aneis=4)
    return p


def piso_grama():
    return _grama(3)


def piso_pedra():
    p = _grama(5, tufos=2, flores=0)
    for cx, cy, rx, ry, s in ((-0.16, -0.14, 0.24, 0.2, 1), (0.22, 0.22, 0.19, 0.16, 2)):
        pts = lib_ilha.blob(cx, cy, rx, ry, seed=s, n=18, wob=0.06)
        p.append(lib_ilha.slab(pts, -0.06, 0.012, 'pedraCaminho', bevel=0.02, segs=2, fundo=False))
    return p


def pisos():
    return {'piso-tabua': piso_tabua(), 'piso-ladrilho': piso_ladrilho(), 'piso-azulejo': piso_azulejo(),
            'piso-grama': piso_grama(), 'piso-pedra': piso_pedra()}


# ---------------------------------------------------------------- telhado
D0, D1 = 0.17, 0.12     # espessura da fiada na beirada de baixo (com o "lábio") e na de cima
FORA_DO_OITAO = 0.24    # quanto o telhado passa do oitão (a testeira fecha a ponta)


def perfil_agua(run, cores):
    """Perfil (y, z) de um pedaço de água: de y = 0 (embaixo) a `run`, com uma fiada a cada 0,5.
    O forro vai por baixo; cada fiada afina de D0 para D1 e a de cima mostra o lábio sobre a de baixo."""
    n = int(round(run / 0.5))
    pts = [(0.0, 0.0), (run, run * INCL), (run, run * INCL + D1)]
    mats = ['telhadoForro', 'telhado']
    for k in range(n - 1, -1, -1):
        ya = k * 0.5
        pts.append((ya, ya * INCL + D0))
        mats.append(cores[k % len(cores)])
        if k > 0:
            pts.append((ya, ya * INCL + D1))
            mats.append('telhadoBorda')
    pts.append((0.0, D1))
    mats.append('telhadoBorda')
    mats.append('telhadoForro')
    return pts, mats


def agua(run, x0=-0.5, x1=0.5, tampas=(False, False)):
    pts, mats = perfil_agua(run, ['telhado', 'telhadoSombra'])
    return [extrudar(pts, x0, x1, mats, tampas=tampas, nome='agua')]


def beiral(x0=-0.5, x1=0.5, tampas=(False, False), tampa_calha=(False, False)):
    """Meia célula de telhado para fora da parede, com a testeira da frente e a calha."""
    p = []
    pts = [(-0.5, -0.25), (0.0, 0.0), (0.0, D1), (-0.5, -0.25 + D0)]
    p.append(extrudar(pts, x0, x1, ['telhadoForro', 'telhadoForro', 'telhadoSombra', 'telhadoBorda'], tampas=tampas,
                      nome='beiral'))
    p.append(extrudar([(-0.49, -0.36), (-0.57, -0.36), (-0.57, -0.17), (-0.49, -0.17)], x0, x1, 'acabamento',
                      tampas=tampas, nome='testeira-frente'))
    yc, zc, ro, ri = -0.65, -0.2, 0.09, 0.075
    arco = [(yc + ro * math.cos(R(a)), zc + ro * math.sin(R(a))) for a in range(180, 361, 20)]
    arco += [(yc + ri * math.cos(R(a)), zc + ri * math.sin(R(a))) for a in range(360, 179, -20)]
    p.append(extrudar(arco, x0, x1, 'calha', tampas=tampa_calha, nome='calha'))
    return p


def tabua_testeira(y0, y1, x0, x1):
    """Testeira da ponta: tábua inclinada que fecha a ponta do telhado no oitão."""
    pts = [(y0, y0 * INCL - 0.08), (y1, y1 * INCL - 0.08), (y1, y1 * INCL + D0 + 0.04), (y0, y0 * INCL + D0 + 0.04)]
    return extrudar(pts, x0, x1, 'acabamento', nome='testeira')


def _pontas(lado):
    """Trecho da água que passa do oitão e a tábua da testeira na ponta (sem se sobrepor em x: a
    ponta aberta da água encosta na face de dentro da tábua)."""
    if lado < 0:
        return (-0.5 - FORA_DO_OITAO, -0.5), (-0.5 - FORA_DO_OITAO - 0.1, -0.5 - FORA_DO_OITAO)
    return (0.5, 0.5 + FORA_DO_OITAO), (0.5 + FORA_DO_OITAO, 0.5 + FORA_DO_OITAO + 0.1)


def testeira(run, lado):
    """`lado` -1: ponta em x < -0,5 (testeira-esq); +1: ponta em x > 0,5. Vai com a mesma posição e
    giro da água da ponta da fileira."""
    (a, b), (c0, c1) = _pontas(lado)
    p = agua(run, a, b)
    # A tábua passa 5 mm de cada ponta da água: as pontas das duas nunca ficam no mesmo plano.
    p.append(tabua_testeira(-0.005, run + 0.005, c0, c1))
    return p


def testeira_beiral(lado):
    (a, b), (c0, c1) = _pontas(lado)
    p = beiral(a, b, tampa_calha=(lado < 0, lado > 0))
    p.append(tabua_testeira(-0.58, 0.005, c0, c1))
    return p


def perfil_cumeeira():
    pts = [(0.16 * math.cos(R(a)), 0.11 + 0.16 * math.sin(R(a))) for a in range(-25, 206, 23)]
    mats = ['telhado'] * (len(pts) - 1) + [None]
    return pts, mats


def cumeeira(x0=-0.5, x1=0.5):
    pts, mats = perfil_cumeeira()
    return [extrudar(pts, x0, x1, mats, tampas=(True, True), nome='cumeeira')]


def oitao(largura, sobe, triangulo=True):
    """Pedaço de oitão (empena), no referencial de parede (origem no meio da base, fora em -Y, rente à
    parede de baixo). `sobe` +1: alto à direita (+x); -1: alto à esquerda. Sem `triangulo`, é a faixa
    retangular de altura INCL × largura que vai embaixo dos triângulos das colunas mais altas."""
    a, b = -largura / 2, largura / 2
    hh = INCL * largura
    if triangulo:
        if sobe > 0:
            pts = [(a, 0), (0, 0), (b, 0), (b, hh), (b, hh + 0.03), (a, 0.03)] if largura > 0.75 else \
                [(a, 0), (b, 0), (b, hh), (b, hh + 0.03), (a, 0.03)]
        else:
            pts = [(a, 0), (0, 0), (b, 0), (b, 0.03), (a, hh + 0.03), (a, hh)] if largura > 0.75 else \
                [(a, 0), (b, 0), (b, 0.03), (a, hh + 0.03), (a, hh)]
    else:
        pts = [(a, 0), (0, 0), (b, 0), (b, hh), (0, hh), (a, hh)] if largura > 0.75 else [(a, 0), (b, 0), (b, hh),
                                                                                           (a, hh)]
    mats = ['parede'] * len(pts)
    for i in range(len(pts)):
        p0, p1 = pts[i], pts[(i + 1) % len(pts)]
        # Embaixo pousa no topo da parede e dos lados encosta na coluna vizinha: sem face (as vizinhas
        # e o telhado escondem, e assim nada fica no plano da ponta de uma água).
        if (abs(p0[1]) < 1e-9 and abs(p1[1]) < 1e-9) or abs(p0[0] - p1[0]) < 1e-9:
            mats[i] = None
    # Fica 3 cm à frente da parede de baixo (frente em -0,13): rente, o pé do oitão casaria com a borda
    # de cima da parede só nas meias células, e as colunas dos vãos dariam emenda em T.
    o = extrudar(pts, -0.08, 0.13, mats, tampas=(True, True), mtampas=('paredeDentro', 'parede'), nome='oitao')
    # extrudar puxa em x com o perfil em (y, z): -90° em z leva o perfil para (x, z), a ponta x0 para
    # y = +0,08 (o verso) e a x1 para y = -0,13 (a frente).
    o.rotation_euler = (0, 0, R(-90))
    return [o]


def vigia():
    """Janelinha redonda do oitão (o vidro acende com as outras). Origem no centro, na linha da grade:
    vai com o giro do oitão, na altura que quiser."""
    circ = _arco(0, 0, 0.22, 0, 360)[:-1]
    perfil = [(-0.03, -0.2), (0.07, -0.2), (0.09, -0.18), (0.09, -0.08), (-0.03, -0.08)]
    p = [varrer(circ, True, perfil, 'acabamento', nome='vigia')]
    p.append(cyl(0.24, 0.02, (0, -0.125, 0), 'vidroJanela', verts=24, rot=(R(90), 0, 0), smooth_sides=False))
    p.append(caixa(-0.02, 0.02, -0.17, -0.13, -0.2, 0.2, 'acabamento'))
    p.append(caixa(-0.2, 0.2, -0.165, -0.135, -0.02, 0.02, 'acabamento'))
    return p


def telhado():
    nos = {
        'agua': agua(1.0),
        'agua-meia': agua(0.5),
        'beiral': beiral(),
        'cumeeira': cumeeira(),
        'cumeeira-ponta': cumeeira(-0.5 - FORA_DO_OITAO - 0.12, -0.5),
        'testeira-esq': testeira(1.0, -1),
        'testeira-dir': testeira(1.0, 1),
        'testeira-meia-esq': testeira(0.5, -1),
        'testeira-meia-dir': testeira(0.5, 1),
        'testeira-beiral-esq': testeira_beiral(-1),
        'testeira-beiral-dir': testeira_beiral(1),
        'oitao-esq': oitao(1.0, -1),
        'oitao-dir': oitao(1.0, 1),
        'oitao-meia-esq': oitao(0.5, -1),
        'oitao-meia-dir': oitao(0.5, 1),
        'oitao-faixa': oitao(1.0, 0, False),
        'oitao-faixa-meia': oitao(0.5, 0, False),
        'vigia': vigia(),
    }
    return nos


# ---------------------------------------------------------------- segundo andar (pedido E04)
# Tudo no referencial do térreo: z = 0 é o piso de baixo. O piso de cima tem o topo em 4,10 e 10 cm
# de espessura (de 4,00, o topo das paredes de baixo, a 4,10); as paredes de cima são as de sempre
# deslocadas 4,10.
ANDAR = 4.1
DEGRAUS = 14
PISO_ESCADA = 4.0 / DEGRAUS          # 0,286 de piso por degrau (a escada tem 4 de comprimento)
ESPELHO = ANDAR / DEGRAUS            # 0,293 de espelho (o corpo sobe sozinho até 0,45)
LARGURA_ESCADA = 0.78                # de -0,39 a 0,39: não encosta no plano da parede (0,40)
SAIDA_DA_ESCADA = 0.7                # a âncora de saída fica 0,7 dentro do piso de cima (a do Bosque)


def piso_andar(montar):
    """O piso de cima: o mesmo piso do térreo subido 4,10, fechado por baixo com o forro (o teto de
    baixo), uma face só no plano de 4,00 (as tábuas e ladrilhos não têm fundo)."""
    p = montar()
    lib_ilha.place(p, loc=(0, 0, ANDAR))
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, ANDAR + Z0)) for x, y in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5))]
    f = bm.faces.new(vs)
    _orientar(f, (0, 0, -1))
    p.append(_objeto('forro', bm, ['telhadoForro']))
    return p


def escada_interna():
    """1 × 4: 14 degraus de 0,293 de 0 a 4,10, com corrimão do lado -x. Origem no meio do pé da escada
    (na linha da grade), subindo para +Y; o último degrau é o próprio piso de cima (topo em 4,10,
    de y = 3,71 a 4,00), e o piso de cima continua de y = 4 em diante. Por baixo, uma laje inclinada
    de forro (20 cm de espessura). Os lados ficam a 0,39 do meio: encostada numa parede do kit,
    sobra 1 cm até a face dela.

    Uma malha só: o perfil (degraus em cima, a laje embaixo, com um vértice embaixo de cada quina
    de degrau) puxado em x, e cada lado feito de uma faixa e um triângulo por degrau (os cantos de
    dentro dos degraus ficam numa reta: um polígono inteiro daria emenda em T)."""
    s = ESPELHO / PISO_ESCADA
    d = 0.2 * math.hypot(1, s)          # a laje de baixo, medida na vertical

    def laje(y):
        return s * y - d
    # Perfil (y, z), na ordem: pé, TL0, TR0, TL1, TR1, …, TR13 (a ponta de cima), as quinas de baixo
    # B14 … B1 e o ponto em que a laje encosta no piso.
    P = [(0.0, 0.0)]
    mats = []
    for k in range(DEGRAUS):
        P += [(k * PISO_ESCADA, (k + 1) * ESPELHO), ((k + 1) * PISO_ESCADA, (k + 1) * ESPELHO)]
        mats += ['acabamento', 'tabua' if k % 2 else 'tabuaClara']
    mats.append('acabamento')                        # a ponta de cima (de costas para o piso de cima)
    for k in range(DEGRAUS, 0, -1):
        P.append((k * PISO_ESCADA, laje(k * PISO_ESCADA)))
        mats.append('telhadoForro')
    P.append((d / s, 0.0))
    mats[-1] = 'telhadoForro'
    mats.append(None)                                # o pé, deitado no piso, sem face
    n = len(P)
    TL = [1 + 2 * k for k in range(DEGRAUS)]
    TR = [2 + 2 * k for k in range(DEGRAUS)]
    B = {k: 2 * DEGRAUS + 1 + (DEGRAUS - k) for k in range(1, DEGRAUS + 1)}
    Z = n - 1
    x = LARGURA_ESCADA / 2
    nomes = ['acabamento', 'tabua', 'tabuaClara', 'telhadoForro', 'tabuaEscura']
    bm = bmesh.new()
    lados = [[bm.verts.new((sx * x, y, z)) for y, z in P] for sx in (-1, 1)]
    for i in range(n):
        if not mats[i]:
            continue
        j = (i + 1) % n
        A, C = lados
        f = bm.faces.new((A[i], A[j], C[j], C[i]))
        dy, dz = P[j][0] - P[i][0], P[j][1] - P[i][1]
        _orientar(f, (0, -dz, dy))
        f.material_index = nomes.index(mats[i])
    for sx, L in zip((-1, 1), lados):
        pecas = [(0, Z, B[1], TR[0]), (0, TR[0], TL[0])]
        for k in range(1, DEGRAUS):
            pecas += [(B[k], B[k + 1], TR[k], TR[k - 1]), (TR[k - 1], TR[k], TL[k])]
        for idx in pecas:
            f = bm.faces.new([L[i] for i in idx])
            _orientar(f, (sx, 0, 0))
            f.material_index = nomes.index('tabuaEscura')
    p = [_objeto('escada', bm, nomes)]
    # Corrimão do lado -x: pilar no primeiro e no último degrau, balaústres no meio de cada piso e o
    # corrimão 0,9 acima dos degraus, na inclinação da escada.
    xc = -x + 0.035     # o corrimão (com a bola do pilar) não passa de 0,395 do meio
    for k in (1, DEGRAUS):
        yk, zk = (k - 0.5) * PISO_ESCADA, k * ESPELHO
        p.append(caixa(xc - 0.03, xc + 0.03, yk - 0.03, yk + 0.03, zk - 0.02, zk + 1.0, 'batente', bevel=0.008))
        p.append(uvball(0.04, (xc, yk, zk + 1.03), 'batente', seg=10, ring=6))
    for k in range(2, DEGRAUS):
        yk, zk = (k - 0.5) * PISO_ESCADA, k * ESPELHO
        p.append(cyl(0.012, 0.92, (xc, yk, zk - 0.01 + 0.46), 'acabamento', verts=6))
    y0, y1 = 0.5 * PISO_ESCADA, (DEGRAUS - 0.5) * PISO_ESCADA
    p.append(tube([(xc, y0 + 0.03, ESPELHO + 0.9 + 0.03 * s), (xc, y1 - 0.03, ANDAR + 0.9 - 0.03 * s)],
                  [0.025, 0.025], 'batente', seg=8))
    return p


RAMPA_ACIMA = 0.1   # a rampa de colisão passa 0,1 acima da reta dos cantos de dentro dos degraus


def colisores_da_escada():
    """A escada se sobe andando: degrau de 0,286 de piso é estreito demais para o degrau automático do
    controlador (pede 0,25 livre em cima, além do corpo), então os degraus colidem como uma RAMPA de
    45,7° (o corpo sobe até 52°), 0,1 acima da reta dos cantos de dentro dos degraus: o pé fica entre
    0,1 abaixo do focinho e 0,19 acima do canto. Embaixo da rampa, uma caixa por degrau (sempre
    5 cm abaixo dela, sem encostar no corpo) fecha o vão de baixo da escada; no alto, a faixa do
    último degrau em 4,10 emenda a rampa no piso de cima. `col-escada-reta-*` só seguram o corpo
    (a câmera passa), como a escada do Bosque.

    `col-escada-reta-1` é a rampa; `-2` a `-14`, as caixas de baixo (degraus 2 a 14); `-15`, a faixa
    de cima."""
    s = ESPELHO / PISO_ESCADA
    th = math.atan(s)
    x = LARGURA_ESCADA / 2
    y_alto = (ANDAR - RAMPA_ACIMA) / s
    esp = 0.1
    comp = y_alto * math.hypot(1, s)
    ym, zm = y_alto / 2, s * y_alto / 2 + RAMPA_ACIMA
    cols = [col_girada('col-escada-reta-1', (LARGURA_ESCADA, comp, esp),
                       (0.0, ym + math.sin(th) * esp / 2, zm - math.cos(th) * esp / 2), (th, 0, 0))]
    for k in range(2, DEGRAUS + 1):
        cols.append(col_caixa(f'col-escada-reta-{k}', -x, x, (k - 1) * PISO_ESCADA, k * PISO_ESCADA, 0.0,
                              (k - 1) * ESPELHO + RAMPA_ACIMA - 0.05))
    cols.append(col_caixa(f'col-escada-reta-{DEGRAUS + 1}', -x, x, y_alto, 4.0, ANDAR - 0.3, ANDAR))
    return cols


def ancoras_da_escada():
    """As âncoras do modo escada (`escada.ts`), como as do Bosque: a base no pé e o topo na beira do
    piso de cima, no eixo da escada; a saída 0,7 dentro do piso de cima. No modo, o corpo vai pela
    reta da base ao topo, `ESCADA.afastamento` (0,47) para trás dela: passa uns 0,19 acima dos
    focinhos dos degraus, longe da rampa de colisão."""
    return [ancora('escada-1-base', 0.0, 0.0, 0.0), ancora('escada-1-topo', 0.0, 4.0, ANDAR),
            ancora('escada-1-saida', 0.0, 4.0 + SAIDA_DA_ESCADA, ANDAR)]


def balaustrada(u0, u1, v0, v1, ao_longo_de_x, fascia=None, postes=(), nome='guarda'):
    """Guarda-corpo sobre o piso de cima, ao longo de x (ou de y), com o corrimão de cima em 0,99
    (1 cm abaixo do topo da parede cortada, 1,0, para os dois não ficarem no mesmo plano onde o
    guarda-corpo encosta numa parede cortada; o colisor vai até 1,0): corrimão de cima, postes,
    balaústres a cada 0,125 e, se pedido, a faixa de acabamento que cobre a beira do vão.
    `u` vai ao longo do guarda-corpo e `v` na espessura dele."""
    def cx(a0, a1, b0, b1, z0, z1, m, bevel=0.0):
        if ao_longo_de_x:
            return caixa(a0, a1, b0, b1, z0, z1, m, bevel=bevel)
        return caixa(b0, b1, a0, a1, z0, z1, m, bevel=bevel)

    vm = (v0 + v1) / 2
    p = [cx(u0, u1, v0, v1, ANDAR + 0.91, ANDAR + 0.99, 'batente', bevel=0.012)]
    if fascia:
        f0, f1 = fascia
        p.append(cx(u0, u1, f0, f1, ANDAR - 0.15, ANDAR + 0.03, 'acabamento'))
        zb = ANDAR + 0.03
    else:
        p.append(cx(u0, u1, vm - 0.03, vm + 0.03, ANDAR + 0.02, ANDAR + 0.08, 'batente', bevel=0.008))
        zb = ANDAR + 0.08
    for u in postes:
        p.append(cx(u - 0.025, u + 0.025, vm - 0.025, vm + 0.025, ANDAR - 0.01, ANDAR + 0.93, 'batente'))
    n = int(round((u1 - u0) / 0.125))
    for i in range(n):
        u = u0 + (i + 0.5) * (u1 - u0) / n
        if any(abs(u - q) < 0.05 for q in postes):
            continue
        zm = (zb - 0.005 + ANDAR + 0.915) / 2
        p.append(cyl(0.011, ANDAR + 0.915 - zb + 0.005, (u, vm, zm) if ao_longo_de_x else (vm, u, zm), 'acabamento',
                     verts=6))
    return p


def piso_andar_vao():
    """O vão da escada no piso de cima (1 × 4, a mesma posição e giro da `escada-interna`): nenhum
    piso, a faixa de acabamento que cobre a beira dos pisos vizinhos e o guarda-corpo de 1,0 nos três
    lados abertos (os dois compridos e o do pé da escada; o quarto é onde a escada chega)."""
    p = []
    for s in (-1, 1):
        v0, v1 = sorted((s * 0.43, s * 0.495))
        f0, f1 = sorted((s * 0.465, s * 0.495))
        p += balaustrada(0.0, 4.0, v0, v1, False, fascia=(f0, f1), postes=(0.04, 1.0, 2.0, 3.0, 3.96))
    # O lado do pé encaixa entre os dois compridos (pontas de costas para eles).
    p += balaustrada(-0.43, 0.43, 0.005, 0.07, True, fascia=(0.005, 0.035), postes=(0.0,))
    return p


def colisores_do_vao():
    zt = ANDAR + 1.0
    return [col_caixa('col-guarda-vao-1', -0.5, -0.42, 0.0, 4.0, ANDAR - 0.1, zt),
            col_caixa('col-guarda-vao-2', 0.42, 0.5, 0.0, 4.0, ANDAR - 0.1, zt),
            col_caixa('col-guarda-vao-3', -0.5, 0.5, 0.0, 0.08, ANDAR - 0.1, zt)]


LADO_DA_PAREDE_DO_VAO = 'x+'   # o lado comprido sem guarda-corpo do `piso-andar-vao-parede`


def piso_andar_vao_parede():
    """Como o `piso-andar-vao`, mas sem o guarda-corpo do lado comprido +x local (x = +0,5): a escada
    encosta numa parede na linha x = +0,5 (o corrimão da escada fica do outro lado, em -x). No lugar
    do guarda-corpo, uma faixa de acabamento de 0,355 a 0,49 cobre, do lado do vão, a linha entre a
    parede de baixo (até 4,00) e a de cima (de 4,10, ou de 4,00 se for a de baixo subida), e segura
    por baixo o rodapé da parede de cima, que passa por cima do vão. A face dela fica 4,5 cm à frente
    da parede (nada no mesmo plano). O guarda-corpo do pé vai até a faixa."""
    p = balaustrada(0.0, 4.0, -0.495, -0.43, False, fascia=(-0.495, -0.465), postes=(0.04, 1.0, 2.0, 3.0, 3.96))
    p += balaustrada(-0.43, 0.355, 0.005, 0.07, True, fascia=(0.005, 0.035), postes=(0.0, 0.29))
    p.append(caixa(0.355, 0.49, 0.0, 4.0, ANDAR - 0.12, ANDAR + 0.02, 'acabamento'))
    return p


def colisores_do_vao_parede():
    zt = ANDAR + 1.0
    return [col_caixa('col-guarda-vao-parede-1', -0.5, -0.42, 0.0, 4.0, ANDAR - 0.1, zt),
            col_caixa('col-guarda-vao-parede-2', -0.5, 0.4, 0.0, 0.08, ANDAR - 0.1, zt)]


def guarda_corpo_andar():
    """1 de largura, 1,0 de altura, para a beira do piso de cima sem parede. Como a parede: origem no
    meio da base, na linha da grade, e o +Y local é o lado do piso (o guarda-corpo fica de 0,02 a
    0,10 da linha, em cima do piso). Peças vizinhas encostam as pontas de costas uma para a outra."""
    return balaustrada(-0.5, 0.5, 0.02, 0.10, True, postes=(-0.46, 0.46))


def andar():
    nos = {
        'piso-andar-tabua': piso_andar(piso_tabua),
        'piso-andar-ladrilho': piso_andar(piso_ladrilho),
        'piso-andar-azulejo': piso_andar(piso_azulejo),
        'escada-interna': escada_interna(),
        'piso-andar-vao': piso_andar_vao(),
        'guarda-corpo-andar': guarda_corpo_andar(),
        'piso-andar-vao-parede': piso_andar_vao_parede(),
    }
    junto = {
        'escada-interna': colisores_da_escada() + ancoras_da_escada(),
        'piso-andar-vao': colisores_do_vao(),
        'piso-andar-vao-parede': colisores_do_vao_parede(),
        'guarda-corpo-andar': [col_caixa('col-guarda-andar-1', -0.5, 0.5, 0.0, 0.12, ANDAR, ANDAR + 1.0)],
    }
    notas = {
        'piso-andar-tabua': '1 × 1; topo em 4,10; origem no meio da célula',
        'piso-andar-ladrilho': '1 × 1; topo em 4,10; origem no meio da célula',
        'piso-andar-azulejo': '1 × 1; topo em 4,10; origem no meio da célula',
        'escada-interna': '1 × 4; origem no meio do pé, sobe para +Y',
        'piso-andar-vao': '1 × 4; mesma posição e giro da escada',
        'guarda-corpo-andar': '1 célula; origem no meio da base, na linha da grade',
        'piso-andar-vao-parede': '1 × 4; mesma posição e giro da escada; sem guarda-corpo do lado +x (parede)',
    }
    return nos, junto, notas


@contextmanager
def no_andar():
    """Monta as paredes do andar com as funções de sempre: o pé da parede no topo do piso (0, e não
    -0,10), as linhas da grade a partir dele e, no lambri, sem alicerce nem rodapé de fora e com a
    cinta. Quem chama sobe as peças 4,10."""
    global Z0, CORTES_Y, CORTES_Y_BAIXA, _SEM_BASE
    antes = (Z0, CORTES_Y, CORTES_Y_BAIXA, _SEM_BASE)
    Z0 = 0.0
    CORTES_Y = (0.0,) + tuple(c for c in antes[1] if c > 0)
    CORTES_Y_BAIXA = (0.0, HB)
    _SEM_BASE = True
    try:
        yield
    finally:
        Z0, CORTES_Y, CORTES_Y_BAIXA, _SEM_BASE = antes


def quina_andar(familia, altura=H):
    """Quina das paredes do andar. Lambri: o pilar branco 1 cm mais largo que o de baixo (0,36), sem
    o bloco de alicerce, descendo até 3,96 (cobre a ponta da cinta e passa por fora do topo da quina
    de baixo, que vai a 4,04). Lisa: o pilar de 0,30 de 4,05 (dentro do piso) para cima."""
    if familia == 'lambri':
        return [sem_fundo(caixa(-0.18, 0.18, -0.18, 0.18, -0.14, altura + 0.04, 'acabamento', bevel=0.04, segs=2))]
    return [sem_fundo(caixa(-0.15, 0.15, -0.15, 0.15, -0.05, altura + 0.03, 'acabamento', bevel=0.05, segs=2))]


def paredes_do_andar():
    """As paredes do andar de cima: as mesmas de baixo com o sufixo `-andar`, menos a porta de lambri
    (não há porta para fora no andar). Cada uma no referencial do térreo (z = 0), com o pé no topo do
    piso de cima (4,10) e a mesma posição e giro da parede de baixo."""
    nos, notas = {}, {}
    with no_andar():
        for fam in ('lambri', 'lisa'):
            nos[f'parede-{fam}-andar'] = parede(1, fam)
            nos[f'parede-{fam}-baixa-andar'] = parede(1, fam, HB)
            if fam == 'lisa':
                nos['parede-porta-lisa-andar'] = parede_porta(fam)
                nos['parede-porta-lisa-baixa-andar'] = parede_porta(fam, HB)
            nos[f'parede-janela-grande-{fam}-andar'] = janela_grande(fam)
            nos[f'parede-janela-arco-{fam}-andar'] = janela_arco(fam)
            nos[f'parede-janela-redonda-{fam}-andar'] = janela_redonda(fam)
            nos[f'quina-{fam}-andar'] = quina_andar(fam)
            nos[f'quina-{fam}-baixa-andar'] = quina_andar(fam, HB)
    for nome, objs in nos.items():
        lib_ilha.place(objs, loc=(0, 0, ANDAR))
        if nome.startswith('parede-'):
            larg = 3 if ('porta' in nome or 'grande' in nome) else 2 if 'arco' in nome else 1
            notas[nome] = f'{larg} célula(s); origem no meio da base, na linha da grade; pé em 4,10'
        else:
            notas[nome] = 'origem no ponto da grade'
    return nos, notas


def main():
    # GLB=paredes,andar escolhe os grupos pelo nome exato (paredes-andar não é paredes).
    so = os.environ.get('GLB')
    so = so.split(',') if so else None
    if not so or 'paredes' in so:
        novo()
        nos, notas = paredes()
        exportar_casa('casa-paredes', nos, grupo='kit', notas=notas)
    if not so or 'portas' in so:
        novo()
        nos, clipes = portas()
        exportar_casa('casa-portas', nos, clipes=clipes, grupo='kit')
    if not so or 'pisos' in so:
        novo()
        exportar_casa('casa-pisos', pisos(), grupo='kit')
    if not so or 'telhado' in so:
        novo()
        exportar_casa('casa-telhado', telhado(), grupo='kit')
    if not so or 'andar' in so:
        novo()
        nos, junto, notas = andar()
        exportar_casa('casa-andar', nos, grupo='kit', notas=notas, junto=junto)
    if not so or 'paredes-andar' in so:
        novo()
        nos, notas = paredes_do_andar()
        exportar_casa('casa-paredes-andar', nos, grupo='kit', notas=notas)


if __name__ == '__main__':
    main()
