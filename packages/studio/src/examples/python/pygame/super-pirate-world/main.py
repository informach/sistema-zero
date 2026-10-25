from settings import *
from level import Level
import pinta
from os.path import join
from support import *
from data import Data
from debug import debug
from ui import UI, Screen
from overworld import Overworld

class Game:
	def __init__(self):
		pygame.init()
		self.display_surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
		pygame.display.set_caption('Super Pirate World')
		self.clock = pygame.time.Clock()
		self.import_assets()

		self.ui = UI(self.font, self.ui_frames)
		self.data = Data(self.ui)
		self.tmx_maps = {
			0: pinta.carregar_mapa('fase-0'),
			1: pinta.carregar_mapa('fase-1'),
			2: pinta.carregar_mapa('fase-2'),
			3: pinta.carregar_mapa('fase-3'),
			4: pinta.carregar_mapa('fase-4'),
			5: pinta.carregar_mapa('fase-5'),
			}
		self.tmx_overworld = pinta.carregar_mapa('mapa-mundo')
		self.title_time = 0
		self.current_stage = Screen(
			'Super Pirate World',
			['Setas: andar    Espaço: pular    X: atacar', 'Seta para baixo: descer da plataforma', 'Pule nas paredes e chegue até a bandeira!'],
			(self.title_font, self.small_font),
			self.start_game,
			background = self.draw_title)
		self.bg_music.play(-1)

	def start_game(self):
		self.current_stage = Level(self.tmx_maps[self.data.current_level], self.level_frames, self.audio_files, self.data, self.switch_stage)

	def switch_stage(self, target, unlock = 0):
		if target == 'level':
			self.current_stage = Level(self.tmx_maps[self.data.current_level], self.level_frames, self.audio_files, self.data, self.switch_stage)

		else: # overworld
			if unlock > 0:
				# completed: the original unlocked every stage here (unlocked_level = 6)
				self.data.unlocked_level = max(self.data.unlocked_level, unlock)
			else:
				self.data.health -= 1
			self.current_stage = Overworld(self.tmx_overworld, self.data, self.overworld_frames, self.switch_stage)
			if unlock > 0 and self.data.current_level == len(self.tmx_maps) - 1:
				self.current_stage = Screen(
					'Vitória!',
					['Você chegou à bandeira da última fase.', f'Moedas: {self.data.coins}'],
					(self.title_font, self.small_font),
					self.back_to_overworld,
					background = self.draw_title,
					sound = self.audio_files['victory'])

	def back_to_overworld(self):
		self.current_stage = Overworld(self.tmx_overworld, self.data, self.overworld_frames, self.switch_stage)

	def restart(self):
		# completed: back to the world map with all the hearts
		self.data.health = 5
		self.back_to_overworld()

	def import_assets(self):
		self.level_frames = {
			'flag': import_folder('bandeira', 'tremular'),
			'saw': import_folder('serra', 'girar'),
			'floor_spike': import_folder('espinhos', 'brilhar'),
			'palms': import_sub_folders('palmeiras', {
				'palm_small': 'pequena', 'palm_large': 'grande', 'palm_left': 'esquerda', 'palm_right': 'direita',
				'palm_bg': 'fundo', 'palm_bg_left': 'fundo-esquerda', 'palm_bg_right': 'fundo-direita'}, cut = True),
			'candle': import_folder('vela', 'queimar'),
			'window': import_folder('janela', 'brilhar'),
			'big_chain': import_folder('correntes', 'grande'),
			'small_chain': import_folder('correntes', 'pequena', cut = True),
			'candle_light': import_folder('luz-vela', 'brilhar'),
			'player': import_sub_folders('pirata', {
				'idle': 'parado', 'run': 'correr', 'jump': 'pular', 'fall': 'cair', 'wall': 'parede',
				'attack': 'atacar', 'air_attack': 'atacar-no-ar', 'hit': 'ferido'}),
			'saw_chain': import_image('serra', 'elo', cut = True),
			'helicopter': import_folder('helice', 'girar'),
			'boat': import_folder('barco', 'flutuar'),
			'spike': import_image('bola-espinhos', 'bola'),
			'spike_chain': import_image('bola-espinhos', 'elo', cut = True),
			'tooth': import_folder('dente', 'correr'),
			'shell': import_sub_folders('concha', {'idle': 'parado', 'fire': 'atirar'}),
			'pearl': import_image('concha', 'perola', cut = True),
			'items': import_sub_folders('itens', {
				'gold': 'ouro', 'silver': 'prata', 'diamond': 'diamante', 'potion': 'pocao', 'skull': 'caveira'}, cut = True),
			'particle': import_folder('particula', 'brilho'),
			'water_top': import_folder('agua', 'superficie'),
			'water_body': import_image('agua', 'fundo', alpha = False),
			'bg_tiles': import_folder_dict('azulejos', alpha = False),
			'cloud_small': [import_image('nuvem-1'), import_image('nuvem-2'), import_image('nuvem-3')],
			'cloud_large': import_image('nuvem-grande'),
			'static': import_folder_dict('decoracao', cut = True),
		}
		self.font = pinta.fonte('bungee', 32)
		self.title_font = pinta.fonte('bungee', 64)
		self.small_font = pinta.fonte('press-start-2p', 18)
		self.ui_frames = {
			'heart': import_folder('interface', 'coracao', cut = True),
			'coin':import_image('interface', 'moeda', cut = True)
		}
		self.overworld_frames = {
			'palms': import_folder('palmeira-mapa', 'balancar'),
			'water': import_folder('mar', 'ondas', alpha = False),
			'path': {
				'horizontal': import_image('caminho', 'horizontal'), 'vertical': import_image('caminho', 'vertical'),
				'tl': import_image('caminho', 'cima-esquerda'), 'tr': import_image('caminho', 'cima-direita'),
				'bl': import_image('caminho', 'baixo-esquerda'), 'br': import_image('caminho', 'baixo-direita'),
				'node': import_image('marco', 'fase')},
			'icon': import_sub_folders('icone', {'idle': 'parado', 'down': 'baixo', 'left': 'esquerda', 'right': 'direita', 'up': 'cima'}),
			'objects': import_folder_dict('enfeites-mapa', cut = True),
		}

		self.audio_files = {
			'coin': pygame.mixer.Sound(join('assets', 'coin.wav')),
			'attack': pygame.mixer.Sound(join('assets', 'attack.wav')),
			'jump': pygame.mixer.Sound(join('assets', 'jump.wav')),
			'damage': pygame.mixer.Sound(join('assets', 'damage.wav')),
			'pearl': pygame.mixer.Sound(join('assets', 'pearl.wav')),
			'game_over': pygame.mixer.Sound(join('assets', 'game_over.wav')),
			'victory': pygame.mixer.Sound(join('assets', 'victory.wav')),
		}
		self.bg_music = pygame.mixer.Sound(join('assets', 'pirate_theme.ogg'))
		self.bg_music.set_volume(0.5)

	def draw_title(self, dt):
		# the title screen: sky, the cloud bank, the sea and the pirate on a little beach
		self.title_time += dt
		horizon = 520
		self.display_surface.fill('#ddc6a1')
		cloud = self.level_frames['cloud_large']
		left = -(self.title_time * 50) % cloud.get_width()
		for x in range(-1, 2):
			self.display_surface.blit(cloud, (left + x * cloud.get_width(), horizon - cloud.get_height()))
		pygame.draw.rect(self.display_surface, '#92a9ce', (0, horizon, WINDOW_WIDTH, WINDOW_HEIGHT - horizon))
		pygame.draw.line(self.display_surface, '#f5f1de', (0, horizon), (WINDOW_WIDTH, horizon), 4)
		frame = int(self.title_time * ANIMATION_SPEED)
		for x in range(0, WINDOW_WIDTH, 64):
			water = self.level_frames['water_top']
			self.display_surface.blit(water[frame % len(water)], (x, 650))
		pygame.draw.ellipse(self.display_surface, '#b88a55', (40, 600, 560, 150))
		pygame.draw.ellipse(self.display_surface, '#e2b97a', (48, 604, 544, 140))
		palm = self.level_frames['palms']['palm_large']
		self.display_surface.blit(palm[frame % len(palm)], (120, 490))
		pirate = self.level_frames['player']['idle']
		self.display_surface.blit(pirate[frame % len(pirate)], (330, 548))

	def check_game_over(self):
		if self.data.health <= 0 and not isinstance(self.current_stage, Screen):
			# completed: the original closed the game here
			self.current_stage = Screen(
				'Fim de jogo',
				['Os corações acabaram.', 'Volte ao mapa e tente de novo.'],
				(self.title_font, self.small_font),
				self.restart,
				sound = self.audio_files['game_over'])

	def run(self):
		while True:
			dt = self.clock.tick() / 1000
			for event in pygame.event.get():
				if event.type == pygame.QUIT:
					pygame.quit()
					sys.exit()

			self.check_game_over()
			self.current_stage.run(dt)
			if not isinstance(self.current_stage, Screen):
				self.ui.update(dt)

			pygame.display.update()

if __name__ == '__main__':
	game = Game()
	game.run()
