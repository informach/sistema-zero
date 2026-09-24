import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent / 'aulas'
WORD = re.compile(r"[\wÀ-ÿ]+(?:['’][\wÀ-ÿ]+)?", re.UNICODE)
CLIP = re.compile(r'^### Clipe `([^`]+)`', re.MULTILINE)
SECTION = re.compile(r'^## Seção (\d+)\. (.+)$', re.MULTILINE)

def audit(manifest_path):
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    script_path = manifest_path.with_name(manifest_path.name.replace('.manifesto.json', '.roteiro.md'))
    video_keys = {b['key'] for b in manifest['blocks'] if b.get('plannedVideo')}
    expected = [key for section in manifest['sections'] for key in section['blockKeys'] if key in video_keys]
    if not script_path.exists():
        return [f'{script_path.name}: ausente ({len(expected)} clipes)'], None
    script = script_path.read_text(encoding='utf-8')
    proposal = manifest_path.with_name(manifest_path.name.replace('.manifesto.json', '.md')).read_text(encoding='utf-8')
    found = CLIP.findall(script)
    errors = []
    if found != expected:
        errors.append(f'{script_path.name}: clipes diferentes do manifesto: esperados {expected}; escritos {found}')
    sections = [(int(m.group(1)), m.group(2)) for m in SECTION.finditer(script)]
    all_sections = [(i, s['title']) for i, s in enumerate(manifest['sections'], 1)]
    video_sections = [(i, s['title']) for i, s in enumerate(manifest['sections'], 1) if any(b in expected for b in s['blockKeys'])]
    if sections != video_sections and sections != all_sections:
        errors.append(f'{script_path.name}: seções diferentes: {sections} vs {video_sections} ou {all_sections}')
    durations = []
    spans = list(CLIP.finditer(script))
    blocks = {b['key']: b for b in manifest['blocks']}
    for i, match in enumerate(spans):
        key = match.group(1)
        body = script[match.end():spans[i+1].start() if i+1 < len(spans) else len(script)]
        notes = len(re.findall(r'^\*\*Na tela:\*\*', body, re.MULTILINE))
        narrations = len(re.findall(r'^\*\*Narração:\*\*$', body, re.MULTILINE))
        if notes != narrations or not notes:
            errors.append(f'{script_path.name}/{key}: Na tela={notes}, Narração={narrations}')
        if re.search(r'^\*\*Na tela:\*\*.*\n\*\*Narração:\*\*', body, re.MULTILINE):
            errors.append(f'{script_path.name}/{key}: falta linha em branco entre par')
        for speech_block in re.finditer(r'^\*\*Narração:\*\*\n((?:>[^\n]*\n?)+)', body, re.MULTILINE):
            lines = speech_block.group(1).strip().splitlines()
            if not lines or not lines[0].startswith('> "') or not lines[-1].endswith('"'):
                errors.append(f'{script_path.name}/{key}: citação de fala malformada')
        if len(re.findall(r'^\*\*Narração:\*\*\n>', body, re.MULTILINE)) != narrations:
            errors.append(f'{script_path.name}/{key}: fala sem citação')
        spoken_parts = []
        in_speech = False
        for line in body.splitlines():
            if line == '**Narração:**':
                in_speech = True
            elif in_speech and line.startswith('> '):
                spoken_parts.append(line[2:])
            else:
                in_speech = False
        spoken = ' '.join(spoken_parts)
        count = len(WORD.findall(re.sub(r'[*_`]', '', spoken)))
        declared = re.search(r'\*\*Palavras:\*\* (\d+)', body)
        if declared and int(declared.group(1)) != count:
            errors.append(f'{script_path.name}/{key}: palavras declaradas {declared.group(1)}, contadas {count}')
        duration = re.search(r'\*\*Duração alvo:\*\* (\d+) a (\d+) (?:segundos|s)', body)
        if duration:
            lo, hi = map(int, duration.groups())
            manifest_duration = re.search(r'Duração alvo: (\d+) a (\d+) segundos', blocks[key]['plannedVideo'])
            if manifest_duration and (lo, hi) != tuple(map(int, manifest_duration.groups())):
                errors.append(f'{script_path.name}/{key}: duração difere do manifesto')
            table = next((line for line in proposal.splitlines() if line.startswith(f'| `{key}` |')), None)
            if table and f'{lo} a {hi} s' not in table:
                errors.append(f'{script_path.name}/{key}: duração difere da tabela da proposta')
            spoken_seconds = count / 137 * 60
            held_seconds = 20 if 'pelo menos vinte segundos' in body else 0
            if spoken_seconds + held_seconds < lo * .75 or spoken_seconds > hi * 1.25:
                durations.append(f'{key}:{count}p/{lo}-{hi}s')
        for bad in [r'\bcrianç[ao]s?\b', r'\broda (?:o |seu )?jogo\b', r'\baí embaixo\b', r'\bali do lado\b']:
            if re.search(bad, spoken, re.IGNORECASE):
                errors.append(f'{script_path.name}/{key}: fala proibida: {bad}')
    if '—' in script:
        errors.append(f'{script_path.name}: travessão')
    for section in manifest['sections']:
        ids = section.get('completion', {}).get('blockIds', [])
        if not section.get('externalTool') or not ids or not all(blocks.get(k, {}).get('plannedVideo') for k in ids):
            continue
        last = ids[-1]
        match = re.search(rf'^### Clipe `{re.escape(last)}`.*?(?=^### Clipe `|^## Seção |\Z)', script, re.M | re.S)
        if not match or 'Pause aqui' not in match.group() or 'resultado de referência' not in match.group():
            errors.append(f'{script_path.name}/{last}: pausa ou autoconferência visual ausente')
    return errors, (script_path.name, len(expected), len(found), durations)

manifests = sorted(ROOT.glob('*.manifesto.json'))
prefix = sys.argv[1] if len(sys.argv) > 1 else ''
selected = [path for path in manifests if not prefix or path.name.startswith(prefix)]
if not selected or (not prefix and len(selected) != 34):
    expected = 'manifestos com o prefixo' if prefix else '34 manifestos'
    print(f'ERRO: esperados {expected}, encontrados {len(selected)} em {ROOT}')
    raise SystemExit(1)
total = 0
all_errors = []
for path in selected:
    errors, summary = audit(path)
    if summary:
        print(*summary[:3], 'tempo:', ', '.join(summary[3]) if summary[3] else 'ok')
        total += summary[2]
    for error in errors:
        print('ERRO:', error)
        all_errors.append(error)
print('TOTAL:', total)
if all_errors:
    raise SystemExit(1)
