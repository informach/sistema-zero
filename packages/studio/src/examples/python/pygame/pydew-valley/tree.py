from random import randint, choice

import pygame
import art
from settings import LAYERS, APPLE_SPOTS, STUMP_DRAWINGS
from things import Thing, Flash


class Tree(Thing):
    """A tree with apples. Each blow of the axe drops an apple; the fifth one fells it."""

    def __init__(self, pos, image, kind, farm):
        super().__init__(pos, image, [farm.all_sprites, farm.solid_sprites, farm.trees])
        self.kind = kind  # 'Small' or 'Large'
        self.farm = farm
        self.health = 5
        self.standing = True
        self.stump = art.image(STUMP_DRAWINGS[kind])
        self.apple = art.image('arvores/maca')
        self.apples = pygame.sprite.Group()
        self.grow_apples()

    def grow_apples(self):
        # Each spot of the tree has a small chance (2 in 11) of getting an apple.
        for x, y in APPLE_SPOTS[self.kind]:
            if randint(0, 10) < 2:
                spot = (self.rect.left + x, self.rect.top + y)
                Thing(spot, self.apple, [self.apples, self.farm.all_sprites], LAYERS['fruit'])

    def regrow_apples(self):
        for apple in self.apples:
            apple.kill()
        self.grow_apples()

    def chop(self):
        # A stump can still be chopped: it only loses the apples that grew on it.
        self.health -= 1
        if len(self.apples) > 0:
            apple = choice(self.apples.sprites())
            Flash(apple.rect.topleft, apple.image, self.farm.all_sprites, LAYERS['fruit'])
            self.farm.give('apple')
            apple.kill()

    def fall(self):
        Flash(self.rect.topleft, self.image, self.farm.all_sprites, LAYERS['fruit'], 300)
        self.image = self.stump
        self.rect = self.image.get_rect(midbottom=self.rect.midbottom)
        self.hitbox = self.rect.copy().inflate(-10, -self.rect.height * 0.6)
        self.standing = False
        self.farm.give('wood')

    def update(self, dt):
        # The tree falls in the frame after the last blow.
        if self.standing and self.health <= 0:
            self.fall()
