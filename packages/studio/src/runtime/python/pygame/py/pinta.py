"""Desenhos do Pinta em jogos pygame-ce: sprites com animações, peças e mapas com camadas.

Cada desenho trazido do Pinta é um PNG em ``assets/``. Sprites, peças e mapas levam os seus
dados dentro do próprio PNG (um bloco ``iTXt`` chamado ``pinta``): as animações, as peças
sólidas, as camadas e os objetos do mapa. Este módulo lê esses dados e corta as imagens com o
pygame-ce, igual no navegador e no computador::

    import pygame
    import pinta

    heroi = pinta.carregar_sprite('heroi')
    quadros = heroi.animacao('correr')            # lista de Surface
    mapa = pinta.carregar_mapa('fase-1')
    for x, y, imagem in mapa.camada('Terreno').tiles():
        tela.blit(imagem, (x * mapa.tamanho_peca, y * mapa.tamanho_peca))
    for objeto in mapa.camada('Entidades'):
        print(objeto.nome, objeto.tipo, objeto.x, objeto.y, objeto.propriedades)

Imagens são convertidas para a tela (``convert_alpha``) quando a janela já existe.
"""
import json
import os
import struct
import zlib
import base64
import io
import copy
import math
import sys
import tempfile

import pygame

__all__ = ['carregar_imagem', 'fonte', 'FONTES', 'carregar_sprite', 'carregar_pecas', 'carregar_mapa', 'ler_dados',
           'Sprite', 'Pecas', 'Mapa', 'CamadaDePecas', 'CamadaDeObjetos', 'Objeto']

PASTA = 'assets'
_PNG = b'\x89PNG\r\n\x1a\n'

# BEGIN GENERATED PINTA WORLD LIMITS — scripts/gen-pinta-scene-python.ts
MUNDO_MAX_MAPAS = 16
MUNDO_MAX_CELULAS = 2097152
MUNDO_MAX_CARACTERES = 4194304
MUNDO_MAX_DADOS = 16777216
MUNDO_MAX_DIMENSAO = 4096
MUNDO_MAX_PIXELS_IMAGEM = 4194304
MUNDO_MAX_PIXELS_TOTAL = 16777216
# END GENERATED PINTA WORLD LIMITS

MAXIMO_DE_DADOS = MUNDO_MAX_DADOS


def _caminho(nome):
    """``'heroi'`` → ``assets/heroi.png``; um caminho com pasta ou extensão fica como está."""
    nome = os.fspath(nome)
    if '/' in nome or '\\' in nome or nome.lower().endswith('.png'):
        return nome
    return os.path.join(PASTA, nome + '.png')


def ler_dados(nome):
    """Os dados do Pinta guardados no PNG (um dicionário), ou ``None`` numa imagem comum."""
    with open(_caminho(nome), 'rb') as arquivo:
        bytes_ = arquivo.read()
    return _ler_dados_png(bytes_, _caminho(nome))


def _ler_dados_png(bytes_, caminho, limite=MAXIMO_DE_DADOS, orcamento=None):
    if bytes_[:8] != _PNG:
        raise ValueError(f'{caminho} não é um PNG.')
    posicao = 8
    while posicao + 8 <= len(bytes_):
        tamanho, tipo = struct.unpack_from('>I4s', bytes_, posicao)
        if tamanho > len(bytes_) - posicao - 12:
            raise ValueError(f'Os dados do Pinta em {caminho} estão estragados.')
        conteudo = bytes_[posicao + 8:posicao + 8 + tamanho]
        posicao += 12 + tamanho
        if tipo == b'IEND':
            break
        if tipo != b'iTXt':
            continue
        chave, _, resto = conteudo.partition(b'\0')
        if chave != b'pinta' or len(resto) < 2:
            continue
        comprimido, resto = resto[0], resto[2:]
        _idioma, _, resto = resto.partition(b'\0')
        _traduzida, _, texto = resto.partition(b'\0')
        dados = _ler_json(texto, comprimido, caminho, limite, orcamento)
        if (dados.get('format') != 'pinta' or dados.get('version') not in (1, 2, 3)
                or (dados.get('version') == 3 and dados.get('kind') != 'map')):
            raise ValueError(f'{caminho} foi feito por um Pinta mais novo.')
        return dados
    return None


def _ler_json(texto, comprimido, caminho, limite=MAXIMO_DE_DADOS, orcamento=None):
    """O JSON do bloco ``pinta``: o arquivo pode ter sido trocado, então tudo é conferido."""
    estragado = f'Os dados do Pinta em {caminho} estão estragados. Traga o desenho do Pinta de novo.'
    try:
        if comprimido:
            descompressor = zlib.decompressobj()
            # Com teto: um bloco pequeno pode se abrir em gigabytes.
            texto = descompressor.decompress(texto, limite + 1)
            if descompressor.unconsumed_tail or len(texto) > limite:
                raise ValueError(f'Os dados do Pinta em {caminho} são grandes demais.')
            if not descompressor.eof or descompressor.unused_data:
                raise ValueError(estragado)
        elif len(texto) > limite:
            raise ValueError(f'Os dados do Pinta em {caminho} são grandes demais.')
        if orcamento is not None:
            orcamento[0] -= len(texto)
            if orcamento[0] < 0:
                raise ValueError(f'Os dados do Pinta em {caminho} são grandes demais.')
        dados = json.loads(texto.decode('utf-8'))
    except (zlib.error, UnicodeDecodeError, json.JSONDecodeError, RecursionError):
        raise ValueError(estragado) from None
    if not isinstance(dados, dict):
        raise ValueError(estragado)
    return dados


