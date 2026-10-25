import pygame
import art
from settings import LAYERS, TOOL_REACH, TOOLS, START_ITEMS, START_SEEDS, START_MONEY
from settings import FARMER_DRAWINGS, SIDE_NAMES
from timer import Timer


class Farmer(pygame.sprite.Sprite):
    """The farmer: walks with the arrows, uses tools and plants seeds."""

    def __init__(self, pos, group, farm):
        super().__init__(group)
        self.farm = farm

        # animations[action][side]: the action is 'walk', 'idle' or a tool,
        # and the side is where the farmer is facing.
        self.animations = {}
        for action in FARMER_DRAWINGS:
            self.animations[action] = {}
            for side in SIDE_NAMES:
                path = FARMER_DRAWINGS[action] + '-' + SIDE_NAMES[side]
                self.animations[action][side] = art.frames(path)
        self.action = 'idle'
        self.facing = 'down'
        self.frame_index = 0
        self.image = self.animations['idle']['down'][0]
        self.rect = self.image.get_rect(center=pos)
        self.z = LAYERS['main']

        # The picture is much bigger than the farmer's body: he bumps into things with
        # a small box around his feet and legs.
        self.hitbox = self.rect.copy().inflate(-126, -70)
        self.pos = pygame.math.Vector2(self.rect.center)
        self.direction = pygame.math.Vector2()
        self.speed = 200
        self.target = self.rect.center + TOOL_REACH[self.facing]

        # The tool hits (and the seed falls) a moment after the key, when the swing ends.
        # Switching waits a little too, or one press would skip over several tools.
        self.timers = {
            'use tool': Timer(350, self.use_tool),
            'switch tool': Timer(200),
            'plant seed': Timer(350, self.plant_seed),
            'switch seed': Timer(200),
        }

        self.tool = TOOLS[0]
        self.items = dict(START_ITEMS)
        self.seeds = dict(START_SEEDS)
        self.seed = list(self.seeds)[0]
        self.money = START_MONEY
        self.sleeping = False

    def update(self, dt):
        # The keys do nothing while a tool is in the air or while the farmer sleeps.
        if not self.timers['use tool'].active and not self.sleeping:
            self.read_keys()
        self.choose_action()
        for timer in self.timers.values():
            timer.update()
        # Where the next blow of the tool (or the next seed) will land.
        self.target = self.rect.center + TOOL_REACH[self.facing]
        self.move(dt)
        self.animate(dt)

    def read_keys(self):
        keys = pygame.key.get_pressed()

        if keys[pygame.K_UP]:
            self.direction.y = -1
            self.walk('up')
        elif keys[pygame.K_DOWN]:
            self.direction.y = 1
            self.walk('down')
        else:
            self.direction.y = 0
        if keys[pygame.K_RIGHT]:
            self.direction.x = 1
            self.walk('right')
        elif keys[pygame.K_LEFT]:
            self.direction.x = -1
            self.walk('left')
        else:
            self.direction.x = 0

        if keys[pygame.K_SPACE]:
            self.start_work('use tool')
        if keys[pygame.K_q] and not self.timers['switch tool'].active:
            self.timers['switch tool'].start()
            self.tool = TOOLS[(TOOLS.index(self.tool) + 1) % len(TOOLS)]
        if keys[pygame.K_LCTRL]:
            self.start_work('plant seed')
        if keys[pygame.K_e] and not self.timers['switch seed'].active:
            self.timers['switch seed'].start()
            seeds = list(self.seeds)
            self.seed = seeds[(seeds.index(self.seed) + 1) % len(seeds)]

        if keys[pygame.K_RETURN]:
            if self.rect.colliderect(self.farm.trader):
                self.farm.toggle_shop()
            elif self.rect.colliderect(self.farm.bed):
                self.go_to_bed()

    def walk(self, side):
        self.facing = side
        self.action = 'walk'

    def start_work(self, timer_name):
        # The farmer stands still while he works.
        self.timers[timer_name].start()
        self.direction = pygame.math.Vector2()
        self.frame_index = 0

    def go_to_bed(self):
        self.facing = 'left'
        self.action = 'idle'
        self.sleeping = True

    def choose_action(self):
        if self.direction.magnitude() == 0:
            self.action = 'idle'
        if self.timers['use tool'].active:
            self.action = self.tool

    def use_tool(self):
        self.farm.use_tool(self.tool, self.target)

    def plant_seed(self):
        # A seed is used up even when it lands outside the dug soil.
        if self.seeds[self.seed] > 0:
            self.farm.field.plant(self.target, self.seed)
            self.seeds[self.seed] -= 1

    def move(self, dt):
        # Moving diagonally is not faster: the direction always has length 1.
        if self.direction.magnitude() > 0:
            self.direction = self.direction.normalize()

        # One axis at a time, so a wall only stops the movement that goes into it.
        self.pos.x += self.direction.x * self.speed * dt
        self.hitbox.centerx = round(self.pos.x)
        self.rect.centerx = self.hitbox.centerx
        self.bump('horizontal')

        self.pos.y += self.direction.y * self.speed * dt
        self.hitbox.centery = round(self.pos.y)
        self.rect.centery = self.hitbox.centery
        self.bump('vertical')

    def bump(self, axis):
        for thing in self.farm.solid_sprites:
            if thing.hitbox is not None and thing.hitbox.colliderect(self.hitbox):
                if axis == 'horizontal':
                    if self.direction.x > 0:
                        self.hitbox.right = thing.hitbox.left
                    if self.direction.x < 0:
                        self.hitbox.left = thing.hitbox.right
                    self.rect.centerx = self.hitbox.centerx
                    self.pos.x = self.hitbox.centerx
                else:
                    if self.direction.y > 0:
                        self.hitbox.bottom = thing.hitbox.top
                    if self.direction.y < 0:
                        self.hitbox.top = thing.hitbox.bottom
                    self.rect.centery = self.hitbox.centery
                    self.pos.y = self.hitbox.centery

    def animate(self, dt):
        frames = self.animations[self.action][self.facing]
        self.frame_index += 4 * dt
        if self.frame_index >= len(frames):
            self.frame_index = 0
        self.image = frames[int(self.frame_index)]
