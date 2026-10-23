"""Native embedding of the canonical Pac-Man ZIP plus an external QA observer.

--preflight verifies inputs/installation without importing Turtle/audio or opening
Tk. Game execution requires a separate agreed hardware window and supervisor.
The exported tree is never modified; the observer is compiled outside that tree.
"""
import argparse
import hashlib
import importlib.metadata
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import time
import tomllib
import traceback
import zipfile

HERE = Path(__file__).resolve().parent
PREPARATION_SHA = '7fe7d1743365f3e201eee7c3c6e3bacc00c9642c0b17d100cb8251aa916ca85d'
ZIP_SHA = 'd67e8f1765ae4e6af46a0d5ef6da163d2da36e3fc8a85c62148fc764608ff98c'
MAIN_SHA = '8bd915293088b0fa85a2313e046711d861f43c481aa691d88ba07402485819d8'
PREFIX = '__SZ_PACMAN_QA__'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verified_inputs(artifact):
    raw = (artifact / 'preparation.json').read_bytes()
    assert digest(raw) == PREPARATION_SHA
    baseline = next(case for case in json.loads(raw)['cases'] if case['scenario'] == 'baseline')
    archive = (artifact / 'baseline/source.zip').read_bytes()
    assert digest(archive) == baseline['zipSha256'] == ZIP_SHA
    files = {}
    with zipfile.ZipFile(io.BytesIO(archive)) as source:
        assert len(source.infolist()) == len(baseline['inventory']) == 32
        assert len(set(source.namelist())) == 32
        for entry in baseline['inventory']:
            name = entry['path']
            assert not stat.S_ISLNK(source.getinfo(name).external_attr >> 16)
            data = source.read(name)
            assert digest(data) == entry['sha256'] and len(data) == entry['bytes']
            files[name] = data
    assert digest(files['main.py']) == MAIN_SHA
    manifest = json.loads(files['.sistemazero/export-manifest.json'])
    assert manifest['entrypoint'] == 'main.py'
    descriptor = importlib.util.find_spec('sz_audio')
    assert descriptor is not None and descriptor.origin is not None
    installed = Path(descriptor.origin).resolve().parent
    assert installed.is_relative_to(Path(sys.prefix).resolve())
    matched = []
    for entry in manifest['portableAudio']['files']:
        if '/sz_audio/' in entry['path']:
            relative = entry['path'].split('/sz_audio/', 1)[1]
            assert digest((installed / relative).read_bytes()) == entry['sha256']
            matched.append(relative)
    assert len(matched) == 7
    module = json.loads((installed / '_module.json').read_bytes())
    dependencies = module['native']['dependencies']
    package_root = Path(manifest['portableAudio']['requirementsPath']).parent.as_posix()
    package = tomllib.loads(files[package_root + '/pyproject.toml'].decode())
    assert package['build-system']['requires'] == ['setuptools==' + dependencies['setuptools']]
    runtime = {key: value for key, value in dependencies.items() if key != 'setuptools'}
    assert set(package['project']['dependencies']) == {key + '==' + value for key, value in runtime.items()}
    assert {key: importlib.metadata.version(key) for key in runtime} == runtime
    return files, dict(preparationSha256=PREPARATION_SHA, zipSha256=ZIP_SHA, mainSha256=MAIN_SHA,
                       installedAudio=str(installed), matchingModuleFiles=matched, dependencies=runtime)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scenario', choices=('geometry', 'ai'), required=True)
    parser.add_argument('--preflight', action='store_true')
    args = parser.parse_args()
    assert sys.flags.isolated and sys.dont_write_bytecode and sys.version_info[:3] == (3, 14, 2)
    args.output.mkdir(parents=True, exist_ok=False)
    observer_path = HERE / 'pacman_functional_observer.py'
    source = observer_path.read_bytes().decode('utf-8')
    marker = 'CONFIG = {"scenario": "geometry", "seed": 2026}'
    assert source.count(marker) == 1
    selected_source = source.replace(marker, 'CONFIG = ' + json.dumps(
        dict(scenario=args.scenario, seed=2026), separators=(',', ':')))
    code = compile(selected_source, str(observer_path), 'exec')
    report = dict(state='failed', scenario=args.scenario, python=sys.version, executable=sys.executable,
                  runnerSha256=digest(Path(__file__).read_bytes()), observerSourceSha256=digest(source.encode()),
                  observerSha256=digest(selected_source.encode()), seed=2026, errors=[], events=[],
                  rootMapEvents=0, rootDestroyEvents=0, audioReleased=False,
                  cooperativeDeadline=False, boundedFunctionalCompletion=False,
                  preflightOnly=args.preflight, freshInstall=False, physicalKeyboard=False,
                  limits=['External observer; exact canonical exported five game modules remain unchanged',
                          'Declared geometry/AI placements and QA bye; not a full played game',
                          'No browser, physical input, raster, acoustic or performance acceptance'])
    screen = desktop = turtle = None
    roots = []
    original_stdout = sys.stdout
    original_cwd, original_path = Path.cwd(), sys.path.copy()
    scope = None
    project = None
    exported_hashes = None
    started = time.monotonic()
    try:
        files, evidence = verified_inputs(args.artifact_dir)
        report.update(evidence)
        for name, data in files.items():
            if name.endswith('.py'):
                compile(data, name, 'exec')
        if args.preflight:
            assert 'turtle' not in sys.modules and 'sz_audio._desktop' not in sys.modules
            report.update(state='preflight-passed-no-Tk', inventoryFiles=len(files))
        else:
            scope = tempfile.TemporaryDirectory(prefix='sz-pacman-functional-')
            project = Path(scope.name).resolve()
            report['ownedTemp'] = str(project)
            for name, data in files.items():
                destination = (project / name).resolve()
                assert '\\' not in name and destination != project and destination.is_relative_to(project)
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
            exported_hashes = {name: digest(data) for name, data in files.items()}
            from sz_audio import _desktop
            desktop = _desktop
            import turtle
            official_root = turtle._Root

            class HiddenOfficialRoot(official_root):
                def __init__(self):
                    super().__init__()
                    roots.append(self)
                    self.withdraw()
                    self.bind('<Map>', lambda event: report.__setitem__('rootMapEvents', report['rootMapEvents'] + int(event.widget is self)), add='+')
                    self.bind('<Destroy>', lambda event: report.__setitem__('rootDestroyEvents', report['rootDestroyEvents'] + int(event.widget is self)), add='+')

                def setupcanvas(self, *values):
                    assert self.state() == 'withdrawn'
                    report['withdrawnBeforeSetup'] = True
                    return super().setupcanvas(*values)

            turtle._Root = HiddenOfficialRoot
            try:
                screen = turtle.Screen()
            finally:
                turtle._Root = official_root
            root = screen.getcanvas().winfo_toplevel()
            assert root.state() == 'withdrawn' and report['withdrawnBeforeSetup']

            def fail_callback(kind, value, tb):
                report['errors'].append(dict(callback=kind.__name__, message=str(value)))
                traceback.print_exception(kind, value, tb)
                screen.bye()

            def deadline():
                report['cooperativeDeadline'] = True
                screen.bye()

            root.report_callback_exception = fail_callback
            screen.ontimer(deadline, 12000)  # Additional QA deadline; authored timers unchanged.

            class ObservedOutput:
                def __init__(self):
                    self.pending = ''

                def write(self, text):
                    original_stdout.write(text)
                    original_stdout.flush()
                    self.pending += text
                    while '\n' in self.pending:
                        line, self.pending = self.pending.split('\n', 1)
                        if line.startswith(PREFIX):
                            event = json.loads(line[len(PREFIX):])
                            assert event['scenario'] == args.scenario
                            report['events'].append(event)
                            if event['event'] == 'functional-complete':
                                report['canvasItemsBeforeQABye'] = len(screen.getcanvas().find_all())
                    return len(text)

                def flush(self):
                    original_stdout.flush()

            sys.stdout = ObservedOutput()
            os.chdir(project)
            sys.path.insert(0, str(project))
            exec(code, dict(__name__='__main__', __file__=str(observer_path)))
            sys.stdout = original_stdout
            expected = 32 if args.scenario == 'geometry' else 10
            manifests = [e for e in report['events'] if e['event'] == 'case-manifest']
            completed = [e for e in report['events'] if e['event'] == 'functional-complete']
            passed = [e['value']['name'] for e in report['events'] if e['event'] == 'case-passed']
            assert len(manifests) == len(completed) == 1
            assert passed == [case['name'] for case in manifests[0]['value']['cases']]
            assert len(passed) == len(set(passed)) == completed[0]['value']['count'] == expected
            assert completed[0]['value']['closedByQA'] and report['rootDestroyEvents'] == 1
            assert not report['cooperativeDeadline'] and not report['errors']
            assert report['canvasItemsBeforeQABye'] > 100
            assert desktop._device is not None and desktop._failure is None
            report['audioBackend'] = str(desktop._device.backend)
            assert report['audioBackend'].lower() != 'null'
            report['imports'] = {name: str(Path(sys.modules[name].__file__).resolve())
                                 for name in ('main', 'actors', 'renderer', 'constants', 'mazes')}
            assert all(Path(path).parent == project for path in report['imports'].values())
            report.update(state='native-functional-passed', boundedFunctionalCompletion=True, passedCases=passed)
    except BaseException as error:
        report['errors'].append(dict(name=type(error).__name__, message=str(error), traceback=traceback.format_exc()))
    finally:
        sys.stdout = original_stdout
        if screen is not None and report['rootDestroyEvents'] == 0:
            try:
                screen.bye()
            except BaseException as error:
                report['errors'].append(dict(cleanup='screen', message=str(error)))
        elif screen is None:
            for root in roots:
                try:
                    root.destroy()
                except BaseException as error:
                    report['errors'].append(dict(cleanup='partial-root', message=str(error)))
        if desktop is not None:
            try:
                if desktop._device is not None:
                    report.setdefault('audioBackend', str(desktop._device.backend))
                desktop._shutdown()
                report['audioReleased'] = desktop._device is None and desktop._generator is None and desktop._mixer.active == 0
            except BaseException as error:
                report['errors'].append(dict(cleanup='audio', message=str(error)))
        if exported_hashes is not None:
            try:
                report['exportTreeUnchanged'] = exported_hashes == {
                    path.relative_to(project).as_posix(): digest(path.read_bytes())
                    for path in project.rglob('*') if path.is_file()}
                assert report['exportTreeUnchanged']
            except BaseException as error:
                report['errors'].append(dict(cleanup='export-integrity', message=str(error)))
        os.chdir(original_cwd)
        sys.path[:] = original_path
        if scope is not None:
            try:
                scope.cleanup()
                report['ownedTempAbsent'] = not project.exists()
            except BaseException as error:
                report['errors'].append(dict(cleanup='temp', message=str(error)))
        if not args.preflight and (report['rootMapEvents'] or report['rootDestroyEvents'] != 1
                or not report['audioReleased'] or not report.get('ownedTempAbsent')):
            report['errors'].append(dict(cleanup='lifecycle', message='Native lifecycle invariants not satisfied'))
        if report['errors']:
            report['state'] = 'failed'
        report['elapsedMs'] = (time.monotonic() - started) * 1000
        with (args.output / 'native.json').open('x', encoding='utf-8') as output:
            json.dump(report, output, indent=2)
    print(json.dumps({key: report[key] for key in ('state', 'scenario', 'elapsedMs', 'errors')}))
    return 0 if report['state'] in ('preflight-passed-no-Tk', 'native-functional-passed') else 1


if __name__ == '__main__':
    sys.exit(main())
