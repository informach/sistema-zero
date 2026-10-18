"""Native CPython contract tests. WASM/graphics/async execution is qualified separately."""
import json
from pathlib import Path
import runpy
import unittest

GRADER = runpy.run_path(str(Path(__file__).resolve().parents[2] / 'src/runtime/python/activity-grader.py'))


class ActivityGraderTests(unittest.TestCase):
    def grade(self, checks, namespace=None, requested=True):
        output = []
        grader = GRADER['_StudioActivity'](
            json.dumps({'checks': checks}), namespace or {}, lambda: requested,
            lambda value: output.append(json.loads(value)), lambda key: key == 'printed')
        grader.checkpoint()
        grader.checkpoint()
        self.assertEqual(len(output), 1 if requested else 0)
        return output[0]['results'] if output else []

    def test_typed_json_and_no_user_comparison_protocols(self):
        class Evil:
            def __eq__(self, other):
                raise AssertionError('User __eq__ must not be invoked')
            def __iter__(self):
                raise AssertionError('User __iter__ must not be invoked')
        checks = [{'id': str(i), 'kind': 'testcase', 'functionName': name,
                   'cases': [{'args': [], 'expected': expected}]} for i, (name, expected) in enumerate([
                       ('boolean', 1), ('number', 1.0), ('tuple', [1, None]), ('evil', 1), ('nan', 0),
                   ])]
        results = self.grade(checks, {'boolean': lambda: True, 'number': lambda: 1,
                                     'tuple': lambda: (1, None), 'evil': lambda: Evil(), 'nan': lambda: float('nan')})
        self.assertEqual([item['passed'] for item in results], [False, True, True, False, False])
        self.assertTrue(all(item['verifiedBy'] == 'client' for item in results))

    def test_observations_precede_mutating_functions_and_code(self):
        namespace = {'score': 0}
        def change():
            namespace['score'] = 10
            return 10
        namespace['change'] = change
        results = self.grade([
            {'id': 'change', 'kind': 'testcase', 'functionName': 'change', 'cases': [{'args': [], 'expected': 10}]},
            {'id': 'score', 'kind': 'behavior', 'rule': {'type': 'globalEquals', 'name': 'score', 'value': 0}},
            {'id': 'code', 'kind': 'code', 'source': 'return ctx["globals"]["score"] == 10'},
            {'id': 'printed', 'kind': 'behavior', 'rule': {'type': 'consoleContains', 'text': 'hello'}},
        ], namespace)
        self.assertEqual([item['checkId'] for item in results], ['change', 'score', 'code', 'printed'])
        self.assertTrue(all(item['passed'] for item in results))

    def test_arguments_detached_and_special_dictionary_keys_preserved(self):
        value = {'__proto__': {'safe': True}, 'constructor': 2, 'toString': 3}
        def mutate(argument):
            original = json.loads(json.dumps(argument))
            argument.clear()
            return original
        results = self.grade([{'id': 'echo', 'kind': 'testcase', 'functionName': 'mutate', 'cases': [
            {'args': [value], 'expected': value}, {'args': [value], 'expected': value},
        ]}], {'mutate': mutate})
        self.assertTrue(results[0]['passed'])
        self.assertIn('__proto__', value)

    def test_missing_functions_nonboolean_assertions_and_bounded_errors(self):
        results = self.grade([
            {'id': 'missing', 'kind': 'testcase', 'functionName': 'absent', 'cases': [{'args': [], 'expected': 1}]},
            {'id': 'truthy', 'kind': 'code', 'source': 'return 1'},
            {'id': 'long', 'kind': 'code', 'source': 'raise ValueError("🐢" * 4000)'},
            {'id': 'ok', 'kind': 'code', 'source': 'return True'},
        ])
        self.assertEqual([item['passed'] for item in results], [False, False, False, True])
        self.assertLessEqual(len(results[2]['message'].encode('utf-16-le')) // 2, 2000)

    def test_no_request_no_grading_and_structure_not_spoofed(self):
        self.assertEqual(self.grade([{'id': 'never', 'kind': 'code', 'source': 'raise RuntimeError()'}], requested=False), [])
        self.assertEqual(self.grade([{'id': 'loop', 'kind': 'structure', 'rule': {'type': 'usesLoop'}}]), [])

    def test_assertion_wrapper_preserves_multiline_and_backslash_string_values(self):
        results = self.grade([
            {'id': 'triple', 'kind': 'code', 'source': 'text = """first\nsecond"""\nreturn text == "first\\nsecond"'},
            {'id': 'continued', 'kind': 'code', 'source': 'text = "first\\\nsecond"\nreturn text == "firstsecond"'},
        ])
        self.assertTrue(all(item['passed'] for item in results), results)

    def test_cycles_non_json_and_deep_results_fail_without_hanging(self):
        cycle = []
        cycle.append(cycle)
        deep = None
        for _ in range(30):
            deep = [deep]
        for value in [cycle, deep, {'bad': object()}, {1: 'numeric key'}, [0] * 1001, 10**1000]:
            results = self.grade([{'id': 'bounded', 'kind': 'testcase', 'functionName': 'f', 'cases': [{'args': [], 'expected': None}]}], {'f': lambda: value})
            self.assertFalse(results[0]['passed'])


if __name__ == '__main__':
    unittest.main()
