# general setup
TILE_SIZE = 64
WINDOW_WIDTH = 1280
WINDOW_HEIGHT = 720
ANIMATION_SPEED = 8

# editor graphics: (Pinta drawing, animation) or (Pinta drawing, animation, mirrored)
EDITOR_DATA = {
    0: {'style': 'player', 'type': 'object', 'menu': None, 'menu_surf': None, 'preview': None, 'graphics': ('pirata', 'parado')},
    1: {'style': 'sky',    'type': 'object', 'menu': None, 'menu_surf': None, 'preview': None, 'graphics': None},

    2: {'style': 'terrain', 'type': 'tile', 'menu': 'terrain', 'menu_surf': ('menu', 'terreno'), 'preview': ('previa', 'terreno'), 'graphics': None},
    3: {'style': 'water',   'type': 'tile', 'menu': 'terrain', 'menu_surf': ('menu', 'agua'),    'preview': ('previa', 'agua'),    'graphics': ('agua', 'superficie')},

    4: {'style': 'coin', 'type': 'tile', 'menu': 'coin', 'menu_surf': ('menu', 'ouro'),     'preview': ('previa', 'ouro'),     'graphics': ('moedas', 'ouro')},
    5: {'style': 'coin', 'type': 'tile', 'menu': 'coin', 'menu_surf': ('menu', 'prata'),    'preview': ('previa', 'prata'),    'graphics': ('moedas', 'prata')},
    6: {'style': 'coin', 'type': 'tile', 'menu': 'coin', 'menu_surf': ('menu', 'diamante'), 'preview': ('previa', 'diamante'), 'graphics': ('diamante', 'brilhar')},

    7:  {'style': 'enemy', 'type': 'tile', 'menu': 'enemy', 'menu_surf': ('menu', 'espinhos'),        'preview': ('previa', 'espinhos'),        'graphics': ('espinhos', 'parado')},
    8:  {'style': 'enemy', 'type': 'tile', 'menu': 'enemy', 'menu_surf': ('menu', 'dente'),           'preview': ('previa', 'dente'),           'graphics': ('dente', 'parado')},
    9:  {'style': 'enemy', 'type': 'tile', 'menu': 'enemy', 'menu_surf': ('menu', 'concha-esquerda'), 'preview': ('previa', 'concha-esquerda'), 'graphics': ('concha', 'parada')},
    10: {'style': 'enemy', 'type': 'tile', 'menu': 'enemy', 'menu_surf': ('menu', 'concha-direita'),  'preview': ('previa', 'concha-direita'),  'graphics': ('concha', 'parada', True)},

    11: {'style': 'palm_fg', 'type': 'object', 'menu': 'palm fg', 'menu_surf': ('menu', 'palmeiras', 0), 'preview': ('palmeira', 'pequena'),  'graphics': ('palmeira', 'pequena')},
    12: {'style': 'palm_fg', 'type': 'object', 'menu': 'palm fg', 'menu_surf': ('menu', 'palmeiras', 1), 'preview': ('palmeira', 'grande'),   'graphics': ('palmeira', 'grande')},
    13: {'style': 'palm_fg', 'type': 'object', 'menu': 'palm fg', 'menu_surf': ('menu', 'palmeiras', 2), 'preview': ('palmeira', 'esquerda'), 'graphics': ('palmeira', 'esquerda')},
    14: {'style': 'palm_fg', 'type': 'object', 'menu': 'palm fg', 'menu_surf': ('menu', 'palmeiras', 3), 'preview': ('palmeira', 'direita'),  'graphics': ('palmeira', 'direita')},

    15: {'style': 'palm_bg', 'type': 'object', 'menu': 'palm bg', 'menu_surf': ('menu', 'palmeiras-fundo', 0), 'preview': ('palmeira-fundo', 'pequena'),  'graphics': ('palmeira-fundo', 'pequena')},
    16: {'style': 'palm_bg', 'type': 'object', 'menu': 'palm bg', 'menu_surf': ('menu', 'palmeiras-fundo', 1), 'preview': ('palmeira-fundo', 'grande'),   'graphics': ('palmeira-fundo', 'grande')},
    17: {'style': 'palm_bg', 'type': 'object', 'menu': 'palm bg', 'menu_surf': ('menu', 'palmeiras-fundo', 2), 'preview': ('palmeira-fundo', 'esquerda'), 'graphics': ('palmeira-fundo', 'esquerda')},
    18: {'style': 'palm_bg', 'type': 'object', 'menu': 'palm bg', 'menu_surf': ('menu', 'palmeiras-fundo', 3), 'preview': ('palmeira-fundo', 'direita'),  'graphics': ('palmeira-fundo', 'direita')},
}

# the palm trees of the level, by the name the original folders had
PALMS = {
    'small_fg': ('palmeira', 'pequena'),
    'large_fg': ('palmeira', 'grande'),
    'left_fg': ('palmeira', 'esquerda'),
    'right_fg': ('palmeira', 'direita'),
    'small_bg': ('palmeira-fundo', 'pequena'),
    'large_bg': ('palmeira-fundo', 'grande'),
    'left_bg': ('palmeira-fundo', 'esquerda'),
    'right_bg': ('palmeira-fundo', 'direita'),
}

NEIGHBOR_DIRECTIONS = {
    'A': (0,-1),
    'B': (1,-1),
    'C': (1,0),
    'D': (1,1),
    'E': (0,1),
    'F': (-1,1),
    'G': (-1,0),
    'H': (-1,-1)
}

# auto-tile: a corner neighbor only changes the tile when both sides next to it have terrain
CORNER_SIDES = {'B': 'AC', 'D': 'CE', 'F': 'EG', 'H': 'GA'}

# the 47 terrain tiles, in the order of the Pinta tileset 'terreno' ('X' has no neighbors)
TERRAIN_TILES = '''
    X A C AC ABC E AE CE ACE ABCE CDE ACDE ABCDE G AG CG ACG ABCG EG AEG CEG ACEG ABCEG CDEG
    ACDEG ABCDEG EFG AEFG CEFG ACEFG ABCEFG CDEFG ACDEFG ABCDEFG AGH ACGH ABCGH AEGH ACEGH
    ABCEGH ACDEGH ABCDEGH AEFGH ACEFGH ABCEFGH ACDEFGH ABCDEFGH
'''.split()

# play mode: hearts, what each coin is worth and how long the end message stays
HEARTS = 3
COIN_VALUES = {'silver': 1, 'gold': 5, 'diamond': 20}
END_MESSAGE_DURATION = 2500

LEVEL_LAYERS = {
    'clouds': 1,
    'ocean': 2,
    'bg': 3,
    'water': 4,
    'main': 5
}

# colors
SKY_COLOR = '#ddc6a1'
SEA_COLOR = '#92a9ce'
HORIZON_COLOR = '#f5f1de'
HORIZON_TOP_COLOR = '#d1aa9d'
LINE_COLOR = 'black'
BUTTON_BG_COLOR = '#33323d'
BUTTON_LINE_COLOR = '#f5f1de'
