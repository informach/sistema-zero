import pygame
import pinta
from os.path import join

from random import randint, uniform, choice

class Player(pygame.sprite.Sprite):
    def __init__(self, groups):
        super().__init__(groups)
        self.frames = ship.animacao('voar')
        self.frame_index = 0
        self.image = self.frames[0]
        self.rect = self.image.get_frect(center = (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2))
        self.direction = pygame.Vector2()
        self.speed = 300

        # cooldown
        self.can_shoot = True
        self.laser_shoot_time = 0
        self.cooldown_duration = 400

        # mask
        self.mask = pygame.mask.from_surface(self.image)

    def laser_timer(self):
        if not self.can_shoot:
            current_time = pygame.time.get_ticks()
            if current_time - self.laser_shoot_time >= self.cooldown_duration:
                self.can_shoot = True

    def animate(self, dt):
        self.frame_index += ship.fps('voar') * dt
        self.image = self.frames[int(self.frame_index) % len(self.frames)]

    def update(self, dt):
        keys = pygame.key.get_pressed()
        self.direction.x = int(keys[pygame.K_RIGHT]) - int(keys[pygame.K_LEFT])
        self.direction.y = int(keys[pygame.K_DOWN]) - int(keys[pygame.K_UP])
        self.direction = self.direction.normalize() if self.direction else self.direction
        self.rect.center += self.direction * self.speed * dt
        # The ship stays on the screen.
        self.rect.clamp_ip(display_surface.get_frect())

        recent_keys = pygame.key.get_just_pressed()
        if recent_keys[pygame.K_SPACE] and self.can_shoot:
            Laser(laser_surf, self.rect.midtop, (all_sprites, laser_sprites))
            self.can_shoot = False
            self.laser_shoot_time = pygame.time.get_ticks()
            laser_sound.play()

        self.laser_timer()
        self.animate(dt)

class Star(pygame.sprite.Sprite):
    def __init__(self, groups, frames):
        super().__init__(groups)
        self.frames = frames
        self.frame_index = uniform(0, len(frames))
        self.image = self.frames[int(self.frame_index)]
        self.rect = self.image.get_frect(center = (randint(0, WINDOW_WIDTH),randint(0, WINDOW_HEIGHT)))

    def update(self, dt):
        self.frame_index += star_sprite.fps('piscar') * dt
        self.image = self.frames[int(self.frame_index) % len(self.frames)]

class Laser(pygame.sprite.Sprite):
    def __init__(self, surf, pos, groups):
        super().__init__(groups)
        self.image = surf
        self.rect = self.image.get_frect(midbottom = pos)

    def update(self, dt):
        self.rect.centery -= 400 * dt
        if self.rect.bottom < 0:
            self.kill()

class Meteor(pygame.sprite.Sprite):
    def __init__(self, surf, pos, groups):
        super().__init__(groups)
        self.original_surf = surf
        self.image = surf
        self.rect = self.image.get_frect(center = pos)
        self.start_time = pygame.time.get_ticks()
        self.lifetime = 3000
        self.direction = pygame.Vector2(uniform(-0.5, 0.5),1)
        self.speed = randint(400,500)
        self.rotation_speed = randint(40,80)
        self.rotation = 0

    def update(self, dt):
        self.rect.center += self.direction * self.speed * dt
        if pygame.time.get_ticks() - self.start_time >= self.lifetime:
            self.kill()
        self.rotation += self.rotation_speed * dt
        self.image = pygame.transform.rotozoom(self.original_surf, self.rotation, 1)
        self.rect = self.image.get_frect(center = self.rect.center)

class AnimatedExplosion(pygame.sprite.Sprite):
    def __init__(self, frames, pos, groups):
        super().__init__(groups)
        self.frames = frames
        self.frame_index = 0
        self.image = self.frames[self.frame_index]
        self.rect = self.image.get_frect(center = pos)
        explosion_sound.play()

    def update(self, dt):
        self.frame_index += 20 * dt
        if self.frame_index < len(self.frames):
            self.image = self.frames[int(self.frame_index)]
        else:
            self.kill()

