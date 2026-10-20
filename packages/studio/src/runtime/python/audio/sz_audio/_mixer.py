"""One bounded stereo mixer; output-device callbacks and project calls share this lock."""
from array import array
from threading import RLock
from . import _POLICY


class Mixer:
    def __init__(self):
        self._lock = RLock()
        self._voices = {}

    @property
    def active(self):
        with self._lock:
            return len(self._voices)

    def add(self, handle, source, volume):
        with self._lock:
            if handle in self._voices or len(self._voices) >= _POLICY['voices']:
                raise RuntimeError('O programa atingiu o limite de sons simultâneos.')
            self._voices[handle] = (source, volume)

    def stop(self, handle=None):
        with self._lock:
            handles = list(self._voices) if handle is None else [handle]
            for identifier in handles:
                voice = self._voices.pop(identifier, None)
                if voice is not None:
                    voice[0].close()

    def read(self, frames):
        if type(frames) is not int or not 0 <= frames <= 16384:
            raise RuntimeError('O dispositivo solicitou um bloco de áudio fora do limite.')
        mixed = array('f', [0.0]) * (frames * 2)
        with self._lock:
            for handle, (source, volume) in list(self._voices.items()):
                samples, ended = source.read(frames)
                if len(samples) > len(mixed) or len(samples) % 2:
                    raise RuntimeError('O decoder devolveu um bloco de áudio inválido.')
                for index, sample in enumerate(samples):
                    mixed[index] += sample * volume
                if ended:
                    self._voices.pop(handle)
                    source.close()
        for index, sample in enumerate(mixed):
            mixed[index] = max(-1.0, min(1.0, sample))
        return mixed
