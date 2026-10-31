"""A planta de interior retro e a moderna da galeria (31/10/2026): `planta-interior-retro` e
`planta-interior-moderna`.

Os nós `vaso`, `terra` e `folhas` da clássica (`planta_interior.py`). A terra e as folhas são as dela
(a boca do vaso fica na mesma altura); só o vaso muda. A face do Pinta (`pintaFrente`) continua dando
a volta no corpo do vaso como um rótulo, com a mesma altura (0,37) e a volta da clássica, e as
coordenadas de textura da clássica (`uv_em_volta`).

- retro (paleta Doces): vaso rosa barrigudo de curvas macias, a borda branca ondulada e o pratinho
  creme; as folhas nas cores da paleta.
- moderna: vaso cônico de parede reta rosa forte com a borda de madeira clara, em cima de um
  pedestal quadrado de madeira clara.
"""
from lib_estilos import *  # noqa: F403

import planta_interior as g  # noqa: E402  (depois do import *: a lib da ilha também tem um `g`)

COR = {'retro': 'docesRosa', 'moderna': 'modernaRosa'}
MAPA = {
    'retro': {'folha': 'docesVerde', 'folhaEscura': 'docesMenta', 'folhaNova': 'docesAmarelo',
              'nervuraFolha': 'docesBranco', 'talo': 'docesMenta', 'terraVaso': 'docesCastanho',
              'pedrinhaVaso': 'docesBranco'},
    'moderna': {},
}
Z_FIM_PINTA = 0.405     # a face do Pinta vai até aqui (a borda fica fora dela, como na clássica)


def vaso_retro():
    p = []
    prato = torneado([(0, 0), (0.17, 0), (0.19, 0.008), (0.196, g.Z_PRATO - 0.006), (0.188, g.Z_PRATO),
                      (0.17, g.Z_PRATO), (0.16, 0.018), (0, 0.018)], 'docesCreme', seg=32)
    p.append(prato)
    zp = g.Z_PRATO
    # A barriga embaixo e a boca virada para fora; no pescoço o vaso tem o raio da terra (0,19).
    perfil = [(0, zp), (0.1, zp), (0.114, zp + 0.008), (0.132, 0.06), (0.154, 0.1), (0.172, 0.15), (0.184, 0.2),
              (0.189, 0.26), (0.187, 0.32), (0.186, 0.37), (0.19, Z_FIM_PINTA), (0.2, 0.418), (0.222, 0.432),
              (0.23, 0.446), (0.228, g.Z_BOCA - 0.004), (0.218, g.Z_BOCA), (0.19, g.Z_BOCA),
              (0.186, g.Z_TERRA - 0.005), (0, g.Z_TERRA - 0.005)]
    corpo = torneado(perfil, 'docesRosa', seg=32)
    pintar_por(corpo, lambda c, n: 'docesBranco' if c.z > Z_FIM_PINTA
               else 'pintaFrente' if abs(n.z) < 0.75 and c.z > zp + 0.012 else None)
    # A borda ondulada: oito ondas em volta da boca.
    for v in corpo.data.vertices:
        if v.co.z > Z_FIM_PINTA + 0.006:
            r = math.hypot(v.co.x, v.co.y)
            if r > 1e-6:
                a = math.atan2(v.co.y, v.co.x)
                k = 1 + 0.05 * math.cos(8 * a) * min(1.0, (v.co.z - Z_FIM_PINTA) / 0.03)
                v.co.x, v.co.y = v.co.x * k, v.co.y * k
    corpo.data.update()
    g.uv_em_volta(corpo, 'pintaFrente')
    p.append(corpo)
    return p


def vaso_moderna():
    p = []
    zb = 0.05
    # Pedestal quadrado de madeira clara.
    p.append(box((0.34, 0.34, zb), (0, 0, zb / 2), 'modernaMadeira', bevel=0.0))
    perfil = [(0, zb), (0.152, zb), (0.152, zb + 0.004), (0.196, Z_FIM_PINTA + 0.014), (0.2, g.Z_BOCA),
              (0.19, g.Z_BOCA), (0.19, g.Z_TERRA - 0.005), (0, g.Z_TERRA - 0.005)]
    corpo = torneado(perfil, 'modernaRosa', seg=32, liso=False)
    for f in corpo.data.polygons:
        f.use_smooth = abs(f.normal.z) < 0.6
    corpo.data.set_sharp_from_angle(angle=R(40))
    pintar_por(corpo, lambda c, n: 'modernaMadeira' if c.z > Z_FIM_PINTA + 0.014 and abs(n.z) < 0.6
               else 'pintaFrente' if abs(n.z) < 0.6 and c.z > zb + 0.002 else None)
    g.uv_em_volta(corpo, 'pintaFrente')
    p.append(corpo)
    return p


def montar(estilo):
    comecar(estilo, COR[estilo])
    vaso = vaso_retro() if estilo == 'retro' else vaso_moderna()
    nos = {'vaso': vaso, 'terra': g.terra(), 'folhas': g.folhas()}
    g.conferir(nos)
    repintar(nos, MAPA[estilo], estilo)
    if estilo == 'retro':
        conferir_doces(nos)
    return {'nos': nos, 'grupo': 'planta', 'uv': True}


if __name__ == '__main__':
    rodar_estilos('planta-interior', montar)
