import pygame
from settings import LAYERS


class Thing(pygame.sprite.Sprite):
    """Anything placed on the map: a picture, where it is and on which layer it is drawn."""

    def __init__(self, pos, image, groups, z=LAYERS['main']):
        super().__init__(groups)
        self.image = image
        self.rect = self.image.get_rect(topleft=pos)
        self.z = z
        # The farmer only bumps into a thin band across the middle of a thing, so he can
        # walk a little in front of it and a little behind it, as if the map had depth.
        self.hitbox = self.rect.copy().inflate(-self.rect.width * 0.2, -self.rect.height * 0.75)


class Decoration(Thing):
    """A sunflower, bush or mushroom: the band you bump into is even thinner."""

    def __init__(self, pos, image, groups):
        super().__init__(pos, image, groups)
        self.hitbox = self.rect.copy().inflate(-20, -self.rect.height * 0.9)


class Water(Thing):
    """One square of the lake, with moving waves."""

    def __init__(self, pos, frames, groups):
        super().__init__(pos, frames[0], groups, LAYERS['water'])
        self.frames = frames
        self.frame_index = 0

    def update(self, dt):
        self.frame_index += 5 * dt
        if self.frame_index >= len(self.frames):
            self.frame_index = 0
        self.image = self.frames[int(self.frame_index)]


class Flash(Thing):
    """A white silhouette that blinks for a moment where something was picked or fell."""

    def __init__(self, pos, image, groups, z, duration=200):
        super().__init__(pos, image, groups, z)
        self.born = pygame.time.get_ticks()
        self.duration = duration
        # The mask turns every painted pixel white and every empty pixel black;
        # the black is then made transparent.
        self.image = pygame.mask.from_surface(image).to_surface()
        self.image.set_colorkey((0, 0, 0))

    def update(self, dt):
        if pygame.time.get_ticks() - self.born > self.duration:
            self.kill()
