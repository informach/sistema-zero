from settings import *

class Player(pygame.sprite.Sprite):
    def __init__(self, pos, groups, collision_sprites):
        super().__init__(groups)
        self.load_images()
        self.state, self.frame_index = 'right', 0
        self.image = self.frames['down'][0]
        self.mask = self.masks['down'][0]
        self.rect = self.image.get_frect(center = pos)
        self.hitbox_rect = self.rect.inflate(-60, -90)

        # movement
        self.direction = pygame.Vector2()
        self.speed = 500
        self.collision_sprites = collision_sprites

        # health
        self.health = PLAYER_HEALTH
        self.vulnerable = True
        self.hurt_time = 0

    def load_images(self):
        hero = pinta.carregar_sprite('heroi')
        self.frames = {'left': hero.animacao('esquerda'), 'right': hero.animacao('direita'),
                       'up': hero.animacao('cima'), 'down': hero.animacao('baixo')}

        # One mask per frame (for collide_mask) and a reddish copy, for the blink after a hit.
        self.masks = {}
        self.hurt_frames = {}
        for state in self.frames.keys():
            self.masks[state] = [pygame.mask.from_surface(surf) for surf in self.frames[state]]
            self.hurt_frames[state] = []
            for surf in self.frames[state]:
                hurt_surf = surf.copy()
                hurt_surf.fill((255, 110, 110), special_flags = pygame.BLEND_RGB_MULT)
                self.hurt_frames[state].append(hurt_surf)

    def input(self):
        keys = pygame.key.get_pressed()
        self.direction.x = int(keys[pygame.K_RIGHT] or keys[pygame.K_d]) - int(keys[pygame.K_LEFT] or keys[pygame.K_a])
        self.direction.y = int(keys[pygame.K_DOWN] or keys[pygame.K_s]) - int(keys[pygame.K_UP] or keys[pygame.K_w])
        self.direction = self.direction.normalize() if self.direction else self.direction

    def move(self, dt):
        self.hitbox_rect.x += self.direction.x * self.speed * dt
        self.collision('horizontal')
        self.hitbox_rect.y += self.direction.y * self.speed * dt
        self.collision('vertical')
        self.rect.center = self.hitbox_rect.center

    def collision(self, direction):
        for sprite in self.collision_sprites:
            if sprite.rect.colliderect(self.hitbox_rect):
                if direction == 'horizontal':
                    if self.direction.x > 0: self.hitbox_rect.right = sprite.rect.left
                    if self.direction.x < 0: self.hitbox_rect.left = sprite.rect.right
                else:
                    if self.direction.y < 0: self.hitbox_rect.top = sprite.rect.bottom
                    if self.direction.y > 0: self.hitbox_rect.bottom = sprite.rect.top

    def damage(self, amount):
        # Returns True when the hit counts (the hunter was not blinking).
        if not self.vulnerable:
            return False
        self.health = max(0, self.health - amount)
        self.vulnerable = False
        self.hurt_time = pygame.time.get_ticks()
        return True

    def hurt_timer(self):
        if not self.vulnerable:
            if pygame.time.get_ticks() - self.hurt_time >= INVULNERABLE_DURATION:
                self.vulnerable = True

    def animate(self, dt):
        # get state
        if self.direction.x != 0:
            self.state = 'right' if self.direction.x > 0 else 'left'
        if self.direction.y != 0:
            self.state = 'down' if self.direction.y > 0 else 'up'

        # animate
        self.frame_index = self.frame_index + 5 * dt if self.direction else 0
        blink = not self.vulnerable and (pygame.time.get_ticks() // 100) % 2 == 0
        frames = self.hurt_frames[self.state] if blink else self.frames[self.state]
        self.image = frames[int(self.frame_index) % len(frames)]
        self.mask = self.masks[self.state][int(self.frame_index) % len(frames)]

    def update(self, dt):
        self.input()
        self.move(dt)
        self.hurt_timer()
        self.animate(dt)
