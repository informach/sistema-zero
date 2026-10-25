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

    def install(self, sizes, protected, folders=()):
        self.original = builtins.open
        self.original_os = (os.remove, os.unlink, os.rmdir, os.rename, os.replace)
        # The same install() the interpreter uses: a patch missing there fails here.
        watcher = SavedFiles(self.root, protected, sizes, self.report, self.original, folders)
        watcher.install(builtins)
        return watcher

    def uninstall(self):
        builtins.open = self.original
        io.open = self.original
        os.remove, os.unlink, os.rmdir, os.rename, os.replace = self.original_os
        sys.modules.pop('_sz_saved_files', None)

    def tearDown(self):
        self.uninstall()
        os.chdir(self.cwd)

    def report(self, path, data):
        self.reports.append((path, None if data is None else bytes(data)))
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
        self.uninstall()
        self.watcher = self.install({f'velho{index}.txt': 1 for index in range(16)}, ['main.py'])
        text = self.warnings(lambda: Path('novo.txt').write_text('1'))
        self.assertIn('16 arquivos', text)
        self.assertEqual(self.reports, [])

    def test_deleting_a_kept_file_tells_the_host_to_forget_it(self):
        Path('recorde.txt').write_text('42')
        os.remove('recorde.txt')
        Path('mapa.txt').write_text('#')
        Path('mapa.txt').unlink()
        Path('nivel.txt').write_text('1')
        os.unlink('nivel.txt')
        self.assertEqual(self.reports[1], ('recorde.txt', None))
        self.assertEqual(self.reports[3], ('mapa.txt', None))
        self.assertEqual(self.reports[5], ('nivel.txt', None))

    def test_deleting_frees_room_in_the_limits(self):
        for index in range(16):
            Path(f'f{index}.txt').write_text('1')
        os.remove('f0.txt')
        text = self.warnings(lambda: Path('mais.txt').write_text('1'))
        self.assertEqual(text, '')
        self.assertEqual(self.reports[-1], ('mais.txt', b'1'))

    def test_renaming_forgets_the_old_name_and_keeps_the_new_one(self):
        Path('rascunho.txt').write_text('fase 1')
        os.rename('rascunho.txt', 'fase.txt')
        Path('fase.txt').replace('final.txt')
        self.assertEqual(self.reports[1:], [
            ('rascunho.txt', None), ('fase.txt', b'fase 1'),
            ('fase.txt', None), ('final.txt', b'fase 1'),
        ])

    def test_deleting_a_program_file_only_lasts_this_run_and_is_said(self):
        Path('inimigos.txt').write_text('1, fim')
        self.uninstall()
        self.watcher = self.install({}, ['main.py', 'inimigos.txt'])
        self.reports.clear()
        text = self.warnings(lambda: os.remove('inimigos.txt'))
        self.assertEqual(self.reports, [])
        self.assertIn('apagar vale só enquanto o jogo roda', text)

    def test_a_failed_delete_tells_nothing_and_raises_as_on_a_computer(self):
        with self.assertRaises(FileNotFoundError):
            os.remove('nao-existe.txt')
        self.assertEqual(self.reports, [])

    def test_a_name_the_host_refuses_is_said_and_not_counted(self):
        self.accept = False
        text = self.warnings(lambda: Path('ruim.txt').write_text('1'))
        self.assertIn('não pode ser usado', text)
        # Not counted: 16 good files still fit after the refused one.
        self.accept = True
        for index in range(16):
            Path(f'f{index}.txt').write_text('1')
        self.assertEqual(len([p for p in self.paths() if p.startswith('f')]), 16)

    def test_the_interpreter_installs_every_patch(self):
        self.uninstall()
        execution = namespace['_StudioExecution'].__new__(namespace['_StudioExecution'])
        execution._main = types.ModuleType('__main__')
        self.original = builtins.open
        self.original_os = (os.remove, os.unlink, os.rmdir, os.rename, os.replace)
        execution.install_saved_files(self.root, json.dumps(['main.py']), '{}', self.report,
                                      json.dumps(['fases']))
        for function in (builtins.open, io.open, os.remove, os.unlink, os.rmdir, os.rename,
                         os.replace):
            self.assertIn(function.__name__, ('open', 'remove', 'rmdir', 'rename'))
        self.assertIsNot(os.replace, self.original_os[4])
        self.assertIsNot(os.rmdir, self.original_os[2])
        self.assertIn('_sz_saved_files', sys.modules)
        Path('a.txt').write_text('1')
        os.replace('a.txt', 'b.txt')
        self.assertEqual(self.reports, [('a.txt', b'1'), ('a.txt', None), ('b.txt', b'1')])

    def test_the_same_name_with_other_capitals_replaces_the_old_one(self):
        Path('Placar.txt').write_text('velho')
        os.remove('Placar.txt')
        self.reports.clear()
        self.uninstall()
        self.watcher = self.install({'Placar.txt': 5}, ['main.py'])
        Path('placar.txt').write_text('novo')
        self.assertEqual(self.reports, [('Placar.txt', None), ('placar.txt', b'novo')])

    def test_deleting_a_folder_forgets_what_was_kept_inside(self):
        import shutil
        os.mkdir('saves')
        Path('saves/um.txt').write_text('1')
        Path('saves/dois.txt').write_text('2')
        shutil.rmtree('saves')
        self.assertIn(('saves/um.txt', None), self.reports)
        self.assertIn(('saves/dois.txt', None), self.reports)

    def test_renaming_a_folder_moves_each_kept_file(self):
        os.mkdir('saves')
        Path('saves/um.txt').write_text('1')
        os.rename('saves', 'backup')
        self.assertIn(('saves/um.txt', None), self.reports)
        self.assertIn(('backup/um.txt', b'1'), self.reports)

    def test_renaming_a_program_file_keeps_neither_name(self):
        Path('fase.txt').write_text('mapa')
        self.uninstall()
        self.watcher = self.install({}, ['main.py', 'fase.txt'])
        self.reports.clear()
        text = self.warnings(lambda: os.rename('fase.txt', 'copia.txt'))
        self.assertEqual(self.reports, [])
        self.assertIn('mudar o nome dele vale só enquanto o jogo roda', text)

    def test_a_folder_of_the_project_with_other_capitals_is_not_used(self):
        self.uninstall()
        self.watcher = self.install({}, ['main.py'], ['fases'])
        os.mkdir('Fases')
        text = self.warnings(lambda: Path('Fases/1.txt').write_text('1'))
        self.assertEqual(self.reports, [])
        self.assertIn("já tem a pasta 'fases'", text)

    def test_a_file_left_open_is_sent_by_the_game_loop_every_quarter_second(self):
        log = open('log.txt', 'a')
        log.write('1')
        sys.modules['_sz_saved_files'].tick()
        self.assertEqual(self.reports, [('log.txt', b'1')])
        log.write('2')
        sys.modules['_sz_saved_files'].tick()
        # Too soon: nothing new until a quarter of a second has passed.
        self.assertEqual(len(self.reports), 1)
        self.watcher._last_tick -= 1
        sys.modules['_sz_saved_files'].tick()
        self.assertEqual(self.reports[-1], ('log.txt', b'12'))
        log.close()

    def test_the_same_bytes_are_not_sent_again(self):
        Path('recorde.txt').write_text('10')
        Path('recorde.txt').write_text('10')
        Path('recorde.txt').write_text('11')
        self.assertEqual(self.paths(), ['recorde.txt', 'recorde.txt'])


if __name__ == '__main__':
    unittest.main()
