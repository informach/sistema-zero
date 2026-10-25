"""pygame.mixer for the browser: the Studio's media service plays the project's sound files.

Sounds, channels and the music stream keep pygame-ce's API and bookkeeping (busy channels,
volumes, end events, queues). The browser reports when each sound ends, so ``get_busy`` and
``set_endevent`` follow what is really heard. Sounds are files of the project (WAV, OGG, MP3),
played from the beginning to the end: ``fadeout``/``fade_ms`` stop or start at once, and
``maxtime`` and ``music.play(start=...)`` are accepted and not applied (README).
"""
import os
import struct
import sys
import types

from pgzero import _sz

pygame = None
_initialized = False
_channels = []
_reserved = 0
_lengths = {}
_DEFAULT_CHANNELS = 8
_INIT = (44100, -16, 2)


def install(module):
    """Replace pygame.mixer (the SDL mixer needs a sound card) with this module."""
    global pygame
    pygame = module
    mixer = types.ModuleType('pygame.mixer', __doc__)
    for name in ('init', 'pre_init', 'quit', 'get_init', 'stop', 'pause', 'unpause', 'fadeout',
                 'set_num_channels', 'get_num_channels', 'set_reserved', 'find_channel',
                 'get_busy', 'get_sdl_mixer_version', 'Sound', 'Channel', 'SoundType',
                 'ChannelType'):
        setattr(mixer, name, globals()[name])
    music = types.ModuleType('pygame.mixer.music')
    for name in ('load', 'unload', 'play', 'rewind', 'stop', 'pause', 'unpause', 'fadeout',
                 'set_volume', 'get_volume', 'get_busy', 'set_pos', 'get_pos', 'queue',
                 'set_endevent', 'get_endevent'):
        setattr(music, name, getattr(_music, name))
    mixer.music = music
    sys.modules['pygame.mixer'] = mixer
    sys.modules['pygame.mixer.music'] = music
    pygame.mixer = mixer


def _error(text):
    return pygame.error(text)


def init(frequency=0, size=0, channels=0, buffer=0, devicename=None, allowedchanges=0):
    global _initialized
    if not _initialized:
        _initialized = True
        set_num_channels(_DEFAULT_CHANNELS)


def pre_init(frequency=0, size=0, channels=0, buffer=0, devicename=None, allowedchanges=0):
    pass


def quit():
    global _initialized
    if _initialized:
        stop()
        _music.stop()
    _initialized = False
    _channels.clear()


def get_init():
    return _INIT if _initialized else None


def _require():
    if not _initialized:
        raise _error('mixer not initialized')


def get_sdl_mixer_version(linked=True):
    return (2, 8, 0)


def set_num_channels(count):
    count = max(0, int(count))
    while len(_channels) > count:
        _channels.pop().stop()
    while len(_channels) < count:
        _channels.append(Channel._create(len(_channels)))


def get_num_channels():
    _require()
    return len(_channels)


def set_reserved(count):
    global _reserved
    _reserved = max(0, min(int(count), len(_channels)))
    return _reserved


def find_channel(force=False):
    _require()
    for channel in _channels[_reserved:]:
        if not channel.get_busy():
            return channel
    if force:
        candidates = _channels[_reserved:]
        if candidates:
            return min(candidates, key=lambda channel: channel._started)
    return None


def stop():
    _require()
    # One batched command, never one per channel: 64 channels would pass the frame's limit.
    _sz.audio_stop_many([channel._voice for channel in _channels if channel._voice is not None])
    for channel in _channels:
        channel._forget()


def pause():
    _require()
    voices = [channel._voice for channel in _channels
              if channel._voice is not None and not channel._paused]
    for channel in _channels:
        if channel._voice is not None:
            channel._paused = True
    _sz.audio_pause_many(voices)


def unpause():
    _require()
    voices = [channel._voice for channel in _channels
              if channel._voice is not None and channel._paused]
    for channel in _channels:
        channel._paused = False
    _sz.audio_resume_many(voices)


