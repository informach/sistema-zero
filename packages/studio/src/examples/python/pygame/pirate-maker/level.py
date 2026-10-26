import pygame, sys
import pinta
from pygame.math import Vector2 as vector

from settings import *
from support import *
from timer import Timer

from sprites import Generic, Block, Animated, Particle, Coin, Player, Spikes, Tooth, Shell, Cloud

from random import choice, randint

class Level:
    def __init__(self, grid, switch, asset_dict, audio):
        self.display_surface = pygame.display.get_surface()
        self.switch = switch

        # groups
        self.all_sprites = CameraGroup()
        self.coin_sprites = pygame.sprite.Group()
        self.damage_sprites = pygame.sprite.Group()
        self.collision_sprites = pygame.sprite.Group()
        self.shell_sprites = pygame.sprite.Group()

        self.build_level(grid, asset_dict, audio['jump'])

        # level limits
        self.level_limits = {
        'left': -WINDOW_WIDTH,
        # a level without terrain still has a right limit
        'right': sorted(list(grid['terrain'].keys()) or [(0,0)], key = lambda pos: pos[0])[-1][0] + 500,
        # falling this far below the lowest terrain ends the game
        'bottom': sorted(list(grid['terrain'].keys()) or [(0,0)], key = lambda pos: pos[1])[-1][1] + 800
        }

        # additional stuff
        self.particle_surfs = asset_dict['particle']
        self.cloud_surfs = asset_dict['clouds']
        self.cloud_timer = pygame.USEREVENT + 2
        pygame.time.set_timer(self.cloud_timer, 2000)
        self.startup_clouds()

        # sounds
        self.bg_music = audio['music']
        self.bg_music.set_volume(0.4)
        self.bg_music.play(loops = -1)

        self.coin_sound = audio['coin']
        self.coin_sound.set_volume(0.3)

        self.hit_sound = audio['hit']
        self.hit_sound.set_volume(0.3)

        self.win_sound = audio['win']
        self.lose_sound = audio['lose']

        # hearts, coins and the end of the level
        self.hearts = HEARTS
        self.coins = 0
        self.has_coins = len(self.coin_sprites) > 0
        self.heart_surfs = asset_dict['hearts']
        self.coin_icon = asset_dict['coin icon']
        self.font = pinta.fonte('bungee', 34)
        self.big_font = pinta.fonte('bungee', 72)
        self.message = None
        self.message_band = pygame.Surface((WINDOW_WIDTH, 160))
        self.message_band.fill(BUTTON_BG_COLOR)
        self.message_band.set_alpha(200)
        self.end_timer = Timer(END_MESSAGE_DURATION)
        self.finished = False

    def build_level(self, grid, asset_dict, jump_sound):
        for layer_name, layer in grid.items():
            for pos, data in layer.items():
                if layer_name == 'terrain':
                    Generic(pos, asset_dict['land'][data], [self.all_sprites, self.collision_sprites])
                if layer_name == 'water':
                    if data == 'top':
                        Animated(asset_dict['water top'], pos, self.all_sprites, LEVEL_LAYERS['water'])
                    else:
                        Generic(pos, asset_dict['water bottom'], self.all_sprites, LEVEL_LAYERS['water'])

                match data:
                    case 0: self.player = Player(pos, asset_dict['player'], self.all_sprites, self.collision_sprites, jump_sound)
                    case 1:
                        self.horizon_y = pos[1]
                        self.all_sprites.horizon_y = pos[1]
                    # coins
                    case 4: Coin('gold', asset_dict['gold'], pos, [self.all_sprites, self.coin_sprites])
                    case 5: Coin('silver', asset_dict['silver'], pos, [self.all_sprites, self.coin_sprites])
                    case 6: Coin('diamond', asset_dict['diamond'], pos, [self.all_sprites, self.coin_sprites])

                    # enemies
                    case 7: Spikes(asset_dict['spikes'], pos, [self.all_sprites, self.damage_sprites])
                    case 8:
                        Tooth(asset_dict['tooth'], pos, [self.all_sprites, self.damage_sprites], self.collision_sprites)
                    case 9:
                        Shell(
                            orientation = 'left',
                            assets = asset_dict['shell'],
                            pos =  pos,
                            group =  [self.all_sprites, self.collision_sprites, self.shell_sprites],
                            pearl_surf = asset_dict['pearl'],
                            damage_sprites = self.damage_sprites)
                    case 10:
                        Shell(
                            orientation = 'right',
                            assets = asset_dict['shell'],
                            pos =  pos,
                            group =  [self.all_sprites, self.collision_sprites, self.shell_sprites],
                            pearl_surf = asset_dict['pearl'],
                            damage_sprites = self.damage_sprites)

                    # palm trees
                    case 11:
                        Animated(asset_dict['palms']['small_fg'], pos, self.all_sprites)
                        Block(pos, (76,50), self.collision_sprites)
                    case 12:
                        Animated(asset_dict['palms']['large_fg'], pos, self.all_sprites)
                        Block(pos, (76,50), self.collision_sprites)
                    case 13:
                        Animated(asset_dict['palms']['left_fg'], pos, self.all_sprites)
                        Block(pos, (76,50), self.collision_sprites)
                    case 14:
                        Animated(asset_dict['palms']['right_fg'], pos, self.all_sprites)
                        Block(pos + vector(50,0), (76,50), self.collision_sprites)

                    case 15: Animated(asset_dict['palms']['small_bg'], pos, self.all_sprites, LEVEL_LAYERS['bg'])
                    case 16: Animated(asset_dict['palms']['large_bg'], pos, self.all_sprites, LEVEL_LAYERS['bg'])
                    case 17: Animated(asset_dict['palms']['left_bg'], pos, self.all_sprites, LEVEL_LAYERS['bg'])
                    case 18: Animated(asset_dict['palms']['right_bg'], pos, self.all_sprites, LEVEL_LAYERS['bg'])

        for sprite in self.shell_sprites:
            sprite.player = self.player

    def get_coins(self):
        collided_coins = pygame.sprite.spritecollide(self.player, self.coin_sprites, True)
        for sprite in collided_coins:
            self.coin_sound.play()
            Particle(self.particle_surfs, sprite.rect.center, self.all_sprites)
            self.coins += COIN_VALUES[sprite.coin_type]

        # every coin of the level collected: the level is complete
        if self.has_coins and not self.coin_sprites:
            self.end('Fase completa!', self.win_sound)

    def get_damage(self):
        collision_sprites = pygame.sprite.spritecollide(self.player, self.damage_sprites, False, pygame.sprite.collide_mask)
        if collision_sprites:
            self.hit_sound.play()
            if self.player.damage():
                self.hearts -= 1
                if self.hearts <= 0:
                    self.end('Fim de jogo', self.lose_sound)

    def check_fall(self):
        if self.player.rect.top > self.level_limits['bottom']:
            self.end('Fim de jogo', self.lose_sound)

    def end(self, message, sound):
        if not self.message:
            self.message = message
            self.bg_music.stop()
            sound.play()
            self.end_timer.activate()

    def back_to_editor(self):
        if not self.finished:
            self.finished = True
            self.switch()
            self.bg_music.stop()

    def event_loop(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                self.back_to_editor()

            if event.type == self.cloud_timer:
                surf = choice(self.cloud_surfs)
                surf = pygame.transform.scale2x(surf) if randint(0,5) > 3 else surf
                x = self.level_limits['right'] + randint(100,300)
                y = self.horizon_y - randint(-50,600)
                Cloud((x,y), surf, self.all_sprites, self.level_limits['left'])

    def startup_clouds(self):
        for i in range(40):
            surf = choice(self.cloud_surfs)
            surf = pygame.transform.scale2x(surf) if randint(0,5) > 3 else surf
            x = randint(self.level_limits['left'], self.level_limits['right'])
            y = self.horizon_y - randint(-50,600)
            Cloud((x,y), surf, self.all_sprites, self.level_limits['left'])

    def display_hud(self):
        for index in range(HEARTS):
            surf = self.heart_surfs[0] if index < self.hearts else self.heart_surfs[1]
            self.display_surface.blit(surf, (20 + index * 44, 16))
        self.display_surface.blit(self.coin_icon, (20, 60))
        text_surf = self.font.render(str(self.coins), True, HORIZON_COLOR)
        self.display_surface.blit(self.font.render(str(self.coins), True, BUTTON_BG_COLOR), (66, 64))
        self.display_surface.blit(text_surf, (64, 61))

    def display_message(self):
        band_rect = self.message_band.get_rect(center = (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2))
        self.display_surface.blit(self.message_band, band_rect)
        text_surf = self.big_font.render(self.message, True, HORIZON_COLOR)
        self.display_surface.blit(text_surf, text_surf.get_rect(center = band_rect.center))

    def run(self, dt):
        # update
        self.event_loop()
        if not self.message:
            self.all_sprites.update(dt)
            self.get_coins()
            self.get_damage()
            self.check_fall()
        else:
            self.end_timer.update()
            if not self.end_timer.active:
                self.back_to_editor()

        # drawing
        self.display_surface.fill(SKY_COLOR)
        self.all_sprites.custom_draw(self.player)
        self.display_hud()
        if self.message:
            self.display_message()

class CameraGroup(pygame.sprite.Group):
    def __init__(self):
        super().__init__()
        self.display_surface = pygame.display.get_surface()
        self.offset = vector()
        self.screen_rect = self.display_surface.get_rect()

    def draw_horizon(self):
        horizon_pos = self.horizon_y - self.offset.y

        if horizon_pos < WINDOW_HEIGHT:
            sea_rect = pygame.Rect(0,horizon_pos,WINDOW_WIDTH,WINDOW_HEIGHT - horizon_pos)
            pygame.draw.rect(self.display_surface, SEA_COLOR, sea_rect)

            # horizon line
            # 3 extra rectangles
            horizon_rect1 = pygame.Rect(0,horizon_pos - 10,WINDOW_WIDTH,10)
            horizon_rect2 = pygame.Rect(0,horizon_pos - 16,WINDOW_WIDTH,4)
            horizon_rect3 = pygame.Rect(0,horizon_pos - 20,WINDOW_WIDTH,2)
            pygame.draw.rect(self.display_surface, HORIZON_TOP_COLOR, horizon_rect1)
            pygame.draw.rect(self.display_surface, HORIZON_TOP_COLOR, horizon_rect2)
            pygame.draw.rect(self.display_surface, HORIZON_TOP_COLOR, horizon_rect3)
            pygame.draw.line(self.display_surface, HORIZON_COLOR, (0,horizon_pos), (WINDOW_WIDTH,horizon_pos), 3)

        if horizon_pos < 0:
            self.display_surface.fill(SEA_COLOR)

    def custom_draw(self, player):
        self.offset.x = player.rect.centerx - WINDOW_WIDTH / 2
        self.offset.y = player.rect.centery - WINDOW_HEIGHT / 2

        for sprite in self:
            if sprite.z == LEVEL_LAYERS['clouds']:
                offset_rect = sprite.rect.copy()
                offset_rect.center -= self.offset
                # only what the camera sees is drawn
                if offset_rect.colliderect(self.screen_rect):
                    self.display_surface.blit(sprite.image, offset_rect)

        self.draw_horizon()
        for sprite in self:
            for layer in LEVEL_LAYERS.values():
                if sprite.z == layer and sprite.z != LEVEL_LAYERS['clouds']:
                    offset_rect = sprite.rect.copy()
                    offset_rect.center -= self.offset
                    if offset_rect.colliderect(self.screen_rect):
                        self.display_surface.blit(sprite.image, offset_rect)
