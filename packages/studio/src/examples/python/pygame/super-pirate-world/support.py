from settings import *
import pinta

# The original read folders of PNG files (os.walk); here every picture comes from a Pinta
# drawing in assets/: a sprite with named animations, or a plain picture (clouds).
sprites = {}

def drawing(name):
	if name not in sprites:
		sprites[name] = pinta.carregar_sprite(name)
	return sprites[name]

def trim(frames):
	# Cut the empty space right and below a drawing that starts in the top-left corner,
	# so the frames have the size of what was painted.
	area = frames[0].get_bounding_rect()
	for frame in frames[1:]:
		area.union_ip(frame.get_bounding_rect())
	area = pygame.Rect(0, 0, area.right, area.bottom)
	return [frame.subsurface(area) for frame in frames]

KEY = (255, 0, 255)
keyed_cache = {}

def keyed(surf):
	# Pixel art has no half-transparent pixel, so a color key draws exactly the same picture
	# as the alpha channel, and much faster in the browser.
	if not surf.get_flags() & pygame.SRCALPHA:
		return surf
	if id(surf) not in keyed_cache:
		fast = pygame.Surface(surf.get_size()).convert()
		fast.fill(KEY)
		fast.blit(surf, (0,0))
		fast.set_colorkey(KEY, pygame.RLEACCEL)
		keyed_cache[id(surf)] = (surf, fast)
	return keyed_cache[id(surf)][1]

def import_image(name, animation = None, alpha = True, cut = False):
	if animation:
		surf = drawing(name).quadro(animation)
	else:
		surf = pinta.carregar_imagem(name)
	if cut:
		surf = trim([surf])[0]
	return keyed(surf) if alpha else surf.convert()

def import_folder(name, animation, alpha = True, cut = False):
	frames = drawing(name).animacao(animation)
	if cut:
		frames = trim(frames)
	return [keyed(frame) if alpha else frame.convert() for frame in frames]

def import_folder_dict(name, alpha = True, cut = False):
	frame_dict = {}
	for animation in drawing(name).nomes:
		frame_dict[animation] = import_image(name, animation, alpha, cut)
	return frame_dict

def import_sub_folders(name, animations, cut = False):
	frame_dict = {}
	for key, animation in animations.items():
		frame_dict[key] = import_folder(name, animation, cut = cut)
	return frame_dict
