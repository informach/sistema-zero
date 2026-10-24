"""raylib do Estúdio: os nomes do C (Vector2Normalize, KEY_SPACE...), ffi e rl.

    import raylib as rl
    from raylib import *
"""
from _szraylib._api import public as _public
from _szraylib._api import raylib_namespace as _namespace

globals().update(_namespace())
__all__ = _public(_namespace())
