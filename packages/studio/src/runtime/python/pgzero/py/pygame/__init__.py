"""The part of pygame that Pygame Zero games from books use, for the Studio's browser.

Desktop Pygame Zero runs on pygame, and book listings sometimes reach for it: pygame.draw on
screen.surface, pygame.Rect, pygame.mixer.init(), pygame.math.Vector2, pygame.image.load. Those
work here the same way. Anything else of pygame is not in the browser, and says so in Portuguese.
"""
from pgzero._sz import Color
from pgzero.rect import Rect

from . import draw, image, math, mixer

__version__ = '2.5.8'
ver = __version__
version = type('version', (), {'ver': __version__, 'vernum': (2, 5, 8)})

PROVIDED = ('draw', 'mixer', 'math', 'image', 'Rect', 'Color')


def init():
    """Nothing to start in the Studio (pgzrun already did it)."""
    return (6, 0)


def quit():
    """Nothing to stop in the Studio."""


def get_init():
    return True


def __getattr__(name):
    if name.startswith('__'):
        raise AttributeError(name)
    raise AttributeError(
        f'No Estúdio existe só uma parte do pygame (pygame.draw, pygame.mixer, pygame.Rect, '
        f'pygame.Color, pygame.math.Vector2 e pygame.image.load); pygame.{name} não está nela. '
        'Quase sempre o Pygame Zero tem um jeito próprio: screen, Actor, keyboard, clock.'
    )
