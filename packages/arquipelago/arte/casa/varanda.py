"""A varanda da porta de entrada da casa construída (31/10/2026, pedido dela: a porta de entrada muda
de lugar no Construir, e a varanda vai junto).

`casa-varanda.glb`, peça do kit com o MESMO desenho e os mesmos materiais da varanda do `casa.glb`
(`arte/mundo/casa.py`, funções `varanda()` e `toldo()`), só que no referencial das peças de parede:
origem no meio da porta, na linha da grade, em z = 0 (o topo do piso), e o lado de fora no -Y local
(a fachada do lambri). O jogo põe a peça com a posição e o giro da parede da porta de entrada.

Nós:
- `varanda`: o deque de tábuas com as vigas por baixo, o degrau, as duas colunas com as bases, o
  lampião ao lado da porta (material `lampiao`, aceso à noite) e os vasinhos nos cantos do deque.
- `varanda-toldo`: o toldo com o barrado de bandeirinhas (sai com o telhado: no Construir e com a
  pessoa dentro de casa, senão tapa a vista).
- `col-varanda-deque`, `-degrau`, `-coluna-1`, `-coluna-2`, `-vaso-1`, `-vaso-2`: os colisores
  (`col_caixa`, nós de primeiro nível no referencial da peça), os mesmos de `COLISORES_DA_VARANDA`
  em `src/sistemas/construcao/pecas.ts` (o teste confere).

As medidas são as da `casa.py` deslocadas do centro da porta nova (x 2,5) e da frente do quarto
(z 4): o deque vai de 0,20 a 1,75 da linha da parede (o alicerce do lambri chega a 0,19) e de -2,1
a 2,1 em x; cabe nas 5 × 2 células que a varanda ocupa no lote.

  /tmp/claude-0/blender-venv/bin/python -B arte/casa/varanda.py
"""
from lib_casa import *

# O referencial da peça: a porta no meio (x 0), a linha da parede em z 0 do jogo.
PX, PL, PH = 0.0, 2.2, 3.0          # porta: centro em x, largura, altura (as da casa.py)
P0 = PX - PL / 2                    # lado esquerdo do vão (o lampião fica além dele)
MZ = 0.0                            # a linha da parede (na casa.py, a frente do quarto em z 4)

lib_q.PALETTE.update({
    # os da varanda do casa.glb, com o mesmo nome e a mesma cor (arte/mundo/lib_mundo.py)
    'deque': ('#c08a5a', 0.85, None, 0),
    'dequeEscuro': ('#a8754a', 0.85, None, 0),
    'lampiao': ('#fff3c4', 0.4, '#ffd27a', 1.0),
    'metalEscuro': ('#4a4f57', 0.5, None, 0),
})


def G(x, y, z):
    """Um ponto do jogo (x, y para cima, z para fora) no Blender (x, -z, y)."""
    return (x, -z, y)


def cx(sx, sy, sz, x, y, z, m, bevel=0.02):
    """A `caixa` da casa.py: tamanho e centro no referencial do jogo."""
    return box((sx, sz, sy), G(x, y, z), m, bevel=bevel, segs=1)


