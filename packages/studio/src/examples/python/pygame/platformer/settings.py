import pygame
import pinta
from os import walk
from os.path import join

WINDOW_WIDTH, WINDOW_HEIGHT = 1280,720
TILE_SIZE = 64
FRAMERATE = 60
BG_COLOR = '#bfe6df'

# The round (completed in this port: the original had no lives, no end and no score)
PLAYER_LIVES = 3
INVULNERABLE_TIME = 1500
TEXT_COLOR = '#fff7e6'
PANEL_COLOR = '#2b1d2a'
PANEL_BORDER = '#9bd75c'
