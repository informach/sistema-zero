"""Formative checks inside the disposable learner worker. Never server authority."""
import copy
import ast
import inspect
import json
import math
import sys


def _message(error):
    try:
        text = str(error)
    except BaseException:
        text = type(error).__name__
    # TypeScript wire counts UTF-16 units. Do not split a surrogate pair.
    encoded = text[:2001].encode('utf-16-le', errors='surrogatepass')
    if len(encoded) <= 4000:
        return text
    prefix = encoded[:3998].decode('utf-16-le', errors='surrogatepass')
    if prefix and 0xD800 <= ord(prefix[-1]) <= 0xDBFF:
        prefix = prefix[:-1]
    return prefix + '…'


def _json_value(value, depth=0, budget=None):
    """No user __eq__, __iter__, properties or coercions during comparison."""
    if budget is None:
        budget = [20000]
    budget[0] -= 1
    if budget[0] < 0 or depth > 24:
        raise ValueError('O retorno excede o limite de complexidade JSON.')
    kind = type(value)
    if value is None or kind is bool:
        return value
    if kind is str:
        if len(value) > 16000:
            raise ValueError('O texto retornado excede o limite.')
        return value
    if kind is int:
        # JSON numbers in the host use IEEE754. Reject non-finite conversions.
        if not math.isfinite(value):
            raise ValueError('O número retornado não é finito.')
        return value
    if kind is float and math.isfinite(value):
        return value
    if kind in (list, tuple):
        if len(value) > 1000:
            raise ValueError('A lista retornada excede o limite.')
        return [_json_value(item, depth + 1, budget) for item in value]
    if kind is dict:
        if len(value) > 1000 or any(type(key) is not str or len(key) > 256 for key in value):
            raise ValueError('O dicionário retornado não é JSON limitado.')
        return {key: _json_value(item, depth + 1, budget) for key, item in value.items()}
    raise ValueError('O retorno precisa ser um valor JSON, lista ou tupla.')


def _equal(actual, expected):
    # Python bool is a subclass of int; True must not pass an expected 1.
    left, right = type(actual), type(expected)
    if left in (int, float) and right in (int, float):
        return actual == expected
    if left is not right:
        return False
    if left is list:
        return len(actual) == len(expected) and all(_equal(a, b) for a, b in zip(actual, expected))
    if left is dict:
        return actual.keys() == expected.keys() and all(_equal(actual[key], expected[key]) for key in actual)
    return actual == expected


class _StudioActivity:
    def __init__(self, definition, namespace, requested, publish, console_matches):
        self._checks = json.loads(definition)['checks']
        self._namespace = namespace
        self._requested = requested
        self._publish = publish
        self._console_matches = console_matches
        self._grading = False
        self._done = False

    def _behavior(self, rule, check_id):
        kind = rule['type']
        if kind == 'consoleContains':
            return bool(self._console_matches(check_id))
        if kind == 'globalEquals':
            name = rule['name']
            if name not in self._namespace:
                raise ValueError('A variável global ainda não foi definida: ' + name)
            return _equal(_json_value(self._namespace[name]), rule['value'])
        if kind != 'turtleState':
            raise ValueError('Critério de comportamento Python inválido.')
        module = sys.modules.get('turtle')
        # No implicit Turtle import, Screen creation or learner expression evaluation.
        screen_class = getattr(module, 'Turtle', None) if module is not None else None
        screen = getattr(screen_class, '_screen', None)
        if screen is None:
            raise ValueError('O programa ainda não criou a tela Turtle.')
        turtles = screen.turtles()
        index = rule['turtleIndex']
        if index >= len(turtles):
            raise ValueError('A tartaruga pedida ainda não foi criada.')
        turtle = turtles[index]
        predicate = rule['predicate']
        prop, expected = predicate['property'], predicate['expected']
        getters = {
            'position': turtle.position, 'heading': turtle.heading,
            'penDown': turtle.isdown, 'visible': turtle.isvisible,
            'shape': turtle.shape, 'penColor': turtle.pencolor, 'fillColor': turtle.fillcolor,
        }
        actual = getters[prop]()
        if prop == 'position':
            # Vec2D is an official immutable tuple subclass; copy its two coordinates explicitly.
            actual = [actual[0], actual[1]]
            return all(abs(a - b) <= predicate.get('tolerance', 1e-6) for a, b in zip(actual, expected))
        if prop == 'heading':
            # Respect the screen's degrees/radians mode. Never assume 360 units.
            return abs(actual - expected) <= predicate.get('tolerance', 1e-6)
        return _equal(_json_value(actual), expected)

    def _testcase(self, check):
        function = self._namespace.get(check['functionName'])
        if not callable(function):
            raise ValueError('A função global ainda não foi definida: ' + check['functionName'])
        for index, case in enumerate(check['cases']):
            value = function(*copy.deepcopy(case['args']))
            if inspect.isawaitable(value):
                from pyodide.ffi import run_sync
                value = run_sync(value)
            if not _equal(_json_value(value), case['expected']):
                return False, 'O retorno do caso ' + str(index + 1) + ' foi diferente do esperado.'
        return True, None

    def _code(self, check):
        namespace = {'__builtins__': __builtins__}
        # Wrapping source by indentation changes multiline/backslash literals.
        # CPython parses the original function body, then wraps its unchanged AST.
        body = ast.parse(check['source'], filename='<atividade>', mode='exec')
        function = ast.FunctionDef(
            name='_assertion',
            args=ast.arguments(posonlyargs=[], args=[ast.arg(arg='ctx')], vararg=None,
                               kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[]),
            body=body.body or [ast.Pass()], decorator_list=[], returns=None,
            type_comment=None, type_params=[])
        module = ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[]))
        exec(compile(module, '<atividade>', 'exec', dont_inherit=True), namespace)
        # All access remains within this isolated worker. Code/assertions are formative.
        context = {'globals': self._namespace}
        value = namespace['_assertion'](context)
        if inspect.isawaitable(value):
            from pyodide.ffi import run_sync
            value = run_sync(value)
        if type(value) is not bool:
            raise ValueError('A asserção precisa retornar True ou False.')
        return value

    def checkpoint(self):
        if self._done or self._grading or not self._requested():
            return
        self._grading = True
        try:
            for stream in (sys.stdout, sys.stderr):
                if stream is not None and not getattr(stream, 'closed', False):
                    stream.flush()
            checks = [check for check in self._checks if check['kind'] != 'structure']
            captured = {}
            # Freeze every observable before testcase/code callbacks mutate the program.
            for check in checks:
                if check['kind'] == 'behavior':
                    try:
                        captured[check['id']] = (self._behavior(check['rule'], check['id']), None)
                    except BaseException as error:
                        captured[check['id']] = (False, _message(error))
            results = []
            for check in checks:
                try:
                    kind = check['kind']
                    if kind == 'behavior':
                        passed, message = captured[check['id']]
                    elif kind == 'testcase':
                        passed, message = self._testcase(check)
                    elif kind == 'code':
                        passed, message = self._code(check), None
                    else:
                        raise ValueError('Checagem Python inválida.')
                except BaseException as error:
                    passed, message = False, _message(error)
                item = {'checkId': check['id'], 'kind': check['kind'], 'passed': passed, 'verifiedBy': 'client'}
                if message is not None:
                    item['message'] = message
                results.append(item)
            self._done = True
            self._publish(json.dumps({'version': 1, 'results': results}, ensure_ascii=False, allow_nan=False))
        finally:
            self._grading = False
