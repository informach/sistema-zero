"""Pygame Zero's tone generator (pgzero 1.2.1 API): notes built by the browser.

The desktop module builds each note with numpy; here Python only names the note (frequency
and number of samples) and the browser builds the very same samples (same sine cycle, same
ADSR envelope, 22050 Hz) and plays them. tone.play and tone.create keep their behaviour:
play() refuses notes longer than 4 seconds, create() returns a sound to play later.
"""
import math
import re

from . import _sz

__all__ = ('play', 'create')

SAMPLE_RATE = 22050
NOTE_PATTERN = r'^([A-G])([b#]?)([0-8])$'
A4 = 440.0
NOTE_VALUE = dict(C=-9, D=-7, E=-5, F=-4, G=-2, A=0, B=2)
TWELTH_ROOT = math.pow(2, (1 / 12))
DECAY = 2000
MAX_DURATION = 4
# The Studio builds notes of at most 10 seconds (create() on the desktop has no limit).
MAX_CREATE_DURATION = 10
# Like pgzero 1.2.1: up to the sample rate (above half of it the note is only silence).
MAX_HZ = SAMPLE_RATE


class InvalidNote(Exception):
    """The parameters passed were invalid."""


def note_to_hertz(note):
    note, accidental, octave = validate_note(note)
    value = note_value(note, accidental, octave)
    return A4 * math.pow(TWELTH_ROOT, value)


def note_value(note, accidental, octave):
    value = NOTE_VALUE[note]
    if accidental:
        value += 1 if accidental == '#' else -1
    return (4 - octave) * -12 + value


def validate_note(note):
    match = re.match(NOTE_PATTERN, note)
    if match is None:
        raise InvalidNote(
            '%s não é uma nota. As notas vão de A a G, podem ser bemol (b) ou sustenido (#) '
            'e têm oitava de 0 a 8, por exemplo C4, F#5 ou Bb3.' % note
        )
    note, accidental, octave = match.group(1, 2, 3)
    return note, accidental, int(octave)


def _convert_args(hz, duration):
    if isinstance(hz, str):
        hz = note_to_hertz(hz)
    samples = int(duration * SAMPLE_RATE)
    if not samples:
        raise InvalidNote('A nota precisa durar mais que zero segundos.')
    if not 0 < hz <= MAX_HZ:
        raise InvalidNote('A frequência da nota precisa ser maior que zero e no máximo 22050 Hz.')
    if duration > MAX_CREATE_DURATION:
        raise InvalidNote('No Estúdio, uma nota dura no máximo 10 segundos.')
    return float(hz), samples


class _Note:
    """A note made with tone.create (like the pygame Sound the desktop returns)."""

    def __init__(self, hz, samples):
        self._hz = hz
        self._samples = samples
        self._volume = 1.0
        self._voices = set()

    def play(self):
        voice = _sz.audio_tone(self._hz, self._samples, self._volume)
        if voice is not None:
            self._voices.add(voice)
            _sz.on_audio_end(voice, lambda: self._voices.discard(voice))

    def stop(self):
        _sz.audio_stop_many(list(self._voices))
        self._voices = set()

    def set_volume(self, value):
        self._volume = min(1.0, max(0.0, float(value)))

    def get_volume(self):
        return self._volume

    def get_length(self):
        return (self._samples + DECAY) / SAMPLE_RATE

    def get_num_channels(self):
        return len(self._voices)

    def __repr__(self):
        return f'<Sound tone {self._hz:.2f} Hz>'


def create(pitch, duration):
    """Create a tone of a given duration at the given pitch; returns a sound to play later."""
    return _Note(*_convert_args(pitch, duration))


def play(pitch, duration):
    """Play a tone of a certain length from a note ('C4', 'F#5') or a frequency in hertz."""
    if duration > MAX_DURATION:
        raise InvalidNote(
            'A nota de %ss é longa demais: tone.play toca até %s segundos. Para mais, use '
            'tone.create.' % (duration, MAX_DURATION)
        )
    create(pitch, duration).play()
