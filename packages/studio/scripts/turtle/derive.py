"""Derive the browser engine from pinned, licensed CPython/Tk sources.

No learner code is read or executed. Run with CPython 3.14.2 -I.
"""
import ast
import hashlib
import importlib.util
import inspect
import json
import platform
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parents[1] / 'src/runtime/python/turtle'
PINS = {
    'turtle.py': '6074e63c2aab6998418e55b0ebc74c8a64c2813a8c079e12a0fbee8ddf2c13c5',
    'xcolors.c': '1646a773ad5cec588c2cb63a42d125433702354b23dc2f550d16d7fa343c237a',
    'LICENSE-tk.txt': '2cde822b93ca16ae535c954b7dfe658b4ad10df2a193628d1b358f1765e8b198',
    'LICENSE-python.txt': 'b0e25a78cffb43f4d92de8b61ccfa1f1f98ecbc22330b54b5251e7b6ba010231',
}
def require(condition, message):
    if not condition:
        raise ValueError(message)

require(platform.python_version() == '3.14.2' and not sys.flags.optimize,
        'Use CPython 3.14.2 without compiler optimization flags')
for name, expected in PINS.items():
    require(hashlib.sha256((ROOT / 'vendor' / name).read_bytes()).hexdigest() == expected,
            'Vendor checksum mismatch: ' + name)
source = (ROOT / 'vendor/turtle.py').read_text(encoding='utf-8')
spec = importlib.util.spec_from_file_location('_turtle_reference', ROOT / 'vendor/turtle.py')
reference = importlib.util.module_from_spec(spec)
module = ast.parse(source)
# Upstream reads turtle.cfg at import time, including the caller's cwd. Do not
# execute that hook in a reproducible build; signatures use the literal pinned defaults.
reference_nodes = [node for node in module.body if not (
    isinstance(node, ast.Try) and len(node.body) == 1 and
    ast.unparse(node.body[0]) == 'readconfig(_CFG)')]
require(len(reference_nodes) == len(module.body) - 1, 'Upstream configuration hook changed')
exec(compile(ast.Module(body=reference_nodes, type_ignores=[]), str(ROOT / 'vendor/turtle.py'), 'exec'),
     reference.__dict__)
selected = {
    'Vec2D', 'Terminator', 'TurtleGraphicsError', 'Shape', 'Tbuffer', 'TurtleScreen',
    'TNavigator', 'TPen', '_TurtleImage', 'RawTurtle', 'Screen', 'Turtle',
}
nodes = [node for node in module.body if getattr(node, 'name', None) in selected]
require({node.name for node in nodes} == selected, 'Upstream definitions changed')
patches = {'image': 0, 'canvas': 0, 'darwin': 0}
class Port(ast.NodeTransformer):
    def visit_Attribute(self, node):
        if isinstance(node.value, ast.Name) and node.value.id == 'TK' and node.attr == 'PhotoImage':
            patches['image'] += 1
            return ast.Name(id='BrowserImage', ctx=ast.Load())
        return self.generic_visit(node)
    def visit_If(self, node):
        # RawTurtle accepts our TurtleScreen, never an external Tk canvas.
        if ast.unparse(node.test) == 'isinstance(canvas, (ScrolledCanvas, Canvas))':
            patches['canvas'] += 1
            return [self.visit(item) for item in node.orelse]
        if ast.unparse(node.test) == "sys.platform == 'darwin'":
            patches['darwin'] += 1
            return None
        return self.generic_visit(node)

engine = ast.Module(body=nodes, type_ignores=[])
engine = ast.fix_missing_locations(Port().visit(engine))
require(patches == {'image': 1, 'canvas': 1, 'darwin': 1}, 'Port edits no longer match upstream')

# Explicitly unsupported leaf operations. Internal pen/resize helpers remain
# unchanged because the contracted high-level methods use them.
unsupported = {
    'TurtleScreen': {'getcanvas', 'save', 'setworldcoordinates'},
    'RawTurtle': {'undo', 'shapetransform', 'shearfactor', 'tilt', 'tiltangle'},
}
quota_checks = 0
activity_turns = 0
internal_updates = 0
class InternalScreenUpdates(ast.NodeTransformer):
    def visit_Call(self, node):
        global internal_updates
        if (isinstance(node.func, ast.Attribute) and node.func.attr == 'update'
                and isinstance(node.func.value, ast.Name) and node.func.value.id == 'self'):
            node.func.attr = '_update_screen'
            internal_updates += 1
        return self.generic_visit(node)

