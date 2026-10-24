"""Som e música do raylib (raudio.c), tocados pelo serviço de mídia do Estúdio.

Os comandos viajam junto do quadro, no mesmo formato do Pygame Zero. Duas regras do raylib que
mudam o que a criança ouve, e que repetimos:

* sem ``init_audio_device()`` nenhum som toca;
* a música só continua se ``update_music_stream(musica)`` rodar a cada quadro: no computador,
  esquecer essa linha trava a música. Aqui ela também para, e o Console explica o porquê.
"""
import os
import struct as _bin

from . import _rt as rt
from ._args import number, struct, text
from ._structs import AudioStream, Music, Sound

_SUPPORTED = ('.wav', '.ogg', '.mp3', '.flac', '.qoa')
_ready = False
_master = 1.0
_warned = set()
_voices = {}        # voz -> _Voice
_next_voice = 0


class _Voice:
    __slots__ = ('id', 'path', 'volume', 'playing', 'paused', 'music', 'looping', 'started',
                 'last_update', 'stalled', 'length')

    def __init__(self, path, music, length):
        global _next_voice
        _next_voice += 1
        self.id = _next_voice
        self.path = path
        self.volume = 1.0
        self.playing = False
        self.paused = False
        self.music = music
        self.looping = True
        self.started = 0.0
        self.last_update = 0.0
        self.stalled = False
        self.length = length


def _warn_once(key, message):
    if key not in _warned and len(_warned) < 64:
        _warned.add(key)
        print(f'Aviso: {message}')


def _wav_frames(absolute):
    try:
        with open(absolute, 'rb') as stream:
            head = stream.read(4096)
        if head[:4] != b'RIFF' or head[8:12] != b'WAVE':
            return 0, 0.0
        channels = sample_rate = bits = 0
        position = 12
        while position + 8 <= len(head):
            chunk, size = head[position:position + 4], _bin.unpack('<I', head[position + 4:position + 8])[0]
            if chunk == b'fmt ':
                channels, sample_rate = _bin.unpack('<HI', head[position + 10:position + 16])
                bits = _bin.unpack('<H', head[position + 22:position + 24])[0]
            elif chunk == b'data' and channels and bits:
                frames = size // (channels * bits // 8)
                return frames, frames / sample_rate if sample_rate else 0.0
            position += 8 + size + (size & 1)
    except OSError:
        pass
    return 0, 0.0


def _load(path, function, music):
    value = text(path, function, 'fileName')
    extension = os.path.splitext(value)[1].lower()
    if extension not in _SUPPORTED:
        raise ValueError(f'{function}: o raylib toca WAV, OGG, MP3, FLAC e QOA, e o arquivo '
                         f'{value!r} é {extension or "sem extensão"}.')
    relative, absolute = rt.project_path(value, function)
    frames, seconds = _wav_frames(absolute) if extension == '.wav' else (0, 0.0)
    voice = _Voice(relative, music, seconds)
    _voices[voice.id] = voice
    stream = AudioStream(voice, None, 44100, 16, 2)
    return voice, stream, frames


def _voice(value, cls, function):
    item = struct(value, cls, function, 'sound' if cls is Sound else 'music')
    voice = item.stream.buffer
    if not isinstance(voice, _Voice):
        raise ValueError(f'{function}: este {cls._name} não foi carregado (use load_sound ou '
                         'load_music_stream).')
    return item, voice


def _send(command):
    if len(rt.audio) < rt.MAX_AUDIO_COMMANDS:
        rt.audio.append(command)


def _play(voice):
    if not _ready:
        _warn_once('device', 'nenhum som toca antes de init_audio_device(). Chame '
                             'init_audio_device() logo depois de init_window(...).')
        return
    if voice.playing:
        _send(['stop', voice.id])
    repeat = -1 if voice.music and voice.looping else 0
    _send(['play', voice.id, voice.path, repeat, voice.volume * _master, False])
    voice.playing = True
    voice.paused = False
    voice.stalled = False
    voice.started = rt.window.now
    voice.last_update = rt.window.now


def _stop(voice):
    if voice.playing:
        _send(['stop', voice.id])
    voice.playing = False
    voice.paused = False


def ended(voices):
    """Vozes que o navegador terminou de tocar."""
    for identifier in voices:
        voice = _voices.get(identifier)
        if voice is not None and not voice.music:
            voice.playing = False


def watch_music():
    """Música sem update_music_stream há meio segundo trava, como no computador."""
    now = rt.window.now
    for voice in _voices.values():
        if voice.music and voice.playing and not voice.paused and not voice.stalled:
            if now - voice.last_update > 0.5:
                voice.stalled = True
                _send(['pause', voice.id])
                _warn_once('update', 'a música parou: no raylib, chame update_music_stream(musica) '
                                     'a cada quadro, dentro do laço do jogo.')


# Dispositivo ------------------------------------------------------------------------------------

def init_audio_device():
    global _ready
    _ready = True


def close_audio_device():
    global _ready
    for voice in _voices.values():
        _stop(voice)
    _ready = False


def is_audio_device_ready():
    return _ready


def set_master_volume(volume, /):
    global _master
    _master = max(0.0, min(1.0, number(volume, 'set_master_volume', 'volume')))
    for voice in _voices.values():
        if voice.playing:
            _send(['volume', voice.id, voice.volume * _master])


