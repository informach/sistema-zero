"""O fliperama de casa (footprint 1 × 1, frente para -Y): os minijogos aprovados viram fliperama.

Nós:
- `fliperama`: o gabinete (laterais com faixas e estrelas, painel de controle com alavanca e
  botões coloridos, moldura da tela, porta das fichas e o letreiro em cima, com o material `luz`
  e um vagalume na frente);
- `tela`: a tela (um retângulo de 4 por 3, material `tela`, coordenadas de textura de 0 a 1 com
  u para a direita e v para cima). O jogo põe nela a imagem do minijogo.
"""
from lib_objetos import *

DY = 0.03      # desloca o perfil para o gabinete ficar centrado no footprint
# Perfil da lateral (y, z): fundo embaixo, frente, painel de controle, tela inclinada, letreiro.
PERFIL = [(0.36, 0), (-0.30, 0), (-0.30, 0.80), (-0.42, 0.88), (-0.42, 0.935), (-0.30, 0.975), (-0.17, 1.42),
          (-0.29, 1.49), (-0.29, 1.76), (0.36, 1.76)]
CORPO = [(0.35, 0.01), (-0.285, 0.01), (-0.285, 0.80), (-0.405, 0.88), (-0.405, 0.935), (-0.285, 0.975),
         (-0.155, 1.42), (-0.275, 1.49), (-0.275, 1.745), (0.35, 1.745)]
LI = 0.72      # largura entre as laterais
EL = 0.05      # espessura das laterais


def no_perfil(pts, x, profundidade, m, bevel=0.0):
    """Placa com o contorno `pts` (y, z) na lateral, de espessura `profundidade` em x."""
    o = prism([(-y, z) for y, z in pts], profundidade, (0, 0, 0), m, bevel=bevel)
    o.rotation_euler = (0, 0, R(-90))
    o.location = (x, DY, 0)
    return o


def no_plano(objs, origem, angulo):
    """Leva peças feitas de frente (-Y, na origem) para um plano inclinado do gabinete."""
    M = Matrix.Translation(Vector(origem)) @ Matrix.Rotation(angulo, 4, 'X')
    bpy.context.view_layer.update()
    for o in objs:
        o.matrix_world = M @ o.matrix_world
    return objs


def gabinete():
    p = [no_perfil(CORPO, 0, LI + 0.01, 'gabineteEscuro')]
    for s in (-1, 1):
        p.append(no_perfil(PERFIL, s * (LI / 2 + EL / 2), EL, 'gabinete', bevel=0.012))
        # Faixas rosas na diagonal e estrelinhas.
        x = s * (LI / 2 + EL + 0.004)
        for faixa in ([(-0.24, 0.12), (0.3, 0.52), (0.3, 0.66), (-0.24, 0.26)],
                      [(-0.24, 0.34), (0.3, 0.74), (0.3, 0.8), (-0.24, 0.4)]):
            p.append(no_perfil(faixa, x, 0.008, 'gabineteClaro'))
        for (y, z, r) in ((0.15, 1.25, 0.05), (-0.05, 1.55, 0.035), (0.22, 1.5, 0.03)):
            p.append(no_perfil([(y + a, z + b) for a, b in lib_q.star_pts(r, r * 0.45)], x, 0.008, 'estrela'))
    # Rodapé preto.
    p.append(box((LI - 0.004, 0.62, 0.07), (0, DY + 0.03, 0.035), 'plastico', bevel=0.01, segs=1))
    # Porta das fichas: placa de metal, duas entradas e as luzinhas.
    yf = -0.285 + DY
    p.append(caixa_redonda((0.3, 0.02, 0.26), (0, yf - 0.008, 0.45), 'metalEscuro', raio=0.012, segs=2))
    for x in (-0.06, 0.06):
        p.append(caixa_redonda((0.07, 0.014, 0.1), (x, yf - 0.022, 0.5), 'botaoAmarelo', raio=0.01, segs=2))
        p.append(box((0.008, 0.01, 0.05), (x, yf - 0.03, 0.5), 'plastico', bevel=0.002, segs=1))
    p.append(cyl(0.012, 0.02, (0.1, yf - 0.02, 0.37), 'metal', verts=10, rot=(R(90), 0, 0)))
    return p


