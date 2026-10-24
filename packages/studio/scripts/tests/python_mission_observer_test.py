"""Known local fixtures only. Does not qualify WASM, sandbox isolation, graphics or deployment."""
import asyncio
import json
from pathlib import Path
import runpy
import unittest

OBSERVER = runpy.run_path(str(Path(__file__).resolve().parents[2] /
                            'src/runtime/python/mission-observer.py'))['_StudioMissionObserver']


def namespace(source):
    values = {}
    exec(compile(source, '<fixture de missão>', 'exec'), values)
    return values


def probe(**extra):
    return {'id': 'calculo', 'type': 'functionReturns', 'name': 'somar',
            'args': [[2, 3], [-1, 1]], **extra}


class MissionObserverTests(unittest.TestCase):
    def test_same_function_structure_different_actual_results(self):
        good = OBSERVER(namespace('def somar(a, b):\n    return a + b'))
        wrong = OBSERVER(namespace('def somar(a, b):\n    return a - b'))
        self.assertEqual([case['value'] for case in good.function_returns(probe())['cases']], [5, 0])
        self.assertEqual([case['value'] for case in wrong.function_returns(probe())['cases']], [-1, -2])

    def test_dead_branch_does_not_count_as_effect(self):
        observer = OBSERVER(namespace('pontos = 0\nif False:\n    pontos = 10'))
        self.assertEqual(observer.read_value('pontos'), {'found': True, 'value': 0})
        self.assertEqual(observer.read_value('inexistente'), {'found': False})

    def test_missing_function_and_exceptions_are_observations_not_pass_flags(self):
        self.assertEqual(OBSERVER({}).function_returns(probe())['missing'], True)
        observer = OBSERVER(namespace('def somar(a, b):\n    raise ValueError("falhou")'))
        report = observer.function_returns(probe())
        self.assertEqual([case['ok'] for case in report['cases']], [False, False])
        self.assertNotIn('passed', json.dumps(report))

    def test_arguments_are_copied_and_answers_refused(self):
        original = probe(name='mudar', args=[[[1]], [[2]]])
        observer = OBSERVER(namespace('def mudar(items):\n    items.append(9)\n    return items'))
        self.assertEqual([case['value'] for case in observer.function_returns(original)['cases']],
                         [[1, 9], [2, 9]])
        self.assertEqual(original['args'], [[[1]], [[2]]])
        with self.assertRaises(ValueError):
            observer.function_returns(probe(expected=5))

    def test_real_modules_and_async_adapter(self):
        loaded = []
        def load(path):
            loaded.append(path)
            return namespace('async def somar(a, b):\n    return a + b')
        result = OBSERVER({}, load, asyncio.run).function_returns(probe(module='regras.py'))
        self.assertEqual([case['value'] for case in result['cases']], [5, 0])
        self.assertEqual(loaded, ['regras.py'])

    def test_non_json_and_oversized_returns_fail_without_user_comparison(self):
        for expression in ['float("nan")', '2 ** 54', '"x" * 3000', 'object()']:
            observer = OBSERVER(namespace('def somar(a, b):\n    return ' + expression))
            self.assertTrue(all(not case['ok'] for case in observer.function_returns(probe())['cases']))
        cycle = []
        cycle.append(cycle)
        self.assertIn('error', OBSERVER({'ciclo': cycle}).read_value('ciclo'))

    def test_nfkc_names_and_json_tuple_return(self):
        observer = OBSERVER(namespace('pontuação = 7\ndef somar(a, b):\n    return (a, b)'))
        self.assertEqual(observer.read_value('pontuação')['value'], 7)
        self.assertEqual(observer.function_returns(probe())['cases'][0]['value'], [2, 3])


if __name__ == '__main__':
    unittest.main()