def fadeout(time):
    stop()


def get_busy():
    if not _initialized:
        return False
    return any(channel.get_busy() for channel in _channels)


def _path(file):
    if hasattr(file, 'read'):
        raise _error('No Estúdio, os sons vêm de arquivos do projeto: use o caminho do arquivo.')
    path = os.fspath(file)
    if not os.path.isfile(path):
        raise FileNotFoundError(f"No file '{path}' found in working directory '{os.getcwd()}'.")
    return _sz.project_path(path)


def _length(path):
    """Duration in seconds, read from the file header (pygame decodes the whole file)."""
    if path in _lengths:
        return _lengths[path]
    seconds = 0.0
    try:
        with open(os.path.join(_sz._root, path), 'rb') as handle:
            data = handle.read()
        seconds = _wav_length(data) or _ogg_length(data) or _mp3_length(data) or 0.0
    except OSError:
        pass
    _lengths[path] = seconds
    return seconds


def _wav_length(data):
    if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        return 0.0
    at, rate, block = 12, 0, 0
    while at + 8 <= len(data):
        chunk, size = data[at:at + 4], struct.unpack_from('<I', data, at + 4)[0]
        if chunk == b'fmt ':
            rate = struct.unpack_from('<I', data, at + 12)[0]
            block = struct.unpack_from('<H', data, at + 20)[0]
        elif chunk == b'data' and rate and block:
            return min(size, len(data) - at - 8) / (rate * block)
        at += 8 + size + (size & 1)
    return 0.0


def _ogg_length(data):
    if data[:4] != b'OggS':
        return 0.0
    head = data.find(b'\x01vorbis')
    rate = struct.unpack_from('<I', data, head + 12)[0] if head >= 0 else 0
    if not rate:
        head = data.find(b'OpusHead')
        rate = 48000 if head >= 0 else 0
    last = data.rfind(b'OggS')
    if not rate or last < 0 or last + 14 > len(data):
        return 0.0
    granule = struct.unpack_from('<q', data, last + 6)[0]
    return max(0.0, granule / rate)


# kbit/s by bitrate index 1-14, for (MPEG-1 or not, layer). MPEG-2 and 2.5 share one table.
_MP3_BITRATES = {
    (True, 1): (32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448),
    (True, 2): (32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384),
    (True, 3): (32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320),
    (False, 1): (32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256),
    (False, 2): (8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160),
    (False, 3): (8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160),
}
# Sample rates by version bits (3: MPEG-1, 2: MPEG-2, 0: MPEG-2.5; 1 is reserved).
_MP3_RATES = {3: (44100, 48000, 32000), 2: (22050, 24000, 16000), 0: (11025, 12000, 8000)}


def _mp3_length(data):
    """Seconds of an MPEG audio file: the Xing/Info frame count (VBR), else the first bitrate."""
    at = 0
    if data[:3] == b'ID3' and len(data) > 10:
        at = 10 + ((data[6] & 0x7F) << 21 | (data[7] & 0x7F) << 14 | (data[8] & 0x7F) << 7
                   | (data[9] & 0x7F))
    end = len(data) - (128 if data[-128:-125] == b'TAG' else 0)
    while True:
        at = data.find(b'\xff', at, end - 3)
        if at < 0:
            return 0.0
        version, layer = (data[at + 1] >> 3) & 3, 4 - ((data[at + 1] >> 1) & 3)
        index, rate_index = data[at + 2] >> 4, (data[at + 2] >> 2) & 3
        if (data[at + 1] & 0xE0 == 0xE0 and version != 1 and layer != 4 and 0 < index < 15
                and rate_index < 3):
            break
        at += 1
    mpeg1 = version == 3
    rate = _MP3_RATES[version][rate_index]
    samples = 384 if layer == 1 else 1152 if layer == 2 or mpeg1 else 576
    mono = data[at + 3] >> 6 == 3
    side = (17 if mono else 32) if mpeg1 else (9 if mono else 17)
    xing = at + 4 + side
    if data[xing:xing + 4] in (b'Xing', b'Info') and xing + 12 <= end:
        flags = struct.unpack_from('>I', data, xing + 4)[0]
        if flags & 1:
            return struct.unpack_from('>I', data, xing + 8)[0] * samples / rate
    return (end - at) * 8 / (_MP3_BITRATES[mpeg1, layer][index - 1] * 1000)


