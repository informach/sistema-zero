"""Bounded observations in the disposable learner worker; never grades or receives answers.

The trusted host owns selectors/arguments and compares the returned observations.
This module must not be loaded in Members or used as evidence of renderer state.
"""
import inspect
import json
import math
import unicodedata


def _error(error):
    try:
        text = str(error)
    except BaseException:
        text = type(error).__name__
    # The wire counts UTF-16 code units. At most 900 code points fit even as astral pairs.
    return text[:900] or 'Erro ao observar o programa.'


def _json_value(value):
    remaining = 2000
    active = set()

    def visit(item, depth):
        nonlocal remaining
        remaining -= 1
        if remaining < 0 or depth > 16:
            raise ValueError('O valor observado excede o limite.')
        kind = type(item)
        if item is None or kind is bool:
            return item
        if kind is int:
            if abs(item) > 9007199254740991:
                raise ValueError('O inteiro observado excede a precisão do relatório.')
            return item
        if kind is float:
            if not math.isfinite(item):
                raise ValueError('O valor observado não é finito.')
            return item
        if kind is str:
            if len(item) > 2000:
                raise ValueError('O texto observado excede o limite.')
            return item
        if kind not in (list, tuple, dict):
            raise ValueError('O retorno precisa ser um valor JSON.')
        if id(item) in active:
            raise ValueError('O valor observado contém um ciclo.')
        active.add(id(item))
        try:
            if kind is dict:
                if any(type(key) is not str or len(key) > 2000 for key in item):
                    raise ValueError('As chaves do retorno precisam ser texto dentro do limite.')
                return {key: visit(child, depth + 1) for key, child in item.items()}
            return [visit(child, depth + 1) for child in item]
        finally:
            active.remove(id(item))

    result = visit(value, 0)
    encoded = json.dumps(result, ensure_ascii=False, allow_nan=False)
    if len(encoded.encode('utf-16-le')) > 4000:
        raise ValueError('O valor observado excede o limite do relatório.')
    return result


class _StudioMissionObserver:
    def __init__(self, namespace, load_module=None, await_result=None):
        self._namespace = namespace
        # The adapter resolves only a file in the immutable project snapshot.
        self._load_module = load_module
        self._await_result = await_result

    def read_value(self, path):
        try:
            parts = path.split('.')
            if not 1 <= len(parts) <= 4 or any(not part.isidentifier() for part in parts):
                raise ValueError('O caminho da observação é inválido.')
            parts = [unicodedata.normalize('NFKC', part) for part in parts]
            if parts[0] not in self._namespace:
                return {'found': False}
            value = self._namespace[parts[0]]
            for part in parts[1:]:
                value = value[part] if type(value) is dict else getattr(value, part)
            return {'found': True, 'value': _json_value(value)}
        except BaseException as error:
            return {'found': False, 'error': _error(error)}

    def function_returns(self, probe):
        if set(probe) - {'id', 'type', 'name', 'module', 'args'}:
            raise ValueError('A sonda não pode conter critérios ou respostas esperadas.')
        name = unicodedata.normalize('NFKC', probe['name'])
        if not name.isidentifier() or len(name) > 100:
            raise ValueError('O nome da função é inválido.')
        arguments = probe['args']
        if type(arguments) is not list or not 1 <= len(arguments) <= 8:
            raise ValueError('A sonda excede o limite de casos.')
        namespace = self._namespace
        try:
            if 'module' in probe:
                if self._load_module is None:
                    raise ValueError('O adaptador não oferece módulos nesta execução.')
                namespace = self._load_module(probe['module'])
            function = namespace.get(name)
        except BaseException as error:
            return {'id': probe['id'], 'type': 'functionReturns',
                    'cases': [{'ok': False, 'error': _error(error)} for _ in arguments]}
        if not callable(function):
            return {'id': probe['id'], 'type': 'functionReturns', 'missing': True}
        outcomes = []
        for args in arguments:
            try:
                if type(args) is not list or len(args) > 6:
                    raise ValueError('Os argumentos excedem o limite.')
                # A function cannot mutate another case or the retained host probe.
                result = function(*[_json_value(arg) for arg in args])
                if inspect.isawaitable(result):
                    if self._await_result is None:
                        if inspect.iscoroutine(result):
                            result.close()
                        raise ValueError('O adaptador não oferece funções assíncronas.')
                    result = self._await_result(result)
                outcomes.append({'ok': True, 'value': _json_value(result)})
            except BaseException as error:
                outcomes.append({'ok': False, 'error': _error(error)})
        return {'id': probe['id'], 'type': 'functionReturns', 'cases': outcomes}
