from settings import *
from os.path import join
from os import walk
import pinta

# import functions
# The art comes from the Pinta drawings in assets/ (module pinta); the original read loose PNG
# files, folders of frames and Tiled maps. Each importer returns the same dictionaries as before.

drawings = {}


def import_sprite(name):
    if name not in drawings:
        drawings[name] = pinta.carregar_sprite(name)
    return drawings[name]


def import_image(name, alpha = True):
    surf = pinta.carregar_imagem(name)
    return surf if alpha else surf.convert()


def import_folder(name, animation, alpha = True):
    frames = import_sprite(name).animacao(animation)
    if not alpha:
        frames = [frame.convert() for frame in frames]
    return frames


def import_frame(name, animation, index = 0):
    return import_sprite(name).quadro(animation, index)


class PixelFont:
    # A platform pixel font with a little room under the letters (the original's font had it, and
    # the bars of the battle are drawn just below the text).
    def __init__(self, size):
        self.font = pinta.fonte('press-start-2p', size)
        self.padding = size // 3

    def render(self, text, antialias, color):
        text_surf = self.font.render(text, antialias, color)
        surf = pygame.Surface((text_surf.get_width(), text_surf.get_height() + self.padding), pygame.SRCALPHA)
        surf.blit(text_surf, (0, self.padding // 2))
        return surf

    def get_height(self):
        return self.font.get_height() + self.padding


def trim(surf):
    return surf.subsurface(surf.get_bounding_rect())


def object_image(obj):
    # The image of a map object: a Pinta background, or a frame of a sprite cut to the object size.
    name = obj.properties['desenho']
    if 'animacao' not in obj.properties:
        if name not in drawings:
            drawings[name] = import_image(name)
        return drawings[name]
    frame = import_frame(name, obj.properties['animacao'])
    return frame.subsurface((0, 0, int(obj.width), int(obj.height)))


def background_importer(*names):
    # A battle background is drawn in two halves in Pinta (a background is at most 512 px wide).
    backgrounds = {}
    for biome, name in names:
        surf = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT)).convert()
        left = import_image(f'{name}-esquerda')
        surf.blit(left, (0, 0))
        surf.blit(import_image(f'{name}-direita'), (left.get_width(), 0))
        backgrounds[biome] = surf
    return backgrounds


def ui_importer():
    frames = {}
    for icon, name in (('sword', 'espada'), ('shield', 'escudo'), ('arrows', 'setas'), ('hand', 'mao')):
        frames[icon] = import_frame('botoes', name, 0)
        frames[f'{icon}_highlight'] = import_frame('botoes', name, 1)
    for stat, name in (('health', 'vida'), ('energy', 'energia'), ('attack', 'ataque'), ('defense', 'defesa'), ('speed', 'velocidade'), ('recovery', 'recuperacao')):
        frames[stat] = import_frame('atributos', name)
    frames['cross'] = import_frame('cruz', 'cruz')
    return frames


def character_importer(name):
    sprite = import_sprite(name)
    new_dict = {}
    for direction, animation in (('down', 'baixo'), ('left', 'esquerda'), ('right', 'direita'), ('up', 'cima')):
        new_dict[direction] = sprite.animacao(animation)
        new_dict[f'{direction}_idle'] = [sprite.quadro(animation, 0)]
    return new_dict


def all_character_import(*names):
    new_dict = {}
    for name in names:
        new_dict[name] = character_importer(name)
    return new_dict


def coast_importer():
    new_dict = {}
    terrains = {'grass': 'costa-grama', 'grass_i': 'costa-ilha-grama', 'sand_i': 'costa-ilha-areia', 'sand': 'costa-areia'}
    sides = {
        'topleft': 'cima-esquerda', 'top': 'cima', 'topright': 'cima-direita',
        'left': 'esquerda', 'right': 'direita', 'bottomleft': 'baixo-esquerda',
        'bottom': 'baixo', 'bottomright': 'baixo-direita'}
    for terrain, name in terrains.items():
        new_dict[terrain] = {}
        for key, animation in sides.items():
            new_dict[terrain][key] = import_folder(name, animation, alpha = False)
    return new_dict


def tmx_importer(*names):
    tmx_dict = {}
    for name in names:
        tmx_dict[name] = pinta.carregar_mapa(name)
    return tmx_dict


def monster_importer(*names):
    monster_dict = {}
    for name in names:
        sprite = import_sprite(name.lower())
        monster_dict[name] = {'idle': sprite.animacao('parado'), 'attack': sprite.animacao('atacar')}
    return monster_dict


def icon_importer(*names):
    icons = {}
    for name in names:
        icons[name] = trim(import_frame(name.lower(), 'icone'))
    return icons


def outline_creator(frame_dict, width):
    outline_frame_dict = {}
    for monster, monster_frames in frame_dict.items():
        outline_frame_dict[monster] = {}
        for state, frames in monster_frames.items():
            outline_frame_dict[monster][state] = []
            for frame in frames:
                new_surf = pygame.Surface(vector(frame.get_size()) + vector(width * 2), pygame.SRCALPHA)
                new_surf.fill((0, 0, 0, 0))
                white_frame = pygame.mask.from_surface(frame).to_surface()
                white_frame.set_colorkey('black')

                new_surf.blit(white_frame, (0, 0))
                new_surf.blit(white_frame, (width, 0))
                new_surf.blit(white_frame, (width * 2, 0))
                new_surf.blit(white_frame, (width * 2, width))
                new_surf.blit(white_frame, (width * 2, width * 2))
                new_surf.blit(white_frame, (width, width * 2))
                new_surf.blit(white_frame, (0, width * 2))
                new_surf.blit(white_frame, (0, width))
                outline_frame_dict[monster][state].append(new_surf)
    return outline_frame_dict


def attack_importer():
    attack_dict = {}
    for attack, animation in (('explosion', 'explosao'), ('fire', 'fogo'), ('green', 'verde'), ('ice', 'gelo'), ('scratch', 'arranhao'), ('splash', 'respingo')):
        attack_dict[attack] = import_folder('ataques', animation)
    return attack_dict


def audio_importer(*path):
    files = {}
    for folder_path, _, file_names in walk(join(*path)):
        for file_name in file_names:
            if file_name.endswith('.wav') or file_name.endswith('.ogg'):
                full_path = join(folder_path, file_name)
                files[file_name.split('.')[0]] = pygame.mixer.Sound(full_path)
    return files


# game functions
def draw_bar(surface, rect, value, max_value, color, bg_color, radius = 1):
    ratio = rect.width / max_value
    bg_rect = rect.copy()
    progress = max(0, min(rect.width, value * ratio))
    progress_rect = pygame.FRect(rect.topleft, (progress, rect.height))
    pygame.draw.rect(surface, bg_color, bg_rect, 0, radius)
    pygame.draw.rect(surface, color, progress_rect, 0, radius)


def check_connections(radius, entity, target, tolerance = 30):
    relation = vector(target.rect.center) - vector(entity.rect.center)
    if relation.length() < radius:
        if entity.facing_direction == 'left' and relation.x < 0 and abs(relation.y) < tolerance or\
           entity.facing_direction == 'right' and relation.x > 0 and abs(relation.y) < tolerance or\
           entity.facing_direction == 'up' and relation.y < 0 and abs(relation.x) < tolerance or\
           entity.facing_direction == 'down' and relation.y > 0 and abs(relation.x) < tolerance:
            return True
