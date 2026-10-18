"""L0 standard-input adapter: normal input() reads from a text stream."""
import io
import json
import sys
from pyodide.ffi import run_sync
from js import l0Readline


class ConsoleInput(io.TextIOBase):
    def __init__(self):
        self._remaining = ""
        self._eof = False

    def readable(self):
        return True

    def readline(self, size=-1):
        if size == 0:
            return ""
        if not self._remaining and not self._eof:
            line = json.loads(run_sync(l0Readline()))["line"]
            if line is None:
                self._eof = True
            else:
                self._remaining = str(line) + "\n"
        if size < 0:
            result, self._remaining = self._remaining, ""
        else:
            result, self._remaining = self._remaining[:size], self._remaining[size:]
        return result


sys.stdin = ConsoleInput()
