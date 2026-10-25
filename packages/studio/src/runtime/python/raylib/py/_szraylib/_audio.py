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
                 'last_update', 'stalled', 'length', 'dead', 'played', 'mark')

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
        # Carregado antes de init_audio_device(): no computador ele nunca toca.
        self.dead = False
        # Segundos tocados de verdade (sem pausa e sem a música travada).
        self.played = 0.0
        self.mark = 0.0


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


def _ogg_frames(data):
    # Vorbis ou Opus: a taxa vem no cabeçalho e o total de quadros na posição (granule) da
    # última página. É o que o decodificador do raylib conta.
    rate = skip = 0
    vorbis = data.find(b'\x01vorbis')
    opus = data.find(b'OpusHead')
    if vorbis >= 0 and len(data) >= vorbis + 16:
        rate = _bin.unpack('<I', data[vorbis + 12:vorbis + 16])[0]
    elif opus >= 0 and len(data) >= opus + 12:
        rate, skip = 48000, _bin.unpack('<H', data[opus + 10:opus + 12])[0]
    last = data.rfind(b'OggS')
    if not rate or last < 0 or len(data) < last + 14:
        return 0, 0.0
    frames = max(0, _bin.unpack('<q', data[last + 6:last + 14])[0] - skip)
    return frames, frames / rate


_MP3_RATES = {3: (44100, 48000, 32000), 2: (22050, 24000, 16000), 0: (11025, 12000, 8000)}
_MP3_KBPS = {
    3: (0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320),
    2: (0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160),
}


def _mp3_frames(data):
    # Anda de quadro em quadro do MPEG (camada III), depois da etiqueta ID3.
    position = 0
    if data[:3] == b'ID3' and len(data) >= 10:
        size = data[6:10]
        position = 10 + ((size[0] & 127) << 21 | (size[1] & 127) << 14 | (size[2] & 127) << 7
                         | (size[3] & 127))
    frames = rate = 0
    while position + 4 <= len(data) and frames < 500_000_000:
        a, b, c = data[position], data[position + 1], data[position + 2]
        version, layer = (b >> 3) & 3, (b >> 1) & 3
        bitrate_index, rate_index = c >> 4, (c >> 2) & 3
        if (a != 0xFF or (b & 0xE0) != 0xE0 or version == 1 or layer != 1 or rate_index == 3
                or bitrate_index in (0, 15)):
            position += 1
            continue
        rate = _MP3_RATES[version][rate_index]
        kbps = _MP3_KBPS[3 if version == 3 else 2][bitrate_index]
        samples = 1152 if version == 3 else 576
        size = samples // 8 * kbps * 1000 // rate + ((c >> 1) & 1)
        if size <= 4:
            break
        frames += samples
        position += size
    return frames, (frames / rate if rate else 0.0)


def _flac_frames(data):
    # STREAMINFO: 20 bits de taxa e 36 bits de quadros no total.
    if data[:4] != b'fLaC' or len(data) < 26:
        return 0, 0.0
    info = data[18:26]
    rate = (info[0] << 12) | (info[1] << 4) | (info[2] >> 4)
    frames = ((info[3] & 15) << 32) | _bin.unpack('>I', info[4:8])[0]
    return frames, (frames / rate if rate else 0.0)


def _qoa_frames(data):
    if data[:4] != b'qoaf' or len(data) < 16:
        return 0, 0.0
    frames = _bin.unpack('>I', data[4:8])[0]
    rate = int.from_bytes(data[9:12], 'big')
    return frames, (frames / rate if rate else 0.0)


def _media_frames(absolute, extension):
    """Quadros e duração do arquivo, lidos do cabeçalho como o raylib os conhece."""
    if extension == '.wav':
        return _wav_frames(absolute)
    readers = {'.ogg': _ogg_frames, '.mp3': _mp3_frames, '.flac': _flac_frames,
               '.qoa': _qoa_frames}
    if extension not in readers:
        return 0, 0.0
    try:
        with open(absolute, 'rb') as stream:
            data = stream.read(64 * 1024 * 1024)
        return readers[extension](data)
    except (OSError, IndexError, _bin.error):
        return 0, 0.0


