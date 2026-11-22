"""Prova diferencial das áreas do projeto (usada por areas.differential.test.ts).

Lê um pedido JSON na entrada:
  {"op": "parse", "sources": [...]}            -> a árvore de cada fonte, no formato do Estúdio
  {"op": "run", "cases": [{"source", "order"}]} -> roda a ordem original e a reorganizada e compara

A comparação olha o que o programa escreve, o erro em que ele para e os valores simples que
sobram no módulo. O `turtle` é de mentira: guarda os registros em silêncio (como o de verdade) e,
no `mainloop`, aperta cada tecla registrada e roda cada relógio uma vez, na ordem.
"""
import ast
import contextlib
import importlib.util
import io
import json
import re
import sys
import types
from pathlib import Path

HERE = Path(__file__).resolve().parent
ANALYZER = HERE.parent / "language" / "analyzer.py"


def load_service():
    spec = importlib.util.spec_from_file_location("studio_analyzer", ANALYZER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    limits = (HERE.parent / "language" / "limits.json").read_text(encoding="utf8")
    return module.PythonLanguageService(limits)


def parse(sources):
    service = load_service()
    out = []
    for source in sources:
        result = json.loads(service.request(json.dumps(
            {"operation": "parse", "source": source, "path": "main.py", "compilable": True}
        )))
        out.append(result.get("tree"))
    return out


def fake_turtle():
    module = types.ModuleType("turtle")
    state = {"keys": {}, "timers": [], "listening": False}

    def log(name, *args):
        shown = ", ".join(getattr(arg, "__name__", None) or repr(arg) for arg in args)
        print(f"[turtle] {name}({shown})")

    def onkey(fun, key):
        if fun is None:
            state["keys"].pop(key, None)
        else:
            state["keys"][key] = fun

    def listen():
        state["listening"] = True

    def ontimer(fun, t=0):
        state["timers"].append(fun)

    def clearscreen():
        log("clearscreen")
        state["keys"].clear()
        state["timers"].clear()
        state["listening"] = False

    def clear():
        log("clear")

    def title(text):
        log("title", text)

    def mainloop():
        log("mainloop")
        for key, fun in list(state["keys"].items()):
            print(f"[tecla {key} ouvida={state['listening']}]")
            fun()
        timers, state["timers"] = state["timers"], []
        for fun in timers:
            print("[relógio]")
            fun()

    class Screen:
        def __new__(cls):
            return screen

    screen = object.__new__(Screen)
    for name, fun in {
        "onkey": onkey, "onkeypress": onkey, "listen": listen, "ontimer": ontimer,
        "clearscreen": clearscreen, "clear": clearscreen, "title": title, "mainloop": mainloop,
    }.items():
        setattr(Screen, name, staticmethod(fun))
    module.Screen = Screen
    module.onkey = onkey
    module.onkeypress = onkey
    module.listen = listen
    module.ontimer = ontimer
    module.clearscreen = clearscreen
    module.clear = clear
    module.title = title
    module.mainloop = mainloop
    module.done = mainloop
    return module


def fake_pgzero(namespace):
    """`pgzrun.go()` roda o laço do jogo: três voltas com `update`, `draw` e o relógio, e uma
    tecla. `clock` e `screen` entram no módulo como o Pygame Zero faz."""
    pgzrun = types.ModuleType("pgzrun")
    timers = []

    def log(name, *args):
        shown = ", ".join(getattr(arg, "__name__", None) or repr(arg) for arg in args)
        print(f"[pgzero] {name}({shown})")

    def schedule(fun, delay):
        timers.append(fun)

    def unschedule(fun):
        if fun in timers:
            timers.remove(fun)

    clock = types.SimpleNamespace(
        schedule=schedule, schedule_interval=schedule, schedule_unique=schedule,
        unschedule=unschedule,
    )
    screen = types.SimpleNamespace(
        clear=lambda: log("clear"), fill=lambda color: log("fill", color),
        draw=types.SimpleNamespace(text=lambda text, *args, **options: log("text", text)),
    )

    def go():
        log("go")
        for frame in range(3):
            for name in ("update", "draw"):
                hook = namespace.get(name)
                if callable(hook):
                    print(f"[volta {frame}: {name}]")
                    hook()
            for fun in list(timers):
                print("[relógio]")
                fun()
        hook = namespace.get("on_key_down")
        if callable(hook):
            print("[tecla]")
            hook("space")

    pgzrun.go = go
    namespace["clock"] = clock
    namespace["screen"] = screen
    return pgzrun


def simple(value, depth=0):
    if depth > 4:
        return False
    if value is None or isinstance(value, (bool, int, float, str)):
        return True
    if isinstance(value, (list, tuple, set, frozenset)):
        return all(simple(item, depth + 1) for item in value)
    if isinstance(value, dict):
        return all(simple(k, depth + 1) and simple(v, depth + 1) for k, v in value.items())
    return False


def execute(tree):
    sys.modules["turtle"] = fake_turtle()
    namespace = {"__name__": "__main__"}
    sys.modules["pgzrun"] = fake_pgzero(namespace)
    output = io.StringIO()
    error = None
    with contextlib.redirect_stdout(output):
        try:
            exec(compile(tree, "main.py", "exec"), namespace)
        except BaseException as caught:  # noqa: BLE001 - o erro faz parte do resultado
            error = f"{type(caught).__name__}: {caught}"
    values = {}
    for key, value in namespace.items():
        if key.startswith("__"):
            continue
        if simple(value):
            values[key] = repr(value)
        elif isinstance(value, (types.FunctionType, type)):
            values[key] = f"<{type(value).__name__} {value.__qualname__}>"
    # O endereço de memória no repr de função e objeto muda a cada execução.
    shown = re.sub(r" at 0x[0-9A-Fa-f]+", "", output.getvalue())
    return {"output": shown, "error": error, "values": values}


def run(cases):
    out = []
    for case in cases:
        tree = ast.parse(case["source"])
        original = execute(tree)
        moved = ast.parse(case["source"])
        moved.body = [moved.body[index] for index in case["order"]]
        reordered = execute(moved)
        # Depois de um erro o programa parou: o que sobrou no módulo ninguém vê (uma definição que
        # subiu para antes do erro só existe a mais ali). O que conta é a saída e o erro.
        same = (
            original["output"] == reordered["output"]
            and original["error"] == reordered["error"]
            and (original["error"] is not None or original["values"] == reordered["values"])
        )
        out.append({"same": same, "original": original, "reordered": reordered})
    return out


def main():
    request = json.loads(sys.stdin.buffer.read().decode("utf8"))
    if request["op"] == "parse":
        result = parse(request["sources"])
    elif request["op"] == "service":
        # Um pedido cru ao analisador do Estúdio (parse/render), para a prova do caminho do editor.
        result = json.loads(load_service().request(json.dumps(request["request"])))
    else:
        result = run(request["cases"])
    sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False).encode("utf8"))


main()
