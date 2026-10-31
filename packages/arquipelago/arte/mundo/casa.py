"""A casca da casa: as paredes de fora em volta do quarto da plataforma, o telhado, a varanda e a
porta nova.

Referencial: o grupo `Casa` do jogo (centro do quarto, y = 0 no piso, que fica 0,02 acima do chão).
O quarto da plataforma (12 × 8, paredes de 4) é desenhado pelo `avatar-quarto` por dentro: as
paredes daqui ficam POR FORA dele (a parede da esquerda e a do fundo do quarto já existem, então
lá vai só o revestimento de fora, sem encostar).

Nós (contrato com `src/mundo/casa.tsx`):
- `paredes`: frente (com o vão da porta) e lado direito (com o vão da janela), rodapé e frisos.
  Ficam translúcidas quando você está dentro.
- `revestimento`: o lado de fora das paredes da esquerda e do fundo, as quinas e o alicerce.
- `janelas`: caixilhos, venezianas e floreiras; o vidro usa o material `vidroJanela`, que o jogo
  acende à noite.
- `telhado`: telhado de duas águas, oitões e chaminé. Some quando você entra.
- `toldo` (31/10/2026; antes ia dentro do `telhado`): o toldo da varanda. Some com o telhado. Na casa
  construída ele sai junto com a `varanda`: a varanda da porta de entrada é a do kit
  (`arte/casa/varanda.py`, `casa-varanda.glb`, com o mesmo desenho), que muda de lugar com a entrada.
- `varanda`: deque, degrau, colunas, vasinhos e o lampião (material `lampiao`, aceso à noite).
- `porta`: a porta nova, com o pivô na dobradiça (x = 1,4; z = 4). Fechada ela fica no vão; o jogo
  gira em y (negativo abre para fora).
"""
from lib_mundo import *

MX, MZ, H = 6.0, 4.0, 4.0           # meio do quarto em x e z, altura das paredes
PX, PL, PH = 2.5, 2.2, 3.0          # porta: centro em x, largura, altura
P0, P1 = PX - PL / 2, PX + PL / 2   # vão da porta em x
JZ, JY, JL, JA = -1.0, 2.3, 1.8, 1.2  # janela do lado: centro z e y, largura (em z) e altura
FX, FY, FL, FA = -3.0, 2.2, 1.6, 1.2  # janela da frente: centro x e y, largura e altura
FORA = 0.16                         # espessura de fora


def G(x, y, z):
    return (x, -z, y)


def caixa(sx, sy, sz, x, y, z, m, bevel=0.02, rot_y=0.0):
    """Caixa no referencial do jogo (tamanho em x, y, z; centro em x, y, z)."""
    return box((sx, sz, sy), G(x, y, z), m, bevel=bevel, segs=1, rot=(0, 0, -rot_y))