def _load(path, function, music):
    value = text(path, function, 'fileName')
    extension = os.path.splitext(value)[1].lower()
    if extension not in _SUPPORTED:
        raise ValueError(f'{function}: o raylib toca WAV, OGG, MP3, FLAC e QOA, e o arquivo '
                         f'{value!r} é {extension or "sem extensão"}.')
    relative, absolute = rt.project_path(value, function)
    frames, seconds = _media_frames(absolute, extension)
    voice = _Voice(relative, music, seconds)
    if not _ready:
        # No computador, o som carregado antes de init_audio_device() fica inválido (sem
        # quadros) e a música fica muda para sempre.
        voice.dead = True
        if not music:
            frames = 0
        _warn_once('early', 'carregue os sons e as músicas DEPOIS de init_audio_device(): '
                            'o que foi carregado antes nunca toca.')
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


def _account(voice):
    now = rt.window.now
    if voice.playing and not voice.paused and not voice.stalled:
        voice.played += max(0.0, now - voice.mark)
    voice.mark = now


def _play(voice):
    if voice.dead:
        return
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
    voice.played = 0.0
    voice.mark = rt.window.now


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
                # A música tocou até a última atualização, não até agora.
                voice.played += max(0.0, voice.last_update - voice.mark)
                voice.mark = now
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
        voice = _voice(sound, Sound, 'is_sound_valid')[1]
    except (TypeError, ValueError):
        return False
    return not voice.dead


is_sound_ready = is_sound_valid


def play_sound(sound, /):
    _play(_voice(sound, Sound, 'play_sound')[1])


def stop_sound(sound, /):
    _stop(_voice(sound, Sound, 'stop_sound')[1])


def pause_sound(sound, /):
    voice = _voice(sound, Sound, 'pause_sound')[1]
    if voice.playing and not voice.paused:
        _account(voice)
        voice.paused = True
        _send(['pause', voice.id])


def resume_sound(sound, /):
    voice = _voice(sound, Sound, 'resume_sound')[1]
    if voice.playing and voice.paused:
        _account(voice)
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
    _warn_once('pitch', 'set_sound_pitch ainda não muda o tom (pitch) no Estúdio; no computador ele muda.')


def set_sound_pan(sound, pan, /):
    _voice(sound, Sound, 'set_sound_pan')
    number(pan, 'set_sound_pan', 'pan')
    _warn_once('pan', 'set_sound_pan ainda não muda o lado do som (pan) no Estúdio; no computador ele muda.')


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
        voice.mark = rt.window.now
        voice.stalled = False
        if not voice.paused:
            _send(['resume', voice.id])


def stop_music_stream(music, /):
    _stop(_voice(music, Music, 'stop_music_stream')[1])


def pause_music_stream(music, /):
    voice = _voice(music, Music, 'pause_music_stream')[1]
    if voice.playing and not voice.paused:
        _account(voice)
        voice.paused = True
        if not voice.stalled:
            _send(['pause', voice.id])


def resume_music_stream(music, /):
    voice = _voice(music, Music, 'resume_music_stream')[1]
    if voice.playing and voice.paused:
        _account(voice)
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
    _warn_once('pitch', 'set_music_pitch ainda não muda o tom (pitch) no Estúdio; no computador ele muda.')


def set_music_pan(music, pan, /):
    _voice(music, Music, 'set_music_pan')
    number(pan, 'set_music_pan', 'pan')
    _warn_once('pan', 'set_music_pan ainda não muda o lado do som (pan) no Estúdio; no computador ele muda.')


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
    _account(voice)
    played = voice.played
    if voice.length > 0 and voice.looping:
        played %= voice.length
    return played
