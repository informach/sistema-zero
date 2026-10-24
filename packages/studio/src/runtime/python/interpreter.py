"""Trusted execution adapter. Learner files remain unchanged in a temporary FS."""
import io
import json
import os
import sys
import traceback
import types
from importlib.machinery import SourceFileLoader
from pathlib import Path

from pyodide.code import eval_code_async
from pyodide.ffi import run_sync, to_js


def _bounded_text(value, limit):
    # Wire limits count UTF-16 units, not Python Unicode code points. Slice
    # before encoding so even a huge exception creates only a bounded copy.
    encoded = value[:limit + 1].encode("utf-16-le", errors="surrogatepass")
    if len(encoded) <= limit * 2:
        return value
    prefix = encoded[:(limit - 1) * 2].decode("utf-16-le", errors="surrogatepass")
    if prefix and 0xD800 <= ord(prefix[-1]) <= 0xDBFF:
        prefix = prefix[:-1]
    return prefix + "…"


class _ConsoleInput(io.TextIOBase):
    def __init__(self, request_line):
        self._request_line = request_line
        self._remaining = ""
        self._eof = False

    @property
    def encoding(self):
        return "utf-8"

    def readable(self):
        return True

    def readline(self, size=-1):
        self._checkClosed()
        if size == 0:
            return ""
        if not self._remaining and not self._eof:
            line = json.loads(run_sync(self._request_line()))["line"]
            if line is None:
                self._eof = True
            else:
                self._remaining = line + "\n"
        count = len(self._remaining) if size < 0 else size
        result, self._remaining = self._remaining[:count], self._remaining[count:]
        return result

    def read(self, size=-1):
        self._checkClosed()
        if size == 0:
            return ""
        parts = []
        remaining = size
        while remaining != 0:
            part = self.readline(remaining)
            if not part:
                break
            parts.append(part)
            if remaining > 0:
                remaining -= len(part)
        return "".join(parts)


class _NoPygameFinder:
    """pygame itself does not run in the browser; say what to use instead."""

    def find_spec(self, name, path=None, target=None):
        if name == 'pygame' or name.startswith('pygame.'):
            raise ModuleNotFoundError(
                "No Estúdio, o Pygame Zero já está pronto sem 'import pygame': use screen, "
                "Actor, Rect, images e sounds direto. Para ler a cor de um ponto de uma imagem, "
                "use images.nome.get_at((x, y)).",
                name=name,
            )
        return None


