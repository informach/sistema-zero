"""The files a program saves (interpreter.py: _SavedFiles), run in plain CPython.

interpreter.py needs Pyodide only to talk to the browser: these stubs stand in for it, and
the report callback records what would go to the host.
"""
import builtins
import contextlib
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest

source = Path(sys.argv[1])
sys.argv[1:] = []
for module in ('pyodide', 'pyodide.code', 'pyodide.ffi'):
    sys.modules[module] = types.ModuleType(module)
sys.modules['pyodide.code'].eval_code_async = None
sys.modules['pyodide.ffi'].run_sync = None
sys.modules['pyodide.ffi'].to_js = bytes
namespace = {'__name__': 'interpreter_under_test'}
exec(compile(source.read_text(encoding='utf-8'), str(source), 'exec'), namespace)
SavedFiles = namespace['_SavedFiles']


class Saved(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.cwd = os.getcwd()
        os.chdir(self.root)
        Path('main.py').write_text('')
        self.reports = []
        self.accept = True
        self.watcher = self.install({}, ['main.py'])

    def install(self, sizes, protected):
        self.original = builtins.open
        watcher = SavedFiles(self.root, protected, sizes, self.report, self.original)
        opener = watcher.opener()
        builtins.open = opener
        io.open = opener
        return watcher

    def tearDown(self):
        builtins.open = self.original
        io.open = self.original
        os.chdir(self.cwd)

    def report(self, path, data):
        self.reports.append((path, bytes(data)))
        return self.accept

    def paths(self):
        return [path for path, _ in self.reports]

    def warnings(self, action):
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            action()
        return stderr.getvalue()

    def test_closing_a_written_file_sends_it_with_its_bytes(self):
        with open('placar.txt', 'wb') as arquivo:
            arquivo.write(b'Ana;30\n')
        self.assertEqual(self.reports, [('placar.txt', b'Ana;30\n')])

    def test_pathlib_json_csv_and_print_go_through_the_same_open(self):
        import csv
        os.mkdir('dados')
        Path('dados/nivel.txt').write_text('1')
        with open('dados/recorde.json', 'w') as arquivo:
            json.dump({'pontos': 10}, arquivo)
        with open('placar.csv', 'w', newline='') as arquivo:
            csv.writer(arquivo).writerow(['Ana', 30])
        print('linha', file=open('log.txt', 'a'))
        self.assertEqual(
            self.paths(), ['dados/nivel.txt', 'dados/recorde.json', 'placar.csv', 'log.txt']
        )

    def test_a_temporary_open_write_is_sent_when_it_is_dropped(self):
        open('solto.txt', 'w').write('sem close')
        self.assertEqual(self.paths(), ['solto.txt'])

    def test_reading_is_not_watched_and_iterating_a_temporary_file_works(self):
        Path('placar.txt').write_text('a\nb\n')
        self.reports.clear()
        with open('placar.txt') as arquivo:
            self.assertEqual(arquivo.read(), 'a\nb\n')
        self.assertEqual(self.reports, [])
        self.assertEqual([linha for linha in open('placar.txt', 'r+')], ['a\n', 'b\n'])

    def test_a_file_left_open_is_sent_at_flush_and_at_the_end_of_the_run(self):
        arquivo = open('recorde.txt', 'w')
        arquivo.write('42')
        self.assertEqual(self.reports, [])
        self.watcher.flush_open()
        self.assertEqual(self.reports, [('recorde.txt', b'42')])
        arquivo.write('0')
        arquivo.flush()
        self.assertEqual(self.reports[-1], ('recorde.txt', b'420'))
        self.assertIn("recorde.txt", repr(arquivo))
        arquivo.close()

    def test_the_program_files_and_files_outside_the_project_are_not_saved(self):
        outside = os.path.join(tempfile.mkdtemp(), 'fora.txt')
        text = self.warnings(lambda: open('MAIN.py', 'a').close())
        with open(outside, 'w') as arquivo:
            arquivo.write('x')
        self.assertEqual(self.reports, [])
        self.assertIn('faz parte do projeto', text)

    def test_the_limits_warn_once_and_keep_what_was_saved(self):
        text = self.warnings(lambda: Path('grande.bin').write_bytes(b'0' * (64 * 1024 + 1)))
        self.assertIn('64 KB', text)
        for index in range(16):
            Path(f'f{index}.txt').write_text('1')
        text = self.warnings(lambda: Path('mais.txt').write_text('1'))
        self.assertIn('16 arquivos', text)
        self.assertEqual(len(self.paths()), 16)

    def test_files_saved_before_count_in_the_limits(self):
        builtins.open = self.original
        io.open = self.original
        self.watcher = self.install({f'velho{index}.txt': 1 for index in range(16)}, ['main.py'])
        text = self.warnings(lambda: Path('novo.txt').write_text('1'))
        self.assertIn('16 arquivos', text)
        self.assertEqual(self.reports, [])

    def test_a_name_the_host_refuses_is_said_and_not_counted(self):
        self.accept = False
        text = self.warnings(lambda: Path('ruim.txt').write_text('1'))
        self.assertIn('não pode ser usado', text)


if __name__ == '__main__':
    unittest.main()
