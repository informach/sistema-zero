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

import pygame

__all__ = ['carregar_imagem', 'fonte', 'FONTES', 'carregar_sprite', 'carregar_pecas', 'carregar_mapa', 'ler_dados',
           'Sprite', 'Pecas', 'Mapa', 'CamadaDePecas', 'CamadaDeObjetos', 'Objeto']

PASTA = 'assets'
_PNG = b'\x89PNG\r\n\x1a\n'


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
    if bytes_[:8] != _PNG:
        raise ValueError(f'{_caminho(nome)} não é um PNG.')
    posicao = 8
    while posicao + 8 <= len(bytes_):
        tamanho, tipo = struct.unpack_from('>I4s', bytes_, posicao)
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
        dados = _ler_json(texto, comprimido, _caminho(nome))
        if dados.get('format') != 'pinta' or dados.get('version') != 1:
            raise ValueError(f'{_caminho(nome)} foi feito por um Pinta mais novo.')
        return dados
    return None


#: Os dados de um desenho do Pinta cabem com folga nisto; um PNG que diz ter mais está estragado.
MAXIMO_DE_DADOS = 16 * 1024 * 1024


def _ler_json(texto, comprimido, caminho):
    """O JSON do bloco ``pinta``: o arquivo pode ter sido trocado, então tudo é conferido."""
    estragado = f'Os dados do Pinta em {caminho} estão estragados. Traga o desenho do Pinta de novo.'
    try:
        if comprimido:
            descompressor = zlib.decompressobj()
            # Com teto: um bloco pequeno pode se abrir em gigabytes.
            texto = descompressor.decompress(texto, MAXIMO_DE_DADOS)
            if descompressor.unconsumed_tail:
                raise ValueError(f'Os dados do Pinta em {caminho} são grandes demais.')
            if not descompressor.eof:
                raise ValueError(estragado)
        elif len(texto) > MAXIMO_DE_DADOS:
            raise ValueError(f'Os dados do Pinta em {caminho} são grandes demais.')
        dados = json.loads(texto.decode('utf-8'))
    except (zlib.error, UnicodeDecodeError, json.JSONDecodeError, RecursionError):
        raise ValueError(estragado) from None
    if not isinstance(dados, dict):
        raise ValueError(estragado)
    return dados


def _carregar(nome):
    imagem = pygame.image.load(_caminho(nome))
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
        self.solidas = frozenset(int(indice) for indice in solidas)
        self.plataformas = frozenset(int(indice) for indice in plataformas)
        self.pecas = [_opaca_se_puder(folha.subsurface(((indice % colunas) * self.tamanho,
                                                        y + (indice // colunas) * self.tamanho,
                                                        self.tamanho, self.tamanho)))
                      for indice in range(int(quantidade))]

    def peca(self, indice):
        return self.pecas[int(indice)]

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
        self.propriedades = dict(dados.get('properties', {}))

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
        self.objetos = [Objeto(item) for item in dados.get('objects', ())]

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
        self.pecas = pecas
        self.colunas = mapa.colunas
        self.linhas = mapa.linhas
        self.celulas = [int(valor) for valor in dados['cells']]

    def peca(self, x, y):
        """O número da peça na casa (x, y), ou -1 quando a casa está vazia."""
        if not (0 <= x < self.colunas and 0 <= y < self.linhas):
            return -1
        return self.celulas[y * self.colunas + x]

    def tiles(self):
        """``(x, y, imagem)`` de cada casa preenchida, em casas (não em pixels)."""
        pecas = self.pecas.pecas
        for indice, valor in enumerate(self.celulas):
            if valor >= 0:
                yield indice % self.colunas, indice // self.colunas, pecas[valor]

    def _retangulos(self, aceitar):
        tamanho = self.pecas.tamanho
        return [pygame.Rect(x * tamanho, y * tamanho, tamanho, tamanho)
                for indice, valor in enumerate(self.celulas) if valor >= 0 and aceitar(valor)
                for x, y in [(indice % self.colunas, indice // self.colunas)]]

    def solidos(self):
        """Um Rect (em pixels) para cada peça marcada como sólida."""
        return self._retangulos(self.pecas.solida)

    def plataformas(self):
        """Um Rect (em pixels) para cada peça marcada como plataforma (só o topo segura)."""
        return self._retangulos(self.pecas.plataforma)

    def desenhar(self, superficie, deslocamento=(0, 0)):
        """Desenha a camada; ``deslocamento`` move o mapa (a câmera).

        Só as casas que aparecem na superfície são desenhadas.
        """
        tamanho = self.pecas.tamanho
        dx, dy = int(deslocamento[0]), int(deslocamento[1])
        largura, altura = superficie.get_size()
        x0, y0 = max(0, -dx // tamanho), max(0, -dy // tamanho)
        x1 = min(self.colunas, (largura - dx) // tamanho + 1)
        y1 = min(self.linhas, (altura - dy) // tamanho + 1)
        pecas, celulas, colunas = self.pecas.pecas, self.celulas, self.colunas
        superficie.fblits([(pecas[valor], (x * tamanho + dx, y * tamanho + dy))
                           for y in range(y0, y1) for x in range(x0, x1)
                           for valor in (celulas[y * colunas + x],) if valor >= 0])

    def __repr__(self):
        return f'<pinta.CamadaDePecas {self.nome!r} {self.colunas}x{self.linhas}>'


class Mapa:
    """Um mapa do Pinta: camadas de peças e de objetos, com as peças de cada camada."""

    def __init__(self, nome):
        dados = _dados(nome, 'map')
        atlas = _carregar(nome)
        self.nome = dados['name']
        self.tamanho_peca = int(dados['tileSize'])
        self.colunas = int(dados['cols'])
        self.linhas = int(dados['rows'])
        self.conjuntos = [Pecas(atlas, self.tamanho_peca, item['columns'], item['count'],
                                item.get('solid', ()), item.get('platform', ()), item['name'],
                                item.get('y', 0))
                          for item in dados['tilesets']]
        self.camadas = []
        for item in dados['layers']:
            if item.get('type') == 'objects':
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
        """Os objetos de todas as camadas (só os de um tipo, se ``tipo`` for dado)."""
        return [objeto for camada in self.camadas_de_objetos for objeto in camada
                if tipo is None or objeto.tipo == tipo]

    def solidos(self):
        """Os Rect das peças sólidas de todas as camadas de peças."""
        return [rect for camada in self.camadas_de_pecas for rect in camada.solidos()]

    def desenhar(self, superficie, deslocamento=(0, 0), frente=False):
        """Desenha as camadas de peças visíveis (as de trás, ou só as da frente)."""
        for camada in self.camadas_de_pecas:
            if camada.visivel and camada.frente == frente:
                camada.desenhar(superficie, deslocamento)

    def __repr__(self):
        return (f'<pinta.Mapa {self.nome!r} {self.colunas}x{self.linhas} casas de '
                f'{self.tamanho_peca}px, {len(self.camadas)} camadas>')


def carregar_mapa(nome):
    """Um mapa do Pinta com as suas camadas de peças e de objetos."""
    return Mapa(nome)
