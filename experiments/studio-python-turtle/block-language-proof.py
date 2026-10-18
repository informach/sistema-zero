"""Native oracle for the TypeScript codecs. Receives bounded test data, never imports it."""
import ast
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys

assert sys.version_info[:3] == (3, 14, 2)
root = Path(__file__).resolve().parents[2]
directory = root / 'packages/studio/src/python/language'
spec = importlib.util.spec_from_file_location('studio_language', directory / 'analyzer.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
service = module.PythonLanguageService((directory / 'limits.json').read_text())
request = json.load(sys.stdin)
result = []
for item in request['items']:
    if request['operation'] == 'parse':
        response = json.loads(service.request(json.dumps({'operation': 'parse', 'source': item['source'], 'path': 'main.py'})))
        assert response.get('ok') and response.get('tree'), (item['id'], response)
    else:
        response = json.loads(service.request(json.dumps({'operation': 'render', 'node': item['node']})))
        assert response.get('ok'), (item['id'], response)
        generated = response['source']
        compile(generated, 'generated.py', 'exec')
        if 'original' in item:
            assert ast.dump(ast.parse(item['original'], type_comments=True)) == ast.dump(ast.parse(generated, type_comments=True)), item['id']
        if item.get('execute'):
            # Only fixed, reviewed fixture programs from block-conformance.ts.
            outputs = []
            for source in (item['original'], generated):
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    exec(compile(source, 'fixture.py', 'exec'), {})
                outputs.append(output.getvalue())
            assert outputs[0] == outputs[1], (item['id'], outputs)
            response['output'] = outputs[0]
    result.append({'id': item['id'], **response})
json.dump(result, sys.stdout, ensure_ascii=True)