def _carregar(nome):
    return _adequar_imagem(pygame.image.load(_caminho(nome)))


def _imagem_em_memoria(bytes_):
    # pygame-ce's Emscripten RWops accepts paths, not Python file-like callbacks.
    # The bytes remain the captured authority: use a private MEMFS file, never a
    # name from the map or project. Remove it even when SDL rejects the image.
    if sys.platform == 'emscripten':
        with tempfile.TemporaryDirectory(prefix='pinta-image-') as directory:
            caminho = os.path.join(directory, 'image.png')
            with open(caminho, 'wb') as arquivo:
                arquivo.write(bytes_)
            return _adequar_imagem(pygame.image.load(caminho))
    return _adequar_imagem(pygame.image.load(io.BytesIO(bytes_)))


def _adequar_imagem(imagem):
    if pygame.display.get_init() and pygame.display.get_surface() is not None:
        return imagem.convert_alpha()
    if imagem.get_bitsize() == 8:
        # Um PNG com paleta (os desenhos da galeria são salvos assim, bem menores): sem a janela
        # ainda não dá para usar convert_alpha, então os mesmos pixels vão para uma Surface com
        # alfa por pixel, igual à de um PNG comum.
        rgba = pygame.Surface(imagem.get_size(), pygame.SRCALPHA, 32)
        rgba.blit(imagem, (0, 0))
        return rgba
    return imagem


def _dados(nome, tipo):
    dados = ler_dados(nome)
    if dados is None or dados.get('kind') != tipo:
        explicacao = {
            'sprite': 'um sprite trazido do Pinta como "Folha com todas as animações"',
            'tileset': 'peças trazidas do Pinta como "Todas as peças"',
            'map': 'um mapa trazido do Pinta como "Mapa com camadas e objetos"',
        }[tipo]
        raise ValueError(f'{_caminho(nome)} não é {explicacao}.')
    return dados


def carregar_imagem(nome):
    """Um fundo, um quadro ou qualquer PNG do projeto, pronto para desenhar."""
    return _carregar(nome)


#: As fontes da plataforma (as mesmas do Pinta e do Estúdio).
FONTES = ('bungee', 'press-start-2p', 'nunito', 'fredoka')


