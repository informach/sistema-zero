from settings import *
from support import *
from timer import Timer
from monster import *
from random import choice
from ui import *
from attack import AttackAnimationSprite

class Game:
    def __init__(self):
        pygame.init()
        self.display_surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption('Monster Battle')
        self.clock = pygame.time.Clock()
        self.running = True
        self.import_assets()
        self.audio['music'].set_volume(0.5)
        self.audio['music'].play(-1)

        # screens: 'start', 'battle' and 'end'
        self.screen = 'start'
        self.title_font = pinta.fonte('bungee', 64)
        self.text_font = pinta.fonte('bungee', 28)
        self.small_font = pinta.fonte('bungee', 20)
        self.best = 0
        self.setup()

    def setup(self):
        self.player_active = True
        self.defeated = 0
        self.end_message = ''

        # groups
        self.all_sprites = pygame.sprite.Group()

        # data
        player_monster_list = ['Sparchu', 'Jacana', 'Plumette', 'Atrox']
        self.player_monsters = [Monster(name, self.back_surfs[name]) for name in player_monster_list]
        self.monster = self.player_monsters[0]
        self.all_sprites.add(self.monster)
        opponent_name = choice(list(MONSTER_DATA.keys()))
        self.opponent = Opponent(opponent_name, self.front_surfs[opponent_name], self.all_sprites)

        # ui
        self.ui = UI(self.monster, self.player_monsters, self.simple_surfs, self.icons, self.get_input)
        self.opponent_ui = OpponentUI(self.opponent)

        # timers
        self.timers = {'player end': Timer(1000, func = self.opponent_turn), 'opponent end': Timer(1000, func = self.player_turn)}

    def get_input(self, state, data = None):
        if state == 'attack':
            self.apply_attack(self.opponent, data)
        elif state == 'heal':
            self.monster.health += 50
            AttackAnimationSprite(self.monster, self.attack_frames['green'], self.all_sprites)
            self.audio['green'].play()
        elif state == 'switch':
            self.monster.kill()
            self.monster = data
            self.all_sprites.add(self.monster)
            self.ui.monster = self.monster

        elif state == 'escape':
            self.end_battle('Você fugiu da batalha!')
        self.player_active = False
        self.timers['player end'].activate()

    def apply_attack(self, target, attack):
        attack_data = ABILITIES_DATA[attack]
        attack_multiplier = ELEMENT_DATA[attack_data['element']][target.element]
        target.health -= attack_data['damage'] * attack_multiplier
        AttackAnimationSprite(target, self.attack_frames[attack_data['animation']], self.all_sprites)
        self.audio[attack_data['animation']].play()

    def opponent_turn(self):
        if self.opponent.health <= 0:
            self.defeated += 1
            self.player_active = True
            self.opponent.kill()
            monster_name = choice(list(MONSTER_DATA.keys()))
            self.opponent = Opponent(monster_name, self.front_surfs[monster_name], self.all_sprites)
            self.opponent_ui.monster = self.opponent
        else:
            attack = choice(self.opponent.abilities)
            self.apply_attack(self.monster, attack)
            self.timers['opponent end'].activate()

    def player_turn(self):
        self.player_active = True
        if self.monster.health <= 0:
            available_monsters = [monster for monster in self.player_monsters if monster.health > 0]
            if available_monsters:
                self.monster.kill()
                self.monster = available_monsters[0]
                self.all_sprites.add(self.monster)
                self.ui.monster = self.monster
            else:
                self.end_battle('Seu time inteiro desmaiou!')

    def end_battle(self, message):
        # The battle ends here; the window stays open for another one.
        self.screen = 'end'
        self.end_message = message
        self.best = max(self.best, self.defeated)
        print(f'{message} Adversários derrotados: {self.defeated}')

    def update_timers(self):
        for timer in self.timers.values():
            timer.update()

    def import_assets(self):
        self.back_surfs = folder_importer('costas')
        self.front_surfs = folder_importer('frente')
        self.bg_surfs = {'bg': background_importer('arena'), 'floor': pinta.carregar_sprite('chao').quadro('parado')}
        self.simple_surfs = folder_importer('icone')
        self.attack_frames = tile_importer('ataques')
        self.icons = icon_importer('icones')
        self.audio = audio_importer('explosion.wav', 'fire.wav', 'green.wav', 'ice.wav', 'music.ogg', 'scratch.wav', 'splash.wav')

    def draw_monster_floor(self):
        for sprite in self.all_sprites:
            if isinstance(sprite, Creature):
                floor_rect = self.bg_surfs['floor'].get_frect(center = sprite.rect.midbottom + pygame.Vector2(0, -10))
                self.display_surface.blit(self.bg_surfs['floor'], floor_rect)

    def draw_panel(self, rect):
        pygame.draw.rect(self.display_surface, COLORS['white'], rect, 0, 12)
        pygame.draw.rect(self.display_surface, COLORS['gray'], rect, 4, 12)

    def draw_text(self, font, text, color, center):
        text_surf = font.render(text, True, color)
        self.display_surface.blit(text_surf, text_surf.get_frect(center = center))

    def draw_start(self):
        rect = pygame.FRect(0, 0, 760, 400).move_to(center = (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2))
        self.draw_panel(rect)
        self.draw_text(self.title_font, 'Monster Battle', '#2f8a4e', (rect.centerx, rect.top + 70))
        self.draw_text(self.small_font, 'Seu time', COLORS['black'], (rect.centerx, rect.top + 140))
        for i, monster in enumerate(self.player_monsters):
            x = rect.left + 130 + i * 166
            simple_surf = self.simple_surfs[monster.name][0]
            self.display_surface.blit(simple_surf, simple_surf.get_frect(midbottom = (x, rect.top + 230)))
            self.draw_text(self.small_font, monster.name, COLORS['black'], (x, rect.top + 250))
        self.draw_text(self.small_font, 'Setas escolhem, espaço confirma, Esc volta ao menu', 'gray40', (rect.centerx, rect.top + 300))
        self.draw_text(self.text_font, 'Aperte Enter para começar', COLORS['red'], (rect.centerx, rect.top + 350))

    def draw_end(self):
        rect = pygame.FRect(0, 0, 680, 300).move_to(center = (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 - 40))
        self.draw_panel(rect)
        self.draw_text(self.text_font, self.end_message, COLORS['black'], (rect.centerx, rect.top + 60))
        self.draw_text(self.text_font, f'Adversários derrotados: {self.defeated}', '#2f8a4e', (rect.centerx, rect.top + 120))
        self.draw_text(self.small_font, f'Recorde: {self.best}', COLORS['black'], (rect.centerx, rect.top + 170))
        self.draw_text(self.text_font, 'Aperte Enter para jogar de novo', COLORS['red'], (rect.centerx, rect.top + 240))

    def run(self):
        while self.running:
            dt = self.clock.tick() / 1000
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
                    if self.screen == 'start':
                        self.screen = 'battle'
                    elif self.screen == 'end':
                        self.setup()
                        self.screen = 'battle'

            # update
            if self.screen == 'battle':
                self.update_timers()
            self.all_sprites.update(dt)
            if self.screen == 'battle' and self.player_active:
                self.ui.update()

            # draw
            self.display_surface.blit(self.bg_surfs['bg'], (0,0))
            if self.screen == 'start':
                self.draw_start()
            else:
                self.draw_monster_floor()
                self.all_sprites.draw(self.display_surface)
                if self.screen == 'battle':
                    self.ui.draw()
                    self.opponent_ui.draw()
                else:
                    self.draw_end()
            pygame.display.update()

        pygame.quit()

if __name__ == '__main__':
    game = Game()
    game.run()
