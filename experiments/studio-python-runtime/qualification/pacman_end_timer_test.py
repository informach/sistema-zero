"""Pure controls for the actual Pac-Man recipe helper; no game/Turtle/audio import."""
import ast
from pathlib import Path
import re
import unittest


RECIPE = Path(__file__).resolve().parents[1] / 'gameVariants.ts'


class Screen:
    def __init__(self):
        self.scheduled = []
        self.registration_error = None

    def bye(self):
        raise AssertionError('The pure control must not execute a timer callback')

    def ontimer(self, callback, delay):
        if self.registration_error is not None:
            raise self.registration_error
        self.scheduled.append((callback, delay))


class EndingTimerTest(unittest.TestCase):
    def setUp(self):
        recipe = RECIPE.read_text(encoding='utf-8').split("  'space-arena':", 1)[0]
        replacements = [ast.literal_eval(match) for match in re.findall(
            r'replacement:\s*(\[[\s\S]*?\])', recipe)]
        helper_lines = next(lines for lines in replacements
                            if lines and lines[0] == 'def close_game_once(screen):')
        # Compile only the actual helper, excluding imports and the game-loop body.
        helper_source = '\n'.join(helper_lines).split('\ndef game_loop(', 1)[0]
        helper = ast.parse(helper_source)
        self.assertEqual(len(helper.body), 1)
        self.assertIsInstance(helper.body[0], ast.FunctionDef)
        namespace = {}
        exec(compile(helper, '<actual-pacman-helper>', 'exec'), namespace)
        self.close = namespace['close_game_once']

    def assert_single_bye(self, screen):
        self.assertEqual(screen.scheduled, [(screen.bye, 3000)])

    def test_repeated_ending_frames_schedule_one_bye(self):
        screen = Screen()
        for _ in range(100):
            self.close(screen)
        self.assert_single_bye(screen)

    def test_both_endings_in_same_frame_share_one_registration(self):
        screen = Screen()
        for _ in range(100):
            self.close(screen)
            self.close(screen)
        self.assert_single_bye(screen)

    def test_new_screen_has_its_own_registration(self):
        first, second = Screen(), Screen()
        self.close(first)
        self.close(second)
        self.close(first)
        self.assert_single_bye(first)
        self.assert_single_bye(second)

    def test_registration_failure_propagates_and_later_call_can_register(self):
        screen = Screen()
        failure = RuntimeError('timer registration rejected')
        screen.registration_error = failure
        with self.assertRaises(RuntimeError) as caught:
            self.close(screen)
        self.assertIs(caught.exception, failure)
        self.assertEqual(screen.scheduled, [])
        screen.registration_error = None
        self.close(screen)
        self.assert_single_bye(screen)

    def test_successful_registration_is_not_repeated_even_if_timer_rejects_later(self):
        screen = Screen()
        self.close(screen)
        screen.registration_error = RuntimeError('must not attempt second registration')
        self.close(screen)
        self.assert_single_bye(screen)

    def test_other_callback_with_same_delay_remains_independent(self):
        screen = Screen()
        reset_speed = lambda: None
        self.close(screen)
        screen.ontimer(reset_speed, 3000)
        self.close(screen)
        self.assertEqual(screen.scheduled, [(screen.bye, 3000), (reset_speed, 3000)])


if __name__ == '__main__':
    unittest.main()