for cls in engine.body:
    if cls.name == 'TurtleScreen':
        cls = InternalScreenUpdates().visit(cls)
        public_update = None
        for item in cls.body:
            if isinstance(item, ast.FunctionDef) and item.name == 'update':
                item.name = '_update_screen'
                public_update = ast.parse('def update(self):\n    self._update_screen()\n    self._activity_turn()').body[0]
                activity_turns += 1
        if public_update is not None:
            cls.body.append(public_update)
    for item in getattr(cls, 'body', []):
        if cls.name == 'Shape' and isinstance(item, ast.FunctionDef) and item.name == '__init__':
            item.body[:0] = ast.parse("if type_ == 'compound':\n    raise NotImplementedError('Formas compostas não estão disponíveis neste perfil Turtle')").body
        if isinstance(item, ast.FunctionDef) and item.name in unsupported.get(cls.name, set()):
            item.body = ast.parse(
                "raise NotImplementedError('Esta API Turtle não está disponível no navegador: "
                + item.name + "')").body
        if cls.name == 'RawTurtle' and isinstance(item, ast.FunctionDef):
            if item.name == 'clone':
                item.body[1:1] = ast.parse('self.screen._check_turtle_capacity(3 + (len(self.currentLine) > 1))').body
                quota_checks += 1
            if item.name == '__init__':
                index = next(index for index, statement in enumerate(item.body)
                             if ast.unparse(statement) == 'screen = self.screen')
                item.body[index+1:index+1] = ast.parse('screen._check_turtle_capacity()').body
                quota_checks += 1
require(quota_checks == 2, 'Turtle quota insertion points changed')
require(activity_turns == 1, 'Activity turn insertion point changed')
require(internal_updates == 2, 'Internal screen update insertion points changed')

screen_names = set('bgcolor bgpic colormode delay getshapes listen mainloop onkey onkeypress '
                   'onkeyrelease onclick ontimer register_shape addshape tracer turtles update '
                   'clear clearscreen reset resetscreen onscreenclick window_width window_height'.split())
window_names = set('setup title bye exitonclick'.split())
turtle_names = set('forward fd backward back bk left lt right rt goto setpos setposition setx sety '
                  'home setheading seth position pos xcor ycor heading distance towards penup pu up '
                  'pendown pd down isdown pensize width pencolor fillcolor color circle dot '
                  'begin_fill end_fill filling write shape shapesize turtlesize showturtle st '
                  'hideturtle ht isvisible speed clone stamp clearstamp clearstamps clear reset '
                  'getscreen onclick onrelease ondrag'.split())
entries = []
for owner, cls, names in [('Screen', reference._Screen, screen_names | window_names),
                           ('Turtle', reference.Turtle, turtle_names)]:
    for name in sorted(names):
        method = getattr(cls, name)
        signature = inspect.signature(method)
        signature = signature.replace(parameters=list(signature.parameters.values())[1:])
        entries.append({'owner': owner, 'name': name, 'signature': str(signature),
                        'canonical': method.__name__, 'fixtureFamily': None})

functions = []
for owner, names, upstream in [('Screen', screen_names | window_names, reference._tg_screen_functions),
                               ('Turtle', turtle_names, reference._tg_turtle_functions)]:
    for name in upstream:
        if name not in names:
            continue
        signature = inspect.signature(getattr(reference, name))
        parameters = list(signature.parameters.values())
        arguments = ', '.join(('*' if p.kind == p.VAR_POSITIONAL else
                               '**' if p.kind == p.VAR_KEYWORD else
                               p.name + '=' if p.kind == p.KEYWORD_ONLY else '') + p.name
                              for p in parameters)
        obj, constructor = ('_screen', 'Screen') if owner == 'Screen' else ('_pen', 'Turtle')
        functions.append(f'''def {name}{signature}:
    if Turtle.{obj} is None:
        if not TurtleScreen._RUNNING:
            TurtleScreen._RUNNING = True
            raise Terminator
        Turtle.{obj} = {constructor}()
    return Turtle.{obj}.{name}({arguments})
''')
        original_class = reference._Screen if owner == 'Screen' else reference.Turtle
        entries.append({'owner': 'turtle', 'name': name, 'signature': str(signature),
                        'canonical': getattr(original_class, name).__name__,
                        'receiver': owner, 'fixtureFamily': None})

