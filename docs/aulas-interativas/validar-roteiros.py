import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent / 'aulas'
WORD = re.compile(r"[\wÀ-ÿ]+(?:['’][\wÀ-ÿ]+)?", re.UNICODE)
CLIP = re.compile(r'^### (?:Clipe|Vídeo) `([^`]+)`', re.MULTILINE)
SECTION = re.compile(r'^## Seção (\d+)\. (.+)$', re.MULTILINE)
SINGLE_VIDEO_SECTION = re.compile(r'^## (?:\d+\. )?(.+?)(?: — .+)?$', re.MULTILINE)
# Vocabulário da aventura (Diretrizes, seção 6, 06/10/2026): a criança não ouve palavras da escola.
# Por dentro, curso, aula, seção, caderno e professor continuam; na fala, aventura, fase, parte,
# Mapa da Aventura e equipe. A lista é a MESMA dos manifestos e do Como Fazer: este validador lê o
# literal de `PALAVRAS_DA_ESCOLA` em qa/palavras-da-escola.ts, para as duas réguas não divergirem.
def regua_da_escola():
    fonte = (Path(__file__).resolve().parent / 'qa' / 'palavras-da-escola.ts').read_text(encoding='utf-8')
    # O biome pode quebrar a linha depois do "=", mas o literal fica inteiro numa linha só.
    literal = re.search(r'^export const PALAVRAS_DA_ESCOLA =\s*/(.+)/i$', fonte, re.MULTILINE)
    if not literal:
        raise SystemExit('ERRO: PALAVRAS_DA_ESCOLA não encontrada em qa/palavras-da-escola.ts')
    return re.compile(literal.group(1), re.IGNORECASE)


ESCOLA = regua_da_escola()


PAPEL_NO_VIDEO = r'(?:Narração|Professora?|(?:Debinha|Dedé) \(avatar\))'
RÓTULO_VIDEO = re.compile(rf'^\*\*{PAPEL_NO_VIDEO}:\*\*(.*)$', re.MULTILINE)
RÓTULO_DE_FALA = re.compile(
    rf'^\*\*(?:{PAPEL_NO_VIDEO}|Zappy abaixo do vídeo|Zappy na página \(não gravar\)):\*\*(.*)$'
)


def extrair_falas(body, rotulos=RÓTULO_DE_FALA):
    """Extrai os turnos de fala, incluindo professora e avatares, sem ler notas de produção.

    Aceita citação com ou sem linha em branco após o rótulo, além de fala na mesma linha
    usada pelo Zappy. A fala acaba na próxima nota, como "**Na tela:**".
    """
    partes = []
    dentro = False
    for linha in body.splitlines():
        rotulo = rotulos.match(linha)
        if rotulo:
            dentro = True
            partes.append(rotulo.group(1))
        elif dentro and (linha.startswith('>') or not linha.strip()):
            partes.append(linha.lstrip('> '))
        else:
            dentro = False
    return ' '.join(partes)

def audit(manifest_path):
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    script_path = manifest_path.with_name(manifest_path.name.replace('.manifesto.json', '.roteiro.md'))
    video_keys = {b['key'] for b in manifest['blocks'] if b.get('plannedVideo')}
    expected = [key for section in manifest['sections'] for key in section['blockKeys'] if key in video_keys]
    if not script_path.exists():
        return [f'{script_path.name}: ausente ({len(expected)} clipes)'], None
    script = script_path.read_text(encoding='utf-8')
    proposal = manifest_path.with_name(manifest_path.name.replace('.manifesto.json', '.md')).read_text(encoding='utf-8')
    if manifest_path.name.startswith('cade-todo-mundo-'):
        headings = list(SINGLE_VIDEO_SECTION.finditer(script))
        titles = [match.group(1) for match in headings]
        expected_titles = [section['title'] for section in manifest['sections']]
        errors = []
        if titles != expected_titles:
            errors.append(f'{script_path.name}: seções ou vídeos diferentes do manifesto: {titles} vs {expected_titles}')
        for index, heading in enumerate(headings):
            body = script[heading.end():headings[index + 1].start() if index + 1 < len(headings) else len(script)]
            section = manifest['sections'][index] if index < len(manifest['sections']) else None
            if section and not any(key in video_keys for key in section['blockKeys']):
                if '**Zappy na página (não gravar):**' not in body or RÓTULO_VIDEO.search(body) or '**Na tela:**' in body:
                    errors.append(f'{script_path.name}/seção {index + 1}: seção sem vídeo precisa de fala na página, sem gravação')
                continue
            if '**Na tela:**' not in body or '> “' not in body or not RÓTULO_VIDEO.search(body):
                errors.append(f'{script_path.name}/seção {index + 1}: direção de tela ou fala ausente')
        for index, heading in enumerate(headings):
            body = script[heading.end():headings[index + 1].start() if index + 1 < len(headings) else len(script)]
            escola = ESCOLA.search(extrair_falas(body))
            if escola:
                errors.append(f'{script_path.name}/seção {index + 1}: palavra da escola na fala: {escola.group(0)}')
        return errors, (script_path.name, len(expected), len(expected), [])
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
        narrations = len(RÓTULO_VIDEO.findall(body))
        if notes != narrations or not notes:
            errors.append(f'{script_path.name}/{key}: Na tela={notes}, turnos de fala={narrations}')
        if re.search(rf'^\*\*Na tela:\*\*.*\n\*\*{PAPEL_NO_VIDEO}:\*\*', body, re.MULTILINE):
            errors.append(f'{script_path.name}/{key}: falta linha em branco entre par')
        speech_blocks = list(re.finditer(
            rf'^\*\*{PAPEL_NO_VIDEO}:\*\*[ \t]*\n(?:[ \t]*\n)*((?:>[^\n]*\n?)+)',
            body, re.MULTILINE,
        ))
        for speech_block in speech_blocks:
            lines = speech_block.group(1).strip().splitlines()
            quoted = lines and any(
                lines[0].startswith(f'> {opening}') and lines[-1].endswith(closing)
                for opening, closing in [('"', '"'), ('“', '”')]
            )
            if not quoted:
                errors.append(f'{script_path.name}/{key}: citação de fala malformada')
        if len(speech_blocks) != narrations:
            errors.append(f'{script_path.name}/{key}: fala sem citação')
        spoken = extrair_falas(body, RÓTULO_VIDEO)
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
            if table and re.search(r'\d+ a \d+ s', table) and f'{lo} a {hi} s' not in table:
                errors.append(f'{script_path.name}/{key}: duração difere da tabela da proposta')
            spoken_seconds = count / 137 * 60
            held_seconds = 20 if 'pelo menos vinte segundos' in body else 0
            if spoken_seconds + held_seconds < lo * .75 or spoken_seconds > hi * 1.25:
                durations.append(f'{key}:{count}p/{lo}-{hi}s')
        for bad in [r'\bcrianç[ao]s?\b', r'\broda (?:o |seu )?jogo\b', r'\baí embaixo\b', r'\bali do lado\b']:
            if manifest_path.name == 'desafio-certificado.manifesto.json' and key == 'video-pitch-farol' and bad == r'\bcrianç[ao]s?\b':
                continue
            if re.search(bad, spoken, re.IGNORECASE):
                errors.append(f'{script_path.name}/{key}: fala proibida: {bad}')
        escola = ESCOLA.search(spoken)
        if escola:
            errors.append(f'{script_path.name}/{key}: palavra da escola na fala: {escola.group(0)}')
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
if not selected or (not prefix and len(selected) != 37):
    expected = 'manifestos com o prefixo' if prefix else '37 manifestos'
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
