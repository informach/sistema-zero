"""Os pacotinhos de semente: um para cada planta da colheita, com o desenho dela na frente.

O pacote é estufado, com a dobra serrilhada em cima e uma etiqueta clara na frente (−Y), onde a
planta aparece em miniatura (as mesmas formas de `colheita.py`, achatadas). Um nó por arquivo,
`semente-<planta>`.
"""
from lib_itens import *
from lib_itens import _caixa
import colheita

lib_q.PALETTE.update({
    'pacoteAlface': ('#7cc96a', 0.85, None, 0),
    'pacoteTomate': ('#ef7466', 0.85, None, 0),
    'pacoteMilho': ('#f2c94c', 0.85, None, 0),
    'pacoteMorango': ('#ff8fb0', 0.85, None, 0),
    'pacoteAlga': ('#4fc3c0', 0.85, None, 0),
    'pacoteBatataDoce': ('#b98ad9', 0.85, None, 0),
    'pacoteAbobora': ('#f2a541', 0.85, None, 0),
    'pacoteAlgodao': ('#8fc6ff', 0.85, None, 0),
    'etiqueta': ('#fffaf0', 0.9, None, 0),
})

PACOTES = {
    'alface': ('pacoteAlface', 1.0),
    'tomate': ('pacoteTomate', 1.0),
    'milho': ('pacoteMilho', 1.0),
    'morango': ('pacoteMorango', 1.0),
    'alga': ('pacoteAlga', 1.0),
    'batata-doce': ('pacoteBatataDoce', 1.0),
    'abobora': ('pacoteAbobora', 1.0),
    'flor-de-algodao': ('pacoteAlgodao', 1.0),
}

L, E, A = 0.14, 0.036, 0.18  # largura, espessura e altura do pacote


def pacote(planta):
    cor, escala = PACOTES[planta]
    p = [lib_q.cushion((L, E, A), (0, 0, A / 2), cor, puff=0.18, round_=0.3)]
    # Dobra de cima: uma tira com a borda serrilhada.
    dentes = 9
    pts = [(-L / 2, 0)] + [(-L / 2 + L * i / (2 * dentes), 0.032 if i % 2 else 0.024) for i in range(2 * dentes + 1)] + \
          [(L / 2, 0)]
    p.append(prism(pts, E * 0.45, (0, 0, A - 0.004), cor))
    # Etiqueta (retângulo arredondado) na frente.
    r, w, h = 0.014, L * 0.72, A * 0.55
    canto = []
    for cx, cz, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180),
                       (w / 2 - r, -h / 2 + r, 270)):
        for k in range(5):
            a = R(a0 + 90 * k / 4)
            canto.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    p.append(prism(canto, 0.004, (0, -E / 2 - 0.012, A * 0.45), 'etiqueta'))
    # A planta em miniatura, achatada contra a etiqueta.
    mini = colheita.FORMAS[planta]()
    for o in mini:
        # A miniatura é pequena: metade dos triângulos basta.
        if len(o.data.polygons) > 60:
            m = o.modifiers.new('dz', 'DECIMATE')
            m.ratio = 0.5
            lib_q._apply(o, m)
    mn, mx = _caixa(mini)
    lado = max(mx.x - mn.x, mx.z - mn.z)
    s = 0.072 / lado * escala
    d = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -(mn.z + mx.z) / 2))
    lib_ilha.place(mini, loc=d)
    bpy.context.view_layer.update()
    for o in mini:
        o.matrix_world = Matrix.Scale(s, 4) @ o.matrix_world
        bpy.context.view_layer.update()
        o.matrix_world = Matrix.Diagonal((1, 0.35, 1, 1)) @ o.matrix_world
    lib_ilha.place(mini, loc=(0, -E / 2 - 0.028, A * 0.45))
    p += mini
    return p


ITENS = [(f'semente-{pl}', (lambda pl=pl: {'nos': {f'semente-{pl}': pacote(pl)}, 'grupo': 'sementes'}))
         for pl in PACOTES]

if __name__ == '__main__':
    rodar(ITENS)
