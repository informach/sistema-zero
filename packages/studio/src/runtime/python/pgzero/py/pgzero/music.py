"""Music streaming (Pygame Zero 1.2.1 API), played by the Studio's media service.

Like Pygame Zero, music files live in music/ and must be MP3 or OGG.
"""
from . import _sz
from .loaders import ResourceLoader, root as _initial_root

__all__ = [
    'rewind', 'stop', 'fadeout', 'set_volume', 'get_volume', 'get_pos',
    'set_pos', 'play', 'play_once', 'queue', 'pause', 'unpause', 'is_playing',
]


class _MusicLoader(ResourceLoader):
    """Validates names exactly like Pygame Zero and returns the file path."""
    EXTNS = ['mp3', 'ogg', 'oga']
    TYPE = 'music'
    TYPE_PT = 'a música'

    def _load(self, path):
        from . import loaders
        import os.path
        return os.path.relpath(path, loaders.root).replace(os.sep, '/')


_loader = _MusicLoader('music')
_voice = None
_volume = 1.0
_paused = False
_current = None
_queued = None
del _initial_root


def _play(name, loop):
    global _voice, _paused, _current, _queued
    path = _loader.load(name)
    if _voice is not None:
        _sz.audio_stop(_voice)
    _voice = _sz.audio_play(path, loop, _volume)
    _paused = False
    _current = name
    _queued = None


def play(name):
    """Play a music file from the music/ directory. It loops when it finishes."""
    _play(name, True)


def play_once(name):
    """Play a music file from the music/ directory once."""
    _play(name, False)


def queue(name):
    """Queue a music file to follow the current track (here: plays when nothing is playing)."""
    global _queued
    _loader.load(name)
    if _voice is None:
        play_once(name)
    else:
        _queued = name


def is_playing(name):
    """Return True if the music is playing and not paused."""
    return _voice is not None and not _paused and (name is None or name == _current)


def stop():
    global _voice, _paused, _current
    if _voice is not None:
        _sz.audio_stop(_voice)
    _voice = None
    _paused = False
    _current = None


def pause():
    """Temporarily stop playback of the music stream (here: stops it)."""
    global _paused
    if _voice is not None:
        _sz.audio_volume(_voice, 0.0)
    _paused = True


def unpause():
    """Resume playback of the music stream after it has been paused."""
    global _paused
    if _voice is not None:
        _sz.audio_volume(_voice, _volume)
    _paused = False


def fadeout(seconds):
    """Fade out and stop the music."""
    stop()


def set_volume(volume):
    global _volume
    _volume = min(1.0, max(0.0, float(volume)))
    if _voice is not None and not _paused:
        _sz.audio_volume(_voice, _volume)


def get_volume():
    return _volume


def rewind():
    if _current is not None:
        _play(_current, True)


def get_pos():
    return -1 if _voice is None else 0


def set_pos(pos):
    pass
