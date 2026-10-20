"""Bounded official CPython/Tk runner for an immutable canonical exported ZIP.

Example (the external supervisor supplies the process deadline):
python -I -B space_arena_native.py --artifact-dir <canonical-r2> --output <new-dir> --scenario Q02
No browser/physical-input/fresh-install/performance claim. Never writes inputs.
"""
import argparse
import hashlib
import importlib.metadata
import importlib.util
import io
import json
import os
from pathlib import Path
import random
import runpy
import stat
import sys
import tempfile
import time
import traceback
import zipfile

HERE = Path(__file__).resolve().parent
RECEIPT_SHA = 'df6d6812ac511686e5dd32187b900cc68c9b565d5d49498e5d3265e9b137fcc0'
ENTRY_SHA = '9db951e68bd4ce10f3739368d806d2a8a15db3535d9d543f21ddd5f2bd2f38a5'


def sha(value):
    return hashlib.sha256(value).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scenario', choices=[f'Q{i:02}' for i in range(2, 8)], required=True)
    args = parser.parse_args()
    assert sys.flags.isolated and sys.dont_write_bytecode
    assert sys.version_info[:3] == (3, 14, 2)
    args.output.mkdir(parents=True, exist_ok=False)
    report = dict(state='failed', scenario=args.scenario, python=sys.version,
                  executable=sys.executable, runnerSha256=sha(Path(__file__).read_bytes()),
                  observerSha256=sha((HERE / 'space_arena_observer.py').read_bytes()),
                  sourceReceiptSha256=RECEIPT_SHA, observations=[], errors=[],
                  rootMapEvents=0, rootDestroyEvents=0, audioReleased=False,
                  freshInstall=False, physicalKeyboard=False, seed=2026,
                  cooperativeBudgetSeconds=30,
                  limits=['Explicit fixtures and QA invocations of authored bindings',
                          'Bounded QA completion after original clear; not natural game exit',
                          'No browser, acoustic, raster, Pro, performance or complete-game acceptance'])
    screen = desktop = turtle = observer = None
    original_update = original_press = original_release = None
    old_cwd, old_path = Path.cwd(), sys.path.copy()
    scope = tempfile.TemporaryDirectory(prefix='sz-space-functional-')
    project = Path(scope.name).resolve()
    report['ownedTemp'] = str(project)
    started = time.monotonic()
    try:
        raw = (args.artifact_dir / 'receipt.json').read_bytes()
        assert sha(raw) == RECEIPT_SHA
        prepared = json.loads(raw)
        archive_bytes = (args.artifact_dir / 'source.zip').read_bytes()
        assert sha(archive_bytes) == prepared['zip']['sha256']
        assert prepared['entrySha256'] == ENTRY_SHA
        report.update(zipSha256=sha(archive_bytes), entrySha256=ENTRY_SHA,
                      historicalBrowserDistribution=prepared['distribution'])
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
            assert len(archive.infolist()) == len(prepared['inventory']) == 42
            assert len(set(archive.namelist())) == len(archive.infolist())
            for item in prepared['inventory']:
                name = item['path']
                info = archive.getinfo(name)
                destination = (project / name).resolve()
                assert '\\' not in name and destination.is_relative_to(project) and destination != project
                assert not stat.S_ISLNK(info.external_attr >> 16)
                data = archive.read(name)
                assert len(data) == item['bytes'] and sha(data) == item['sha256']
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
        before = {item['path']: sha((project / item['path']).read_bytes()) for item in prepared['inventory']}
        assert before['space_arena.py'] == ENTRY_SHA
        manifest = json.loads((project / '.sistemazero/export-manifest.json').read_bytes())
        import sz_audio
        from sz_audio import _desktop
        desktop = _desktop
        installed = Path(sz_audio.__file__).resolve().parent
        assert installed.is_relative_to(Path(sys.prefix).resolve())
        matched = []
        for item in manifest['portableAudio']['files']:
            if '/sz_audio/' in item['path']:
                relative = item['path'].split('/sz_audio/', 1)[1]
                assert sha((installed / relative).read_bytes()) == item['sha256']
                matched.append(relative)
        assert len(matched) == 7
        descriptor = json.loads((installed / '_module.json').read_bytes())
        deps = {key: value for key, value in descriptor['native']['dependencies'].items() if key != 'setuptools'}
        assert {key: importlib.metadata.version(key) for key in deps} == deps
        report.update(installedAudio=str(installed), matchingModuleFiles=matched, dependencies=deps)
        spec = importlib.util.spec_from_file_location('space_arena_observer', HERE / 'space_arena_observer.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        callbacks = {}
        observer = module.Observer(args.scenario, report, callbacks)
        import turtle
        official_root = turtle._Root

        class WithdrawnRoot(official_root):
            def __init__(self):
                super().__init__()
                self.withdraw()
                self.bind('<Map>', lambda event: report.__setitem__('rootMapEvents', report['rootMapEvents'] + int(event.widget is self)), add='+')
                self.bind('<Destroy>', lambda event: report.__setitem__('rootDestroyEvents', report['rootDestroyEvents'] + int(event.widget is self)), add='+')

            def setupcanvas(self, *values):
                assert self.state() == 'withdrawn'
                report['withdrawnBeforeSetup'] = True
                return super().setupcanvas(*values)

        turtle._Root = WithdrawnRoot
        try:
            screen = turtle.Screen()
        finally:
            turtle._Root = official_root
        root = screen.getcanvas().winfo_toplevel()
        assert root.state() == 'withdrawn' and report['withdrawnBeforeSetup']
        original_press = turtle.TurtleScreen.onkeypress
        original_release = turtle.TurtleScreen.onkeyrelease
        original_update = turtle.TurtleScreen.update

        def press(self, callback, key=None):
            callbacks['press', key] = callback
            return original_press(self, callback, key)

        def release(self, callback, key=None):
            callbacks['release', key] = callback
            return original_release(self, callback, key)

        def update(self):
            namespace = sys._getframe(1).f_globals
            result = original_update(self)
            elapsed = time.monotonic() - started
            assert elapsed < 30, 'Native functional cooperative deadline'
            if 'game' in namespace and 'exhaust' in namespace:
                if observer.namespace is None:
                    report['fullGameReadyMs'] = elapsed * 1000
                observer.update(namespace)
            return result

        turtle.TurtleScreen.onkeypress = press
        turtle.TurtleScreen.onkeyrelease = release
        turtle.TurtleScreen.update = update
        root.report_callback_exception = lambda kind, value, tb: report['errors'].append(dict(callback=kind.__name__, message=str(value)))
        os.chdir(project)
        sys.path.insert(0, str(project))
        random.seed(2026)
        try:
            runpy.run_path(str(project / 'space_arena.py'), run_name='__main__')
        except module.FunctionalComplete:
            report['boundedFunctionalCompletion'] = True
        else:
            raise AssertionError('Expected bounded observation of infinite author loop')
        assert report.get('boundedFunctionalCompletion') and not report['errors']
        assert desktop._failure is None and desktop._device is not None
        report['audioBackend'] = str(desktop._device.backend)
        assert report['audioBackend'].lower() != 'null'
        assert before == {path.relative_to(project).as_posix(): sha(path.read_bytes())
                          for path in project.rglob('*') if path.is_file()}
        report['exportTreeUnchanged'] = True
        report['state'] = 'native-functional-passed'
    except BaseException as error:
        report['errors'].append(dict(name=type(error).__name__, message=str(error), traceback=traceback.format_exc()))
    finally:
        if observer is not None:
            observer.restore()
            if observer.namespace is not None:
                observer.namespace['play_sound'] = observer.original_sound
        if turtle is not None:
            if original_update is not None:
                turtle.TurtleScreen.update = original_update
            if original_press is not None:
                turtle.TurtleScreen.onkeypress = original_press
            if original_release is not None:
                turtle.TurtleScreen.onkeyrelease = original_release
        if screen is not None:
            try:
                screen.bye()
            except BaseException as error:
                report['errors'].append(dict(cleanup='screen', name=type(error).__name__, message=str(error)))
        if desktop is not None:
            try:
                desktop._shutdown()
                report['audioReleased'] = desktop._device is None and desktop._generator is None and desktop._mixer.active == 0
            except BaseException as error:
                report['errors'].append(dict(cleanup='audio', name=type(error).__name__, message=str(error)))
        os.chdir(old_cwd)
        sys.path[:] = old_path
        try:
            scope.cleanup()
            report['ownedTempAbsent'] = not project.exists()
        except BaseException as error:
            report['errors'].append(dict(cleanup='temp', name=type(error).__name__, message=str(error)))
        if (report['rootMapEvents'] or report['rootDestroyEvents'] != 1
                or not report['audioReleased'] or not report.get('ownedTempAbsent') or report['errors']):
            report['state'] = 'failed'
        report['elapsedMs'] = (time.monotonic() - started) * 1000
        with (args.output / 'native.json').open('x', encoding='utf-8') as output:
            json.dump(report, output, indent=2)
    print(json.dumps({key: report[key] for key in ('state', 'scenario', 'elapsedMs', 'errors')}))
    return 0 if report['state'] == 'native-functional-passed' else 1


if __name__ == '__main__':
    sys.exit(main())
