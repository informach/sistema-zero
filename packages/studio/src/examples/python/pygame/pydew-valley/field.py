from os.path import join
from random import choice

import pygame
import pinta
import art
from settings import TILE_SIZE, LAYERS, SOIL_PIECES, GROW_SPEED, PLANT_LIFT, PLANT_DRAWINGS
from things import Thing, Flash


class Plant(pygame.sprite.Sprite):
    """Corn or tomato growing on one square of the field."""

    def __init__(self, kind, square, groups):
        super().__init__(groups)
        self.kind = kind
        self.square = square
        self.frames = art.frames(PLANT_DRAWINGS[kind])
        self.age = 0
        self.ripe = False
        col, row = square
        # Where the plant touches the ground: the middle of its square, a little above the bottom.
        self.bottom =(col * TILE_SIZE + TILE_SIZE // 2, (row + 1) * TILE_SIZE - PLANT_LIFT[kind])
        self.image = self.frames[0]
        self.rect = self.image.get_rect(midbottom=self.bottom)
        self.z = LAYERS['ground plant']
        # A seed is flat: the farmer walks over it until it sprouts.
        self.hitbox = None

    def grow(self):
        self.age += GROW_SPEED[self.kind]
        if int(self.age) > 0:
            self.z = LAYERS['main']
            self.hitbox = self.rect.copy().inflate(-26, -self.rect.height * 0.4)
        if self.age >= len(self.frames) - 1:
            self.age = len(self.frames) - 1
            self.ripe = True
        self.image = self.frames[int(self.age)]
        self.rect = self.image.get_rect(midbottom=self.bottom)


class Field:
    """The ground that can be farmed: which squares are dug, wet and planted."""

    def __init__(self, farm_map, all_sprites, solid_sprites):
        self.all_sprites = all_sprites
        self.solid_sprites = solid_sprites
        self.soil_sprites = pygame.sprite.Group()
        self.puddles = pygame.sprite.Group()
        self.plants = pygame.sprite.Group()
        self.soil_pieces = pinta.carregar_pecas('solo')
        self.wet_pieces = list(pinta.carregar_pecas('solo-molhado'))

        # A square is (column, row). The hidden map layer 'Cultivável' marks the good soil.
        self.farmable = set()
        for col, row, piece in farm_map.camada('Cultivável').tiles():
            self.farmable.add((col, row))
        self.dug = set()
        self.planted = set()
        # How many nights of water each wet square still holds. Watering a square twice
        # in a day keeps it wet for two nights: the puddle dries in the morning, but the
        # ground keeps the second watering.
        self.water = {}

        self.hoe_sound = pygame.mixer.Sound(join('assets', 'hoe.wav'))
        self.hoe_sound.set_volume(0.1)
        self.plant_sound = pygame.mixer.Sound(join('assets', 'plant.wav'))
        self.plant_sound.set_volume(0.2)

    def square_at(self, point):
        return (int(point[0]) // TILE_SIZE, int(point[1]) // TILE_SIZE)

    def dig(self, point):
        # The hoe only works on the good soil. Returns True when it dug.
        square = self.square_at(point)
        if square not in self.farmable:
            return False
        self.hoe_sound.play()
        self.dug.add(square)
        self.lay_soil()
        return True

    def lay_soil(self):
        # Each dug square shows the piece that joins it to its dug neighbors, so the
        # pieces are chosen again every time a square is dug.
        for soil in self.soil_sprites:
            soil.kill()
        for col, row in self.dug:
            neighbors = ''
            if (col, row - 1) in self.dug:
                neighbors += 't'
            if (col, row + 1) in self.dug:
                neighbors += 'b'
            if (col - 1, row) in self.dug:
                neighbors += 'l'
            if (col + 1, row) in self.dug:
                neighbors += 'r'
            piece = self.soil_pieces[SOIL_PIECES[neighbors]]
            Thing((col * TILE_SIZE, row * TILE_SIZE), piece, [self.all_sprites, self.soil_sprites], LAYERS['soil'])

    def add_water(self, square):
        self.water[square] = self.water.get(square, 0) + 1
        col, row = square
        puddle = choice(self.wet_pieces)
        Thing((col * TILE_SIZE, row * TILE_SIZE), puddle, [self.all_sprites, self.puddles], LAYERS['soil water'])

    def water_at(self, point):
        square = self.square_at(point)
        if square in self.dug:
            self.add_water(square)

    def water_everything(self):
        # The rain wets every dug square that is still dry, row by row.
        for square in sorted(self.dug, key=lambda square: (square[1], square[0])):
            if square not in self.water:
                self.add_water(square)

    def dry_out(self):
        # Every night uses up one watering of each wet square.
        for puddle in self.puddles:
            puddle.kill()
        self.water = {square: nights - 1 for square, nights in self.water.items() if nights > 1}

    def plant(self, point, seed):
        square = self.square_at(point)
        if square not in self.dug:
            return
        self.plant_sound.play()
        if square not in self.planted:
            self.planted.add(square)
            Plant(seed, square, [self.all_sprites, self.plants, self.solid_sprites])

    def grow_plants(self):
        # Only the plants on wet ground grow during the night.
        for plant in self.plants:
            if plant.square in self.water:
                plant.grow()

    def pick(self, plant):
        plant.kill()
        Flash(plant.rect.topleft, plant.image, self.all_sprites, LAYERS['main'])
        self.planted.remove(plant.square)
