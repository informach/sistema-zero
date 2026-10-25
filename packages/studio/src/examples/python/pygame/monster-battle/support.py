from settings import *

def folder_importer(view):
    """The frames of one view ('frente', 'costas' or 'icone') of every monster, by name.

    Each monster is one Pinta drawing; the frames are cut to the painted area, like the
    original images were."""
    surfs = {}
    for name in MONSTER_DATA:
        frames = pinta.carregar_sprite(name.lower()).animacao(view)
        area = frames[0].get_bounding_rect().unionall([frame.get_bounding_rect() for frame in frames])
        surfs[name] = [frame.subsurface(area) for frame in frames]
    return surfs

def background_importer(name):
    """The arena map from Pinta, drawn once into a surface the size of the window."""
    surf = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
    pinta.carregar_mapa(name).desenhar(surf)
    return surf.convert()

def audio_importer(*file_names):
    audio_dict = {}
    for file_name in file_names:
        audio_dict[file_name.split('.')[0]] = pygame.mixer.Sound(join('assets', file_name))
    return audio_dict

def tile_importer(name):
    """The attack animations: Pinta cuts the sheet into frames for us."""
    sprite = pinta.carregar_sprite(name)
    attack_frames = {}
    for attack, animation in ATTACK_ANIMATIONS.items():
        attack_frames[attack] = sprite.animacao(animation)
    return attack_frames

def icon_importer(name):
    """The icon of each ability and of each option of the main menu, by its name."""
    sprite = pinta.carregar_sprite(name)
    icons = dict(zip(ABILITIES_DATA, sprite.animacao('habilidades')))
    icons.update(zip(['attack', 'heal', 'switch', 'escape'], sprite.animacao('menu')))
    return icons
