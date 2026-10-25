"""Trusted execution adapter. Learner files remain unchanged in a temporary FS."""
import io
import json
import os
import sys
import traceback
import types
import weakref
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


def _bounded_ends(value, head, tail):
    # A long traceback (deep recursion) keeps its start and its end: the end has the line of
    # the error and its kind, as a terminal shows.
    if len(value) <= head + tail:
        return _bounded_text(value, 16000)
    return _bounded_text(value[:head] + "\n…\n" + value[-tail:], 16000)


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


# The part of pygame the Pygame Zero extension brings (packages/studio/.../pgzero/py/pygame).
_PROVIDED_PYGAME = frozenset(
    {'pygame', 'pygame.draw', 'pygame.image', 'pygame.math', 'pygame.mixer'}
)


class _NoPygameFinder:
    """Only a part of pygame exists in the browser; anything else says what to use instead."""

    def find_spec(self, name, path=None, target=None):
        if name in _PROVIDED_PYGAME:
            return None
        if name == 'pygame' or name.startswith('pygame.'):
            raise ModuleNotFoundError(
                f"No Estúdio existe só uma parte do pygame (pygame.draw, pygame.mixer, "
                f"pygame.Rect, pygame.Color, pygame.math.Vector2 e pygame.image.load); "
                f"'{name}' não está nela. Quase sempre o Pygame Zero tem um jeito próprio: "
                f"screen, Actor, keyboard e clock.",
                name=name,
            )
        return None


# Files the program saves with open() go back to the host (savedFiles.ts) and return in the
# next run, as they would stay on a computer. The same limits as the host's.
_SAVED_FILE_LIMITS = {'files': 16, 'file_bytes': 64 * 1024, 'total_bytes': 256 * 1024}
_WRITE_MODE_LETTERS = frozenset('wax+')


class _SavedFiles:
    def __init__(self, root, protected, sizes, report, original_open):
        self._root = os.path.realpath(root)
        self._protected = frozenset(path.lower() for path in protected)
        self._sizes = dict(sizes)
        self._report = report
        self._open = original_open
        self._warned = set()
        # Written files still open: sent at the end of the run (on a computer they reach the
        # disk when the program ends) and at each flush().
        self._open_files = weakref.WeakSet()

    def relative(self, file):
        """The project path of a file the program opened, or None when it is not kept."""
        if isinstance(file, int):
            return None
        try:
            path = os.fsdecode(os.fspath(file))
        except TypeError:
            return None
        absolute = os.path.realpath(os.path.join(os.getcwd(), path))
        if not absolute.startswith(self._root + os.sep):
            return None
        relative = absolute[len(self._root) + 1:].replace(os.sep, '/')
        # The program's own files are not saved over: the next run starts from the project.
        if relative.lower() in self._protected:
            self._warn(relative, 'ele faz parte do projeto; o que o jogo gravar nele vale só '
                                 'enquanto ele roda.')
            return None
        return relative

    def _warn(self, relative, reason):
        if relative in self._warned:
            return
        self._warned.add(relative)
        print(f"Aviso: o arquivo '{relative}' não foi guardado no projeto: {reason}",
              file=sys.stderr)

    def opened(self, wrapper):
        self._open_files.add(wrapper)

    def flush_open(self):
        for wrapper in list(self._open_files):
            try:
                wrapper.flush()
            except Exception:
                pass

    def closed(self, relative):
        absolute = os.path.join(self._root, relative)
        try:
            size = os.path.getsize(absolute)
        except OSError:
            return
        if size > _SAVED_FILE_LIMITS['file_bytes']:
            self._warn(relative, 'ele passou de 64 KB.')
            return
        sizes = dict(self._sizes)
        sizes[relative] = size
        if len(sizes) > _SAVED_FILE_LIMITS['files']:
            self._warn(relative, 'o jogo já guardou 16 arquivos.')
            return
        if sum(sizes.values()) > _SAVED_FILE_LIMITS['total_bytes']:
            self._warn(relative, 'os arquivos guardados passariam de 256 KB.')
            return
        with self._open(absolute, 'rb') as handle:
            data = handle.read()
        if not self._report(relative, to_js(data)):
            self._warn(relative, 'o nome dele não pode ser usado num projeto.')
            return
        self._sizes = sizes

    def opener(self):
        original = self._open
        watcher = self

        def open(file, mode='r', *args, **kwargs):
            handle = original(file, mode, *args, **kwargs)
            if isinstance(mode, str) and not _WRITE_MODE_LETTERS.isdisjoint(mode):
                relative = watcher.relative(file)
                if relative is not None:
                    wrapper = _SavedFile(handle, relative, watcher)
                    watcher.opened(wrapper)
                    return wrapper
            return handle

        open.__doc__ = original.__doc__
        return open


