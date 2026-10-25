from random import randint, choice

import pygame
import art
from settings import SCREEN_WIDTH, SCREEN_HEIGHT, LAYERS
from things import Thing


class Sky:
    """The day slowly gets darker, until the farmer sleeps and a new day begins."""

    def __init__(self):
        self.screen = pygame.display.get_surface()
        self.shade = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
        self.color = [255, 255, 255]
        self.night_color = (38, 101, 189)

    def morning(self):
        self.color = [255, 255, 255]

    def draw(self, dt):
        for index in range(3):
            if self.color[index] > self.night_color[index]:
                self.color[index] -= 2 * dt
        # Multiplying the screen by a color darkens it: white keeps it as it is,
        # and the bluer the color, the closer to night.
        self.shade.fill(self.color)
        self.screen.blit(self.shade, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)


class Drop(Thing):
    """A raindrop falling, or a splash on the ground. Lives for less than half a second."""

    def __init__(self, image, pos, falling, groups, z):
        super().__init__(pos, image, groups, z)
        self.lifetime = randint(400, 500)
        self.born = pygame.time.get_ticks()
        self.falling = falling
        if falling:
            self.pos = pygame.math.Vector2(self.rect.topleft)
            self.direction = pygame.math.Vector2(-2, 4)
            self.speed = randint(200, 250)

    def update(self, dt):
        if self.falling:
            self.pos += self.direction * self.speed * dt
            self.rect.topleft = (round(self.pos.x), round(self.pos.y))
        if pygame.time.get_ticks() - self.born >= self.lifetime:
            self.kill()


class Rain:
    """Every frame of a rainy day, one splash and one drop appear somewhere on the map."""

    def __init__(self, all_sprites, map_size):
        self.all_sprites = all_sprites
        self.drops = art.frames('chuva/gotas')
        self.splashes = art.frames('chuva/respingos')
        self.width, self.height = map_size

    def update(self):
        self.add(self.splashes, False, LAYERS['rain floor'])
        self.add(self.drops, True, LAYERS['rain drops'])

    def add(self, images, falling, z):
        image = choice(images)
        pos = (randint(0, self.width), randint(0, self.height))
        Drop(image, pos, falling, self.all_sprites, z)
