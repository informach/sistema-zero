import pygame
import pinta
from os.path import join

WINDOW_WIDTH, WINDOW_HEIGHT = 1280,720
TILE_SIZE = 64

# The hunter's life: each monster that touches him takes ENEMY_DAMAGE, and after a hit he
# blinks and cannot be hurt again for INVULNERABLE_DURATION milliseconds.
PLAYER_HEALTH = 100
ENEMY_DAMAGE = 10
INVULNERABLE_DURATION = 1000

COLORS = {
    'text': '#fff3d6',
    'shade': '#1b1426',
    'health': '#e2344c',
    'health back': '#4a2030',
    'gold': '#e5b544',
}