def get_master_volume():
    return _master


# Sons -------------------------------------------------------------------------------------------

def load_sound(fileName, /):
    voice, stream, frames = _load(fileName, 'load_sound', False)
    return Sound(stream, frames)


def load_sound_alias(source, /):
    item, voice = _voice(source, Sound, 'load_sound_alias')
    copy = _Voice(voice.path, False, voice.length)
    _voices[copy.id] = copy
    return Sound(AudioStream(copy, None, 44100, 16, 2), item.frameCount)


def unload_sound(sound, /):
    item, voice = _voice(sound, Sound, 'unload_sound')
    _stop(voice)
    _voices.pop(voice.id, None)


unload_sound_alias = unload_sound


def is_sound_valid(sound, /):
    try:
        _voice(sound, Sound, 'is_sound_valid')
    except (TypeError, ValueError):
        return False
    return True


is_sound_ready = is_sound_valid


def play_sound(sound, /):
    _play(_voice(sound, Sound, 'play_sound')[1])


def stop_sound(sound, /):
    _stop(_voice(sound, Sound, 'stop_sound')[1])


def pause_sound(sound, /):
    voice = _voice(sound, Sound, 'pause_sound')[1]
    if voice.playing and not voice.paused:
        voice.paused = True
        _send(['pause', voice.id])


def resume_sound(sound, /):
    voice = _voice(sound, Sound, 'resume_sound')[1]
    if voice.playing and voice.paused:
        voice.paused = False
        _send(['resume', voice.id])


def is_sound_playing(sound, /):
    voice = _voice(sound, Sound, 'is_sound_playing')[1]
    return voice.playing and not voice.paused


def set_sound_volume(sound, volume, /):
    voice = _voice(sound, Sound, 'set_sound_volume')[1]
    voice.volume = max(0.0, number(volume, 'set_sound_volume', 'volume'))
    if voice.playing:
        _send(['volume', voice.id, voice.volume * _master])


def set_sound_pitch(sound, pitch, /):
    _voice(sound, Sound, 'set_sound_pitch')
    number(pitch, 'set_sound_pitch', 'pitch')


def set_sound_pan(sound, pan, /):
    _voice(sound, Sound, 'set_sound_pan')
    number(pan, 'set_sound_pan', 'pan')


# Música -----------------------------------------------------------------------------------------

def load_music_stream(fileName, /):
    voice, stream, frames = _load(fileName, 'load_music_stream', True)
    return Music(stream, frames, True, 0, None)


def unload_music_stream(music, /):
    item, voice = _voice(music, Music, 'unload_music_stream')
    _stop(voice)
    _voices.pop(voice.id, None)


def is_music_valid(music, /):
    try:
        _voice(music, Music, 'is_music_valid')
    except (TypeError, ValueError):
        return False
    return True


is_music_ready = is_music_valid


def play_music_stream(music, /):
    item, voice = _voice(music, Music, 'play_music_stream')
    voice.looping = bool(item.looping)
    _play(voice)


def update_music_stream(music, /):
    item, voice = _voice(music, Music, 'update_music_stream')
    voice.last_update = rt.window.now
    if voice.stalled and voice.playing:
        voice.stalled = False
        if not voice.paused:
            _send(['resume', voice.id])


def stop_music_stream(music, /):
    _stop(_voice(music, Music, 'stop_music_stream')[1])


def pause_music_stream(music, /):
    voice = _voice(music, Music, 'pause_music_stream')[1]
    if voice.playing and not voice.paused:
        voice.paused = True
        if not voice.stalled:
            _send(['pause', voice.id])


def resume_music_stream(music, /):
    voice = _voice(music, Music, 'resume_music_stream')[1]
    if voice.playing and voice.paused:
        voice.paused = False
        voice.last_update = rt.window.now
        voice.stalled = False
        _send(['resume', voice.id])


def is_music_stream_playing(music, /):
    voice = _voice(music, Music, 'is_music_stream_playing')[1]
    return voice.playing and not voice.paused


def set_music_volume(music, volume, /):
    voice = _voice(music, Music, 'set_music_volume')[1]
    voice.volume = max(0.0, number(volume, 'set_music_volume', 'volume'))
    if voice.playing:
        _send(['volume', voice.id, voice.volume * _master])


def set_music_pitch(music, pitch, /):
    _voice(music, Music, 'set_music_pitch')
    number(pitch, 'set_music_pitch', 'pitch')


def set_music_pan(music, pan, /):
    _voice(music, Music, 'set_music_pan')
    number(pan, 'set_music_pan', 'pan')


def seek_music_stream(music, position, /):
    _voice(music, Music, 'seek_music_stream')
    number(position, 'seek_music_stream', 'position')
    _warn_once('seek', 'seek_music_stream ainda não muda o ponto da música no Estúdio.')


def get_music_time_length(music, /):
    return _voice(music, Music, 'get_music_time_length')[1].length


def get_music_time_played(music, /):
    voice = _voice(music, Music, 'get_music_time_played')[1]
    if not voice.playing:
        return 0.0
    played = rt.window.now - voice.started
    if voice.length > 0 and voice.looping:
        played %= voice.length
    return played
