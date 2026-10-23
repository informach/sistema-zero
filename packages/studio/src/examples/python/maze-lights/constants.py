# Derivado de código MIT de TheWannabeCoder (2025), commit 2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103.
# Labirinto das Luzes — Sistema Zero. Consulte LICENSE e NOTICE.md.

"""Tamanhos, velocidades e alcance do radar dos drones.

Nomes em MAIÚSCULAS reúnem os valores usados pelos outros arquivos.
Créditos e licença em NOTICE.md e LICENSE.
"""

# Grid size
CELL_SIZE = 30
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 850
GRID_ROWS = SCREEN_HEIGHT // CELL_SIZE
GRID_COLUMNS = SCREEN_WIDTH // CELL_SIZE
ROW_MARGIN = (SCREEN_WIDTH - (CELL_SIZE * GRID_COLUMNS)) / 2
COLUMN_MARGIN = (SCREEN_HEIGHT - (CELL_SIZE * GRID_ROWS)) / 2
# Our full screen grid is 28 rows x 33 columns, this leaves a
# margin of 5 on each side of the horizontal and vertical axis
# The 2 top rows will be used to display score and other game data
MAZE_GRID_ROWS = GRID_ROWS - 2
MAZE_GRID_COLUMNS = GRID_COLUMNS
# We need to calculate the start position for the maze level considering
# to exclude the 2 top rows, we going to start from the top left coordinate
# and we will finish at the bottom right coordinate
MAZE_LEVEL_START_X = (-SCREEN_WIDTH / 2) + ROW_MARGIN + CELL_SIZE / 2
MAZE_LEVEL_START_Y = (SCREEN_HEIGHT / 2) - COLUMN_MARGIN - (CELL_SIZE * 5 / 2)
# Pac-Man Parameters
PLAYER_MOVE_SPEED = 5
# Enemy Parameters
ENEMY_NUMBER = 7
ENEMY_MOVE_SPEED = 5
ENEMY_RADAR = CELL_SIZE * 5
