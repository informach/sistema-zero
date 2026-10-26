from settings import *
from timer import Timer
from math import sin
from random import randint

class Sprite(pygame.sprite.Sprite):
    def __init__(self, pos, surf, groups):
        super().__init__(groups)
        self.image = surf
        self.rect = self.image.get_frect(topleft = pos)

class Bullet(Sprite):
    def __init__(self, surf, pos, direction, groups):
        super().__init__(pos, surf, groups)

        # adjustment
        self.image = pygame.transform.flip(self.image, direction == -1, False)

        # movement
        self.direction = direction
        self.speed = 850

        # The shot fades after flying far away (in the original it flew forever).
        self.life_timer = Timer(2000, func = self.kill, autostart = True)

    def update(self, dt):
        self.life_timer.update()
        self.rect.x += self.direction * self.speed * dt

class Fire(Sprite):
    def __init__(self, surf, pos, groups, player):
        super().__init__(pos, surf, groups)
        self.player = player
        self.flip = player.flip
        self.timer = Timer(100, autostart = True, func = self.kill)
        self.y_offset = pygame.Vector2(0,8)
        if self.player.flip:
            self.rect.midright = self.player.rect.midleft + self.y_offset
            self.image = pygame.transform.flip(self.image, True, False)
        else:
            self.rect.midleft = self.player.rect.midright + self.y_offset

    def update(self, _):
        self.timer.update()

        if self.player.flip:
            self.rect.midright = self.player.rect.midleft + self.y_offset
        else:
            self.rect.midleft = self.player.rect.midright + self.y_offset

        if self.flip != self.player.flip:
            self.kill()

class AnimatedSprite(Sprite):
    def __init__(self, frames, pos, groups):
        self.frames, self.frame_index, self.animation_speed = frames, 0, 10
        super().__init__(pos, self.frames[self.frame_index], groups)

    def animate(self, dt):
        self.frame_index += self.animation_speed * dt
        self.image = self.frames[int(self.frame_index) % len(self.frames)]

class Enemy(AnimatedSprite):
    def __init__(self, frames, pos, groups):
        super().__init__(frames, pos, groups)
        self.death_timer = Timer(200, func = self.kill)

    def destroy(self):
        self.death_timer.activate()
        self.animation_speed = 0
        self.image = pygame.mask.from_surface(self.image).to_surface()
        self.image.set_colorkey('black')

    def update(self, dt):
        self.death_timer.update()
        if not self.death_timer:
            self.move(dt)
            self.animate(dt)
        self.constraint()

class Bee(Enemy):
    def __init__(self, frames, pos, groups, speed):
        super().__init__(frames, pos, groups)
        self.speed = speed
        self.amplitude = randint(500,600)
        self.frequency = randint(300,600)

    def move(self, dt):
        self.rect.x -= self.speed * dt
        self.rect.y += sin(pygame.time.get_ticks() / self.frequency) * self.amplitude * dt

    def constraint(self):
        if self.rect.right <= 0:
            self.kill()

class Worm(Enemy):
    def __init__(self, frames, rect, groups):
        super().__init__(frames, rect.topleft, groups)
        self.rect.bottomleft = rect.bottomleft
        self.main_rect = rect
        self.speed = randint(160,200)
        self.direction = 1

    def move(self, dt):
        self.rect.x += self.direction * self.speed * dt

    def constraint(self):
        if not self.main_rect.contains(self.rect):
            self.direction *= -1
            self.frames = [pygame.transform.flip(surf, True, False) for surf in self.frames]

class Flag(AnimatedSprite):
    """The finish flag at the end of the level (added in this port)."""
    def __init__(self, frames, rect, groups):
        super().__init__(frames, rect.topleft, groups)
        self.rect.midbottom = rect.midbottom
        self.animation_speed = 8

    def update(self, dt):
        self.animate(dt)

class Player(AnimatedSprite):
    def __init__(self, pos, groups, collision_sprites, frames, create_bullet):
        # frames: every animation of the Pinta drawing (parado, correr, pular, ferido)
        self.animations = frames
        super().__init__(frames['parado'], pos, groups)
        self.flip = False
        self.create_bullet = create_bullet

        # movement & collision
        self.direction = pygame.Vector2()
        self.collision_sprites = collision_sprites
        self.speed = 400
        self.gravity = 50
        self.on_floor = False

        # timer
        self.shoot_timer = Timer(500)
        self.hurt_timer = Timer(INVULNERABLE_TIME)

    def input(self):
        keys = pygame.key.get_pressed()
        self.direction.x = int(keys[pygame.K_RIGHT]) - int(keys[pygame.K_LEFT])
        if keys[pygame.K_SPACE] and self.on_floor:
            self.direction.y = -20

        if keys[pygame.K_s] and not self.shoot_timer:
            self.create_bullet(self.rect.center, -1 if self.flip else 1)
            self.shoot_timer.activate()

    def move(self, dt):
        # horizontal
        self.rect.x += self.direction.x * self.speed * dt
        self.collision('horizontal')

        # vertical
        self.direction.y += self.gravity * dt
        self.rect.y += self.direction.y
        self.collision('vertical')

    def collision(self, direction):
        for sprite in self.collision_sprites:
            if sprite.rect.colliderect(self.rect):
                if direction == 'horizontal':
                    if self.direction.x > 0: self.rect.right = sprite.rect.left
                    if self.direction.x < 0: self.rect.left = sprite.rect.right
                if direction == 'vertical':
                    if self.direction.y > 0: self.rect.bottom = sprite.rect.top
                    if self.direction.y < 0: self.rect.top = sprite.rect.bottom
                    self.direction.y = 0

    def check_floor(self):
        bottom_rect = pygame.FRect((0,0), (self.rect.width, 2)).move_to(midtop = self.rect.midbottom)
        self.on_floor = True if bottom_rect.collidelist([sprite.rect for sprite in self.collision_sprites]) >= 0 else False

    def hurt(self):
        # A hit: a little hop and a moment without getting hurt again.
        self.hurt_timer.activate()
        self.direction.y = -10

    def animate(self, dt):
        if self.direction.x:
            self.frames = self.animations['correr']
            self.frame_index += self.animation_speed * dt
            self.flip = self.direction.x < 0
        else:
            # standing still: breathing, at half the speed of the run
            self.frames = self.animations['parado']
            self.frame_index += self.animation_speed / 2 * dt

        if not self.on_floor:
            # in the air: one frame going up, another coming down
            self.frames = self.animations['pular']
            self.frame_index = 0 if self.direction.y < 0 else 1
        if self.hurt_timer and pygame.time.get_ticks() - self.hurt_timer.start_time < 300:
            self.frames = self.animations['ferido']

        self.image = self.frames[int(self.frame_index) % len(self.frames)]
        self.image = pygame.transform.flip(self.image, self.flip, False)

        # blinking while nothing can hurt the explorer
        if self.hurt_timer and pygame.time.get_ticks() // 100 % 2:
            self.image.set_alpha(90)

    def update(self, dt):
        self.shoot_timer.update()
        self.hurt_timer.update()
        self.check_floor()
        self.input()
        self.move(dt)
        self.animate(dt)
