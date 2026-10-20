"""Bounded RIFF inspection; does not decode or load the complete media file."""
import struct
from . import _POLICY


def inspect(path):
    with path.open('rb') as source:
        source.seek(0, 2)
        size = source.tell()
        if not 44 <= size <= _POLICY['fileBytes']:
            raise ValueError('O WAV está vazio ou excede o limite de bytes.')
        source.seek(0)
        signature, declared, kind = struct.unpack('<4sI4s', source.read(12))
        if signature != b'RIFF' or kind != b'WAVE' or declared != size - 8:
            raise ValueError('O contêiner WAV é inválido ou está incompleto.')
        cursor = 12
        count = 0
        audio_format = None
        data_size = None
        while cursor < size:
            count += 1
            if count > _POLICY['wavChunks'] or cursor + 8 > size:
                raise ValueError('A estrutura de chunks WAV é inválida ou excede o limite.')
            source.seek(cursor)
            tag, length = struct.unpack('<4sI', source.read(8))
            body = cursor + 8
            cursor = body + length + length % 2
            if cursor > size:
                raise ValueError('Um chunk WAV está truncado.')
            if tag == b'fmt ':
                if audio_format is not None or length < 16:
                    raise ValueError('O WAV precisa de um único formato PCM16.')
                codec, channels, rate, byte_rate, align, bits = struct.unpack(
                    '<HHIIHH', source.read(16))
                if (codec != 1 or channels not in (1, 2) or bits != 16
                        or not _POLICY['minimumSampleRate'] <= rate <= _POLICY['maximumSampleRate']
                        or align != channels * 2 or byte_rate != rate * align):
                    raise ValueError('Use WAV PCM16 mono ou estéreo, de 8 a 96 kHz.')
                audio_format = (channels, rate, align)
            elif tag == b'data':
                if data_size is not None or not length:
                    raise ValueError('O WAV precisa de um único bloco de amostras não vazio.')
                data_size = length
        if audio_format is None or data_size is None or data_size % audio_format[2]:
            raise ValueError('O WAV não contém amostras PCM16 completas.')
        frames = data_size // audio_format[2]
        duration = frames / audio_format[1]
        if duration > _POLICY['durationSeconds']:
            raise ValueError('O som excede o limite de duração.')
        return {'channels': audio_format[0], 'sampleRate': audio_format[1],
                'frames': frames, 'durationSeconds': duration}
