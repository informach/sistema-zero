"""Portable project audio; independent of the Python standard-library turtle API."""

import json
import math
from pathlib import Path
import sys

__all__ = ["play", "stop"]
_MODULE = json.loads(Path(__file__).with_name('_module.json').read_text(encoding='utf-8'))
__version__ = _MODULE['version']
_POLICY = _MODULE['audio']['policy']
_sequence = 0


def _identifier(value):
    return type(value) is int and 0 < value <= 9007199254740991


def _exchange(request):
    from pyodide.ffi import run_sync
    import _sz_audio_runtime as runtime

    response = json.loads(run_sync(runtime.exchange(json.dumps(request))))
    if (not isinstance(response, dict) or response.get("version") != 1
            or type(response.get("ok")) is not bool):
        raise RuntimeError("O ambiente devolveu uma resposta de áudio inválida.")
    if not response["ok"]:
        message = response.get("error")
        if not isinstance(message, str) or not message or len(message) > 1000:
            raise RuntimeError("O ambiente devolveu uma resposta de áudio inválida.")
        raise RuntimeError(message)


def play(path, *, loop=False, volume=1.0):
    """Start a WAV without waiting for its end; return the voice handle."""
    if not isinstance(path, str) or not path or len(path) > 4096:
        raise TypeError("O caminho do som precisa ser um texto válido.")
    if type(loop) is not bool:
        raise TypeError("loop precisa ser True ou False.")
    if (type(volume) not in (int, float) or not math.isfinite(volume)
            or not 0 <= volume <= 1):
        raise ValueError("O volume precisa estar entre 0 e 1.")
    if not path.lower().endswith(".wav"):
        raise ValueError("Use um arquivo WAV PCM16 mono ou estéreo.")
    if sys.platform != "emscripten":
        from . import _desktop
        return _desktop.play(path, loop=loop, volume=volume)

    import _sz_audio_runtime as runtime
    root = Path(runtime.root)
    try:
        relative = Path(path).resolve().relative_to(root).as_posix()
    except ValueError:
        raise ValueError("O som precisa estar dentro do projeto.") from None
    global _sequence
    _sequence += 1
    if not _identifier(_sequence):
        raise RuntimeError("O programa excedeu o limite de identificadores de áudio.")
    _exchange({"version": 1, "op": "play", "id": _sequence,
               "path": relative, "loop": loop, "volume": volume})
    return _sequence


def stop(handle=None):
    """Stop one voice, or every voice owned by this execution."""
    if handle is not None and not _identifier(handle):
        raise ValueError("Use o identificador devolvido por play, ou None para parar todos.")
    if sys.platform != "emscripten":
        from . import _desktop
        _desktop.stop(handle)
        return
    _exchange({"version": 1, "op": "stop", "id": handle})
