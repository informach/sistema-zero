"""Runner for the Studio: same prepare_mod/run_mod contract as Pygame Zero's runner.

``sys._pgzrun`` is set by the runtime, so ``import pgzrun`` / ``pgzrun.go()`` in a program are
accepted and do nothing (exactly like running ``pgzrun game.py`` on a computer).
"""
from . import builtins, loaders
from .game import PGZeroGame


def prepare_mod(mod):
    """Prepare a module to run as a Pygame Zero program (before its code runs)."""
    loaders.set_root(mod.__file__)
    # Like Pygame Zero, but without the builtins module's own dunders (__name__, __file__…):
    # the program keeps running as __main__.
    mod.__dict__.update(
        {key: value for key, value in vars(builtins).items() if not key.startswith('__')}
    )


def run_mod(mod):
    """Run the module's game loop."""
    PGZeroGame(mod).run()
