"""Inert tests of the real QA witness; no Turtle window/runtime/browser is started."""
import unittest
from input_presentation import InputPresentation


class Screen:
    def __init__(self):
        self.frames = []
        self.queued = None
        self.updates = 0
        self.draws = 0
        self.width = 800

    def _createpoly(self):
        return 1

    def _drawpoly(self, identifier, points, **style):
        self.draws += 1
        self.queued = style['fill']

    def window_width(self):
        return self.width

    def window_height(self):
        return 600

    def _update(self):
        self.updates += 1
        self.frames.append(self.queued)


class WitnessTests(unittest.TestCase):
    def setUp(self):
        self.screen = Screen()
        self.witness = InputPresentation(self.screen)
        self.pose = dict(x=0, y=0, heading=90, dx=0, dy=0)

    def test_animation_or_callback_ack_without_original_pose_effect_never_marks(self):
        self.witness.begin('Left', self.pose)
        for _ in range(40):
            self.witness.rendered(dict(self.pose, x=1))
            self.screen._update()
        self.assertEqual(set(self.screen.frames), {'#000000'})
        self.assertEqual(self.screen.updates, 40)
        self.assertEqual(self.screen.draws, 1)

    def test_ignored_binding_never_marks_even_if_unrelated_motion_turns_actor(self):
        self.witness.begin('Left', self.pose, enabled=False)
        self.witness.rendered(dict(self.pose, heading=100))
        self.screen._update()
        self.assertEqual(self.screen.frames, ['#000000'])

    def test_delay_remains_unmarked_until_original_render_and_real_update(self):
        self.witness.begin('Left', self.pose)
        for _ in range(30):  # Repaints during e.g. a500ms delay are irrelevant.
            self.screen._update()
        self.witness.rendered(dict(self.pose, heading=100))
        self.assertEqual(set(self.screen.frames), {'#000000'})
        self.screen._update()
        self.assertEqual(self.screen.frames[-1], '#010001')

    def test_wrong_rotation_cannot_mark_the_other_key(self):
        self.witness.begin('Right', self.pose)
        self.witness.rendered(dict(self.pose, heading=100))
        self.screen._update()
        self.assertEqual(self.screen.frames[-1], '#000000')
        self.witness.rendered(dict(self.pose, heading=80))
        self.screen._update()
        self.assertEqual(self.screen.frames[-1], '#010002')

    def test_up_requires_velocity_and_position_effect(self):
        self.witness.begin('Up', self.pose)
        self.witness.rendered(dict(self.pose, x=1))
        self.screen._update()
        self.assertEqual(self.screen.frames[-1], '#000000')
        self.witness.rendered(dict(self.pose, x=1, dx=1))
        self.screen._update()
        self.assertEqual(self.screen.frames[-1], '#010003')

    def test_click_requires_its_exact_target_and_changed_position(self):
        self.witness.begin('click', dict(self.pose, target=(10, 20)))
        self.witness.rendered(dict(self.pose, x=5, y=20))
        self.screen._update()
        self.assertEqual(self.screen.frames[-1], '#000000')
        self.witness.rendered(dict(self.pose, x=10, y=20))
        self.screen._update()
        self.assertEqual(self.screen.frames[-1], '#010004')

    def test_outstanding_input_refuses_coalescing_and_new_screen_starts_unmarked(self):
        self.witness.begin('Left', self.pose)
        with self.assertRaises(AssertionError):
            self.witness.begin('Up', self.pose)
        screen = Screen()
        witness = InputPresentation(screen)
        screen._update()
        self.assertEqual(witness.sequence, 0)
        self.assertEqual(screen.frames, ['#000000'])


    def test_resize_redraws_once_but_unchanged_updates_do_not_add_visual_work(self):
        self.screen._update()
        self.screen._update()
        self.assertEqual(self.screen.draws, 1)
        self.screen.width = 900
        self.screen._update()
        self.screen._update()
        self.assertEqual(self.screen.draws, 2)
        self.assertEqual(self.screen.updates, 4)

    def test_invisible_inactive_or_paused_actor_cannot_witness_a_changed_pose(self):
        for reason in ('visible', 'active', 'playing'):
            screen = Screen()
            witness = InputPresentation(screen)
            witness.begin('Left', self.pose)
            witness.rendered(dict(self.pose, heading=100), **{reason: False})
            screen._update()
            self.assertEqual(screen.frames[-1], '#000000')


if __name__ == '__main__':
    unittest.main()
