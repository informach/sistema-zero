"""pygame.mixer: in the Studio the sound is always ready, so init and quit change nothing."""
import os

from pgzero import loaders


def init(frequency=44100, size=-16, channels=2, buffer=512, *args, **kwargs):
    """Nothing to do: Pygame Zero's sounds already play (book games call this to tune it)."""


def pre_init(frequency=44100, size=-16, channels=2, buffer=512, *args, **kwargs):
    """Nothing to do in the Studio."""


def quit():
    """Nothing to do in the Studio (sounds keep working)."""


def get_init():
    return (22050, -16, 2)


def get_num_channels():
    return 8


def set_num_channels(count):
    """The Studio mixes a fixed number of sounds; this changes nothing."""


def Sound(file):
    """A sound from a file of the project, e.g. pygame.mixer.Sound('sounds/bip.wav')."""
    path = os.path.join(loaders.root, os.fspath(file))
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Não encontrei o som '{file}' no projeto.")
    return loaders.Sound(path)


def __getattr__(name):
    if name.startswith('__'):
        raise AttributeError(name)
    raise AttributeError(
        f'No Estúdio, pygame.mixer.{name} não existe. Para música, use music.play("nome"); '
        'para sons, sounds.nome.play().'
    )
