"""Desenhos do Pinta como formas da tartaruga.

Um desenho vetorial do Pinta (assets/nave.svg) vira uma forma composta do turtle: ela
gira junto com a tartaruga e cresce com shapesize sem borrar.

    import turtle
    import formas_do_pinta

    formas_do_pinta.registrar('assets/nave.svg')   # registra a forma 'nave'
    nave = turtle.Turtle()
    nave.shape('nave')

Este arquivo só usa a biblioteca padrão do Python: roda igual no Estúdio e no computador.
O desenho fica virado para a DIREITA, que é para onde a tartaruga anda quando começa.
"""
import math
import os
import re
import turtle
import xml.etree.ElementTree as ElementTree

__all__ = ['forma', 'registrar']

# Uma forma com pontos demais deixa a tartaruga lenta: cada movimento redesenha tudo.
MAXIMO_DE_PONTOS = 600
_SVG = '{http://www.w3.org/2000/svg}'
_NUMERO = re.compile(r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')
# Toda letra vira comando (as que o módulo não conhece são recusadas, nunca puladas).
_COMANDO = re.compile(r'[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')
# As formas que a tartaruga já tem: um desenho com um desses nomes trocaria a de todas.
_FORMAS_DA_TARTARUGA = {'arrow', 'turtle', 'circle', 'square', 'triangle', 'classic', 'blank'}


class DesenhoNaoServe(ValueError):
    """O desenho tem algo que não vira forma (texto, figura, máscara)."""


def _nao_serve(caminho, motivo):
    return DesenhoNaoServe(
        f"O desenho '{caminho}' {motivo}: no Pinta, tire isso do desenho, ou traga-o de novo "
        f"como um desenho novo, que ele entra como imagem PNG para usar com screen.addshape."
    )


def forma(caminho, tamanho=None):
    """A forma composta do desenho em `caminho`. Com `tamanho`, o lado maior mede isso."""
    raiz = _ler(caminho)
    largura, altura, caixa = _medidas(raiz)
    escala = 1.0
    if tamanho is not None:
        escala = float(tamanho) / max(largura, altura)
    escala_x = largura / caixa[2] * escala
    escala_y = altura / caixa[3] * escala
    centro_x = caixa[0] + caixa[2] / 2
    centro_y = caixa[1] + caixa[3] / 2
    degrades = _degrades(raiz)
    partes = []
    for elemento in _desenhados(raiz):
        nome = elemento.tag.replace(_SVG, '')
        # O Estúdio traz como imagem PNG o desenho que tem estas coisas.
        if (nome in ('text', 'image', 'use') or elemento.get('clip-path')
                or elemento.get('mask')):
            raise _nao_serve(caminho, 'tem texto, figura ou máscara, que não viram forma da '
                                      'tartaruga')
        if any(_numero(elemento.get(chave), 1.0) < 1
               for chave in ('opacity', 'fill-opacity', 'stroke-opacity')):
            raise _nao_serve(caminho, 'tem uma parte transparente, e a tartaruga só pinta com '
                                      'cor cheia')
        if elemento.get('style') or (nome == 'g' and any(
                elemento.get(chave) for chave in ('transform', 'fill', 'stroke'))):
            raise _nao_serve(caminho, 'usa um jeito de pintar que a tartaruga não entende')
        anel = _forma_do_elemento(nome, elemento)
        if anel is None:
            continue
        aneis, fechado = anel
        aneis = [_girar(pontos, elemento.get('transform')) for pontos in aneis]
        preenchimento = _cor(elemento.get('fill', '#000000'), degrades)
        contorno = _cor(elemento.get('stroke'), degrades)
        espessura = _numero(elemento.get('stroke-width'), 1.0) or 1.0
        if preenchimento is not None and fechado:
            # Um furo (uma rosca, o "tirar a da frente" do Pinta) é costurado ao anel de fora:
            # a forma da tartaruga não tem furos, mas um polígono só com o corte tem.
            for pontos in _com_furos([anel for anel in aneis if len(anel) >= 3]):
                if len(pontos) >= 3:
                    partes.append((pontos, preenchimento, preenchimento))
        if contorno is not None:
            # O contorno (e o traço de linha e de pincel) vira uma faixa da largura dele, por
            # cima do preenchimento.
            for pontos in aneis:
                faixa = _faixa_fechada(pontos, espessura) if fechado else _faixa_aberta(
                    pontos, espessura)
                if len(faixa) >= 3:
                    partes.append((faixa, contorno, contorno))
    if not partes:
        raise DesenhoNaoServe(f"O desenho '{caminho}' não tem nenhuma forma para a tartaruga.")
    partes = _caber_no_orcamento(partes, max(largura, altura), caminho)
    resultado = turtle.Shape('compound')
    for pontos, preenchimento, borda in partes:
        # No turtle, o +y da forma aponta para a frente (a direita do desenho) e o +x para
        # baixo do desenho.
        poligono = tuple(
            (round((y - centro_y) * escala_y, 2), round((x - centro_x) * escala_x, 2))
            for x, y in pontos
        )
        resultado.addcomponent(poligono, preenchimento, borda)
    return resultado


def registrar(caminho, nome=None, tamanho=None):
    """Registra a forma do desenho na tela e devolve o nome dela (o nome do arquivo)."""
    if nome is None:
        nome = os.path.splitext(os.path.basename(caminho))[0]
    if nome in _FORMAS_DA_TARTARUGA:
        raise DesenhoNaoServe(
            f"O nome '{nome}' já é de uma forma da tartaruga: dê outro nome ao desenho "
            f"(registrar(caminho, nome='...'))."
        )
    turtle.Screen().register_shape(nome, forma(caminho, tamanho))
    return nome


# Leitura -------------------------------------------------------------------------------


def _ler(caminho):
    if not os.path.isfile(caminho):
        raise FileNotFoundError(f"Não encontrei o desenho '{caminho}' no projeto.")
    try:
        raiz = ElementTree.parse(caminho).getroot()
    except ElementTree.ParseError:
        raise DesenhoNaoServe(f"O arquivo '{caminho}' não é um desenho vetorial (SVG).")
    if raiz.tag not in ('svg', _SVG + 'svg'):
        raise DesenhoNaoServe(f"O arquivo '{caminho}' não é um desenho vetorial (SVG).")
    return raiz


def _desenhados(elemento):
    """Os elementos que pintam, em ordem; o que está em defs (degradês, máscaras) fica fora."""
    for filho in elemento:
        if filho.tag.replace(_SVG, '') in ('defs', 'clipPath', 'mask', 'style',
                                            'linearGradient', 'radialGradient'):
            continue
        yield filho
        yield from _desenhados(filho)


def _numero(texto, padrao=0.0):
    encontrado = _NUMERO.search(texto or '')
    return float(encontrado.group()) if encontrado else padrao


def _medidas(raiz):
    caixa = [float(valor) for valor in _NUMERO.findall(raiz.get('viewBox', ''))]
    largura = _numero(raiz.get('width'), 0) or (caixa[2] if len(caixa) == 4 else 100)
    altura = _numero(raiz.get('height'), 0) or (caixa[3] if len(caixa) == 4 else 100)
    if len(caixa) != 4 or caixa[2] <= 0 or caixa[3] <= 0:
        caixa = [0.0, 0.0, largura, altura]
    return largura, altura, caixa


def _degrades(raiz):
    """Cada degradê vira a cor do meio dele (a tartaruga só pinta de uma cor)."""
    cores = {}
    for elemento in raiz.iter():
        nome = elemento.tag.replace(_SVG, '')
        if nome not in ('linearGradient', 'radialGradient') or not elemento.get('id'):
            continue
        paradas = [
            parada.get('stop-color')
            for parada in elemento
            if parada.tag.replace(_SVG, '') == 'stop' and parada.get('stop-color')
        ]
        rgb = [_rgb(cor) for cor in paradas]
        rgb = [valor for valor in rgb if valor is not None]
        if rgb:
            media = [round(sum(canal) / len(rgb)) for canal in zip(*rgb)]
            cores[elemento.get('id')] = '#%02x%02x%02x' % tuple(media)
    return cores


def _rgb(cor):
    cor = (cor or '').strip()
    if re.fullmatch(r'#[0-9a-fA-F]{6}', cor):
        return [int(cor[i:i + 2], 16) for i in (1, 3, 5)]
    if re.fullmatch(r'#[0-9a-fA-F]{3}', cor):
        return [int(c * 2, 16) for c in cor[1:]]
    return None


def _cor(valor, degrades):
    valor = (valor or '').strip()
    if not valor or valor == 'none':
        return None
    referencia = re.fullmatch(r'url\(#([^)]+)\)', valor)
    if referencia:
        return degrades.get(referencia.group(1))
    return valor


# Geometria -----------------------------------------------------------------------------


def _forma_do_elemento(nome, elemento):
    """Os anéis de pontos de um elemento e se ele é fechado, ou None se não desenha nada."""
    numero = lambda chave: _numero(elemento.get(chave))
    if nome == 'rect':
        x, y, w, h = numero('x'), numero('y'), numero('width'), numero('height')
        raio = min(numero('rx'), w / 2, h / 2)
        if raio <= 0:
            return [[(x, y), (x + w, y), (x + w, y + h), (x, y + h)]], True
        cantos = [(x + w - raio, y + raio, -90), (x + w - raio, y + h - raio, 0),
                  (x + raio, y + h - raio, 90), (x + raio, y + raio, 180)]
        pontos = []
        for cx, cy, inicio in cantos:
            for passo in range(7):
                angulo = math.radians(inicio + passo * 15)
                pontos.append((cx + raio * math.cos(angulo), cy + raio * math.sin(angulo)))
        return [pontos], True
    if nome in ('ellipse', 'circle'):
        cx, cy = numero('cx'), numero('cy')
        rx = numero('rx') if nome == 'ellipse' else numero('r')
        ry = numero('ry') if nome == 'ellipse' else numero('r')
        lados = max(12, min(48, int(math.sqrt(max(rx, ry)) * 6)))
        return [[(cx + rx * math.cos(2 * math.pi * i / lados),
                  cy + ry * math.sin(2 * math.pi * i / lados)) for i in range(lados)]], True
    if nome == 'line':
        return [[(numero('x1'), numero('y1')), (numero('x2'), numero('y2'))]], False
    if nome in ('polygon', 'polyline'):
        valores = [float(v) for v in _NUMERO.findall(elemento.get('points', ''))]
        pontos = list(zip(valores[0::2], valores[1::2]))
        return [pontos], nome == 'polygon'
    if nome == 'path':
        return _caminho(elemento.get('d', ''))
    return None


def _caminho(d):
    """M L H V C S Q T Z (maiúsculas e minúsculas); as curvas viram pedaços de reta."""
    pedacos = _COMANDO.findall(d)
    aneis, atual = [], []
    x = y = inicio_x = inicio_y = 0.0
    controle = None
    comando = None
    fechado = False
    i = 0

    def ler(quantos):
        nonlocal i
        valores = [float(v) for v in pedacos[i:i + quantos]]
        if len(valores) < quantos:
            raise DesenhoNaoServe('Um caminho do desenho está incompleto.')
        i += quantos
        return valores

    while i < len(pedacos):
        if pedacos[i].isalpha():
            comando = pedacos[i]
            i += 1
            if comando in 'Zz':
                fechado = True
                x, y = inicio_x, inicio_y
                if atual:
                    aneis.append(atual)
                atual = []
                continue
        if comando is None:
            raise DesenhoNaoServe('Um caminho do desenho começa sem comando.')
        relativo = comando.islower()
        base_x, base_y = (x, y) if relativo else (0.0, 0.0)
        letra = comando.upper()
        if letra == 'M':
            px, py = ler(2)
            if atual:
                aneis.append(atual)
            x, y = base_x + px, base_y + py
            inicio_x, inicio_y = x, y
            atual = [(x, y)]
            comando = 'l' if relativo else 'L'
            controle = None
        elif letra == 'L':
            px, py = ler(2)
            x, y = base_x + px, base_y + py
            atual.append((x, y))
            controle = None
        elif letra == 'H':
            (px,) = ler(1)
            x = base_x + px
            atual.append((x, y))
            controle = None
        elif letra == 'V':
            (py,) = ler(1)
            y = base_y + py
            atual.append((x, y))
            controle = None
        elif letra in 'CS':
            if letra == 'C':
                x1, y1, x2, y2, px, py = ler(6)
                c1 = (base_x + x1, base_y + y1)
            else:
                x2, y2, px, py = ler(4)
                c1 = (2 * x - controle[0], 2 * y - controle[1]) if controle else (x, y)
            c2 = (base_x + x2, base_y + y2)
            fim = (base_x + px, base_y + py)
            atual.extend(_cubica((x, y), c1, c2, fim))
            controle = c2
            x, y = fim
        elif letra in 'QT':
            if letra == 'Q':
                x1, y1, px, py = ler(4)
                c = (base_x + x1, base_y + y1)
            else:
                px, py = ler(2)
                c = (2 * x - controle[0], 2 * y - controle[1]) if controle else (x, y)
            fim = (base_x + px, base_y + py)
            c1 = (x + 2 / 3 * (c[0] - x), y + 2 / 3 * (c[1] - y))
            c2 = (fim[0] + 2 / 3 * (c[0] - fim[0]), fim[1] + 2 / 3 * (c[1] - fim[1]))
            atual.extend(_cubica((x, y), c1, c2, fim))
            controle = c
            x, y = fim
        else:
            raise DesenhoNaoServe(f'O caminho do desenho usa um comando que não conheço: {comando}.')
    if atual:
        aneis.append(atual)
    return [anel for anel in aneis if len(anel) >= 2], fechado


def _cubica(p0, p1, p2, p3):
    comprimento = (math.dist(p0, p1) + math.dist(p1, p2) + math.dist(p2, p3))
    passos = max(2, min(24, int(comprimento / 3)))
    pontos = []
    for passo in range(1, passos + 1):
        t = passo / passos
        u = 1 - t
        pontos.append((
            u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
        ))
    return pontos


def _girar(pontos, transformacao):
    """O Pinta gira cada forma com rotate(graus cx cy); outra transformação não é dele."""
    if not transformacao:
        return pontos
    encontrado = re.fullmatch(r'\s*rotate\(([^)]*)\)\s*', transformacao)
    if not encontrado:
        raise DesenhoNaoServe('O desenho usa uma transformação que a tartaruga não entende.')
    valores = [float(v) for v in _NUMERO.findall(encontrado.group(1))]
    angulo = math.radians(valores[0]) if valores else 0.0
    cx, cy = (valores[1], valores[2]) if len(valores) >= 3 else (0.0, 0.0)
    seno, cosseno = math.sin(angulo), math.cos(angulo)
    return [
        (cx + (x - cx) * cosseno - (y - cy) * seno, cy + (x - cx) * seno + (y - cy) * cosseno)
        for x, y in pontos
    ]


def _area(anel):
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(anel, anel[1:] + anel[:1])) / 2


