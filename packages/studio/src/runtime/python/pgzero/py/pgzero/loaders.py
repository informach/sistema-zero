"""Resource loaders (Pygame Zero 1.2.1 API) for the Studio's browser runtime.

Same folders, extensions, lower-case rule and caching as Pygame Zero; only the final load step
differs: images become browser-painted surfaces and sounds are played by the Studio's media
service. Messages are in Portuguese.
"""
import os.path
import struct
import sys

from . import _sz

root = '.'


def set_root(path):
    """Configure all loaders to load from the given root."""
    global root
    path = os.path.abspath(path)
    root = path if os.path.isdir(path) else os.path.dirname(path)
    if root not in sys.path:
        sys.path.insert(0, root)


class InvalidCase(Exception):
    """Indicate case errors early so they don't bite cross-platform users."""


def validate_lowercase(relpath):
    if relpath.lower() != relpath:
        raise InvalidCase(
            "%r não está em letras minúsculas. Use nomes de arquivo só com minúsculas: "
            "em outros computadores, Arquivo.png e arquivo.png são arquivos diferentes." % relpath
        )


def validate_compatible_path(path):
    validate_lowercase(os.path.relpath(path, root))


class ResourceLoader:
    """Loads resources from a subfolder of the game's folder, caching each one."""

    def __init__(self, subpath):
        self.subpath = subpath
        self.cache = {}
        self.have_root = False

    def validate_root(self, name):
        r = self._root()
        self.have_root = os.path.exists(r)
        if self.have_root:
            validate_compatible_path(r)
        else:
            raise KeyError(
                "Não encontrei a pasta '{subpath}' para carregar {type} '{name}'.".format(
                    subpath=self.subpath, type=self.TYPE_PT, name=name
                )
            )

    def _root(self):
        return os.path.join(root, self.subpath)

    @staticmethod
    def cache_key(name, args, kwargs):
        return (name, args, tuple(sorted(kwargs.items())))

    def load(self, name, *args, **kwargs):
        key = self.cache_key(name, args, kwargs)
        if key in self.cache:
            return self.cache[key]
        if not self.have_root:
            self.validate_root(name)
        p = os.path.join(self._root(), name)
        if not os.path.isfile(p):
            for ext in self.EXTNS:
                p = os.path.join(self._root(), name + '.' + ext)
                if os.path.exists(p):
                    break
            else:
                raise KeyError(
                    "Não encontrei {type} '{name}' na pasta {subpath}/ (procurei {options}).".format(
                        type=self.TYPE_PT,
                        name=name,
                        subpath=self.subpath,
                        options=', '.join(name + '.' + ext for ext in self.EXTNS),
                    )
                )
        validate_compatible_path(p)
        res = self.cache[key] = self._load(p, *args, **kwargs)
        return res

    def __getattr__(self, name):
        if name.startswith('__'):
            raise AttributeError(name)
        p = os.path.join(self._root(), name)
        if os.path.isdir(p):
            resource = self.__class__(os.path.join(self.subpath, name))
        else:
            try:
                resource = self.load(name)
            except KeyError as e:
                raise AttributeError(*e.args) from None
        setattr(self, name, resource)
        return resource


class ImageLoader(ResourceLoader):
    # 'svg' is a Studio addition: vector drawings from Pinta stay vector in the browser. The
    # desktop export turns each one into a PNG of the same size, which pgzero 1.2.1 finds.
    EXTNS = ['png', 'gif', 'jpg', 'jpeg', 'bmp', 'svg']
    TYPE = 'image'
    TYPE_PT = 'a imagem'

    def _load(self, path):
        return _sz.Surface(path)


class UnsupportedFormat(Exception):
    """The resource was not in a supported format."""


def _wav_length(path):
    try:
        with open(path, 'rb') as stream:
            data = stream.read(1 << 16)
        if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
            return None
        offset = 12
        byte_rate = None
        while offset + 8 <= len(data):
            chunk, size = data[offset:offset + 4], struct.unpack('<I', data[offset + 4:offset + 8])[0]
            if chunk == b'fmt ':
                byte_rate = struct.unpack('<I', data[offset + 16:offset + 20])[0]
            elif chunk == b'data' and byte_rate:
                return size / byte_rate
            offset += 8 + size + (size & 1)
    except (OSError, struct.error):
        return None
    return None



def _ogg_length(path):
    """Seconds of an Ogg Vorbis or Opus file: the last page's position over the sample rate."""
    try:
        with open(path, 'rb') as stream:
            data = stream.read()
        if data[:4] != b'OggS':
            return None
        vorbis = data.find(b'\x01vorbis')
        opus = data.find(b'OpusHead')
        last = data.rfind(b'OggS')
        granule = struct.unpack('<q', data[last + 6:last + 14])[0]
        if vorbis >= 0:
            rate = struct.unpack('<I', data[vorbis + 12:vorbis + 16])[0]
            return granule / rate if rate else None
        if opus >= 0:
            pre_skip = struct.unpack('<H', data[opus + 10:opus + 12])[0]
            return max(0, granule - pre_skip) / 48000
    except (OSError, struct.error):
        return None
    return None


def _sound_length(path):
    return _wav_length(path) if str(path).lower().endswith('.wav') else _ogg_length(path)

# Voices a sound remembers; the oldest that do not repeat forever are forgotten first.
_MAX_VOICES = 32


class Sound:
    """A sound effect from sounds/ (pygame.mixer.Sound subset)."""

    def __init__(self, path):
        # The Studio's media service names files from the project root.
        self._path = _sz.project_path(path)
        self._volume = 1.0
        # voice → True when it repeats until stop() (it never ends by itself).
        self._voices = {}
        self._length = _sound_length(path)

    def play(self, loops=0, maxtime=0, fade_ms=0):
        """Play the sound. loops=N plays it N more times; loops=-1 repeats it until stop()."""
        repeat = -1 if loops < 0 else int(loops)
        # The browser repeats it at once, without a gap between the plays.
        voice = _sz.audio_play(self._path, repeat, self._volume)
        if voice is None:
            return None  # Like pygame with every channel busy: the sound is not played.
        self._voices[voice] = repeat < 0
        # A sound that ends by itself is watched, so get_num_channels() drops it when it ends.
        _sz.on_audio_end(voice, lambda: self._voices.pop(voice, None), wait=repeat >= 0)
        if len(self._voices) > _MAX_VOICES:
            for old, forever in list(self._voices.items()):
                if not forever:
                    del self._voices[old]
                    break
        return None

    def stop(self):
        _sz.audio_stop_many(list(self._voices))
        self._voices = {}

    fadeout = lambda self, ms=0: self.stop()  # noqa: E731

    def set_volume(self, value):
        self._volume = min(1.0, max(0.0, float(value)))
        _sz.audio_volume_many(list(self._voices), self._volume)

    def get_volume(self):
        return self._volume

    def get_length(self):
        return self._length if self._length is not None else 0.0

    def get_num_channels(self):
        return len(self._voices)

    def __repr__(self):
        return f'<Sound {self._path}>'


class SoundLoader(ResourceLoader):
    EXTNS = ['wav', 'ogg', 'oga']
    TYPE = 'sound'
    TYPE_PT = 'o som'

    def _load(self, path):
        return Sound(path)


class FontLoader(ResourceLoader):
    EXTNS = ['ttf']
    TYPE = 'font'
    TYPE_PT = 'a fonte'

    def _load(self, path, fontsize=None):
        # Relative to the project root, where the browser reads it from.
        return _sz.project_path(path)


images = ImageLoader('images')
sounds = SoundLoader('sounds')
fonts = FontLoader('fonts')
