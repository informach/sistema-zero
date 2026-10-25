"""pygame.image.load: an image of the project, ready for get_at and screen.blit."""
import os

from pgzero import _sz, loaders


def load(file, namehint=''):
    """The image at this path of the project, e.g. pygame.image.load('images/mapa.png')."""
    path = os.path.join(loaders.root, os.fspath(file))
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Não encontrei a imagem '{file}' no projeto.")
    return _sz.Surface(path)


def __getattr__(name):
    if name.startswith('__'):
        raise AttributeError(name)
    raise AttributeError(
        f'No Estúdio, pygame.image.{name} não existe; pygame.image.load lê uma imagem do projeto.'
    )
