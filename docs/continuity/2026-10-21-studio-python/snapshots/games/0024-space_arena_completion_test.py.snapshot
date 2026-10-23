"""Actual QA completion guard controls; no game, Turtle, Tk or audio import."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest


HERE = Path(__file__).resolve().parent


class CompletionGuardTest(unittest.TestCase):
    def setUp(self):
        browser = ast.parse((HERE / 'space_arena_browser.py').read_text(encoding='utf-8'))
        observer = ast.parse((HERE / 'space_arena_observer.py').read_text(encoding='utf-8'))
        completion = next(node for node in observer.body if isinstance(node, ast.ClassDef)
                          and node.name == 'FunctionalComplete')
        timer = next(node for node in browser.body if isinstance(node, ast.FunctionDef)
                     and node.name == 'timer')
        outer = next(node for node in browser.body if isinstance(node, ast.Try))
        checks = [node for node in outer.body if isinstance(node, ast.Assert)]
        self.assertEqual(len(checks), 2)
        self.scheduled = []
        self.closed = []
        self.observer = SimpleNamespace(complete_requested=True)
        self.report = {'observations': [{'kind': 'complete'}]}
        self.scope = dict(
            real_timer=lambda screen, callback, delay: self.scheduled.append((screen, callback, delay)),
            turtle=SimpleNamespace(bye=lambda: self.closed.append(True)),
            observer=self.observer, report=self.report,
        )
        # Compile only the exact class/function/assert AST nodes, not imports or game.
        exec(compile(ast.Module(body=[completion, timer], type_ignores=[]), '<actual-qa-guard>', 'exec'), self.scope)
        self.checks = compile(ast.Module(body=checks, type_ignores=[]), '<actual-post-import-checks>', 'exec')

    def schedule(self, callback):
        callback.__name__ = '_space_arena_tick'
        callback.__module__ = 'space_arena'
        self.scope['timer']('screen', callback, 17)
        self.assertEqual(self.scheduled[0][0], 'screen')
        self.assertEqual(self.scheduled[0][2], 17)
        return self.scheduled[0][1]

    def test_unrelated_authored_timer_keeps_callback_and_delay(self):
        def fps():
            pass
        self.scope['timer']('screen', fps, 1000)
        self.assertEqual(self.scheduled, [('screen', fps, 1000)])
        self.assertEqual(self.closed, [])

    def test_declared_completion_closes_once_and_passes_real_post_checks(self):
        called = []
        def tick():
            called.append(True)
            raise self.scope['FunctionalComplete']()
        self.schedule(tick)()
        self.assertEqual(called, [True])
        self.assertEqual(self.closed, [True])
        exec(self.checks, self.scope)

    def test_other_callback_error_propagates_without_closing(self):
        failure = ValueError('authored failure')
        def tick():
            raise failure
        with self.assertRaises(ValueError) as caught:
            self.schedule(tick)()
        self.assertIs(caught.exception, failure)
        self.assertEqual(self.closed, [])

    def test_unrequested_completion_does_not_pass_post_checks(self):
        self.observer.complete_requested = False
        with self.assertRaises(AssertionError):
            exec(self.checks, self.scope)

    def test_missing_complete_witness_does_not_pass_post_checks(self):
        self.report['observations'] = []
        with self.assertRaises(AssertionError):
            exec(self.checks, self.scope)

    def test_duplicate_complete_witness_does_not_pass_post_checks(self):
        self.report['observations'].append({'kind': 'complete'})
        with self.assertRaises(AssertionError):
            exec(self.checks, self.scope)


if __name__ == '__main__':
    unittest.main()
