"""Qualification recipe: add checked bytecode, retaining every original ZIP entry."""
import hashlib
import importlib.util
import json
import platform
import py_compile
import sys
import tempfile
import zipfile
from pathlib import Path

EXPECTED_INPUT = 'fa1957e5777068fc4f7437f96d860ae2fbe9c19732ba06c84e004ec16dd7dd7a'

def require(condition, message):
    if not condition:
        raise ValueError(message)

require(platform.python_version() == '3.14.2', 'CPython 3.14.2 is required')
require(sys.flags.optimize == 0, 'Run the compiler without -O, -OO or PYTHONOPTIMIZE')
require(len(sys.argv) == 3, 'Expected source ZIP and output ZIP paths')
source, target = (Path(arg).resolve() for arg in sys.argv[1:3])
require(source != target, 'Output must not overwrite the source archive')
require(hashlib.sha256(source.read_bytes()).hexdigest() == EXPECTED_INPUT, 'Invalid source archive checksum')
compiled = 0
with tempfile.TemporaryDirectory(prefix='sz-stdlib-compile-') as temporary:
    root = Path(temporary)
    with zipfile.ZipFile(source) as original, zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as output:
        require(len(original.namelist()) == len(set(original.namelist())), 'Duplicate source entry')
        for info in original.infolist():
            data = original.read(info)
            output.writestr(info, data)
            if not info.filename.endswith('.py'):
                continue
            require(info.filename + 'c' not in original.namelist(), 'Bytecode would overwrite an original entry')
            # No extracted path is used; compile only trusted bytes in one temporary file.
            raw = root / 'module.py'
            bytecode = root / 'module.pyc'
            raw.write_bytes(data)
            py_compile.compile(str(raw), cfile=str(bytecode),
                dfile='/lib/python314.zip/' + info.filename,
                doraise=True, optimize=0,
                invalidation_mode=py_compile.PycInvalidationMode.CHECKED_HASH)
            cached = bytecode.read_bytes()
            require(cached[:4] == importlib.util.MAGIC_NUMBER, 'Unexpected bytecode magic')
            entry = zipfile.ZipInfo(info.filename + 'c', date_time=(1980, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            output.writestr(entry, cached)
            compiled += 1
with zipfile.ZipFile(source) as original, zipfile.ZipFile(target) as output:
    for info in original.infolist():
        require(original.read(info) == output.read(info.filename), 'Original source was not preserved')
    require(len(output.namelist()) == len(original.namelist()) + compiled, 'Output entry count mismatch')
result = {
    'recipe': 'stdlib-checked-bytecode-with-sources-v1',
    'pythonVersion': platform.python_version(),
    'magic': importlib.util.MAGIC_NUMBER.hex(),
    'sourceSha256': EXPECTED_INPUT,
    'compiledModules': compiled,
    'sourcesPreserved': True,
    'bytes': target.stat().st_size,
    'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'path': str(target),
}
print(json.dumps(result))