def parede_com_vaos(eixo, fixo, de, ate, y0, y1, esp, vaos, m, cortes_y=(), cortes_u=()):
    """Parede retangular com vãos retangulares: (centro, largura, base, topo) ao longo do eixo.

    Sai numa malha SÓ, numa grade em que toda face divide os vértices com as vizinhas. Antes eram
    quatro caixas encostadas em volta de cada vão: a quina de uma caía no MEIO da aresta da outra
    (junção em T) e a costura aparecia como uma linha tracejada que cintilava acima e abaixo da
    janela. A grade também não tem faces escondidas entre as peças. `cortes_y` e `cortes_u` acrescentam
    linhas à grade: duas paredes que se encontram numa quina com as MESMAS linhas fecham a costura
    sem fresta."""
    us = {de, ate, *cortes_u}
    ys = {y0, y1, *cortes_y}
    for c, w, b, t in vaos:
        us |= {c - w / 2, c + w / 2}
        ys |= {max(b, y0), min(t, y1)}
    us = sorted(us)
    ys = sorted(ys)

    def cheia(i, j):
        if not (0 <= i < len(us) - 1 and 0 <= j < len(ys) - 1):
            return False
        um, ym = (us[i] + us[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
        return not any(c - w / 2 < um < c + w / 2 and b < ym < t for c, w, b, t in vaos)

    bm = bmesh.new()
    vs = {}

    def V(i, j, k):
        if (i, j, k) not in vs:
            n = fixo + (k - 0.5) * esp
            x, z = (us[i], n) if eixo == 'x' else (n, us[i])
            vs[(i, j, k)] = bm.verts.new(G(x, ys[j], z))
        return vs[(i, j, k)]

    for i in range(len(us) - 1):
        for j in range(len(ys) - 1):
            if not cheia(i, j):
                continue
            for k in (0, 1):
                bm.faces.new([V(i, j, k), V(i + 1, j, k), V(i + 1, j + 1, k), V(i, j + 1, k)])
            if not cheia(i - 1, j):
                bm.faces.new([V(i, j, 0), V(i, j + 1, 0), V(i, j + 1, 1), V(i, j, 1)])
            if not cheia(i + 1, j):
                bm.faces.new([V(i + 1, j, 0), V(i + 1, j + 1, 0), V(i + 1, j + 1, 1), V(i + 1, j, 1)])
            if not cheia(i, j - 1):
                bm.faces.new([V(i, j, 0), V(i + 1, j, 0), V(i + 1, j, 1), V(i, j, 1)])
            if not cheia(i, j + 1):
                bm.faces.new([V(i, j + 1, 0), V(i + 1, j + 1, 0), V(i + 1, j + 1, 1), V(i, j + 1, 1)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return [lib_q.flat(lib_q._obj('parede', bm, m))]


def frisos_horizontais(eixo, fixo, de, ate, vaos, alturas, m, saliencia=0.03):
    """Tábuas do revestimento: frisos finos que param nos vãos (o "lambri" de fora).

    Um vão com um 5º número diz quanto o friso para antes dele (padrão 0,12). Nas janelas ele acaba
    ATRÁS da veneziana: se passasse por baixo dela, a frente dos dois ficaria no mesmo plano e as
    listras do friso piscariam através da veneziana."""
    out = []
    for y in alturas:
        a = de
        trechos = []
        for vao in sorted(vaos):
            c, w, b, t = vao[:4]
            folga = vao[4] if len(vao) > 4 else 0.12
            if b - 0.05 < y < t + 0.05:
                trechos.append((a, c - w / 2 - folga))
                a = c + w / 2 + folga
        trechos.append((a, ate))
        for u0, u1 in trechos:
            if u1 - u0 < 0.1:
                continue
            if eixo == 'x':
                out.append(caixa(u1 - u0, 0.05, saliencia, (u0 + u1) / 2, y, fixo, m, bevel=0.0))
            else:
                out.append(caixa(saliencia, 0.05, u1 - u0, fixo, y, (u0 + u1) / 2, m, bevel=0.0))
    return out


FRISOS = [0.75, 1.25, 1.75, 2.25, 2.75, 3.25]
# Os frisos param a 0,2 do vão da janela: a veneziana (de 0,13 a 0,63 do vão) cobre a ponta deles.
FOLGA_DO_FRISO = 0.2


def paredes():
    p = []
    vao_porta = (PX, PL, 0.0, PH)
    vao_frente = (FX, FL, FY - FA / 2, FY + FA / 2)
    vao_lado = (JZ, JL, JY - JA / 2, JY + JA / 2)
    # A da frente vai até a quina de fora (x 6,15) e a do lado para na face de dentro da da frente
    # (z 3,9): encostam sem se sobrepor, com as mesmas alturas na grade.
    alturas = [y for _, _, b, t in (vao_porta, vao_frente, vao_lado) for y in (b, t)]
    zf = MZ + 0.025  # parede da frente: de 3,9 a 4,15 (a face de dentro fica onde o jogo já tinha)
    p += parede_com_vaos('x', zf, -MX - 0.1, MX + 0.15, 0.0, H, 0.25, [vao_porta, vao_frente], 'parede', alturas,
                         [MX - 0.1])
    xd = MX + 0.025
    p += parede_com_vaos('z', xd, -MZ - 0.1, MZ - 0.1, 0.0, H, 0.25, [vao_lado], 'parede', alturas)
    # Frisos do lambri, por fora.
    p += frisos_horizontais('x', MZ + 0.16, -MX, MX + 0.1, [vao_porta, vao_frente + (FOLGA_DO_FRISO,)], FRISOS,
                            'paredeSombra')
    p += frisos_horizontais('z', MX + 0.16, -MZ, MZ + 0.1, [vao_lado + (FOLGA_DO_FRISO,)], FRISOS, 'paredeSombra')
    # Rodapé claro e friso de cima.
    p.append(caixa(P0 + MX + 0.1, 0.18, 0.06, (-MX - 0.1 + P0) / 2, 0.42, MZ + 0.17, 'acabamento'))
    p.append(caixa(MX + 0.15 - P1, 0.18, 0.06, (P1 + MX + 0.15) / 2, 0.42, MZ + 0.17, 'acabamento'))
    p.append(caixa(0.06, 0.18, 2 * MZ + 0.25, MX + 0.17, 0.42, 0.025, 'acabamento'))
    p.append(caixa(2 * MX + 0.5, 0.22, 0.1, 0.05, H - 0.15, MZ + 0.18, 'acabamento'))
    p.append(caixa(0.1, 0.22, 2 * MZ + 0.5, MX + 0.18, H - 0.15, 0.05, 'acabamento'))
    # Batente da porta (madeira), com a verga um pouco mais larga.
    for lado in (-1, 1):
        # Desce 5 cm abaixo do piso, para a base não ficar no plano da base da parede.
        p.append(caixa(0.18, PH + 0.15, 0.34, PX + lado * (PL / 2 + 0.07), (PH + 0.15) / 2 - 0.05, MZ + 0.025,
                       'batente'))
    p.append(caixa(PL + 0.6, 0.2, 0.38, PX, PH + 0.12, MZ + 0.04, 'batente'))
    return p


def revestimento():
    p = []
    # Esquerda e fundo: só o lado de fora (o quarto da plataforma desenha o de dentro).
    xe = -MX - 0.09 - FORA / 2
    zt = -MZ - 0.09 - FORA / 2
    p.append(caixa(FORA, H, 2 * MZ + 0.35, xe, H / 2, 0.0, 'parede', bevel=0.0))
    p.append(caixa(2 * MX + 0.35, H, FORA, 0.0, H / 2, zt, 'parede', bevel=0.0))
    p += frisos_horizontais('z', xe - FORA / 2 - 0.01, -MZ - 0.2, MZ + 0.15, [], FRISOS, 'paredeSombra')
    p += frisos_horizontais('x', zt - FORA / 2 - 0.01, -MX - 0.2, MX + 0.15, [], FRISOS, 'paredeSombra')
    p.append(caixa(0.06, 0.18, 2 * MZ + 0.4, xe - FORA / 2 - 0.02, 0.42, 0.0, 'acabamento'))
    p.append(caixa(2 * MX + 0.4, 0.18, 0.06, 0.0, 0.42, zt - FORA / 2 - 0.02, 'acabamento'))
    p.append(caixa(0.1, 0.22, 2 * MZ + 0.5, xe - 0.06, H - 0.15, 0.0, 'acabamento'))
    p.append(caixa(2 * MX + 0.5, 0.22, 0.1, 0.0, H - 0.15, zt - 0.06, 'acabamento'))
    # Quinas: pilares brancos nos quatro cantos.
    for x in (-MX - 0.2, MX + 0.17):
        for z in (-MZ - 0.2, MZ + 0.17):
            # Começam 10 cm dentro do alicerce: a base não fica no plano da base das paredes.
            p.append(caixa(0.34, H + 0.15, 0.34, x, (H + 0.15) / 2 - 0.1, z, 'acabamento', bevel=0.04))
    # Alicerce de pedra em volta (com o vão da porta), um pouco mais largo que as paredes. Na frente e
    # à direita a face de dentro fica DENTRO da parede (1 cm além da face de dentro dela): antes
    # sobrava uma mureta de 4 cm no chão do quarto. No vão da porta ele para 2 cm antes, sob o
    # batente, para a ponta não ficar no mesmo plano do fim da parede.
    a0, a1 = -0.32, 0.3
    hy = (a0 + a1) / 2
    hh = a1 - a0
    xe, xd, zt, zf = -MX - 0.4, MX + 0.31, -MZ - 0.4, MZ + 0.31
    p.append(caixa(P0 - 0.02 - xe, hh, 0.4, (xe + P0 - 0.02) / 2, hy, zf - 0.2, 'alicerce', bevel=0.05))
    p.append(caixa(xd - P1 - 0.02, hh, 0.4, (P1 + 0.02 + xd) / 2, hy, zf - 0.2, 'alicerce', bevel=0.05))
    p.append(caixa(0.4, hh, zf - zt, xd - 0.2, hy, (zt + zf) / 2, 'alicerce', bevel=0.05))
    p.append(caixa(0.4, hh, zf - zt, xe + 0.2, hy, (zt + zf) / 2, 'alicerce', bevel=0.05))
    p.append(caixa(xd - xe, hh, 0.4, (xe + xd) / 2, hy, zt + 0.2, 'alicerce', bevel=0.05))
    # Soleira de madeira no vão da porta, entre o piso do quarto (z = 4) e o deque: sem ela, via-se
    # a grama por uma fresta de 20 cm. O topo fica 1 cm abaixo do deque (nunca no mesmo plano).
    p.append(caixa(PL + 0.04, 0.14, MZ + 0.22 - (MZ - 0.12), PX, -0.03, (MZ - 0.12 + MZ + 0.22) / 2, 'batente',
                   bevel=0.01))
    return p


def janela(eixo, cu, cy, w, h, face, sentido):
    """Janela num vão: vidro, caixilho em cruz, peitoril, venezianas e floreira com flores.

    `eixo` 'x' = parede da frente (largura em x); 'z' = parede do lado. `face` é a coordenada da
    face de fora e `sentido` (+1) o lado de fora."""
    p = []

    def C(du, dy, dn, su, sy, sn, m, bevel=0.015):
        if eixo == 'x':
            return caixa(su, sy, sn, cu + du, cy + dy, face + sentido * dn, m, bevel)
        return caixa(sn, sy, su, face + sentido * dn, cy + dy, cu + du, m, bevel)

    # O vidro e a cruz entram um pouco na parede (2 e 1 cm): as bordas deles nunca ficam no mesmo
    # plano das faces do vão nem uma da outra.
    p.append(C(0, 0, -0.14, w + 0.04, h + 0.04, 0.04, 'vidroJanela', bevel=0.0))
    # Caixilho: moldura, cruz e peitoril. A moldura forra o vão de ponta a ponta (da frente, 5 cm para
    # fora, até 1 cm além da face de dentro): com 10 cm só, sobrava um degrau de 1 cm entre ela e o
    # vão, que de lado virava um fio tracejado cintilando.
    for s in (-1, 1):
        p.append(C(s * (w / 2 + 0.05), 0, -0.105, 0.12, h + 0.2, 0.31, 'acabamento'))
        p.append(C(0, s * (h / 2 + 0.05), -0.105, w + 0.2, 0.12, 0.31, 'acabamento'))
    p.append(C(0, 0, -0.1, 0.06, h + 0.02, 0.06, 'acabamento', bevel=0.0))
    p.append(C(0, 0, -0.1, w + 0.02, 0.06, 0.06, 'acabamento', bevel=0.0))
    p.append(C(0, -h / 2 - 0.13, 0.08, w + 0.4, 0.07, 0.24, 'acabamento'))
    # Venezianas abertas dos dois lados, com ripas. Ficam POR CIMA do lambri (a frente 3 cm à
    # frente da dos frisos): no mesmo plano, as listras do friso piscavam através da veneziana.
    for s in (-1, 1):
        du = s * (w / 2 + 0.38)
        p.append(C(du, 0, 0.03, 0.5, h + 0.12, 0.05, 'floreira'))
        for k in range(5):
            p.append(C(du, -h / 2 + 0.12 + k * (h - 0.12) / 5, 0.07, 0.42, 0.04, 0.04, 'navy', bevel=0.0))
    # Floreira com flores e folhas.
    p.append(C(0, -h / 2 - 0.36, 0.2, w + 0.1, 0.28, 0.3, 'floreira', bevel=0.03))
    p.append(C(0, -h / 2 - 0.23, 0.2, w, 0.04, 0.24, 'terra', bevel=0.0))
    rnd = random.Random(int(cu * 10 + cy))
    cores = ['petalaRosa', 'petalaAmarela', 'petalaBranca', 'petalaRosa', 'petalaLilas']
    n = 5
    for k in range(n):
        du = (k - (n - 1) / 2) * (w / n)
        if eixo == 'x':
            base = G(cu + du, cy - h / 2 - 0.2, face + sentido * 0.2)
        else:
            base = G(face + sentido * 0.2, cy - h / 2 - 0.2, cu + du)
        p.append(uvball(0.13, (base[0], base[1], base[2] + 0.05), 'copa' if k % 2 else 'copaClara', seg=7, ring=4,
                        scale=(1, 1, 0.7)))
        p += flor((base[0] + rnd.uniform(-0.05, 0.05), base[1] + rnd.uniform(-0.05, 0.05), base[2]), cores[k],
                  seed=k + int(cu * 7), r=0.11, haste=0.2)
    return p


def janelas():
    p = []
    p += janela('z', JZ, JY, JL, JA, MX + 0.15, 1)
    p += janela('x', FX, FY, FL, FA, MZ + 0.15, 1)
    return p


def telhado():
    p = []
    beiral_z = MZ + 0.85
    beiral_x = MX + 0.55
    base = H - 0.05
    cume = H + 2.5
    ang = math.atan2(cume - base, beiral_z)
    L = math.hypot(beiral_z, cume - base)
    # Duas águas: placas grossas com a borda de baixo arredondada.
    for s in (-1, 1):
        cz = s * beiral_z / 2
        cy = (base + cume) / 2 + 0.1
        o = box((2 * beiral_x, L + 0.1, 0.22), (0, -cz, cy), 'telhadoSombra', bevel=0.06, segs=1)
        o.rotation_euler = (s * ang, 0, 0)
        p.append(o)
        # Fiadas de telhas: ripas em degrau ao longo da água.
        fiadas = 7
        for k in range(fiadas):
            t = (k + 0.5) / fiadas
            dz = s * beiral_z * (1 - t)
            dy = base + (cume - base) * t + 0.22
            f = box((2 * beiral_x + 0.04, L / fiadas + 0.04, 0.09), (0, -dz, dy), 'telhado' if k % 2 else 'telhadoSombra',
                    bevel=0.035, segs=1)
            f.rotation_euler = (s * ang, 0, 0)
            # A borda de baixo de cada fiada fica um pouco para fora (sombra entre fiadas).
            f.location.z += 0.02
            p.append(f)
    # Cumeeira.
    p.append(cyl(0.2, 2 * beiral_x + 0.12, (0, 0, cume + 0.2), 'telhado', verts=12, rot=(0, R(90), 0)))
    # Oitões: triângulos na cor da parede, com friso e janelinha redonda (acende com as outras).
    for s in (-1, 1):
        # À direita o oitão recua 5 cm (frente em 6,20) para ficar atrás do friso de cima (que vai até
        # 6,23): à frente dele, a faixa de 2 cm da base do oitão aparecia de baixo como um serrilhado.
        # À esquerda o friso já passa da frente do oitão.
        x = s * (MX + (0.07 if s > 0 else 0.12))
        tri = [(-MZ - 0.25, H - 0.05), (MZ + 0.25, H - 0.05), (0, cume - 0.15)]
        o = prism([(z, y) for z, y in tri], 0.26, (0, 0, 0), 'parede', rot=(0, 0, 0))
        # prism desenha no plano XZ do Blender com a espessura em y: gira para o plano do oitão.
        o.rotation_euler = (0, 0, R(90))
        o.location = (x, 0, 0)
        p.append(o)
        p.append(cyl(0.42, 0.12, (x + s * 0.12, 0, H + 1.05), 'acabamento', verts=20, rot=(0, R(90), 0)))
        p.append(cyl(0.32, 0.14, (x + s * 0.14, 0, H + 1.05), 'vidroJanela', verts=20, rot=(0, R(90), 0)))
        p.append(box((0.06, 0.62, 0.05), (x + s * 0.2, 0, H + 1.05), 'acabamento', bevel=0.0))
        p.append(box((0.06, 0.05, 0.62), (x + s * 0.2, 0, H + 1.05), 'acabamento', bevel=0.0))
        # Testeiras brancas acompanhando as águas.
        for t in (-1, 1):
            # 0,25 a mais que a água: a ponta do cume passa da ponta da placa (antes ficavam a 2 mm).
            o = box((0.12, L + 0.25, 0.16), (s * (MX + 0.42), -t * beiral_z / 2, (base + cume) / 2 + 0.05), 'acabamento',
                    bevel=0.03)
            o.rotation_euler = (t * ang, 0, 0)
            p.append(o)
    # Chaminé de tijolo na água de trás, com tampa.
    cx, cz = -3.4, -1.7
    yb = base + (cume - base) * (1 - abs(cz) / beiral_z)
    p.append(box((0.8, 0.8, 1.9), G(cx, yb + 0.55, cz), 'tijolo', bevel=0.04, segs=1))
    p.append(box((1.0, 1.0, 0.18), G(cx, yb + 1.55, cz), 'alicerce', bevel=0.04, segs=1))
    p.append(box((0.5, 0.5, 0.1), G(cx, yb + 1.62, cz), 'black', bevel=0.02, segs=1))
    for k in range(3):
        p.append(box((0.82, 0.82, 0.04), G(cx, yb + 0.35 + 0.35 * k, cz), 'telhadoSombra', bevel=0.0))
    return p


def varanda():
    p = []
    z0, z1 = MZ + 0.2, MZ + 1.75
    x0, x1 = PX - 2.1, PX + 2.1
    # Deque de tábuas com vigas por baixo.
    tabuas = 8
    for k in range(tabuas):
        x = x0 + (k + 0.5) * (x1 - x0) / tabuas
        p.append(caixa((x1 - x0) / tabuas - 0.04, 0.1, z1 - z0, x, 0.0, (z0 + z1) / 2,
                       'deque' if k % 2 else 'dequeEscuro', bevel=0.02))
    p.append(caixa(x1 - x0 + 0.1, 0.18, 0.14, (x0 + x1) / 2, -0.1, z1 - 0.05, 'batente', bevel=0.02))
    # Degrau.
    p.append(caixa(2.4, 0.08, 0.4, PX, -0.04, z1 + 0.22, 'dequeEscuro', bevel=0.02))
    # Colunas e toldo sobre a porta.
    for x in (x0 + 0.15, x1 - 0.15):
        # A coluna nasce dentro da base (y 0,1), não no plano de baixo dela.
        p.append(caixa(0.2, 3.3, 0.2, x, 0.1 + 3.3 / 2, z1 - 0.15, 'acabamento', bevel=0.03))
        p.append(caixa(0.32, 0.14, 0.32, x, 0.12, z1 - 0.15, 'batente', bevel=0.03))
    # Lampião ao lado da porta (aceso à noite).
    lx, ly, lz = P0 - 0.55, 2.35, MZ + 0.32
    p.append(caixa(0.1, 0.1, 0.25, lx, ly + 0.35, lz - 0.08, 'metalEscuro', bevel=0.01))
    p.append(cyl(0.13, 0.34, G(lx, ly, lz + 0.05), 'lampiao', verts=8))
    p.append(cone(0.2, 0.16, G(lx, ly + 0.25, lz + 0.05), 'metalEscuro', verts=8))
    p.append(cyl(0.15, 0.05, G(lx, ly - 0.19, lz + 0.05), 'metalEscuro', verts=8))
    # Vasinhos nos cantos do deque.
    for x in (x0 + 0.5, x1 - 0.5):
        p.append(cyl(0.2, 0.32, G(x, 0.21, z0 + 0.3), 'terracotta', verts=10, r2=0.25))
        p.append(uvball(0.26, G(x, 0.5, z0 + 0.3), 'copaClara', seg=9, ring=6, scale=(1, 1, 0.8)))
    return p


def toldo():
    """O toldo da varanda: vai junto com o telhado (some quando você entra, senão tapa a vista)."""
    p = []
    z0, z1 = MZ + 0.2, MZ + 1.75
    x0, x1 = PX - 2.1, PX + 2.1
    yt = PH + 0.65
    o = box((x1 - x0 + 0.6, 1.95, 0.14), G(PX, yt, (z0 + z1) / 2 - 0.05), 'telhado', bevel=0.04, segs=1)
    o.rotation_euler = (R(-14), 0, 0)
    p.append(o)
    p.append(caixa(x1 - x0 + 0.5, 0.16, 0.16, PX, yt - 0.25, z1 - 0.15, 'acabamento', bevel=0.03))
    # Barrado recortado do toldo (bandeirinhas de casa de vila).
    n = 9
    for k in range(n):
        x = x0 - 0.2 + (k + 0.5) * (x1 - x0 + 0.4) / n
        o = prism([(-0.2, 0), (0.2, 0), (0, -0.18)], 0.04, G(x, yt - 0.33, z1 - 0.07), 'acabamento')
        p.append(o)
    return p


def porta():
    """Porta nova fechada no vão: tábuas largas, almofadas, janelinha redonda e maçaneta.
    O pivô (dobradiça) fica na borda esquerda, no meio da espessura."""
    p = []
    z = MZ + 0.03
    # A folha começa 7 cm acima do piso: aberta, ela gira por cima do deque (topo em 0,05) sem entrar
    # nele.
    p.append(caixa(PL - 0.04, PH - 0.08, 0.12, PX, (PH + 0.06) / 2, z, 'portaNova', bevel=0.03))
    # Almofadas em relevo.
    for dx in (-0.48, 0.48):
        p.append(caixa(0.78, 0.9, 0.06, PX + dx, 0.75, z + 0.07, 'portaNova', bevel=0.04))
        p.append(caixa(0.78, 0.7, 0.06, PX + dx, 1.75, z + 0.07, 'portaNova', bevel=0.04))
    # Janelinha redonda em cima (o vidro acende à noite com as janelas).
    p.append(cyl(0.36, 0.1, G(PX, 2.5, z + 0.07), 'batente', verts=20, rot=(R(90), 0, 0)))
    # O vidro começa 1 cm à frente do fundo do aro (antes os dois fundos ficavam no mesmo plano).
    p.append(cyl(0.27, 0.11, G(PX, 2.5, z + 0.085), 'vidroJanela', verts=20, rot=(R(90), 0, 0)))
    # Dobradiças e maçaneta.
    for y in (0.5, 2.5):
        p.append(caixa(0.22, 0.12, 0.05, P0 + 0.12, y, z + 0.07, 'metalEscuro', bevel=0.01))
    p.append(uvball(0.09, G(P1 - 0.25, 1.45, z + 0.14), 'macaneta', seg=10, ring=6))
    p.append(cyl(0.08, 0.06, G(P1 - 0.25, 1.45, z + 0.08), 'macaneta', verts=10, rot=(R(90), 0, 0)))
    return p


def main():
    lib_q.reset()
    exportar('casa', {
        'paredes': paredes(),
        'revestimento': revestimento(),
        'janelas': janelas(),
        'telhado': telhado(),
        'toldo': toldo(),
        'varanda': varanda(),
        'porta': (porta(), G(P0, 0, MZ + 0.03)),
    })


if __name__ == '__main__':
    main()
