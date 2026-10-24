"""pyray do Estúdio: a mesma API do pacote raylib (raylib-python-cffi 6.0.1.0) do computador.

    from pyray import *

A janela é o canvas do Estúdio; o resto é o raylib que você instala com pip install raylib.
"""
from _szraylib._api import public as _public
from _szraylib._api import pyray_namespace as _namespace

globals().update(_namespace())
__all__ = _public(_namespace())
