"""Light tests of QA witnesses only; no Turtle, media, timers or game executed."""
from pathlib import Path
from types import SimpleNamespace
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from space_arena_q08 import Observer, simulation_snapshot


def namespace():
    return dict(game=SimpleNamespace(frame=17),
                sprites=[SimpleNamespace(x=1, y=2, dx=3, dy=4, state='active', health=40, fuel=200)],
                background_sprites=[SimpleNamespace(x=5, y=6, state='active')],
                camera=SimpleNamespace(x=7, y=8, dx=9, dy=10, heading=90, visible=False),
                explosion=SimpleNamespace(particles=[SimpleNamespace(x=1, y=2, frame=10, state='active')]),
                exhaust=SimpleNamespace(particles=[SimpleNamespace(x=3, y=4, frame=12, state='inactive')]))


class SimulationWitnessTests(unittest.TestCase):
    def test_fps_counter_reset_is_not_mistaken_for_simulation(self):
        n = namespace()
        frozen = simulation_snapshot(n)
        n['game'].frame = 0
        self.assertEqual(simulation_snapshot(n), frozen)

    def test_sprite_motion_health_and_fuel_changes_are_detected(self):
        for key in ('x', 'y', 'dx', 'dy', 'health', 'fuel', 'state'):
            with self.subTest(key=key):
                n = namespace()
                frozen = simulation_snapshot(n)
                setattr(n['sprites'][0], key, 'changed' if key == 'state' else -1)
                self.assertNotEqual(simulation_snapshot(n), frozen)

    def test_background_and_camera_motion_are_detected(self):
        for target in ('background_sprites', 'camera'):
            with self.subTest(target=target):
                n = namespace()
                frozen = simulation_snapshot(n)
                obj = n[target][0] if target == 'background_sprites' else n[target]
                obj.x = -100
                self.assertNotEqual(simulation_snapshot(n), frozen)

    def test_allowed_camera_visibility_input_is_not_mistaken_for_motion(self):
        n = namespace()
        frozen = simulation_snapshot(n)
        n['camera'].visible = True
        self.assertEqual(simulation_snapshot(n), frozen)

    def test_particle_lifetime_changes_are_detected_even_without_motion(self):
        n = namespace()
        frozen = simulation_snapshot(n)
        n['explosion'].particles[0].frame -= 1
        self.assertNotEqual(simulation_snapshot(n), frozen)

    def test_snapshot_is_independent_of_later_live_state(self):
        n = namespace()
        frozen = simulation_snapshot(n)
        n['sprites'][0].x = 100
        self.assertEqual(frozen['sprites'][0]['x'], 1)

    def test_counter_hook_delegates_once_preserving_return(self):
        observed = Observer('Q08-pause', dict(observations=[]), {})
        calls = []

        class ActualMethod:
            def update(self, argument):
                calls.append(argument)
                return argument * 2

        instance = ActualMethod()
        observed.wrap(ActualMethod, 'update', before=lambda *args: observed.count_call('sprite'))
        try:
            self.assertEqual(instance.update(21), 42)
            self.assertEqual(calls, [21])
            self.assertEqual(observed.original_calls['sprite'], 1)
        finally:
            observed.restore()
        self.assertEqual(instance.update(1), 2)
        self.assertEqual(observed.original_calls['sprite'], 1)

    def test_counter_hook_does_not_swallow_original_exception(self):
        observed = Observer('Q08-pause', dict(observations=[]), {})

        class ActualFailure:
            def update(self):
                raise ValueError('original method failed')

        observed.wrap(ActualFailure, 'update', before=lambda *args: observed.count_call('enemy'))
        try:
            with self.assertRaisesRegex(ValueError, 'original method failed'):
                ActualFailure().update()
            self.assertEqual(observed.original_calls['enemy'], 1)
        finally:
            observed.restore()


if __name__ == '__main__':
    unittest.main()
