from pygame.math import Vector2

# The window and the size of one square of the map.
SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
TILE_SIZE = 64

# Drawing order: a lower number is drawn first, so it ends up under the others.
LAYERS = {
    'water': 0,
    'ground': 1,
    'soil': 2,
    'soil water': 3,
    'rain floor': 4,
    'house bottom': 5,
    'ground plant': 6,
    'main': 7,
    'fruit': 8,
    'rain drops': 9,
}

# Where the tool hits, measured from the middle of the farmer, for each side he faces.
TOOL_REACH = {
    'left': Vector2(-50, 40),
    'right': Vector2(50, 40),
    'up': Vector2(0, -10),
    'down': Vector2(0, 50),
}

# What the farmer carries when the game starts.
START_ITEMS = {'wood': 20, 'apple': 20, 'corn': 20, 'tomato': 20}
START_SEEDS = {'corn': 5, 'tomato': 5}
START_MONEY = 200
TOOLS = ['hoe', 'axe', 'water']

# How much a plant grows in one night with wet soil. It is ripe when it reaches the
# last picture of its drawing (age 3: the drawings have 4 pictures).
GROW_SPEED = {'corn': 1, 'tomato': 0.7}

# How many pixels above the bottom of its square the plant is drawn.
PLANT_LIFT = {'corn': 16, 'tomato': 8}

# The trader pays SALE_PRICES and charges PURCHASE_PRICES for each seed.
SALE_PRICES = {'wood': 4, 'apple': 2, 'corn': 10, 'tomato': 20}
PURCHASE_PRICES = {'corn': 4, 'tomato': 5}

# Where an apple may grow on each kind of tree, from the top left corner of the tree.
APPLE_SPOTS = {
    'Small': [(18, 17), (30, 37), (12, 50), (30, 45), (20, 30), (30, 10)],
    'Large': [(30, 24), (60, 65), (50, 50), (16, 40), (45, 50), (42, 70)],
}

# The Pinta drawings ('drawing/animation') used by the code.
FARMER_DRAWINGS = {
    'walk': 'fazendeiro/andar',
    'idle': 'fazendeiro/parado',
    'hoe': 'fazendeiro-ferramentas/enxada',
    'axe': 'fazendeiro-ferramentas/machado',
    'water': 'fazendeiro-ferramentas/regador',
}
SIDE_NAMES = {'up': 'cima', 'down': 'baixo', 'left': 'esquerda', 'right': 'direita'}
PLANT_DRAWINGS = {'corn': 'plantas/milho', 'tomato': 'plantas/tomate'}
STUMP_DRAWINGS = {'Small': 'arvores/toco-pequeno', 'Large': 'arvores/toco-grande'}
ICONS = {
    'hoe': 'icones/enxada',
    'axe': 'icones/machado',
    'water': 'icones/regador',
    'corn': 'icones/milho',
    'tomato': 'icones/tomate',
}

# The 'solo' drawing has one piece for each way a dug square can touch its dug
# neighbors. The key lists those neighbors: t (top), b (bottom), l (left), r (right).
SOIL_PIECES = {
    '': 0, 'tblr': 1, 'r': 2, 'l': 3, 'lr': 4, 'b': 5, 't': 6, 'tb': 7,
    'br': 8, 'bl': 9, 'tr': 10, 'tl': 11, 'tbr': 12, 'tbl': 13, 'tlr': 14, 'blr': 15,
}

# Bottom middle of the tool and seed icons on the screen.
HUD_POSITIONS = {'tool': (40, SCREEN_HEIGHT - 15), 'seed': (70, SCREEN_HEIGHT - 5)}

# The names the shop shows.
ITEM_NAMES = {'wood': 'madeira', 'apple': 'maçã', 'corn': 'milho', 'tomato': 'tomate'}