def collisions():
    global game_over, best_score

    collision_sprites = pygame.sprite.spritecollide(player, meteor_sprites, True, pygame.sprite.collide_mask)
    if collision_sprites:
        # The game ends here; the window stays open for another round.
        game_over = True
        best_score = max(best_score, current_score())
        damage_sound.play()
        AnimatedExplosion(explosion_frames, player.rect.center, all_sprites)
        player.kill()

    for laser in laser_sprites:
        collided_sprites = pygame.sprite.spritecollide(laser, meteor_sprites, True)
        if collided_sprites:
            laser.kill()
            AnimatedExplosion(explosion_frames, laser.rect.midtop, all_sprites)

def current_score():
    return (pygame.time.get_ticks() - start_time) // 100

def display_score():
    score = final_score if game_over else current_score()
    text_surf = font.render(str(score), True, (240,240,240))
    text_rect = text_surf.get_frect(midbottom = (WINDOW_WIDTH / 2,WINDOW_HEIGHT - 50))
    display_surface.blit(text_surf, text_rect)
    pygame.draw.rect(display_surface, (240,240,240), text_rect.inflate(20,10).move(0,-8), 5, 10)

def display_game_over():
    title_surf = font.render('Fim de jogo', True, (240,240,240))
    best_surf = small_font.render(f'Recorde: {best_score}', True, (240,240,240))
    hint_surf = small_font.render('Aperte Enter para jogar de novo', True, (200,190,210))
    display_surface.blit(title_surf, title_surf.get_frect(center = (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 - 60)))
    display_surface.blit(best_surf, best_surf.get_frect(center = (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2)))
    display_surface.blit(hint_surf, hint_surf.get_frect(center = (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + 50)))

def reset_game():
    global player, game_over, start_time
    for sprite in (*meteor_sprites, *laser_sprites):
        sprite.kill()
    player = Player(all_sprites)
    game_over = False
    start_time = pygame.time.get_ticks()

# general setup
pygame.init()
WINDOW_WIDTH, WINDOW_HEIGHT = 1280, 720
display_surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption('Space shooter')
running = True
clock = pygame.time.Clock()

# import
ship = pinta.carregar_sprite('nave')
star_sprite = pinta.carregar_sprite('estrela')
meteor_surfs = pinta.carregar_sprite('meteoro').animacao('pedras')
laser_frame = pinta.carregar_sprite('laser').quadro('brilhar')
# The beam is narrower than the smallest Pinta frame: the shot is just its painted part.
laser_surf = laser_frame.subsurface(laser_frame.get_bounding_rect())
font = pinta.fonte('bungee', 40)
small_font = pinta.fonte('bungee', 24)
explosion_frames = pinta.carregar_sprite('explosao').animacao('explodir')

laser_sound = pygame.mixer.Sound(join('assets', 'laser.wav'))
laser_sound.set_volume(0.5)
explosion_sound = pygame.mixer.Sound(join('assets', 'explosion.wav'))
damage_sound = pygame.mixer.Sound(join('assets', 'damage.wav'))
game_music = pygame.mixer.Sound(join('assets', 'game_music.ogg'))
game_music.set_volume(0.4)
game_music.play(loops= -1)


# sprites
all_sprites = pygame.sprite.Group()
meteor_sprites = pygame.sprite.Group()
laser_sprites = pygame.sprite.Group()
for i in range(20):
    Star(all_sprites, star_sprite.animacao('piscar'))
player = Player(all_sprites)
game_over = False
start_time = 0
best_score = 0
final_score = 0

# custom events -> meteor event
meteor_event = pygame.event.custom_type()
pygame.time.set_timer(meteor_event, 200)

while running:
    dt = clock.tick() / 1000
    # event loop
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == meteor_event and not game_over:
            x, y = randint(0, WINDOW_WIDTH), randint(-200, -100)
            Meteor(choice(meteor_surfs), (x, y), (all_sprites, meteor_sprites))
        if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN and game_over:
            reset_game()
    # update
    all_sprites.update(dt)
    if not game_over:
        collisions()
        final_score = current_score()

    # draw the game
    display_surface.fill('#3a2e3f')
    display_score()
    all_sprites.draw(display_surface)
    if game_over:
        display_game_over()

    pygame.display.update()

pygame.quit()
