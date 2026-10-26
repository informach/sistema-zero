from settings import * 
from sprites import AnimatedSprite
from random import randint
from timer import Timer

class UI:
	def __init__(self, font, frames):
		self.display_surface = pygame.display.get_surface()
		self.sprites = pygame.sprite.Group()
		self.font = font

		# health / hearts 
		self.heart_frames = frames['heart']
		self.heart_surf_width = self.heart_frames[0].get_width()
		self.heart_padding = 6

		# coins 
		self.coin_amount = 0
		self.coin_timer = Timer(1000)
		self.coin_surf = frames['coin']

	def create_hearts(self, amount):
		for sprite in self.sprites:
			sprite.kill()
		for heart in range(amount):
			x = 10 + heart * (self.heart_surf_width + self.heart_padding)
			y = 10
			Heart((x,y), self.heart_frames, self.sprites)

	def display_text(self):
		if self.coin_timer.active:
			text_surf = self.font.render(str(self.coin_amount), False, '#33323d')
			text_rect = text_surf.get_frect(topleft = (16,34))
			self.display_surface.blit(text_surf, text_rect)

			coin_rect = self.coin_surf.get_frect(center = text_rect.bottomleft).move(0,-6)
			self.display_surface.blit(self.coin_surf, coin_rect)

	def show_coins(self, amount):
		self.coin_amount = amount
		self.coin_timer.activate()

	def update(self, dt):
		self.coin_timer.update()
		self.sprites.update(dt)
		self.sprites.draw(self.display_surface)
		self.display_text()

class Heart(AnimatedSprite):
	def __init__(self, pos, frames, groups):
		super().__init__(pos, frames, groups)
		self.active = False

	def animate(self, dt):
		self.frame_index += ANIMATION_SPEED * dt
		if self.frame_index < len(self.frames):
			self.image = self.frames[int(self.frame_index)]
		else:
			self.active = False
			self.frame_index = 0

	def update(self, dt):
		if self.active:
			self.animate(dt)
		else:
			if randint(0,2000) == 1:
				self.active = True

class Screen:
	# Completed: the original had no title screen and closed the window at zero hearts.
	# A screen shows a title and a few lines; releasing Enter calls `on_close`.
	def __init__(self, title, lines, fonts, on_close, background = None, sound = None):
		self.display_surface = pygame.display.get_surface()
		self.title_font, self.font = fonts
		self.title = title
		self.lines = lines
		self.on_close = on_close
		self.background = background
		if not background:
			# a darker copy of the last frame of the game
			self.snapshot = self.display_surface.copy()
			shade = pygame.Surface(self.snapshot.get_size())
			shade.fill('#2a1d2e')
			shade.set_alpha(170)
			self.snapshot.blit(shade, (0,0))
		# a soft dark panel behind the words
		height = 200 + len(lines) * 44
		self.panel = pygame.Surface((980, height), pygame.SRCALPHA)
		pygame.draw.rect(self.panel, (42, 29, 46, 150), self.panel.get_rect(), border_radius = 24)
		self.panel_rect = self.panel.get_frect(midtop = (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 - 200))
		self.time = 0
		if sound:
			sound.play()

	def draw_text(self, text, font, color, center):
		shadow = font.render(text, False, '#2a1d2e')
		surf = font.render(text, False, color)
		rect = surf.get_frect(center = center)
		self.display_surface.blit(shadow, rect.move(4,4))
		self.display_surface.blit(surf, rect)

	def run(self, dt):
		self.time += dt
		if self.background:
			self.background(dt)
		else:
			self.display_surface.blit(self.snapshot, (0,0))
		self.display_surface.blit(self.panel, self.panel_rect)

		self.draw_text(self.title, self.title_font, '#ffdfa6', (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 - 120))
		for index, line in enumerate(self.lines):
			self.draw_text(line, self.font, '#f5f1de', (WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + index * 44))
		if int(self.time * 2) % 2 == 0:
			self.draw_text('Aperte Enter', self.font, '#ffdfa6', (WINDOW_WIDTH / 2, WINDOW_HEIGHT - 90))

		if self.time > 0.5 and pygame.key.get_just_released()[pygame.K_RETURN]:
			self.on_close()
