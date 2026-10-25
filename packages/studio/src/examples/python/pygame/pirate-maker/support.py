import pygame
import pinta
from settings import *

# The palm trees, the clouds and the cursors share one frame size per Pinta drawing (the biggest):
# each animation is cut back to its painted area, the size each picture has in the game.
TRIMMED = ('palmeira', 'palmeira-fundo', 'nuvem', 'cursor')

drawings = {}

def import_folder(name, animation, mirrored = False):
    if name not in drawings:
        drawings[name] = pinta.carregar_sprite(name)
    surface_list = drawings[name].animacao(animation, virar_x = mirrored)

    if name in TRIMMED:
        area = surface_list[0].get_bounding_rect()
        for surf in surface_list:
            area.union_ip(surf.get_bounding_rect())
        surface_list = [surf.subsurface(area) for surf in surface_list]
    return surface_list

def import_image(name, animation, index = 0):
    return import_folder(name, animation)[index]

def import_folder_dict(name):
    surface_dict = {}

    tiles = pinta.carregar_pecas(name)
    for index, tile_name in enumerate(TERRAIN_TILES):
        surface_dict[tile_name] = tiles[index]

    return surface_dict

def terrain_style(terrain_string):
    # the tile of a terrain cell, from the names of its neighbors with terrain
    style = ''
    for name in terrain_string:
        if name in CORNER_SIDES:
            # a corner only counts when both sides next to it have terrain
            first, second = CORNER_SIDES[name]
            if first in terrain_string and second in terrain_string:
                style += name
        else:
            style += name
    return style if style else 'X'