def _dentro(ponto, anel):
    x, y = ponto
    dentro = False
    for (x1, y1), (x2, y2) in zip(anel, anel[1:] + anel[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            dentro = not dentro
    return dentro


def _com_furos(aneis):
    """Os anéis de um caminho: os de dentro (furos) costurados a quem os contém."""
    if len(aneis) < 2:
        return aneis
    profundidade = [
        sum(_dentro(anel[0], outro) for outro in aneis if outro is not anel) for anel in aneis
    ]
    poligonos = []
    for i, anel in enumerate(aneis):
        if profundidade[i] % 2:
            continue
        contorno = list(anel)
        for j, furo in enumerate(aneis):
            if profundidade[j] == profundidade[i] + 1 and _dentro(furo[0], anel):
                contorno = _costurar(contorno, furo)
        poligonos.append(contorno)
    return poligonos


def _costurar(contorno, furo):
    """Fechadura: do ponto do contorno mais perto do furo, dá a volta no furo e volta."""
    # O furo anda ao contrário do contorno: assim o polígono não se cruza.
    if (_area(furo) > 0) == (_area(contorno) > 0):
        furo = furo[::-1]
    i, j = min(
        ((i, j) for i in range(len(contorno)) for j in range(len(furo))),
        key=lambda par: math.dist(contorno[par[0]], furo[par[1]]),
    )
    volta = furo[j:] + furo[:j] + [furo[j]]
    return contorno[:i + 1] + volta + contorno[i:]


def _sem_repetidos(pontos):
    limpos = []
    for ponto in pontos:
        if not limpos or math.dist(limpos[-1], ponto) > 1e-9:
            limpos.append(ponto)
    return limpos


def _normal(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    tamanho = math.hypot(dx, dy)
    return (-dy / tamanho, dx / tamanho) if tamanho else None


def _lados(antes, ponto, depois, meio):
    """O ponto empurrado meio traço para cada lado, com o canto em bico (no máximo 2 vezes)."""
    n1 = _normal(antes, ponto) if antes is not None else None
    n2 = _normal(ponto, depois) if depois is not None else None
    n1 = n1 or n2
    n2 = n2 or n1
    mx, my = n1[0] + n2[0], n1[1] + n2[1]
    tamanho = math.hypot(mx, my)
    if tamanho < 1e-9:
        # O traço volta para trás: o bico ficaria infinito, então fica do lado da reta.
        mx, my, escala = n1[0], n1[1], meio
    else:
        mx, my = mx / tamanho, my / tamanho
        escala = meio / max(mx * n1[0] + my * n1[1], 0.5)
    return ((ponto[0] + mx * escala, ponto[1] + my * escala),
            (ponto[0] - mx * escala, ponto[1] - my * escala))


def _circulo(centro, raio, lados=12):
    return [(centro[0] + raio * math.cos(2 * math.pi * i / lados),
             centro[1] + raio * math.sin(2 * math.pi * i / lados)) for i in range(lados)]


def _faixa_aberta(pontos, espessura):
    """Um traço aberto (linha, pincel) vira um polígono da largura dele."""
    meio = max(espessura, 1.0) / 2
    pontos = _sem_repetidos(pontos)
    comprimento = sum(math.dist(a, b) for a, b in zip(pontos, pontos[1:]))
    if len(pontos) < 2 or comprimento < meio * 2:
        # Um toque só do pincel: no Pinta ele é uma bolinha redonda.
        centro = (sum(x for x, _ in pontos) / len(pontos), sum(y for _, y in pontos) / len(pontos))
        return _circulo(centro, meio)
    esquerda, direita = [], []
    for i, ponto in enumerate(pontos):
        antes = pontos[i - 1] if i > 0 else None
        depois = pontos[i + 1] if i + 1 < len(pontos) else None
        lado_a, lado_b = _lados(antes, ponto, depois, meio)
        esquerda.append(lado_a)
        direita.append(lado_b)
    return esquerda + direita[::-1]


def _faixa_fechada(pontos, espessura):
    """O contorno de uma forma fechada vira um anel da largura dele (com a costura no começo)."""
    pontos = _sem_repetidos(pontos)
    if len(pontos) > 1 and math.dist(pontos[0], pontos[-1]) <= 1e-9:
        pontos = pontos[:-1]
    if len(pontos) < 3:
        return _faixa_aberta(pontos, espessura)
    meio = max(espessura, 1.0) / 2
    fora, dentro = [], []
    for i, ponto in enumerate(pontos):
        lado_a, lado_b = _lados(pontos[i - 1], ponto, pontos[(i + 1) % len(pontos)], meio)
        fora.append(lado_a)
        dentro.append(lado_b)
    # Dá a volta por fora, cruza para dentro, dá a volta por dentro ao contrário e volta.
    return fora + [fora[0], dentro[0]] + dentro[1:][::-1] + [dentro[0]]


def _simplificar(pontos, tolerancia):
    """Ramer-Douglas-Peucker: tira os pontos que quase não mudam o desenho."""
    if len(pontos) < 4:
        return pontos
    inicio, fim = pontos[0], pontos[-1]
    maior, indice = 0.0, 0
    for i in range(1, len(pontos) - 1):
        distancia = _distancia_da_reta(pontos[i], inicio, fim)
        if distancia > maior:
            maior, indice = distancia, i
    if maior <= tolerancia:
        return [inicio, fim]
    return (_simplificar(pontos[:indice + 1], tolerancia)[:-1]
            + _simplificar(pontos[indice:], tolerancia))


def _distancia_da_reta(p, a, b):
    if a == b:
        return math.dist(p, a)
    return abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / math.dist(a, b)


def _simplificar_anel(pontos, tolerancia):
    """Um anel fechado: parte no ponto mais longe do primeiro e simplifica as duas metades.

    Nunca sobra menos de 3 pontos: uma parte pequena continua lá, nunca some.
    """
    if len(pontos) <= 3:
        return pontos
    longe = max(range(len(pontos)), key=lambda i: math.dist(pontos[0], pontos[i]))
    if longe == 0:
        return pontos
    ida = _simplificar(pontos[:longe + 1], tolerancia)
    volta = _simplificar(pontos[longe:] + pontos[:1], tolerancia)
    anel = ida[:-1] + volta[:-1]
    return anel if len(anel) >= 3 else pontos


def _caber_no_orcamento(partes, lado, caminho):
    tolerancia = lado / 400
    while sum(len(pontos) for pontos, _, _ in partes) > MAXIMO_DE_PONTOS:
        if tolerancia > lado:
            # Nenhuma parte é apagada para caber: o desenho inteiro fica de fora, com o aviso.
            raise _nao_serve(caminho, f'tem detalhes demais (mais de {MAXIMO_DE_PONTOS} '
                                      f'pontos) para virar forma da tartaruga')
        partes = [(_simplificar_anel(pontos, tolerancia), preenchimento, borda)
                  for pontos, preenchimento, borda in partes]
        tolerancia *= 2
    return partes
