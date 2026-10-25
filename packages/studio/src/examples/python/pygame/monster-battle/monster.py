from settings import *
from random import sample

class Creature:
    def get_data(self, name):
        self.element = MONSTER_DATA[name]['element']
        self._health = self.max_health = MONSTER_DATA[name]['health']
        self.abilities = sample(list(ABILITIES_DATA.keys()),4)
        self.name = name

    def animate(self, dt):
        self.frame_index += ANIMATION_SPEED * dt
        self.image = self.frames[int(self.frame_index) % len(self.frames)]

    @property
    def health(self):
        return self._health

    @health.setter
    def health(self, value):
        self._health = min(self.max_health, max(0, value))

class Monster(pygame.sprite.Sprite, Creature):
    def __init__(self, name, frames):
        super().__init__()
        self.frames, self.frame_index = frames, 0
        self.image = self.frames[self.frame_index]
        self.rect = self.image.get_frect(bottomleft = (100, WINDOW_HEIGHT))
        self.get_data(name)

    def update(self, dt):
        self.animate(dt)

    def __repr__(self):
        return f'{self.name}: {self.health}/{self.max_health}'

class Opponent(pygame.sprite.Sprite, Creature):
    def __init__(self, name, frames, groups):
        super().__init__(groups)
        self.frames, self.frame_index = frames, 0
        self.image = self.frames[self.frame_index]
        self.rect = self.image.get_frect(midbottom = (WINDOW_WIDTH - 250, 300))
        self.get_data(name)

    def update(self, dt):
        self.animate(dt)