class _SavedFile:
    """A written file of the project: closing it (or dropping it) sends it to the host."""

    def __init__(self, handle, relative, watcher):
        self.__dict__['_handle'] = handle
        self.__dict__['_relative'] = relative
        self.__dict__['_watcher'] = watcher

    def __getattr__(self, name):
        value = getattr(self._handle, name)
        if not callable(value):
            return value
        # `open('x', 'w').write(...)` drops this wrapper before calling write: the method
        # holds it until the call returns, and only then does dropping it close the file.
        wrapper = self

        def method(*args, **kwargs):
            keep = wrapper  # noqa: F841 (the closure is what keeps the wrapper)
            return value(*args, **kwargs)

        return method

    def __setattr__(self, name, value):
        setattr(self._handle, name, value)

    def __iter__(self):
        # The wrapper itself: a temporary open() in a for loop stays open until the loop ends.
        return self

    def __next__(self):
        return next(self._handle)

    def __repr__(self):
        return repr(self._handle)

    def flush(self):
        self._handle.flush()
        if not self._handle.closed:
            self._watcher.closed(self._relative)

    def __enter__(self):
        self._handle.__enter__()
        return self

    def __exit__(self, *exception):
        self.close()
        return False

    def close(self):
        if self._handle.closed:
            return
        self._handle.close()
        self._watcher.closed(self._relative)

    def __del__(self):
        try:
            self.close()
        except Exception:
            pass