class Sound:
    """A sound effect read from a project file."""

    def __init__(self, file=None, buffer=None, array=None):
        _require()
        if file is None:
            raise _error('No Estúdio, os sons vêm de arquivos do projeto: Sound("sons/pulo.wav").')
        self._path = _path(file)
        self._volume = 1.0

    def play(self, loops=0, maxtime=0, fade_ms=0):
        channel = find_channel(force=False)
        if channel is None:
            return None
        channel.play(self, loops, maxtime, fade_ms)
        return channel

    def stop(self):
        for channel in _channels:
            if channel._sound is self:
                channel.stop()

    def fadeout(self, time):
        self.stop()

    def set_volume(self, value):
        self._volume = max(0.0, min(1.0, float(value)))
        for channel in _channels:
            if channel._sound is self:
                channel._apply_volume()

    def get_volume(self):
        return self._volume

    def get_num_channels(self):
        return sum(1 for channel in _channels if channel._sound is self and channel.get_busy())

    def get_length(self):
        return _length(self._path)

    def get_raw(self):
        raise _error('No Estúdio, os bytes de um som não são lidos pelo jogo.')

    def copy(self):
        twin = Sound.__new__(Sound)
        twin._path, twin._volume = self._path, self._volume
        return twin

    __copy__ = copy

    def __repr__(self):
        return f'<Sound object at {id(self):#x}>'


class Channel:
    """One of the mixer's channels: plays one sound at a time."""

    def __new__(cls, id):
        _require()
        if not 0 <= int(id) < len(_channels):
            raise IndexError('invalid channel index')
        return _channels[int(id)]

    @classmethod
    def _create(cls, index):
        channel = object.__new__(cls)
        channel._id = index
        channel._voice = None
        channel._sound = None
        channel._queued = None
        channel._volume = 1.0
        channel._endevent = pygame.NOEVENT if pygame else 0
        channel._paused = False
        channel._started = 0
        return channel

    def __init__(self, id):
        pass

    def _effective_volume(self):
        return (self._sound._volume if self._sound else 1.0) * self._volume

    def _apply_volume(self):
        if self._voice is not None:
            _sz.audio_volume(self._voice, self._effective_volume())

    def play(self, sound, loops=0, maxtime=0, fade_ms=0):
        self.stop()
        voice = _sz.audio_play(sound._path, int(loops), sound._volume * self._volume)
        if voice is None:
            return
        self._voice, self._sound, self._paused = voice, sound, False
        self._started = pygame.time.get_ticks()
        _sz.on_audio_end(voice, lambda voice=voice: self._ended(voice), wait=True)

    def _ended(self, voice):
        if self._voice != voice:
            return
        self._voice = self._sound = None
        if self._endevent != pygame.NOEVENT:
            pygame.event.post(pygame.event.Event(self._endevent))
        if self._queued is not None:
            queued, self._queued = self._queued, None
            self.play(queued)

    def stop(self):
        if self._voice is not None:
            _sz.audio_stop(self._voice)
        self._forget()

    def _forget(self):
        self._voice = self._sound = self._queued = None
        self._paused = False

    def pause(self):
        if self._voice is not None and not self._paused:
            self._paused = True
            _sz.audio_pause(self._voice)

    def unpause(self):
        if self._voice is not None and self._paused:
            self._paused = False
            _sz.audio_resume(self._voice)

    def fadeout(self, time):
        self.stop()

    def set_volume(self, value, right=None):
        if right is not None:
            value = (float(value) + float(right)) / 2
        self._volume = max(0.0, min(1.0, float(value)))
        self._apply_volume()

    def get_volume(self):
        return self._volume

    def get_busy(self):
        # As in SDL_mixer (Mix_Playing), a paused channel is still busy: it keeps its sound.
        return self._voice is not None

    def get_sound(self):
        return self._sound

    def queue(self, sound):
        if self._voice is None:
            self.play(sound)
        else:
            self._queued = sound

    def get_queue(self):
        return self._queued

    def set_endevent(self, type=None):
        self._endevent = pygame.NOEVENT if type is None else int(getattr(type, 'type', type))

    def get_endevent(self):
        return self._endevent

    @property
    def id(self):
        return self._id

    def __repr__(self):
        return f'<Channel object at {id(self):#x}>'