def painel():
    """O painel de controle inclinado: alavanca, quatro botões e dois botõezinhos de começar.
    As peças são feitas com o "para cima" do painel em +Z e depois giradas para o plano dele."""
    p0 = Vector((0, -0.405 + DY, 0.935))
    p1 = Vector((0, -0.285 + DY, 0.975))
    ang = math.atan2(p1.z - p0.z, p1.y - p0.y)
    meio = (p0 + p1) / 2
    pecas = [caixa_redonda((LI - 0.04, (p1 - p0).length + 0.01, 0.012), (0, 0, 0), 'gabineteClaro', raio=0.004,
                           segs=1)]
    pecas += [cyl(0.04, 0.012, (-0.2, 0, 0.012), 'plastico', verts=16),
              cyl(0.008, 0.09, (-0.2, 0, 0.055), 'metalEscuro', verts=8),
              lib_q.sphere(0.03, (-0.2, 0, 0.11), 'botaoVermelho', subdiv=2)]
    for (x, y, m) in ((0.02, 0.018, 'botaoAzul'), (0.1, 0.03, 'botaoAmarelo'), (0.18, 0.018, 'botaoVerde'),
                      (0.26, 0.0, 'botaoVermelho')):
        pecas.append(cyl(0.028, 0.012, (x, y, 0.012), 'plastico', verts=14))
        pecas.append(cyl(0.022, 0.016, (x, y, 0.024), m, verts=14))
        pecas.append(lib_q.sphere(0.022, (x, y, 0.032), m, scale=(1, 1, 0.4), subdiv=1))
    for x in (0.07, 0.17):
        pecas.append(cyl(0.012, 0.014, (x, -0.038, 0.012), 'branco', verts=10))
    normal = Vector((0, -math.sin(ang), math.cos(ang)))
    M = Matrix.Translation(meio + normal * 0.006) @ Matrix.Rotation(ang, 4, 'X')
    bpy.context.view_layer.update()
    for o in pecas:
        o.matrix_world = M @ o.matrix_world
    return pecas


def tela_e_moldura():
    a = Vector((0, -0.285 + DY, 0.975))
    b = Vector((0, -0.155 + DY, 1.42))
    beta = math.atan2(b.y - a.y, b.z - a.z)       # quanto a tela deita para trás
    meio = (a + b) / 2
    # Moldura preta com o furo da tela (feita de frente, depois inclinada).
    mold = caixa_redonda((0.64, 0.03, 0.44), (0, -0.015, 0), 'plastico', raio=0.015, segs=2)
    furo = box((0.52, 0.2, 0.39), (0, 0, 0), 'plastico', bevel=0.012, segs=2)
    booleana(mold, furo)
    tl, ta = 0.5, 0.375
    q = malha('tela', [(-tl / 2, -0.012, -ta / 2), (tl / 2, -0.012, -ta / 2), (tl / 2, -0.012, ta / 2),
                       (-tl / 2, -0.012, ta / 2)], [(0, 1, 2, 3)], 'tela', liso=False)
    me = q.data
    if q.data.polygons[0].normal.y > 0:
        q.data.polygons[0].flip()
    me.update()
    fundo = box((0.54, 0.01, 0.41), (0, 0.0, 0), 'plastico', bevel=0.0)
    no_plano([mold, q, fundo], meio, -beta)
    uv_plano(q, {'tela'}, (1, 0, 0), (0, math.sin(beta), math.cos(beta)))
    return [mold, fundo], [q]


def letreiro():
    yf = -0.275 + DY
    zc = (1.49 + 1.745) / 2
    p = [caixa_redonda((LI - 0.02, 0.02, 0.2), (0, yf - 0.01, zc), 'luz', raio=0.01, segs=2)]
    # O vagalume no meio (corpo, cabeça, asas, antenas e a cauda que brilha), com estrelas dos lados.
    y = yf - 0.03
    p.append(esfera(0.05, (0.0, y, zc), 'gabineteEscuro', escala=(1.25, 0.4, 0.8), seg=12, aneis=7))
    p.append(esfera(0.034, (-0.07, y - 0.002, zc + 0.012), 'gabineteEscuro', escala=(1, 0.5, 1), seg=10, aneis=6))
    p.append(esfera(0.04, (0.075, y - 0.004, zc - 0.006), 'botaoVerde', escala=(1, 0.5, 0.9), seg=10, aneis=6))
    for s in (-1, 1):
        asa = esfera(0.04, (0.0 + s * 0.018, y - 0.012, zc + 0.045), 'foto', escala=(0.55, 0.25, 1), seg=10,
                     aneis=6)
        asa.rotation_euler = (0, R(-28 * s), 0)
        p.append(asa)
        p.append(barra((-0.085, y, zc + 0.035), (-0.1 + s * 0.016, y, zc + 0.082), 'gabineteEscuro', r=0.005, verts=4))
        p.append(lib_q.sphere(0.009, (-0.1 + s * 0.016, y, zc + 0.082), 'gabineteEscuro', subdiv=1))
        for (x, z, r) in ((0.19, 0.035, 0.035), (0.27, -0.03, 0.026)):
            p.append(prism(lib_q.star_pts(r, r * 0.45), 0.008, (s * x, yf - 0.024, zc + z), 'estrela'))
    # Teto arredondado por cima do letreiro.
    p.append(caixa_redonda((LI + 2 * EL + 0.02, 0.7, 0.04), (0, DY + 0.035, 1.78), 'gabinete', raio=0.018, segs=2))
    return p


def fliperama():
    moldura, tela = tela_e_moldura()
    nos = {'fliperama': gabinete() + painel() + moldura + letreiro(), 'tela': tela}
    return {'nos': nos, 'grupo': 'fliperama', 'uv': True}


ITENS = [('fliperama', fliperama)]

if __name__ == '__main__':
    rodar(ITENS)