class _StudioExecution:
    def __init__(self):
        self._main = None
        self._entrypoint = None
        self._grader = None
        self._after_main = None

    def prepare(self, root, entrypoint, request_line):
        if self._main is not None:
            raise RuntimeError("O snapshot já foi preparado.")
        absolute = str(Path(root) / entrypoint)
        main = types.ModuleType("__main__")
        main.__file__ = absolute
        main.__package__ = None
        main.__spec__ = None
        main.__loader__ = SourceFileLoader("__main__", absolute)
        sys.modules["__main__"] = main
        sys.argv = [entrypoint]
        sys.path[0] = str(Path(absolute).parent)
        sys.stdin = _ConsoleInput(request_line)
        os.chdir(root)
        self._main = main
        self._entrypoint = absolute

    def install_turtle(self, directory, graphics):
        # The adapted stdlib turtle follows author paths and precedes the
        # desktop stdlib copy. Its private package searches only trusted files.
        # Do not pre-import turtle: an author's own turtle.py must still shadow it.
        sys.path.insert(1, directory)
        package = types.ModuleType('_sz_turtle_runtime')
        package.__path__ = [directory]
        sys.modules[package.__name__] = package
        backend_path = str(Path(directory) / '_sz_turtle_backend.py')
        from importlib.util import module_from_spec, spec_from_file_location
        spec = spec_from_file_location('_sz_turtle_runtime._sz_turtle_backend', backend_path)
        backend = module_from_spec(spec)
        sys.modules[spec.name] = backend
        spec.loader.exec_module(backend)
        backend.configure(graphics, str(Path.cwd()),
                          self._grader.checkpoint if self._grader is not None else None)

    def install_pgzero(self, directory, exchange, decode):
        # Pygame Zero runs like `pgzrun main.py`: the program's top level runs first with the
        # built-in names already present, then the game loop starts. `import pgzrun` and
        # `pgzrun.go()` stay valid (runner mode). Author modules keep precedence.
        if self._main is None or 'pgzero' in sys.modules:
            raise RuntimeError('O Pygame Zero não pode ser preparado nesta execução.')
        sys.path.insert(1, directory)
        sys.meta_path.insert(0, _NoPygameFinder())
        sys._pgzrun = True
        from pgzero import _sz, runner

        def transport(header, payload):
            # A Uint8Array copy crosses the boundary: no PyProxy for the browser to keep or free.
            # The reply is the text, or [text, pixels] when the browser sends bytes back.
            reply = run_sync(exchange(header, to_js(payload)))
            if isinstance(reply, str):
                return reply, None
            return str(reply[0]), reply[1].to_bytes()

        def decoder(path):
            # One copy into Python memory (to_bytes), not two.
            return run_sync(decode(path)).to_bytes()

        _sz.configure(transport, decoder, str(Path.cwd()))
        runner.prepare_mod(self._main)
        self._after_main = lambda: runner.run_mod(self._main)

    def install_audio(self, directory, exchange):
        # Author modules keep precedence. This adds media, not an unofficial turtle method.
        if self._main is None or '_sz_audio_runtime' in sys.modules:
            raise RuntimeError('O canal de áudio não pode ser preparado nesta execução.')
        sys.path.insert(1, directory)
        transport = types.ModuleType('_sz_audio_runtime')
        transport.exchange = exchange
        transport.root = str(Path.cwd())
        sys.modules[transport.__name__] = transport

    def install_activity(self, source, definition, requested, publish, console_matches):
        if self._grader is not None or self._main is None:
            raise RuntimeError('A atividade não pode ser preparada nesta execução.')
        namespace = {'__name__': '_sz_activity_runtime'}
        exec(compile(source, '<executor de atividade>', 'exec', dont_inherit=True), namespace)
        self._grader = namespace['_StudioActivity'](
            definition, self._main.__dict__, requested, publish, console_matches)

    def grade_activity(self):
        if self._grader is None:
            raise RuntimeError('Esta execução não tem atividade.')
        self._grader.checkpoint()

    def execute(self):
        try:
            source = Path(self._entrypoint).read_bytes()
            exec(compile(source, self._entrypoint, "exec", dont_inherit=True), self._main.__dict__)
            if self._after_main is not None:
                self._after_main()
            result = {"ok": True, "text": ""}
        except SystemExit as error:
            if error.code is None or isinstance(error.code, int) and int.__eq__(error.code, 0):
                result = {"ok": True, "text": ""}
            else:
                result = self._failure(error)
        except BaseException as error:
            result = self._failure(error)
        return self._finish(result)

    def evaluate(self, source):
        try:
            result = run_sync(eval_code_async(
                source, self._main.__dict__, filename="<console>", dedent=False,
            ))
            result = {"ok": True, "text": "" if result is None else _bounded_text(repr(result), 8000)}
        except BaseException as error:
            result = self._failure(error)
        return self._finish(result)

    def _finish(self, result):
        # Draining the JS ring cannot flush CPython's TextIOWrapper. Deliver
        # partial prints before success/error/REPL completion, without adding LF.
        for stream in (sys.stdout, sys.stderr):
            try:
                if stream is not None and not getattr(stream, "closed", False):
                    stream.flush()
            except BaseException as error:
                if result["ok"]:
                    result = self._failure(error)
        return json.dumps(result)

    @staticmethod
    def _failure(error):
        # A user exception may override __str__; keep that failure in the worker.
        try:
            message = _bounded_text(str(error), 4000)
        except BaseException:
            message = _bounded_text(type(error).__name__, 4000)
        try:
            formatted = _bounded_text("".join(traceback.format_exception(error)), 16000)
        except BaseException:
            formatted = message
        return {"ok": False, "text": message, "traceback": formatted}


_StudioExecution()
