from os.path import join
from random import randint

import pygame
import pinta
import art
from settings import SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE, LAYERS
from things import Thing, Decoration, Water
from tree import Tree
from field import Field
from farmer import Farmer
from weather import Sky, Rain
from hud import Hud, SleepFade
from shop import Shop


class Camera(pygame.sprite.Group):
    """All the sprites of the map, drawn around the farmer, layer by layer."""

    def __init__(self):
        super().__init__()
        self.screen = pygame.display.get_surface()
        self.offset = pygame.math.Vector2()
        self.ground_layers = []

    def draw_around(self, farmer):
        self.offset.x = farmer.rect.centerx - SCREEN_WIDTH / 2
        self.offset.y = farmer.rect.centery - SCREEN_HEIGHT / 2

        # Only what the camera sees is drawn. Sorting by height on the screen puts
        # whatever stands lower in front: the farmer passes in front of a tree and behind it.
        view = pygame.Rect(self.offset.x, self.offset.y, SCREEN_WIDTH, SCREEN_HEIGHT)
        visible = [sprite for sprite in self.sprites() if view.colliderect(sprite.rect)]
        visible = sorted(visible, key=lambda sprite: sprite.rect.centery)

        for layer in LAYERS.values():
            if layer == LAYERS['ground']:
                for ground in self.ground_layers:
                    ground.desenhar(self.screen, -self.offset)
            for sprite in visible:
                if sprite.z == layer:
                    self.screen.blit(sprite.image, sprite.rect.topleft - self.offset)


class Farm:
    """The whole game world: builds it from the maps, runs each frame and starts each day."""

    def __init__(self):
        self.screen = pygame.display.get_surface()
        self.all_sprites = Camera()
        self.solid_sprites = pygame.sprite.Group()  # what the farmer bumps into
        self.trees = pygame.sprite.Group()

        farm_map = pinta.carregar_mapa('fazenda')
        house_map = pinta.carregar_mapa('casa-e-objetos')
        self.field = Field(farm_map, self.all_sprites, self.solid_sprites)
        self.build(farm_map, house_map)

        self.hud = Hud(self.farmer)
        self.sleep_fade = SleepFade(self.new_day, self.wake_up)
        self.sky = Sky()
        self.rain = Rain(self.all_sprites, farm_map.tamanho)
        self.raining = self.will_it_rain()
        self.shop = Shop(self.farmer, self.toggle_shop)
        self.shop_open = False

        self.water_sound = self.load_sound('water.wav', 0.2)
        self.axe_sound = self.load_sound('axe.wav')
        self.success_sound = self.load_sound('success.wav', 0.3)
        self.music = self.load_sound('music.ogg')
        self.music.play(loops=-1)

    def will_it_rain(self):
        # 3 of the 11 numbers from 0 to 10 are bigger than 7: it rains on about one day in four.
        return randint(0, 10) > 7

    def load_sound(self, name, volume=1.0):
        sound = pygame.mixer.Sound(join('assets', name))
        sound.set_volume(volume)
        return sound

    def place_tiles(self, layer, groups, z=LAYERS['main']):
        for col, row, image in layer.tiles():
            Thing((col * TILE_SIZE, row * TILE_SIZE), image, groups, z)

    def build(self, farm_map, house_map):
        # The house: floor and low furniture under the farmer, walls and tall furniture
        # sorted with him (he can stand in front of them or behind them).
        self.place_tiles(house_map.camada('Piso da casa'), self.all_sprites, LAYERS['house bottom'])
        self.place_tiles(house_map.camada('Móveis de baixo'), self.all_sprites, LAYERS['house bottom'])
        self.place_tiles(house_map.camada('Paredes'), self.all_sprites)
        self.place_tiles(house_map.camada('Móveis de cima'), self.all_sprites)
        self.place_tiles(farm_map.camada('Cerca'), [self.all_sprites, self.solid_sprites])

        # Water tiles have no transparent pixels: convert() makes them faster to draw.
        waves = []
        for frame in art.frames('agua/ondas'):
            waves.append(frame.convert())
        for col, row, image in farm_map.camada('Água').tiles():
            Water((col * TILE_SIZE, row * TILE_SIZE), waves, self.all_sprites)

        for spot in house_map.camada('Árvores'):
            Tree((spot.x, spot.y), art.image(spot.propriedades['imagem']), spot.nome, self)
        for spot in house_map.camada('Enfeites'):
            Decoration((spot.x, spot.y), art.image(spot.propriedades['imagem']), [self.all_sprites, self.solid_sprites])

        # 'Colisão' is a hidden layer: invisible walls along the edges of the farm.
        self.place_tiles(farm_map.camada('Colisão'), self.solid_sprites)

        places = house_map.camada('Jogador')
        start = places.com_nome('Start')
        self.farmer = Farmer((start.x, start.y), self.all_sprites, self)
        bed = places.com_nome('Bed')
        self.bed = pygame.Rect(bed.x, bed.y, bed.largura, bed.altura)
        trader = places.com_nome('Trader')
        self.trader = pygame.Rect(trader.x, trader.y, trader.largura, trader.altura)

        # The ground is drawn straight from the map layers, under all the sprites;
        # the trees, sunflowers and the trader in 'Objetos' are painted on it.
        for name in ['Chão', 'Grama', 'Enfeites', 'Morros']:
            self.all_sprites.ground_layers.append(farm_map.camada(name))
        for spot in house_map.camada('Objetos'):
            Thing((spot.x, spot.y), art.image(spot.propriedades['imagem']), self.all_sprites, LAYERS['ground'])

    def give(self, item):
        self.farmer.items[item] += 1
        self.success_sound.play()

    def toggle_shop(self):
        self.shop_open = not self.shop_open

    def use_tool(self, tool, target):
        if tool == 'hoe':
            # Soil dug on a rainy day gets wet at once.
            if self.field.dig(target) and self.raining:
                self.field.water_everything()
        if tool == 'axe':
            for tree in self.trees:
                if tree.rect.collidepoint(target):
                    self.axe_sound.play()
                    tree.chop()
        if tool == 'water':
            self.field.water_at(target)
            self.water_sound.play()

    def harvest(self):
        # A ripe plant is picked as soon as the farmer touches it.
        for plant in self.field.plants:
            if plant.ripe and plant.rect.colliderect(self.farmer.hitbox):
                self.give(plant.kind)
                self.field.pick(plant)

    def new_day(self):
        # The plants grow with the water they had during the night, and only then
        # the soil dries. The weather of the new day decides if the rain waters it again.
        self.field.grow_plants()
        self.field.dry_out()
        self.raining = self.will_it_rain()
        if self.raining:
            self.field.water_everything()
        for tree in self.trees:
            tree.regrow_apples()
        self.sky.morning()

    def wake_up(self):
        self.farmer.sleeping = False

    def run(self, dt):
        self.screen.fill('black')
        self.all_sprites.draw_around(self.farmer)

        # The shop pauses the world: nothing moves while it is open.
        if self.shop_open:
            self.shop.update()
        else:
            self.all_sprites.update(dt)
            self.harvest()

        self.hud.draw()
        if self.raining and not self.shop_open:
            self.rain.update()
        self.sky.draw(dt)
        if self.farmer.sleeping:
            self.sleep_fade.draw()