def fonte(nome, tamanho):
    """Uma ``pygame.font.Font`` com uma das fontes da plataforma: ``fonte('bungee', 40)``."""
    if nome not in FONTES:
        raise ValueError(f'A fonte {nome!r} não existe. Fontes: {", ".join(FONTES)}.')
    for pasta in ('fontes', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fontes')):
        caminho = os.path.join(pasta, nome + '.ttf')
        if os.path.isfile(caminho):
            return pygame.font.Font(caminho, int(tamanho))
    raise FileNotFoundError(f'Não encontrei a fonte {nome!r} na pasta fontes/.')


# Sprites ------------------------------------------------------------------------------------

class Sprite:
    """Um sprite do Pinta: a folha e as animações, cortadas em quadros (Surface)."""

    def __init__(self, nome):
        dados = _dados(nome, 'sprite')
        self.nome = dados['name']
        self.folha = _carregar(nome)
        self.largura = int(dados['frameWidth'])
        self.altura = int(dados['frameHeight'])
        caixa = dados.get('hitbox')
        #: A área de colisão desenhada no Pinta, relativa ao quadro (ou None).
        self.caixa = pygame.Rect(caixa['x'], caixa['y'], caixa['width'], caixa['height']) \
            if caixa else None
        self._animacoes = {}
        self._info = {}
        for animacao in dados['animations']:
            linha = int(animacao['row'])
            quadros = [self.folha.subsurface((coluna * self.largura, linha * self.altura,
                                              self.largura, self.altura))
                       for coluna in range(int(animacao['frames']))]
            self._animacoes[animacao['name']] = quadros
            self._info[animacao['name']] = (float(animacao['fps']), bool(animacao['loop']))
        self._viradas = {}

    @property
    def nomes(self):
        """Os nomes das animações, na ordem do Pinta."""
        return list(self._animacoes)

    @property
    def tamanho(self):
        return self.largura, self.altura

    def _procurar(self, nome):
        if nome not in self._animacoes:
            raise KeyError(f'O sprite {self.nome!r} não tem a animação {nome!r}. '
                           f'Animações: {", ".join(self._animacoes)}.')
        return self._animacoes[nome]

    def animacao(self, nome, virar_x=False, virar_y=False):
        """Os quadros de uma animação; ``virar_x`` espelha (olhar para o outro lado)."""
        quadros = self._procurar(nome)
        if not virar_x and not virar_y:
            return list(quadros)
        chave = (nome, bool(virar_x), bool(virar_y))
        if chave not in self._viradas:
            self._viradas[chave] = [pygame.transform.flip(quadro, virar_x, virar_y)
                                    for quadro in quadros]
        return list(self._viradas[chave])

    def animacoes(self, virar_x=False, virar_y=False):
        """Todas as animações num dicionário ``{nome: [quadros]}``."""
        return {nome: self.animacao(nome, virar_x, virar_y) for nome in self._animacoes}

    def quadro(self, nome, indice=0):
        """O quadro ``indice`` da animação; passando do último, volta ao primeiro."""
        quadros = self._procurar(nome)
        if not quadros:
            raise ValueError(f'A animação {nome!r} do sprite {self.nome!r} não tem quadros. '
                             'Desenhe pelo menos um quadro nela no Pinta.')
        return quadros[int(indice) % len(quadros)]

    def fps(self, nome):
        """Quadros por segundo escolhidos no Pinta para a animação."""
        self._procurar(nome)
        return self._info[nome][0]

    def repete(self, nome):
        """Se a animação recomeça sozinha ao terminar."""
        self._procurar(nome)
        return self._info[nome][1]

    def __repr__(self):
        return f'<pinta.Sprite {self.nome!r} {self.largura}x{self.altura} {self.nomes}>'


def carregar_sprite(nome):
    """Um sprite do Pinta com todas as animações."""
    return Sprite(nome)


# Peças --------------------------------------------------------------------------------------

def _opaca_se_puder(peca):
    """Uma peça sem nenhum pixel transparente vira uma Surface sem alfa (como o pytmx faz).

    Desenhar uma imagem opaca é bem mais rápido que misturar pixel a pixel, e o chão de um
    mapa costuma ser feito só delas.
    """
    if (pygame.display.get_init() and pygame.display.get_surface() is not None
            and pygame.mask.from_surface(peca, 254).count() == peca.get_width() * peca.get_height()):
        return peca.convert()
    return peca


class Pecas:
    """As peças (tileset) de um desenho do Pinta, com as marcações de sólido e plataforma."""

    def __init__(self, folha, tamanho, colunas, quantidade, solidas, plataformas, nome, y=0):
        self.nome = nome
        self.tamanho = int(tamanho)
        self.animacoes = {}
        self.propriedades = {}
        self.terrenos = []
        self._viradas = {}
        self.solidas = frozenset(int(indice) for indice in solidas)
        self.plataformas = frozenset(int(indice) for indice in plataformas)
        self.pecas = [_opaca_se_puder(folha.subsurface(((indice % colunas) * self.tamanho,
                                                        y + (indice // colunas) * self.tamanho,
                                                        self.tamanho, self.tamanho)))
                      for indice in range(int(quantidade))]

    def peca(self, indice):
        return self.pecas[int(indice)]

    def imagem(self, celula, tempo=None):
        """A peça com espelhos, giro e animação; os oito giros são os do Tiled."""
        celula = int(celula)
        indice, flags = celula & 4095, celula & 28672
        quadros = self.animacoes.get(str(indice), ())
        total = sum(quadro['duration'] for quadro in quadros)
        # Animação sem duração (dados feitos à mão) fica parada na própria peça.
        if quadros and total > 0:
            atual = (pygame.time.get_ticks() if tempo is None else tempo) % total
            for quadro in quadros:
                atual -= quadro['duration']
                if atual < 0:
                    indice = quadro['tile']
                    break
        if not flags:
            return self.pecas[indice]
        chave = (indice, flags)
        if chave not in self._viradas:
            imagem = self.pecas[indice]
            if flags & 16384:
                imagem = pygame.transform.flip(pygame.transform.rotate(imagem, 90), False, True)
            imagem = pygame.transform.flip(imagem, bool(flags & 4096), bool(flags & 8192))
            self._viradas[chave] = imagem
        return self._viradas[chave]

    def solida(self, indice):
        return int(indice) in self.solidas

    def plataforma(self, indice):
        return int(indice) in self.plataformas

    def __len__(self):
        return len(self.pecas)

    def __getitem__(self, indice):
        return self.pecas[indice]

    def __iter__(self):
        return iter(self.pecas)

    def __repr__(self):
        return f'<pinta.Pecas {self.nome!r} {len(self.pecas)} peças de {self.tamanho}px>'


def carregar_pecas(nome):
    """As peças de um tileset do Pinta (uma Surface por peça)."""
    dados = _dados(nome, 'tileset')
    return Pecas(_carregar(nome), dados['tileSize'], dados['columns'], dados['count'],
                 dados.get('solid', ()), dados.get('platform', ()), dados['name'])


# Mapas --------------------------------------------------------------------------------------

class Objeto:
    """Um objeto de uma camada de objetos: um ponto (largura e altura 0) ou uma área."""

    def __init__(self, dados):
        self.id = str(dados.get('id', ''))
        self.nome = str(dados.get('name', ''))
        self.tipo = str(dados.get('type', ''))
        self.x = dados.get('x', 0)
        self.y = dados.get('y', 0)
        self.largura = dados.get('width', 0)
        self.altura = dados.get('height', 0)
        self.forma = dados.get('shape', 'point' if not self.largura and not self.altura else 'rect')
        self.pontos = [pygame.Vector2(p['x'], p['y']) for p in dados.get('points', ())]
        self.giro = dados.get('rotation', 0)
        self.virar_x, self.virar_y = bool(dados.get('flipX')), bool(dados.get('flipY'))
        self.papel = dados.get('role', '')
        self.arte = dados.get('art')
        self.conjunto = dados.get('setId')
        propriedades = dict(dados.get('properties', {}))
        self.tipos_das_propriedades = {chave: valor['type'] for chave, valor in propriedades.items() if isinstance(valor, dict) and 'type' in valor}
        self.propriedades = {chave: valor.get('value') if isinstance(valor, dict) else valor for chave, valor in propriedades.items()}

    # Os mesmos nomes do Tiled/pytmx, para código que já usava mapas assim.
    name = property(lambda self: self.nome)
    type = property(lambda self: self.tipo)
    width = property(lambda self: self.largura)
    height = property(lambda self: self.altura)
    properties = property(lambda self: self.propriedades)

    @property
    def pos(self):
        return pygame.Vector2(self.x, self.y)

    @property
    def rect(self):
        return pygame.FRect(self.x, self.y, self.largura, self.altura)

    def __repr__(self):
        return f'<pinta.Objeto {self.nome!r} tipo={self.tipo!r} em ({self.x}, {self.y})>'


class CamadaDeObjetos:
    """Os objetos de uma camada, na ordem do Pinta (dá para usar num ``for``)."""

    tipo = 'objetos'

    def __init__(self, dados):
        self.nome = dados['name']
        self.visivel = bool(dados.get('visible', True))
        self.opacidade = dados.get('opacity', 1)
        self.deslocamento = (dados.get('offsetX', 0), dados.get('offsetY', 0))
        self.propriedades = dict(dados.get('properties', {}))
        self.objetos = [Objeto(dict(item, x=item.get('x', 0) + self.deslocamento[0], y=item.get('y', 0) + self.deslocamento[1])) for item in dados.get('objects', ())]

    def do_tipo(self, tipo):
        return [objeto for objeto in self.objetos if objeto.tipo == tipo]

    def com_nome(self, nome):
        for objeto in self.objetos:
            if objeto.nome == nome:
                return objeto
        raise KeyError(f'A camada {self.nome!r} não tem o objeto {nome!r}.')

    def __iter__(self):
        return iter(self.objetos)

    def __len__(self):
        return len(self.objetos)

    def __getitem__(self, indice):
        return self.objetos[indice]

    def __repr__(self):
        return f'<pinta.CamadaDeObjetos {self.nome!r} com {len(self.objetos)} objetos>'


class CamadaDePecas:
    """Uma grade de peças. ``tiles()`` percorre as casas preenchidas, como no pytmx."""

    tipo = 'pecas'

    def __init__(self, dados, mapa, pecas):
        self.nome = dados['name']
        self.visivel = bool(dados.get('visible', True))
        #: Desenhada na frente do jogador (marcada como "frente" no Pinta).
        self.frente = bool(dados.get('front', False))
        self.colisao = bool(dados.get('collision', False))
        self.opacidade = dados.get('opacity', 1)
        self.deslocamento = (dados.get('offsetX', 0), dados.get('offsetY', 0))
        self.parallax = (dados.get('parallaxX', 1), dados.get('parallaxY', 1))
        self.propriedades = dict(dados.get('properties', {}))
        self._opacas = {}
        #: A versão dos dados do mapa. Na 1, ``desenhar`` chamado direto desenha também a camada
        #: escondida, como sempre fez; quem pula a escondida é ``Mapa.desenhar``.
        self._versao = getattr(mapa, 'versao', 1)
        self.pecas = pecas
        self.colunas = mapa.colunas
        self.linhas = mapa.linhas
        self.celulas = [int(valor) for valor in dados['cells']]

    def peca(self, x, y):
        """O número da peça na casa (x, y), ou -1 quando a casa está vazia."""
        if not (0 <= x < self.colunas and 0 <= y < self.linhas):
            return -1
        valor = self.celulas[y * self.colunas + x]
        return valor & 4095 if valor >= 0 else -1

    def tiles(self):
        """``(x, y, imagem)`` de cada casa preenchida, em casas (não em pixels)."""
        for indice, valor in enumerate(self.celulas):
            if valor >= 0:
                yield indice % self.colunas, indice // self.colunas, self.pecas.imagem(valor)

    def _retangulos(self, aceitar):
        tamanho = self.pecas.tamanho
        return [pygame.Rect(x * tamanho + self.deslocamento[0], y * tamanho + self.deslocamento[1], tamanho, tamanho)
                for indice, valor in enumerate(self.celulas) if valor >= 0 and aceitar(valor & 4095)
                for x, y in [(indice % self.colunas, indice // self.colunas)]]

    def solidos(self):
        """Um Rect (em pixels) para cada peça marcada como sólida."""
        return self._retangulos(lambda indice: self.colisao or self.pecas.solida(indice))

    def plataformas(self):
        """Um Rect (em pixels) para cada peça marcada como plataforma (só o topo segura)."""
        return self._retangulos(self.pecas.plataforma)

    def desenhar(self, superficie, deslocamento=(0, 0)):
        """Desenha a camada; ``deslocamento`` move o mapa (a câmera).

        Só as casas que aparecem na superfície são desenhadas.
        """
        tamanho = self.pecas.tamanho
        if self._versao >= 2 and (self.colisao or not self.visivel or self.opacidade <= 0):
            return
        dx = int(deslocamento[0] * self.parallax[0] + self.deslocamento[0])
        dy = int(deslocamento[1] * self.parallax[1] + self.deslocamento[1])
        largura, altura = superficie.get_size()
        x0, y0 = max(0, -dx // tamanho), max(0, -dy // tamanho)
        x1 = min(self.colunas, (largura - dx) // tamanho + 1)
        y1 = min(self.linhas, (altura - dy) // tamanho + 1)
        celulas, colunas = self.celulas, self.colunas
        superficie.fblits([(self._imagem(valor), (x * tamanho + dx, y * tamanho + dy))
                           for y in range(y0, y1) for x in range(x0, x1)
                           for valor in (celulas[y * colunas + x],) if valor >= 0])

    def _imagem(self, valor):
        imagem = self.pecas.imagem(valor)
        if self.opacidade >= 1:
            return imagem
        chave = (id(imagem), self.opacidade)
        if chave not in self._opacas:
            copia = pygame.Surface(imagem.get_size(), pygame.SRCALPHA, 32)
            copia.blit(imagem, (0, 0))
            copia.set_alpha(round(255 * self.opacidade))
            self._opacas[chave] = copia
        return self._opacas[chave]

    def __repr__(self):
        return f'<pinta.CamadaDePecas {self.nome!r} {self.colunas}x{self.linhas}>'


class GrupoDeCamadas:
    tipo = 'grupo'

    def __init__(self, dados):
        self.nome = dados['name']
        self.visivel = dados.get('visible', True)
        self.opacidade = dados.get('opacity', 1)
        self.propriedades = dict(dados.get('properties', {}))


def _dimensoes_png(bytes_, escala=1):
    if (len(bytes_) < 33 or bytes_[:8] != _PNG
            or bytes_[8:16] != b'\x00\x00\x00\rIHDR'):
        raise ValueError('Uma imagem deste cenário está estragada.')
    largura, altura = struct.unpack_from('>II', bytes_, 16)
    if (not largura or not altura or max(largura, altura) > MUNDO_MAX_DIMENSAO
            or largura * altura > MUNDO_MAX_PIXELS_IMAGEM):
        raise ValueError('Uma imagem deste cenário é grande demais.')
    w, h = round(largura * escala), round(altura * escala)
    if not w or not h or max(w, h) > MUNDO_MAX_DIMENSAO or w * h > MUNDO_MAX_PIXELS_IMAGEM:
        raise ValueError('Uma imagem deste cenário é grande demais nesta escala.')
    return w, h


class _MundoPNG:
    """Bounded immutable source records and encoded images; no retained map surfaces."""

    def __init__(self, dados, png, orcamento):
        mundo = dados.get('world')
        if not isinstance(mundo, dict) or mundo.get('version') != 1:
            raise ValueError('Este cenário não contém seus outros lugares. Traga o cenário de novo.')
        raiz, destinos = mundo.get('rootId'), mundo.get('maps')
        if (not isinstance(raiz, str) or not raiz or len(raiz) > 200
                or not isinstance(destinos, list) or len(destinos) >= MUNDO_MAX_MAPAS):
            raise ValueError('A lista de lugares deste cenário está estragada.')
        self.escala = dados.get('scale', 1)
        if (not isinstance(self.escala, (int, float)) or isinstance(self.escala, bool)
                or not math.isfinite(self.escala) or self.escala <= 0
                or self.escala > MUNDO_MAX_DIMENSAO):
            raise ValueError('A escala deste cenário está estragada.')
        self.imagens, self.entradas = {}, {}
        self.pixels, self.celulas = 0, 0
        self._adicionar(raiz, dados.get('name'), {k: v for k, v in dados.items() if k != 'world'}, png)
        caracteres = 0
        for destino in destinos:
            if not isinstance(destino, dict):
                raise ValueError('Um dos lugares deste cenário está estragado.')
            identificador, nome, imagem = destino.get('id'), destino.get('name'), destino.get('png')
            if not isinstance(imagem, str) or not imagem.startswith('data:image/png;base64,'):
                raise ValueError('Falta a imagem de um dos lugares deste cenário.')
            caracteres += len(imagem)
            if caracteres > MUNDO_MAX_CARACTERES or orcamento[0] <= 0:
                raise ValueError('Os outros lugares deste cenário são grandes demais.')
            try:
                bytes_ = base64.b64decode(imagem.split(',', 1)[1], validate=True)
            except (ValueError, TypeError):
                raise ValueError('A imagem de um dos lugares está estragada.') from None
            info = _ler_dados_png(bytes_, str(nome), orcamento[0], orcamento)
            if (not info or info.get('version') != 2 or info.get('kind') != 'map'
                    or 'world' in info or info.get('scale') != self.escala):
                raise ValueError('Um dos lugares deste cenário está incompleto.')
            self._adicionar(identificador, nome, info, bytes_)

    @staticmethod
    def _inteiro(valor, teto):
        return isinstance(valor, int) and not isinstance(valor, bool) and 1 <= valor <= teto

    def _adicionar(self, identificador, nome, dados, png):
        if (not isinstance(identificador, str) or not identificador or len(identificador) > 200
                or identificador in self.entradas or not isinstance(nome, str) or not nome or len(nome) > 48):
            raise ValueError('Os nomes ou IDs dos lugares estão estragados.')
        cena = dados.get('scene')
        if (not isinstance(cena, dict) or cena.get('version') not in (1, 2)
                or cena.get('id') != identificador or dados.get('name') != nome):
            raise ValueError('Os dados não correspondem ao lugar deste cenário.')
        w, h = _dimensoes_png(png)
        self.pixels += w * h
        tamanho, folhas, camadas = dados.get('tileSize'), dados.get('tilesets'), dados.get('layers')
        if (not self._inteiro(tamanho, MUNDO_MAX_DIMENSAO) or not isinstance(folhas, list)
                or not 1 <= len(folhas) <= 32 or not isinstance(camadas, list) or len(camadas) > 32
                or not self._inteiro(dados.get('cols'), 256) or not self._inteiro(dados.get('rows'), 256)):
            raise ValueError('As camadas deste cenário estão estragadas.')
        faixas = []
        for folha in folhas:
            cols, quantidade, y = folha.get('columns'), folha.get('count'), folha.get('y')
            if (not self._inteiro(cols, 256) or not self._inteiro(quantidade, 256)
                    or not isinstance(y, int) or isinstance(y, bool) or y < 0):
                raise ValueError('As peças deste cenário estão estragadas.')
            fim = y + math.ceil(quantidade / cols) * tamanho
            if (min(cols, quantidade) * tamanho > w or fim > h
                    or any(y < outro_fim and fim > inicio for inicio, outro_fim in faixas)):
                raise ValueError('As peças não cabem na imagem deste cenário.')
            faixas.append((y, fim))
        self._conferir_cena(cena)
        if self.pixels > MUNDO_MAX_PIXELS_TOTAL:
            raise ValueError('As imagens deste cenário são grandes demais juntas.')
        self.entradas[identificador] = (nome, dados, png)

    def _conferir_cena(self, cena):
        conjuntos = cena.get('sets', [])
        if not isinstance(conjuntos, list) or len(conjuntos) > 64:
            raise ValueError('Os conjuntos deste cenário estão estragados.')
        objetos = 0
        for parte in [cena] + conjuntos:
            cols, rows, camadas = parte.get('cols'), parte.get('rows'), parte.get('layers')
            if (not self._inteiro(cols, 256) or not self._inteiro(rows, 256)
                    or not isinstance(camadas, list) or len(camadas) > 32):
                raise ValueError('As regiões deste cenário estão estragadas.')
            for camada in camadas:
                if camada.get('kind') == 'tiles':
                    cells = camada.get('cells')
                    if not isinstance(cells, list) or len(cells) != cols * rows:
                        raise ValueError('Faltam peças em uma camada deste cenário.')
                    self.celulas += len(cells)
                elif camada.get('kind') == 'objects':
                    items = camada.get('objects')
                    if not isinstance(items, list):
                        raise ValueError('Os objetos deste cenário estão estragados.')
                    objetos += len(items)
                    for objeto in items:
                        self._superficies_temporarias(objeto, cena, conjuntos)
        if self.celulas > MUNDO_MAX_CELULAS or objetos > 512:
            raise ValueError('Este cenário tem peças ou objetos demais.')
        for chave, teto in [('tilesets', 32), ('art', 128)]:
            recursos = cena.get(chave, [])
            if not isinstance(recursos, list) or len(recursos) > teto:
                raise ValueError('Os desenhos deste cenário estão estragados.')
            for recurso in recursos:
                imagem = recurso.get('image')
                if not isinstance(imagem, str) or not imagem.startswith('data:image/png;base64,'):
                    raise ValueError('Falta um desenho deste cenário.')
                if imagem in self.imagens:
                    continue
                try:
                    bytes_ = base64.b64decode(imagem.split(',', 1)[1], validate=True)
                except (ValueError, TypeError):
                    raise ValueError('Um desenho deste cenário está estragado.') from None
                w, h = _dimensoes_png(bytes_, self.escala)
                self.pixels += w * h
                if self.pixels > MUNDO_MAX_PIXELS_TOTAL:
                    raise ValueError('Os desenhos deste cenário são grandes demais juntos.')
                self.imagens[imagem] = bytes_

    def _superficies_temporarias(self, objeto, cena, conjuntos):
        if not objeto.get('setId') and not objeto.get('art'):
            return
        w, h = objeto.get('width'), objeto.get('height')
        rotation = objeto.get('rotation', 0)
        if any(not isinstance(n, (int, float)) or isinstance(n, bool) or not math.isfinite(n)
               for n in (w, h, rotation)) or min(w, h) < 0:
            raise ValueError('O tamanho ou giro de um desenho está estragado.')
        if not objeto.get('setId') and (not w or not h):
            return
        def area(width, height):
            width, height = max(1, math.ceil(width)), max(1, math.ceil(height))
            if max(width, height) > MUNDO_MAX_DIMENSAO or width * height > MUNDO_MAX_PIXELS_IMAGEM:
                raise ValueError('Um desenho ampliado deste cenário é grande demais.')
            return width * height
        conjunto = next((s for s in conjuntos if s.get('id') == objeto.get('setId')), None)
        if conjunto:
            self.pixels += area(conjunto['cols'] * cena['tileSize'] * self.escala,
                                conjunto['rows'] * cena['tileSize'] * self.escala)
        w, h = max(1, math.ceil(w * self.escala)), max(1, math.ceil(h * self.escala))
        self.pixels += 2 * area(w, h)
        if rotation % 360:
            a = math.radians(rotation)
            c, s = abs(math.cos(a)), abs(math.sin(a))
            c, s = 0 if c < 1e-12 else c, 0 if s < 1e-12 else s
            padding = 2 if rotation % 90 else 0
            self.pixels += area(w * c + h * s + padding, w * s + h * c + padding)
        if self.pixels > MUNDO_MAX_PIXELS_TOTAL:
            raise ValueError('Os desenhos ampliados deste cenário são grandes demais juntos.')

    def lugar(self, referencia, por_id=False):
        if not isinstance(referencia, str):
            raise ValueError('Esta porta não tem um destino válido.')
        if por_id and referencia in self.entradas:
            return self.entradas[referencia]
        nomes = [entrada for entrada in self.entradas.values() if entrada[0] == referencia]
        if len(nomes) > 1:
            raise ValueError('Há mais de um lugar com esse nome. Use o ID do lugar.')
        if nomes:
            return nomes[0]
        if referencia in self.entradas:
            return self.entradas[referencia]
        raise KeyError(f'O lugar {referencia!r} não está neste cenário.')


class Mapa:
    """Um mapa do Pinta: camadas de peças e de objetos, com as peças de cada camada."""

    def __init__(self, nome, *, _fonte=None, _mundo=None):
        if _fonte is None:
            with open(_caminho(nome), 'rb') as arquivo:
                png = arquivo.read()
            orcamento = [MUNDO_MAX_DADOS]
            dados = _ler_dados_png(png, _caminho(nome), orcamento=orcamento)
            if not dados or dados.get('kind') != 'map':
                raise ValueError(f'{_caminho(nome)} não é um mapa trazido do Pinta como "Mapa com camadas e objetos".')
            if dados.get('version') == 3:
                try:
                    _mundo = _MundoPNG(dados, png, orcamento)
                except (AttributeError, TypeError, IndexError, KeyError, OverflowError) as error:
                    raise ValueError('Os dados dos lugares deste cenário estão estragados.') from error
        else:
            dados, png = _fonte
        atlas = _imagem_em_memoria(png)
        self._mundo = _mundo
        self.nome = dados['name']
        #: 1 para os mapas de antes; 2 para os que trazem grupos, opacidade, giros e a cena.
        self.versao = int(dados.get('version', 1))
        self.tamanho_peca = int(dados['tileSize'])
        self.colunas = int(dados['cols'])
        self.linhas = int(dados['rows'])
        self.conjuntos = [Pecas(atlas, self.tamanho_peca, item['columns'], item['count'],
                                item.get('solid', ()), item.get('platform', ()), item['name'],
                                item.get('y', 0))
                          for item in dados['tilesets']]
        for pecas, item in zip(self.conjuntos, dados['tilesets']):
            pecas.animacoes = item.get('animations', {})
            pecas.propriedades = item.get('tileProperties', {})
            pecas.terrenos = item.get('terrains', [])
        self.camadas = []
        self.cena = copy.deepcopy(dados.get('scene'))
        self._cena = None
        self._objetos_da_cena = None
        if self.cena:
            escala = dados.get('scale', 1)
            self.cena['tileSize'] *= escala
            for arte in self.cena.get('art', []):
                arte['width'] *= escala
                arte['height'] *= escala
                if arte.get('sprite'):
                    arte['sprite']['frameWidth'] *= escala
                    arte['sprite']['frameHeight'] *= escala
            for grupo in [self.cena] + self.cena.get('sets', []):
                for layer in grupo['layers']:
                    for key in ('offsetX', 'offsetY'):
                        if key in layer:
                            layer[key] *= escala
                    for obj in layer.get('objects', []):
                        for key in ('x', 'y', 'width', 'height'):
                            obj[key] *= escala
                        for point in obj.get('points', []):
                            point['x'] *= escala
                            point['y'] *= escala
            cena = _CenaCompleta.__new__(_CenaCompleta)
            cena.mapas = {self.cena['name']: self.cena}
            cena.imagens, cena.pecas = {}, {}
            def imagem(caminho):
                if caminho not in cena.imagens:
                    raw = (self._mundo.imagens[caminho] if self._mundo
                           else base64.b64decode(caminho.split(',', 1)[1]))
                    source = _imagem_em_memoria(raw).convert_alpha()
                    cena.imagens[caminho] = pygame.transform.scale(source, (round(source.get_width() * escala), round(source.get_height() * escala)))
                return cena.imagens[caminho]
            cena.imagem = imagem
            cena.carregar(self.cena['name'])
            self._cena = cena
            # O compositor já resolveu grupos, escala, conjuntos e referências entre objetos.
            # Conserva as instâncias públicas entre consultas, como nas camadas legadas.
            self._objetos_da_cena = [Objeto(objeto) for objeto in cena.objetos]
        resolvidas = {}
        for original in dados['layers']:
            item = dict(original)
            pai = resolvidas.get(item.get('parentId'))
            if pai:
                item['visible'] = item.get('visible', True) and pai.get('visible', True)
                item['opacity'] = item.get('opacity', 1) * pai.get('opacity', 1)
                for chave in ('offsetX', 'offsetY'):
                    item[chave] = item.get(chave, 0) + pai.get(chave, 0)
                for chave in ('parallaxX', 'parallaxY'):
                    item[chave] = item.get(chave, 1) * pai.get(chave, 1)
            if 'id' in item:
                resolvidas[item['id']] = item
            if item.get('type') == 'group':
                self.camadas.append(GrupoDeCamadas(item))
            elif item.get('type') == 'objects':
                self.camadas.append(CamadaDeObjetos(item))
            else:
                self.camadas.append(CamadaDePecas(item, self, self.conjuntos[int(item['tileset'])]))

    @property
    def largura(self):
        """Largura do mapa em pixels."""
        return self.colunas * self.tamanho_peca

    @property
    def altura(self):
        """Altura do mapa em pixels."""
        return self.linhas * self.tamanho_peca

    @property
    def tamanho(self):
        return self.largura, self.altura

    def camada(self, nome):
        for camada in self.camadas:
            if camada.nome == nome:
                return camada
        raise KeyError(f'O mapa {self.nome!r} não tem a camada {nome!r}. '
                       f'Camadas: {", ".join(camada.nome for camada in self.camadas)}.')

    def tem_camada(self, nome):
        return any(camada.nome == nome for camada in self.camadas)

    @property
    def camadas_de_pecas(self):
        return [camada for camada in self.camadas if isinstance(camada, CamadaDePecas)]

    @property
    def camadas_de_objetos(self):
        return [camada for camada in self.camadas if isinstance(camada, CamadaDeObjetos)]

    def objetos(self, tipo=None):
        """Os objetos do mapa, incluindo conjuntos (só os de um tipo, se ``tipo`` for dado)."""
        if self._objetos_da_cena is not None:
            return [objeto for objeto in self._objetos_da_cena if tipo is None or objeto.tipo == tipo]
        return [objeto for camada in self.camadas_de_objetos for objeto in camada
                if tipo is None or objeto.tipo == tipo]

    def solidos(self):
        """Os Rect das peças sólidas de todas as camadas de peças."""
        if self._cena:
            return [pygame.Rect(r) for r in self._cena.solidos]
        return [rect for camada in self.camadas_de_pecas for rect in camada.solidos()]

    def objeto_por_id(self, referencia):
        """O objeto de uma propriedade de referência, ou None se ele não existe."""
        return next((objeto for objeto in self.objetos() if objeto.id == referencia), None)

    def recurso_imagem(self, referencia):
        """A Surface da arte referenciada neste mapa, inclusive uma versão guardada."""
        caminho = self._cena.recurso_imagem(referencia) if self._cena else None
        return self._cena.imagem(caminho) if caminho else None

    def propriedade_camada(self, referencia, chave):
        """Lê uma propriedade pelo ID da camada, conservando seu valor tipado."""
        return self._cena.propriedade_camada(referencia, chave) if self._cena else None

    def propriedade_peca(self, referencia, peca, chave):
        """Lê uma propriedade pela referência do conjunto e pelo índice da peça."""
        return self._cena.propriedade_peca(referencia, peca, chave) if self._cena else None

    def ponto_inicial(self):
        """A posição marcada como início do jogador, em pixels do jogo."""
        inicio = next((objeto for objeto in self.objetos()
                       if objeto.papel == 'start' or objeto.tipo == 'inicio'), None)
        return (inicio.x, inicio.y) if inicio else (self.tamanho_peca / 2, self.tamanho_peca / 2)

    def abrir_lugar(self, referencia):
        """Abre um ID de mapa deste cenário. Não procura arquivos pelo nome da porta."""
        if not self._mundo:
            raise ValueError('Traga este mapa como Cenário com outros lugares para abrir suas portas.')
        nome, dados, png = self._mundo.lugar(referencia, por_id=True)
        return Mapa(nome, _fonte=(dados, png), _mundo=self._mundo)

    def abrir_destino(self, porta):
        """Abre o lugar de uma porta; o programa decide quando e onde mover o jogador."""
        if not isinstance(porta, Objeto):
            raise TypeError('Escolha um objeto porta deste cenário.')
        chave = 'destino' if porta.propriedades.get('destino') else 'destination'
        referencia = porta.propriedades.get(chave)
        if not referencia:
            return None
        if not self._mundo:
            raise ValueError('Traga este mapa como Cenário com outros lugares para abrir suas portas.')
        nome, dados, png = self._mundo.lugar(referencia, porta.tipos_das_propriedades.get(chave) == 'asset')
        return Mapa(nome, _fonte=(dados, png), _mundo=self._mundo)

    def desenhar(self, superficie, deslocamento=(0, 0), frente=False):
        """Desenha as camadas de peças visíveis (as de trás, ou só as da frente)."""
        if self._cena:
            self._cena.desenhar(superficie, frente, camera=(-deslocamento[0], -deslocamento[1]), personagem=False)
            return
        for camada in self.camadas_de_pecas:
            if camada.visivel and camada.frente == frente:
                camada.desenhar(superficie, deslocamento)

    def __repr__(self):
        return (f'<pinta.Mapa {self.nome!r} {self.colunas}x{self.linhas} casas de '
                f'{self.tamanho_peca}px, {len(self.camadas)} camadas>')


def carregar_mapa(nome):
    """Um mapa do Pinta com as suas camadas de peças e de objetos."""
    return Mapa(nome)
# BEGIN GENERATED PINTA SCENE — scripts/gen-pinta-scene-python.ts
"""Cenários do Pinta: dados editáveis em maps.json; imagens locais, sem rede."""
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

class _CenaCompleta:
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
                tile = celula & 4095
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
                        tile = celula & 4095
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
        tile, flags = celula & 4095, celula & 28672
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
            if flags & 16384:
                imagem = pygame.transform.flip(pygame.transform.rotate(imagem, 90), False, True)
            self.pecas[chave] = pygame.transform.flip(imagem, bool(flags & 4096), bool(flags & 8192))
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
