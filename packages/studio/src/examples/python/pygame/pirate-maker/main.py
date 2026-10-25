import pygame
from pygame.math import Vector2 as vector
from settings import *
from support import *

from os.path import join

from editor import Editor
from level import Level

class Main:
    def __init__(self):
        pygame.init()
        self.display_surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption('Pirate Maker')
        self.clock = pygame.time.Clock()
        self.imports()

        self.editor_active = True
        self.transition = Transition(self.toggle)
        self.editor = Editor(self.land_tiles, self.switch)

        # cursor
        surf = import_image('cursor', 'seta')
        cursor = pygame.cursors.Cursor((0,0), surf)
        pygame.mouse.set_cursor(cursor)

    def imports(self):
        # terrain
        self.land_tiles = import_folder_dict('terreno')
        self.water_bottom = import_image('agua', 'fundo')
        self.water_top_animation = import_folder('agua', 'superficie')

        # coins
        self.gold = import_folder('moedas', 'ouro')
        self.silver = import_folder('moedas', 'prata')
        self.diamond = import_folder('diamante', 'brilhar')
        self.particle = import_folder('brilho', 'estourar')

        # palm trees
        self.palms = {folder: import_folder(*PALMS[folder]) for folder in PALMS}

        # enemies
        self.spikes = import_image('espinhos', 'parado')
        self.tooth = {
            'idle': import_folder('dente', 'parado'),
            'run_left': import_folder('dente', 'correr', True),
            'run_right': import_folder('dente', 'correr')}
        self.shell = {
            'attack': import_folder('concha', 'atacar'),
            'idle': import_folder('concha', 'parada')}
        self.pearl = import_image('perola', 'parada')

        # player
        self.player_graphics = {}
        for status, animation in (('idle', 'parado'), ('run', 'correr'), ('jump', 'pular'), ('fall', 'cair')):
            self.player_graphics[f'{status}_left'] = import_folder('pirata', animation, True)
            self.player_graphics[f'{status}_right'] = import_folder('pirata', animation)

        # clouds
        self.clouds = import_folder('nuvem', 'formas')

        # hearts and the coin counter of the play mode
        self.hearts = import_folder('hud', 'coracao')
        self.coin_icon = import_image('hud', 'tesouro')

        # sounds
        self.level_sounds = {
            'coin': pygame.mixer.Sound(join('assets', 'coin.wav')),
            'hit': pygame.mixer.Sound(join('assets', 'hit.wav')),
            'jump': pygame.mixer.Sound(join('assets', 'jump.wav')),
            'music': pygame.mixer.Sound(join('assets', 'SuperHero.ogg')),
            'win': pygame.mixer.Sound(join('assets', 'win.wav')),
            'lose': pygame.mixer.Sound(join('assets', 'lose.wav')),
        }

    def toggle(self):
        self.editor_active = not self.editor_active
        if self.editor_active:
            self.editor.editor_music.play()

    def switch(self, grid = None):
        self.transition.active = True
        if grid:
            self.level = Level(
                grid,
                self.switch,{
                    'land': self.land_tiles,
                    'water bottom': self.water_bottom,
                    'water top': self.water_top_animation,
                    'gold': self.gold,
                    'silver': self.silver,
                    'diamond': self.diamond,
                    'particle': self.particle,
                    'palms': self.palms,
                    'spikes': self.spikes,
                    'tooth': self.tooth,
                    'shell': self.shell,
                    'player': self.player_graphics,
                    'pearl': self.pearl,
                    'clouds': self.clouds,
                    'hearts': self.hearts,
                    'coin icon': self.coin_icon},
                self.level_sounds)

    def run(self):
        while True:
            dt = self.clock.tick() / 1000

            if self.editor_active:
                self.editor.run(dt)
            else:
                self.level.run(dt)
            self.transition.display(dt)
            pygame.display.update()


class Transition:
    def __init__(self, toggle):
        self.display_surface = pygame.display.get_surface()
        self.toggle = toggle
        self.active = False

        self.border_width = 0
        self.direction = 1
        self.center = (WINDOW_WIDTH /2, WINDOW_HEIGHT / 2)
        self.radius = vector(self.center).magnitude()
        self.threshold = self.radius + 100

    def display(self, dt):
        if self.active:
            self.border_width += 1000 * dt * self.direction
            if self.border_width >= self.threshold:
                self.direction = -1
                self.toggle()

            if self.border_width < 0:
                self.active = False
                self.border_width = 0
                self.direction = 1
            pygame.draw.circle(self.display_surface, 'black',self.center, self.radius, int(self.border_width))

if __name__ == '__main__':
    main = Main()
    main.run()