def varanda():
    """A `varanda()` da casa.py, peça por peça."""
    p = []
    z0, z1 = MZ + 0.2, MZ + 1.75
    x0, x1 = PX - 2.1, PX + 2.1
    # Deque de tábuas com vigas por baixo.
    tabuas = 8
    for k in range(tabuas):
        x = x0 + (k + 0.5) * (x1 - x0) / tabuas
        p.append(cx((x1 - x0) / tabuas - 0.04, 0.1, z1 - z0, x, 0.0, (z0 + z1) / 2,
                    'deque' if k % 2 else 'dequeEscuro', bevel=0.02))
    p.append(cx(x1 - x0 + 0.1, 0.18, 0.14, (x0 + x1) / 2, -0.1, z1 - 0.05, 'batente', bevel=0.02))
    # Degrau.
    p.append(cx(2.4, 0.08, 0.4, PX, -0.04, z1 + 0.22, 'dequeEscuro', bevel=0.02))
    # Colunas do toldo.
    for x in (x0 + 0.15, x1 - 0.15):
        # A coluna nasce dentro da base (y 0,1), não no plano de baixo dela.
        p.append(cx(0.2, 3.3, 0.2, x, 0.1 + 3.3 / 2, z1 - 0.15, 'acabamento', bevel=0.03))
        p.append(cx(0.32, 0.14, 0.32, x, 0.12, z1 - 0.15, 'batente', bevel=0.03))
    # Lampião ao lado da porta (aceso à noite).
    lx, ly, lz = P0 - 0.55, 2.35, MZ + 0.32
    p.append(cx(0.1, 0.1, 0.25, lx, ly + 0.35, lz - 0.08, 'metalEscuro', bevel=0.01))
    p.append(cyl(0.13, 0.34, G(lx, ly, lz + 0.05), 'lampiao', verts=8))
    p.append(cone(0.2, 0.16, G(lx, ly + 0.25, lz + 0.05), 'metalEscuro', verts=8))
    p.append(cyl(0.15, 0.05, G(lx, ly - 0.19, lz + 0.05), 'metalEscuro', verts=8))
    # Vasinhos nos cantos do deque.
    for x in (x0 + 0.5, x1 - 0.5):
        p.append(cyl(0.2, 0.32, G(x, 0.21, z0 + 0.3), 'terracotta', verts=10, r2=0.25))
        p.append(uvball(0.26, G(x, 0.5, z0 + 0.3), 'copaClara', seg=9, ring=6, scale=(1, 1, 0.8)))
    return p


def toldo():
    """O `toldo()` da casa.py: some com o telhado (no Construir e dentro de casa)."""
    p = []
    z0, z1 = MZ + 0.2, MZ + 1.75
    x0, x1 = PX - 2.1, PX + 2.1
    yt = PH + 0.65
    o = box((x1 - x0 + 0.6, 1.95, 0.14), G(PX, yt, (z0 + z1) / 2 - 0.05), 'telhado', bevel=0.04, segs=1)
    o.rotation_euler = (R(-14), 0, 0)
    p.append(o)
    p.append(cx(x1 - x0 + 0.5, 0.16, 0.16, PX, yt - 0.25, z1 - 0.15, 'acabamento', bevel=0.03))
    # Barrado recortado do toldo (bandeirinhas de casa de vila).
    n = 9
    for k in range(n):
        x = x0 - 0.2 + (k + 0.5) * (x1 - x0 + 0.4) / n
        p.append(prism([(-0.2, 0), (0.2, 0), (0, -0.18)], 0.04, G(x, yt - 0.33, z1 - 0.07), 'acabamento'))
    return p


def colisor(nome, x, y, z, mx, my, mz):
    """Caixa de colisão pelo centro e meia medida no referencial do jogo (como `CaixaDaObra`)."""
    return col_caixa(nome, x - mx, x + mx, -(z + mz), -(z - mz), y - my, y + my)


def colisores():
    """Os mesmos de `COLISORES_DA_VARANDA` (`pecas.ts`): tampo do deque, degrau, colunas e vasos."""
    return [
        colisor('col-varanda-deque', 0, 0, 0.975, 2.1, 0.05, 0.775),
        colisor('col-varanda-degrau', 0, -0.04, 1.97, 1.2, 0.04, 0.2),
        colisor('col-varanda-coluna-1', -1.95, 1.7, 1.6, 0.12, 1.7, 0.12),
        colisor('col-varanda-coluna-2', 1.95, 1.7, 1.6, 0.12, 1.7, 0.12),
        colisor('col-varanda-vaso-1', -1.6, 0.36, 0.5, 0.22, 0.36, 0.22),
        colisor('col-varanda-vaso-2', 1.6, 0.36, 0.5, 0.22, 0.36, 0.22),
    ]


def main():
    novo()
    nos = {'varanda': varanda(), 'varanda-toldo': toldo()}
    notas = {
        'varanda': 'porta de entrada; origem no meio da porta, na linha da grade; fora no -Y',
        'varanda-toldo': 'a mesma origem e giro da varanda; sai com o telhado',
    }
    exportar_casa('casa-varanda', nos, grupo='kit', notas=notas, junto={'varanda': colisores()})


if __name__ == '__main__':
    main()