class _StudioExecution:
    def __init__(self):
        self._main = None
        self._entrypoint = None
        self._grader = None
        self._after_main = None
        self._mission = None
        self._root = None

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
        self._root = str(Path(root).resolve())

    def _checkpoint(self):
        if self._grader is not None:
            self._grader.checkpoint()
        if self._mission is not None:
            self._mission.checkpoint()

    def install_mission(self, source, requested, publish):
        if self._main is None or self._mission is not None:
            raise RuntimeError('O observador não pode ser preparado nesta execução.')
        namespace = {'__name__': '_sz_mission_runtime'}
        exec(compile(source, '<observador de missão>', 'exec', dont_inherit=True), namespace)
        self._mission = namespace['_StudioMissionObserver'](
            self._main.__dict__, self._mission_module, run_sync,
            requested, publish, self._mission_sprite)

    def _mission_module(self, path):
        from importlib import import_module
        if (not isinstance(path, str) or not path.endswith('.py') or
                '\\' in path or path.startswith('/') or
                any(part in ('', '.', '..') for part in path.split('/'))):
            raise ValueError('O módulo precisa pertencer ao projeto Python.')
        expected = (Path(self._root) / path).resolve()
        if not expected.is_relative_to(self._root) or not expected.is_file():
            raise ValueError('O módulo não existe no projeto Python.')
        if str(expected) == self._entrypoint:
            return self._main.__dict__
        original = list(sys.path)
        try:
            sys.path.insert(0, self._root)
            name = path[:-3].replace('/', '.')
            if name.endswith('.__init__'):
                name = name[:-9]
            module = import_module(name)
            if Path(module.__file__).resolve() != expected:
                raise ValueError('O módulo resolvido não pertence a este arquivo do projeto.')
            return module.__dict__
        finally:
            sys.path[:] = original

    @staticmethod
    def _mission_sprite(value):
        for name, class_name in [('turtle', 'RawTurtle'), ('pgzero.actor', 'Actor')]:
            module = sys.modules.get(name)
            kind = getattr(module, class_name, None) if module is not None else None
            if isinstance(kind, type) and isinstance(value, kind):
                return id(value)
        return None

    def observe_mission(self):
        if self._mission is None:
            raise RuntimeError('Esta execução não possui observador de missão.')
        self._mission.checkpoint()

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
                          self._checkpoint if self._grader is not None or self._mission is not None else None,
                          mission=self._mission is not None)

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

        _sz.configure(transport, decoder, str(Path.cwd()),
                      checkpoint=self._checkpoint if self._mission is not None else None)
        runner.prepare_mod(self._main)
        self._after_main = lambda: runner.run_mod(self._main)

    def install_raylib(self, directory, exchange, decode, mode):
        # pyray/raylib like `pip install raylib` on the desktop: the program draws in its own
        # loop and each end_drawing() is one exchange with the browser. One module serves the
        # two extensions; `mode` ("2d" or "3d") says which one the project installed.
        # Author modules keep precedence (sys.path[0] is the project).
        if self._main is None or '_szraylib' in sys.modules:
            raise RuntimeError('O Raylib não pode ser preparado nesta execução.')
        if mode not in ('2d', '3d'):
            raise RuntimeError('Extensão Raylib desconhecida.')
        sys.path.insert(1, directory)
        import _szraylib

        def transport(header, payload):
            reply = run_sync(exchange(header, to_js(payload)))
            if isinstance(reply, str):
                return reply, None
            return str(reply[0]), reply[1].to_bytes()

        def decoder(path):
            return run_sync(decode(path)).to_bytes()

        _szraylib.configure(transport, decoder, str(Path.cwd()), mode,
                           checkpoint=self._checkpoint if self._mission is not None else None)

    def install_audio(self, directory, exchange):
        # Author modules keep precedence. This adds media, not an unofficial turtle method.
        if self._main is None or '_sz_audio_runtime' in sys.modules:
            raise RuntimeError('O canal de áudio não pode ser preparado nesta execução.')
        sys.path.insert(1, directory)
        transport = types.ModuleType('_sz_audio_runtime')
        transport.exchange = exchange
        transport.root = str(Path.cwd())
        sys.modules[transport.__name__] = transport

    def install_saved_files(self, root, protected, sizes, report):
        # Applies to pathlib too (Path.open goes through io.open, the same function).
        import builtins
        if self._main is None or getattr(builtins.open, '_sz_saved_files', False):
            raise RuntimeError('Os arquivos do jogo não podem ser preparados nesta execução.')
        watcher = _SavedFiles(root, json.loads(protected), json.loads(sizes), report,
                              builtins.open)
        self._saved_files = watcher
        opener = watcher.opener()
        opener._sz_saved_files = True
        builtins.open = opener
        io.open = opener

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
            # Like CPython: sys.exit() ends the program without a traceback. A number is only
            # the exit status; any other value is printed to stderr first.
            if error.code is not None and not isinstance(error.code, int):
                try:
                    print(error.code, file=sys.stderr)
                except BaseException as failure:
                    result = self._failure(failure)
                    return self._finish(result)
            result = {"ok": True, "text": ""}
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
        saved = getattr(self, '_saved_files', None)
        if saved is not None:
            saved.flush_open()
        backend = sys.modules.get('_sz_turtle_runtime._sz_turtle_backend')
        if backend is not None:
            try:
                backend.present_pending()
            except Exception:
                pass
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
            formatted = _bounded_ends("".join(traceback.format_exception(error)), 3000, 11000)
        except BaseException:
            formatted = message
        return {"ok": False, "text": message, "traceback": formatted}


_StudioExecution()
