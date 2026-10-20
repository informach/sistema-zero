"""Native streaming output. Install the declared dependencies; never invoke a shell."""
import atexit
from array import array
from pathlib import Path
import sys
from threading import Lock
import time
from . import _MODULE, _POLICY
from ._mixer import Mixer
from ._wav import inspect

_mixer = Mixer()
_lifecycle = Lock()
_device = None
_generator = None
_failure = None
_sequence = 0
_window_start = 0.0
_commands = 0
_native_module = None
_RATE = 48000


def _native():
    global _native_module
    if _native_module is None:
        try:
            import miniaudio
        except ModuleNotFoundError as error:
            raise RuntimeError('Instale as dependências de áudio nativas indicadas no LEIA-ME da exportação.') from error
        if miniaudio.__version__ != _MODULE['native']['dependencies']['miniaudio']:
            raise RuntimeError('A versão de miniaudio difere das dependências declaradas na exportação.')
        _native_module = miniaudio
    return _native_module


def _stream(path):
    native = _native()
    # stream_file already returns a primed generator (public API, miniaudio 1.71).
    return native.stream_file(str(path), output_format=native.SampleFormat.FLOAT32,
                              nchannels=2, sample_rate=_RATE, frames_to_read=1024)


class _Source:
    def __init__(self, path, loop, duration):
        self.path = path
        self.loop = loop
        self.position = 0
        self.cached = None
        self.stream = None
        if loop and duration <= 0.1:
            native = _native()
            self.cached = native.decode_file(str(path), output_format=native.SampleFormat.FLOAT32,
                                             nchannels=2, sample_rate=_RATE).samples
            if not self.cached or len(self.cached) % 2 or len(self.cached) > 32768:
                raise RuntimeError('O som em repetição excedeu o limite do buffer curto.')
        else:
            self.stream = _stream(path)

    def read(self, frames):
        if self.cached is not None:
            length = len(self.cached)
            result = array('f', (self.cached[(self.position + i) % length] for i in range(frames * 2)))
            self.position = (self.position + len(result)) % length
            return result, False
        result = array('f')
        remaining = frames
        restarts = 0
        while remaining:
            try:
                samples = self.stream.send(remaining)
            except StopIteration:
                self.stream = None
                if not self.loop:
                    return result, True
                restarts += 1
                if restarts > 8:
                    raise RuntimeError('O decoder excedeu o limite de reinícios por bloco.')
                self.stream = _stream(self.path)
                continue
            if not samples or len(samples) % 2 or len(samples) > remaining * 2:
                raise RuntimeError('O decoder devolveu um bloco de áudio inválido.')
            result.extend(samples)
            remaining -= len(samples) // 2
        return result, False

    def close(self):
        if self.stream is not None:
            self.stream.close()
            self.stream = None
        self.cached = None


def _failed(error):
    global _failure
    if _failure is None:
        _failure = error
        print(f'Áudio Python: {error}', file=sys.stderr)
    _mixer.stop()


def _output():
    frames = yield array('f')
    while True:
        try:
            samples = _mixer.read(frames)
        except Exception as error:
            _failed(error)
            # Callback count is bounded before allocating a recovery block.
            samples = array('f', [0.0]) * (min(max(int(frames), 0), 16384) * 2)
        frames = yield samples


def _ensure_device():
    global _device, _generator
    if _device is None:
        native = _native()
        device = native.PlaybackDevice(output_format=native.SampleFormat.FLOAT32,
                                       nchannels=2, sample_rate=_RATE, buffersize_msec=20,
                                       app_name='Sistema Zero Python')
        if device.backend.lower() == 'null':
            device.close()
            raise RuntimeError('Nenhum dispositivo de som real está disponível.')
        device.stop_callback = lambda: _failed(RuntimeError('O dispositivo de som foi interrompido.')) if _mixer.active else None
        generator = _output()
        next(generator)
        _device, _generator = device, generator
    return _device


def _budget():
    global _window_start, _commands
    now = time.monotonic()
    if now - _window_start >= 1:
        _window_start, _commands = now, 0
    _commands += 1
    if _commands > _POLICY['commandsPerSecond']:
        raise RuntimeError('O programa excedeu o limite de comandos de áudio.')


def play(path, *, loop, volume):
    global _sequence
    path = Path(path).resolve()
    metadata = inspect(path)
    with _lifecycle:
        _budget()
        if _failure is not None:
            raise RuntimeError('O dispositivo de som falhou; reinicie o programa.') from _failure
        if _mixer.active >= _POLICY['voices']:
            raise RuntimeError('O programa atingiu o limite de sons simultâneos.')
        source = _Source(path, loop, metadata['durationSeconds'])
        handle = None
        try:
            device = _ensure_device()
            _sequence += 1
            handle = _sequence
            _mixer.add(handle, source, volume)
            if not device.running:
                # Never hold the mixer's lock while the output thread starts.
                device.start(_generator)
            return handle
        except BaseException:
            source.close()
            if handle is not None:
                _mixer.stop(handle)
            raise


def stop(handle=None):
    with _lifecycle:
        _budget()
        _mixer.stop(handle)
        if _device is not None and not _mixer.active:
            _device.stop()


def _shutdown():
    global _device, _generator
    with _lifecycle:
        _mixer.stop()
        if _device is not None:
            _device.close()
            _device = None
        if _generator is not None:
            _generator.close()
            _generator = None


atexit.register(_shutdown)
