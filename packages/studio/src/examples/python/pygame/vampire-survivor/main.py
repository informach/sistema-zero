from settings import *
from player import Player
from sprites import *
from groups import AllSprites

from random import randint, choice

class Game:
    def __init__(self):
        # setup
        pygame.init()
        self.display_surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption('Survivor')
        self.clock = pygame.time.Clock()
        self.running = True

        # groups
        self.all_sprites = AllSprites()
        self.collision_sprites = pygame.sprite.Group()
        self.bullet_sprites = pygame.sprite.Group()
        self.enemy_sprites = pygame.sprite.Group()

        # gun timer
        self.can_shoot = True
        self.shoot_time = 0
        self.gun_cooldown = 100

        # enemy timer
        self.enemy_event = pygame.event.custom_type()
        pygame.time.set_timer(self.enemy_event, 300)
        self.spawn_positions = []

        # audio
        self.shoot_sound = pygame.mixer.Sound(join('assets', 'shoot.wav'))
        self.shoot_sound.set_volume(0.2)
        self.impact_sound = pygame.mixer.Sound(join('assets', 'impact.wav'))
        self.hurt_sound = pygame.mixer.Sound(join('assets', 'hurt.wav'))
        self.game_over_sound = pygame.mixer.Sound(join('assets', 'game_over.wav'))
        self.music = pygame.mixer.Sound(join('assets', 'music.ogg'))
        self.music.set_volume(0.5)
        self.music.play(loops = -1)

        # match: 'start' (title screen), 'playing' or 'game over'
        self.state = 'start'
        self.start_time = 0
        self.survived = 0
        self.best_time = 0
        self.kills = 0
        self.font = pinta.fonte('bungee', 30)
        self.title_font = pinta.fonte('bungee', 84)
        self.small_font = pinta.fonte('bungee', 22)
        self.shade_surf = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
        self.shade_surf.fill((16, 8, 28, 170))

        # setup
        self.load_images()
        self.setup()

    def load_images(self):
        self.bullet_surf = pinta.carregar_sprite('bala').quadro('voar')

        self.enemy_frames = {
            'bat': pinta.carregar_sprite('morcego').animacao('voar'),
            'blob': pinta.carregar_sprite('gosma').animacao('quicar'),
            'skeleton': pinta.carregar_sprite('esqueleto').animacao('andar'),
        }

        # Trees, ruins and rocks: each one cut to its painted area (that is its collision box).
        self.object_frames = {}
        for name in ['arvores', 'pedras-e-ruinas']:
            drawing = pinta.carregar_sprite(name)
            for animation in drawing.nomes:
                surf = drawing.quadro(animation)
                self.object_frames[animation] = surf.subsurface(surf.get_bounding_rect())

        icons = pinta.carregar_sprite('placar')
        self.heart_surf = icons.quadro('coracao')
        self.skull_surf = icons.quadro('caveira')
        self.clock_surf = icons.quadro('relogio')

    def input(self):
        if pygame.mouse.get_pressed()[0] and self.can_shoot:
            self.shoot_sound.play()
            pos = self.gun.rect.center + self.gun.player_direction * 50
            Bullet(self.bullet_surf, pos, self.gun.player_direction, (self.all_sprites, self.bullet_sprites))
            self.can_shoot = False
            self.shoot_time = pygame.time.get_ticks()

    def gun_timer(self):
        if not self.can_shoot:
            current_time = pygame.time.get_ticks()
            if current_time - self.shoot_time >= self.gun_cooldown:
                self.can_shoot = True

    def setup(self):
        map = pinta.carregar_mapa('mundo')

        self.all_sprites.ground = map.camada('Chão')

        for obj in map.camada('Objetos'):
            CollisionSprite((obj.x, obj.y), self.object_frames[obj.name], (self.all_sprites, self.collision_sprites))

        for obj in map.camada('Colisões'):
            CollisionSprite((obj.x, obj.y), pygame.Surface((obj.width, obj.height)), self.collision_sprites)

        for obj in map.camada('Entidades'):
            if obj.name == 'Jogador':
                self.player_start = (obj.x, obj.y)
                self.spawn_player()
            else:
                self.spawn_positions.append((obj.x, obj.y))

    def spawn_player(self):
        self.player = Player(self.player_start, self.all_sprites, self.collision_sprites)
        self.gun = Gun(self.player, self.all_sprites)

    def start_game(self):
        # A new match: the monsters and bullets go away and the hunter comes back.
        if self.state == 'game over':
            for sprite in [*self.enemy_sprites, *self.bullet_sprites]:
                sprite.kill()
            self.player.kill()
            self.gun.kill()
            self.spawn_player()
        self.state = 'playing'
        self.start_time = pygame.time.get_ticks()
        self.kills = 0
        self.can_shoot = True

    def bullet_collision(self):
        if self.bullet_sprites:
            for bullet in self.bullet_sprites:
                collision_sprites = pygame.sprite.spritecollide(bullet, self.enemy_sprites, False)
                collision_sprites = [sprite for sprite in collision_sprites if pygame.sprite.collide_mask(bullet, sprite)]
                if collision_sprites:
                    self.impact_sound.play()
                    for sprite in collision_sprites:
                        if sprite.death_time == 0:
                            self.kills += 1
                        sprite.destroy()
                    bullet.kill()

    def player_collision(self):
        touching = pygame.sprite.spritecollide(self.player, self.enemy_sprites, False)
        touching = [sprite for sprite in touching if sprite.death_time == 0 and pygame.sprite.collide_mask(self.player, sprite)]
        if touching and self.player.damage(ENEMY_DAMAGE):
            if self.player.health > 0:
                self.hurt_sound.play()
            else:
                self.game_over()

    def game_over(self):
        self.state = 'game over'
        self.survived = pygame.time.get_ticks() - self.start_time
        self.best_time = max(self.best_time, self.survived)
        self.game_over_sound.play()
        self.gun.kill()
        print(f'Fim de jogo: {self.format_time(self.survived)}, {self.kills} monstros')

    def format_time(self, milliseconds):
        seconds = milliseconds // 1000
        return f'{seconds // 60}:{seconds % 60:02d}'

    def draw_text(self, text, font, color, pos):
        # Text with a dark shadow, centered on pos.
        shadow_surf = font.render(text, True, COLORS['shade'])
        text_surf = font.render(text, True, color)
        self.display_surface.blit(shadow_surf, shadow_surf.get_frect(center = (pos[0] + 3, pos[1] + 4)))
        self.display_surface.blit(text_surf, text_surf.get_frect(center = pos))

    def display_hud(self):
        # life
        self.display_surface.blit(self.heart_surf, (24, 20))
        bar_rect = pygame.FRect(70, 30, 260, 22)
        pygame.draw.rect(self.display_surface, COLORS['shade'], bar_rect.inflate(8, 8), 0, 8)
        pygame.draw.rect(self.display_surface, COLORS['health back'], bar_rect, 0, 5)
        life_rect = bar_rect.copy()
        life_rect.width = bar_rect.width * self.player.health / PLAYER_HEALTH
        if life_rect.width > 0:
            pygame.draw.rect(self.display_surface, COLORS['health'], life_rect, 0, 5)

        # time and monsters defeated
        elapsed = self.survived if self.state == 'game over' else pygame.time.get_ticks() - self.start_time
        self.display_surface.blit(self.clock_surf, (WINDOW_WIDTH - 210, 18))
        self.draw_text(self.format_time(elapsed), self.font, COLORS['text'], (WINDOW_WIDTH - 100, 42))
        self.display_surface.blit(self.skull_surf, (WINDOW_WIDTH - 210, 70))
        self.draw_text(str(self.kills), self.font, COLORS['text'], (WINDOW_WIDTH - 100, 94))

    def display_start(self):
        self.display_surface.blit(self.shade_surf, (0, 0))
        center = WINDOW_WIDTH / 2
        self.draw_text('Vampire Survivor', self.title_font, COLORS['health'], (center, 190))
        self.draw_text('Os monstros não param de chegar. Aguente o máximo que puder!', self.small_font, COLORS['text'], (center, 300))
        self.draw_text('Setas ou WASD: andar', self.small_font, COLORS['text'], (center, 380))
        self.draw_text('Mouse: mirar     Botão esquerdo: atirar', self.small_font, COLORS['text'], (center, 420))
        if self.best_time:
            self.draw_text(f'Recorde: {self.format_time(self.best_time)}', self.small_font, COLORS['gold'], (center, 480))
        self.draw_text('Aperte Enter para começar', self.font, COLORS['gold'], (center, 570))

    def display_game_over(self):
        self.display_surface.blit(self.shade_surf, (0, 0))
        center = WINDOW_WIDTH / 2
        self.draw_text('Fim de jogo', self.title_font, COLORS['health'], (center, 200))
        self.draw_text(f'Você sobreviveu {self.format_time(self.survived)}', self.font, COLORS['text'], (center, 320))
        self.draw_text(f'Monstros derrotados: {self.kills}', self.font, COLORS['text'], (center, 370))
        self.draw_text(f'Recorde: {self.format_time(self.best_time)}', self.small_font, COLORS['gold'], (center, 430))
        self.draw_text('Aperte Enter para jogar de novo', self.font, COLORS['gold'], (center, 550))

    def run(self):
        while self.running:
            # dt
            dt = self.clock.tick() / 1000

            # event loop
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                if event.type == self.enemy_event and self.state == 'playing':
                    Enemy(choice(self.spawn_positions), choice(list(self.enemy_frames.values())), (self.all_sprites, self.enemy_sprites), self.player, self.collision_sprites)
                if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN and self.state != 'playing':
                    self.start_game()

            # update
            if self.state == 'playing':
                self.gun_timer()
                self.input()
                self.all_sprites.update(dt)
                self.bullet_collision()
                self.player_collision()
            elif self.state == 'game over':
                # The monsters still gather around the fallen hunter.
                self.enemy_sprites.update(dt)
                self.bullet_sprites.update(dt)

            # draw
            self.display_surface.fill('black')
            self.all_sprites.draw(self.player.rect.center)
            if self.state == 'start':
                self.display_start()
            else:
                self.display_hud()
                if self.state == 'game over':
                    self.display_game_over()
            pygame.display.update()

        pygame.quit()

if __name__ == '__main__':
    game = Game()
    game.run()