SoundType = Sound
ChannelType = Channel


class _Music:
    """pygame.mixer.music: one long stream on its own channel."""

    def __init__(self):
        self._path = None
        self._voice = None
        self._volume = 1.0
        self._paused = False
        self._started = 0
        self._loops = 0
        self._paused_at = 0
        # (path, loops) of the next track (music.queue).
        self._queued = None
        self._endevent = 0

    def load(self, filename, namehint=''):
        _require()
        self.stop()
        self._path = _path(filename)

    def unload(self):
        self.stop()
        self._path = None

    def play(self, loops=0, start=0.0, fade_ms=0):
        # The Studio's audio queue plays a file from its beginning: start and fade_ms are
        # accepted and not applied (README, "pygame.mixer").
        _require()
        if self._path is None:
            raise _error('music not loaded')
        self.stop()
        self._start(int(loops))

    def _start(self, loops):
        voice = _sz.audio_play(self._path, loops, self._volume, music=True)
        self._voice, self._paused, self._loops = voice, False, loops
        self._started = pygame.time.get_ticks()
        if voice is not None:
            _sz.on_audio_end(voice, lambda voice=voice: self._ended(voice), wait=True)

    def _ended(self, voice):
        if self._voice != voice:
            return
        self._voice = None
        if self._endevent:
            pygame.event.post(pygame.event.Event(self._endevent))
        if self._queued is not None:
            (self._path, loops), self._queued = self._queued, None
            self._start(loops)

    def rewind(self):
        """From the beginning again, with the same loops, queue and pause as before."""
        if self._voice is None:
            return
        paused = self._paused
        _sz.audio_stop(self._voice)
        self._start(self._loops)
        if paused:
            self.pause()

    def stop(self):
        if self._voice is not None:
            _sz.audio_stop(self._voice)
        self._voice = None
        self._paused = False
        self._queued = None

    def pause(self):
        if self._voice is not None and not self._paused:
            self._paused = True
            self._paused_at = pygame.time.get_ticks()
            _sz.audio_pause(self._voice)

    def unpause(self):
        if self._voice is not None and self._paused:
            self._paused = False
            self._started += pygame.time.get_ticks() - self._paused_at
            _sz.audio_resume(self._voice)

    def fadeout(self, time):
        self.stop()

    def set_volume(self, volume):
        self._volume = max(0.0, min(1.0, float(volume)))
        if self._voice is not None:
            _sz.audio_volume(self._voice, self._volume)

    def get_volume(self):
        return self._volume

    def get_busy(self):
        return self._voice is not None and not self._paused

    def set_pos(self, pos):
        raise _error('No Estúdio, a música toca do começo: set_pos não está disponível.')

    def get_pos(self):
        if self._voice is None:
            return -1
        end = self._paused_at if self._paused else pygame.time.get_ticks()
        return end - self._started

    def queue(self, filename, namehint='', loops=0):
        path = _path(filename)
        if self._voice is None:
            self._path = path
            self.play(loops)
        else:
            self._queued = (path, int(loops))

    def set_endevent(self, type=None):
        self._endevent = 0 if type is None else int(getattr(type, 'type', type))

    def get_endevent(self):
        return self._endevent or pygame.NOEVENT


_music = _Music()
