"""Portable audio validation/DSP. Native decoder checks run only when miniaudio is installed."""
from array import array
import importlib.util
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
import wave

STUDIO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(STUDIO / 'src/runtime/python/audio'))
import sz_audio
from sz_audio._mixer import Mixer
from sz_audio._wav import inspect


class Samples:
    """Deterministic source for actual mixer arithmetic, not a device/playback simulator."""
    def __init__(self, samples, ended=False):
        self.samples = array('f', samples)
        self.ended = ended
        self.closed = 0

    def read(self, frames):
        return self.samples[:frames * 2], self.ended

    def close(self):
        self.closed += 1


class PortableAudio(unittest.TestCase):
    def test_public_arguments_are_validated_before_native_dependencies_or_device_access(self):
        for path in [None, 1, '', 'x' * 4097]:
            with self.assertRaises(TypeError):
                sz_audio.play(path)
        for volume in [True, -1, 2, float('nan'), float('inf'), '0.8']:
            with self.assertRaises(ValueError):
                sz_audio.play('sound.wav', volume=volume)
        with self.assertRaises(ValueError):
            sz_audio.play('sound.mp3')
        with self.assertRaises(TypeError):
            sz_audio.play('sound.wav', loop=1)
        for handle in [0, -1, True, 0.5, '1', 9007199254740992]:
            with self.assertRaises(ValueError):
                sz_audio.stop(handle)

    def test_mixing_volume_and_clipping_preserve_channels(self):
        mixer = Mixer()
        mixer.add(1, Samples([0.8, -0.8, 0.2, -0.2]), 1)
        mixer.add(2, Samples([0.8, -0.8, 0.2, -0.2]), 0.5)
        block = mixer.read(2)
        self.assertEqual(list(block[:2]), [1.0, -1.0])
        self.assertAlmostEqual(block[2], 0.3, places=6)
        self.assertAlmostEqual(block[3], -0.3, places=6)
        mixer.stop(1)
        self.assertEqual(mixer.active, 1)
        self.assertAlmostEqual(mixer.read(2)[0], 0.4, places=6)
        mixer.stop()

    def test_end_and_stop_release_sources_without_affecting_other_voices(self):
        mixer = Mixer()
        short = Samples([0.5, -0.5], ended=True)
        other = Samples([0.1, -0.1])
        mixer.add(1, short, 1)
        mixer.add(2, other, 1)
        first = mixer.read(3)
        self.assertAlmostEqual(first[0], 0.6, places=6)
        self.assertEqual(list(first[2:]), [0.0] * 4)
        self.assertEqual((mixer.active, short.closed, other.closed), (1, 1, 0))
        mixer.stop(1)
        mixer.stop()
        self.assertEqual((short.closed, other.closed), (1, 1))
        self.assertEqual(list(mixer.read(3)), [0.0] * 6)

    def test_voice_and_callback_limits_are_enforced(self):
        mixer = Mixer()
        sources = [Samples([0, 0]) for _ in range(17)]
        for handle, source in enumerate(sources[:16], 1):
            mixer.add(handle, source, 1)
        with self.assertRaises(RuntimeError):
            mixer.add(17, sources[16], 1)
        with self.assertRaises(RuntimeError):
            mixer.add(1, sources[16], 1)
        for frames in [-1, 16385, 1.5, True]:
            with self.assertRaises(RuntimeError):
                mixer.read(frames)
        mixer.stop()
        self.assertTrue(all(source.closed == 1 for source in sources[:16]))
        self.assertEqual(sources[16].closed, 0)

    def test_native_wav_inspection_agrees_with_standard_library_and_refuses_truncation(self):
        with tempfile.TemporaryDirectory(prefix='sz-audio-test-') as directory:
            root = Path(directory).resolve()
            self.assertTrue(root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
            path = root / 'tone.wav'
            with wave.open(str(path), 'wb') as target:
                target.setparams((2, 2, 96000, 0, 'NONE', 'not compressed'))
                target.writeframes(struct.pack('<hh', 1000, -1000) * 9600)
            self.assertEqual(inspect(path), {
                'channels': 2, 'sampleRate': 96000, 'frames': 9600, 'durationSeconds': 0.1,
            })
            path.write_bytes(path.read_bytes()[:-1])
            with self.assertRaises(ValueError):
                inspect(path)

    @unittest.skipUnless(importlib.util.find_spec('miniaudio'), 'native miniaudio dependency not installed')
    def test_native_streams_resample_and_short_loops_are_bounded(self):
        from sz_audio._desktop import _Source
        with tempfile.TemporaryDirectory(prefix='sz-audio-native-test-') as directory:
            root = Path(directory).resolve()
            self.assertTrue(root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
            path = root / 'tone.wav'
            with wave.open(str(path), 'wb') as target:
                target.setparams((1, 2, 96000, 0, 'NONE', 'not compressed'))
                target.writeframes(struct.pack('<h', 1000) * 4800)
            loop = _Source(path, True, 0.05)
            self.assertIsNotNone(loop.cached)
            self.assertIsNone(loop.stream)
            block, ended = loop.read(10000)
            self.assertEqual((len(block), ended), (20000, False))
            self.assertTrue(all(abs(value) <= 1 for value in block))
            loop.close()
            stream = _Source(path, False, 0.05)
            samples, ended = stream.read(4096)
            self.assertTrue(ended)
            self.assertAlmostEqual(len(samples) / 2 / 48000, 0.05, places=3)
            stream.close()


if __name__ == '__main__':
    unittest.main()
