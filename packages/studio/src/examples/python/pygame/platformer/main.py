from settings import *
from sprites import *
from groups import AllSprites
from support import *
from timer import Timer
from random import randint

class Game:
    def __init__(self):
        pygame.init()
        self.display_surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption('Platformer')
        self.clock = pygame.time.Clock()
        self.running = True

        # the round: start screen, playing, victory and game over
        self.state = 'start'
        self.lives = PLAYER_LIVES
        self.score = 0

        # groups
        self.all_sprites = AllSprites()
        self.collision_sprites = pygame.sprite.Group()
        self.bullet_sprites = pygame.sprite.Group()
        self.enemy_sprites = pygame.sprite.Group()

        # load game
        self.load_assets()
        self.setup()

        # timers
        self.bee_timer = Timer(100, func = self.create_bee, autostart = True, repeat = True)

        # The music was switched off in the original; here it plays from the start.
        self.audio['music'].play(loops = -1)

    def create_bee(self):
        Bee(frames = self.bee_frames,
            pos = ((self.level_width + WINDOW_WIDTH),(randint(0,self.level_height))),
            groups = (self.all_sprites, self.enemy_sprites),
            speed = randint(300,500))

    def create_bullet(self, pos, direction):
        x = pos[0] + direction * 34 if direction == 1 else pos[0] + direction * 34 - self.bullet_surf.get_width()
        Bullet(self.bullet_surf, (x, pos[1]), direction, (self.all_sprites, self.bullet_sprites))
        Fire(self.fire_surf, pos, self.all_sprites, self.player)
        self.audio['shoot'].play()

    def load_assets(self):
        # graphics: the drawings made in Pinta
        self.player_frames = pinta.carregar_sprite('jogador').animacoes()
        self.bullet_surf = pinta.carregar_sprite('tiro').quadro('voar')
        self.fire_surf = pinta.carregar_sprite('clarao').quadro('brilhar')
        self.bee_frames = pinta.carregar_sprite('abelha').animacao('voar')
        self.worm_frames = pinta.carregar_sprite('minhoca').animacao('rastejar')
        self.flag_frames = pinta.carregar_sprite('bandeira').animacao('tremular')
        hearts = pinta.carregar_sprite('coracao')
        self.heart_full = hearts.quadro('cheio')
        self.heart_empty = hearts.quadro('vazio')

        # text
        self.title_font = pinta.fonte('bungee', 60)
        self.font = pinta.fonte('bungee', 26)
        self.small_font = pinta.fonte('nunito', 28)

        # sounds
        self.audio = audio_importer('assets')
        self.audio['music'].set_volume(0.4)

    def setup(self):
        tmx_map = pinta.carregar_mapa('mundo')
        self.level_width = tmx_map.colunas * TILE_SIZE
        self.level_height = tmx_map.linhas * TILE_SIZE

        for x, y, image in tmx_map.camada('Main').tiles():
            Sprite((x * TILE_SIZE,y * TILE_SIZE), image, (self.all_sprites, self.collision_sprites))

        for x, y, image in tmx_map.camada('Decoration').tiles():
            Sprite((x * TILE_SIZE,y * TILE_SIZE), image, self.all_sprites)

        for obj in tmx_map.camada('Entities'):
            if obj.name == 'Player':
                self.player = Player((obj.x, obj.y), self.all_sprites, self.collision_sprites, self.player_frames, self.create_bullet)
                self.start_pos = (obj.x, obj.y)
            if obj.name == 'Worm':
                Worm(self.worm_frames, pygame.FRect(obj.x, obj.y, obj.width, obj.height), (self.all_sprites, self.enemy_sprites))
            if obj.name == 'Flag':
                self.flag = Flag(self.flag_frames, pygame.FRect(obj.x, obj.y, obj.width, obj.height), self.all_sprites)

    def mask_collide(self, sprite, group):
        # The rects first, then the masks: the same answer as collide_mask alone, without
        # building a mask for every bee in the sky on every frame.
        return [other for other in pygame.sprite.spritecollide(sprite, group, False) if pygame.sprite.collide_mask(sprite, other)]

    def collision(self):
        # bullets -> enemies
        for bullet in self.bullet_sprites:
            sprite_collision = self.mask_collide(bullet, self.enemy_sprites)
            if sprite_collision:
                self.audio['impact'].play()
                bullet.kill()
                for sprite in sprite_collision:
                    if not sprite.death_timer:
                        self.score += 1
                    sprite.destroy()

        # enemies -> player (switched off in the original)
        if not self.player.hurt_timer:
            for enemy in self.mask_collide(self.player, self.enemy_sprites):
                if not enemy.death_timer and not self.player.hurt_timer:
                    self.hit_player()

        # falling below the level
        if self.player.rect.top > self.level_height:
            self.player.rect.topleft = self.start_pos
            self.player.direction.y = 0
            self.hit_player()

        # the flag at the end of the level
        if self.state == 'playing' and self.player.rect.colliderect(self.flag.rect):
            self.end_round('won', 'victory')

    def hit_player(self):
        if self.state != 'playing':
            return
        self.lives -= 1
        self.audio['damage'].play()
        self.player.hurt()
        if self.lives <= 0:
            self.end_round('game_over', 'game_over')

    def end_round(self, state, sound):
        self.state = state
        self.audio[sound].play()
        # the explorer waits for the next round fully visible (no more blinking)
        self.player.hurt_timer.deactivate()
        self.player.image.set_alpha(255)

    def reset(self):
        for sprite in self.all_sprites:
            sprite.kill()
        self.lives = PLAYER_LIVES
        self.score = 0
        self.setup()
        self.state = 'playing'

    def display_hud(self):
        for index in range(PLAYER_LIVES):
            heart = self.heart_full if index < self.lives else self.heart_empty
            self.display_surface.blit(heart, (24 + index * 40, 18))

        score_surf = self.font.render(f'Inimigos: {self.score}', True, TEXT_COLOR)
        score_rect = score_surf.get_frect(topright = (WINDOW_WIDTH - 24, 18))
        self.display_surface.blit(self.font.render(f'Inimigos: {self.score}', True, PANEL_COLOR), score_rect.move(3, 3))
        self.display_surface.blit(score_surf, score_rect)

    def display_message(self):
        if self.state == 'start':
            lines = ('Platformer', 'Chegue à bandeira lá no alto, à direita!', 'Setas: andar    Espaço: pular    S: atirar', 'Aperte Enter para começar')
        elif self.state == 'won':
            lines = ('Você chegou!', f'Inimigos derrotados: {self.score}', f'Corações que sobraram: {self.lives}', 'Aperte Enter para jogar de novo')
        else:
            lines = ('Fim de jogo', f'Inimigos derrotados: {self.score}', 'Os três corações acabaram.', 'Aperte Enter para tentar de novo')

        # the panel sits below the explorer, who stays in the middle of the screen
        panel = pygame.FRect(0, 0, 820, 290)
        panel.midtop = (WINDOW_WIDTH / 2, 410)
        pygame.draw.rect(self.display_surface, PANEL_COLOR, panel, 0, 28)
        pygame.draw.rect(self.display_surface, PANEL_BORDER, panel, 6, 28)

        title_surf = self.title_font.render(lines[0], True, PANEL_BORDER)
        self.display_surface.blit(title_surf, title_surf.get_frect(center = (panel.centerx, panel.top + 58)))
        for index in range(1, len(lines)):
            text_surf = self.small_font.render(lines[index], True, TEXT_COLOR)
            self.display_surface.blit(text_surf, text_surf.get_frect(center = (panel.centerx, panel.top + 80 + index * 46)))

    def run(self):
        while self.running:
            dt = self.clock.tick(FRAMERATE) / 1000

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
                    if self.state == 'start':
                        self.state = 'playing'
                    elif self.state != 'playing':
                        self.reset()

            # update
            self.bee_timer.update()
            if self.state == 'playing':
                self.all_sprites.update(dt)
                self.collision()
            else:
                # outside a round the world keeps moving, but the explorer waits
                for sprite in self.all_sprites:
                    if sprite != self.player:
                        sprite.update(dt)

            # draw
            self.display_surface.fill(BG_COLOR)
            self.all_sprites.draw(self.player.rect.center)
            self.display_hud()
            if self.state != 'playing':
                self.display_message()
            pygame.display.update()

        pygame.quit()

if __name__ == '__main__':
    game = Game()
    game.run()