# Public constructors and mainloop's official module alias are part of the same
# contract. Constructor signatures come from CPython, never a hand-written copy.
for name in ['Screen', 'Turtle', 'done']:
    entries.append({'owner': 'turtle', 'name': name,
                    'signature': str(inspect.signature(getattr(reference, name))),
                    'canonical': 'mainloop' if name == 'done' else name,
                    'receiver': 'Screen' if name == 'done' else None,
                    'fixtureFamily': None})

header = source[:source.index('"""')]
header += '\n# ALTERED VERSION: Sistema Zero browser port, derived from CPython 3.14.2.\n'
header += '# Generated by scripts/turtle/derive.py. Do not edit this file.\n'
header += 'import math\nfrom copy import deepcopy\nfrom contextlib import contextmanager\n'
header += 'from _sz_turtle_runtime._sz_turtle_backend import TurtleScreenBase, BrowserImage\n'
header += '_CFG = ' + repr(reference._CFG) + '\n\n'
suffix = (ROOT / 'screen.py.inc').read_text(encoding='utf-8')
output = header + ast.unparse(engine) + '\n\n' + suffix + '\n' + '\n'.join(functions)
output += '\ndone = mainloop\nPen = Turtle\nRawPen = RawTurtle\n'
output += '__all__ = ' + repr(sorted(set(e['name'] for e in entries if e['owner'] == 'turtle') |
                                   {'Screen', 'Turtle', 'Vec2D', 'Terminator', 'done'})) + '\n'
compile(output, 'turtle.py', 'exec')
require(not re.search(r'\bTK\.|\btkinter\b', ast.unparse(engine)), 'Unexpected Tk dependency')
OUTPUT.mkdir(parents=True, exist_ok=True)
limits = json.loads((OUTPUT / 'limits.json').read_text(encoding='utf-8'))
(OUTPUT / '_sz_turtle_limits.py').write_text(
    '# Generated from limits.json by scripts/turtle/derive.py. Do not edit.\n'
    + 'LIMITS = ' + repr(limits) + '\n', encoding='utf-8', newline='\n')

# Decode Tk's 32-byte table, preserving its named-color values and word boundaries.
# CSS's gray/green/purple definitions do not match Tk, so CSS name lookup is not used.
color_source = (ROOT / 'vendor/xcolors.c').read_text(encoding='utf-8')
table = color_source.split('static const elem xColors[] = {', 1)[1].split('};', 1)[0]
colors = {}
initial = None
count = 0
table = re.sub(r'"\s*\n\s*"', '', table)  # Adjacent C string literals form one entry.
for line in table.splitlines():
    match = re.search("Colors starting with '([a-z])'", line)
    if match:
        initial = match[1]
    if not line.strip().startswith('"'):
        continue
    count += 1
    if '/* placeholder */' in line:
        continue
    literal = line.strip().rstrip(',')
    value = ast.literal_eval('b' + literal).ljust(32, b'\0')
    require(len(value) == 32 and initial is not None, 'Invalid Tk color record')
    name = initial + value.split(b'\0', 1)[0].decode('ascii')
    variants = range(101) if value[31] == 8 else range(value[31] + 1)
    for number in variants:
        if number > 8:
            gray = (number * 255 + 50) // 100
            if gray in (230, 128):
                gray -= 1
            rgb = bytes([gray] * 3)
        else:
            rgb = value[28-number*3:31-number*3]
        expanded = ['']
        for char in name:
            expanded = [prefix + gap + char.lower() for prefix in expanded
                        for gap in (('', ' ') if char.isupper() else ('',))]
        for spelling in expanded:
            colors[spelling + (str(number) if number else '')] = '#' + rgb.hex()
require(count == 158, 'Tk color table changed')
(OUTPUT / '_sz_turtle_colors.py').write_text(
    '# Derived from Tk 8.6.15 xlib/xcolors.c; see LICENSE-tk.txt.\nCOLORS = ' +
    repr(dict(sorted(colors.items()))) + '\n', encoding='utf-8', newline='\n')
(OUTPUT / 'turtle.py').write_text(output, encoding='utf-8', newline='\n')
(OUTPUT / 'api-reference.json').write_text(json.dumps({
    'version': 1, 'python': '3.14.2', 'tk': '8.6.15', 'upstreamSha256': PINS['turtle.py'],
    'status': 'contract-under-conformance', 'entries': entries,
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'sha256': hashlib.sha256(output.encode()).hexdigest(), 'entries': len(entries),
                  'patches': patches}))
