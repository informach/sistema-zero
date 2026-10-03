"""Valida apenas o pacote local de marketing, sem rede nem escrita."""
from pathlib import Path
import csv
import json
import re
import sys

import yaml

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / '.agents/marketing'
manifest = json.loads((PACKAGE / 'manifest.json').read_text(encoding='utf-8'))
errors = []
markdown = []

def check(condition, message):
    if not condition:
        errors.append(message)

def frontmatter(path):
    content = path.read_text(encoding='utf-8')
    match = re.match(r'^---\n(.*?)\n---(?:\n|$)', content, re.S)
    check(match is not None, f'Frontmatter ausente: {path}')
    if not match:
        return {}
    try:
        data = yaml.safe_load(match.group(1))
        check(isinstance(data, dict), f'Frontmatter inválido: {path}')
        return data if isinstance(data, dict) else {}
    except yaml.YAMLError as error:
        errors.append(f'YAML inválido: {path}: {error}')
        return {}

skills = manifest['canonicalSkills']
for name in skills:
    canonical = ROOT / '.agents/skills' / name
    mirror = ROOT / '.claude/skills' / name
    canonical_files = {path.relative_to(canonical) for path in canonical.rglob('*') if path.is_file()}
    mirror_files = {path.relative_to(mirror) for path in mirror.rglob('*') if path.is_file()}
    check(canonical_files == mirror_files, f'Arquivos divergentes no espelho: {name}')
    for local in canonical_files & mirror_files:
        check((canonical/local).read_bytes() == (mirror/local).read_bytes(), f'Conteúdo divergente: {name}/{local}')
    for directory in (canonical, mirror):
        path = directory / 'SKILL.md'
        check(path.is_file(), f'Skill ausente: {path}')
        if not path.is_file():
            continue
        data = frontmatter(path)
        check(data.get('name') == name, f'Nome de skill divergente: {path}')
        check(bool(re.fullmatch(r'[a-z0-9-]{1,64}', name)), f'Nome inválido: {name}')
        check(isinstance(data.get('description'), str) and bool(data['description'].strip()), f'Descrição ausente: {path}')
        for document in directory.rglob('*.md'):
            markdown.append(document)
            text = document.read_text(encoding='utf-8')
            for obsolete in ('meus-produtos/', 'entregas/.ativo', 'workshop-copy-template-tema.py', 'C:/Users/tocha/Documents/fluxo-criativo'):
                check(obsolete not in text, f'Dependência da origem: {document}: {obsolete}')

for name in manifest['agents']:
    path = ROOT / '.claude/agents' / f'{name}.md'
    check(path.is_file(), f'Agente ausente: {name}')
    if path.is_file():
        data = frontmatter(path)
        check(data.get('name') == name, f'Nome incorreto no agente: {name}')
        check(bool(data.get('description')), f'Descrição ausente no agente: {name}')
        for skill in data.get('skills', []):
            check(skill in skills, f'Skill não instalada no agente {name}: {skill}')
        markdown.append(path)

for name in manifest['commands']:
    path = ROOT / '.claude/commands' / f'{name}.md'
    check(path.is_file(), f'Comando ausente: {name}')
    if path.is_file():
        data = frontmatter(path)
        check(bool(data.get('description')), f'Descrição ausente: {name}')
        text = path.read_text(encoding='utf-8')
        targets = re.findall(r'`(\.claude/skills/[^`]+/SKILL\.md)`', text)
        check(len(targets) == 1 and (ROOT / targets[0]).is_file(), f'Roteamento inválido: {name}')
        check('$ARGUMENTS' in text, f'Argumentos não encaminhados: {name}')
        markdown.append(path)

rule = ROOT / '.claude/rules/marketing.md'
check(bool(frontmatter(rule).get('paths')), 'Regra de marketing sem escopo de caminhos')
markdown.extend([rule, *PACKAGE.glob('*.md')])
for path in markdown:
    text = path.read_text(encoding='utf-8')
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', text):
        if re.match(r'^[a-z]+://', target) or target.startswith('#'):
            continue
        local = target.split('#')[0]
        check((path.parent / local).exists(), f'Link local inválido: {path}: {target}')

settings = json.loads((ROOT / '.claude/settings.json').read_text(encoding='utf-8'))
hooks = [hook for block in settings.get('hooks', {}).get('PostToolUse', []) for hook in block.get('hooks', [])]
matching = [hook for hook in hooks if '${CLAUDE_PROJECT_DIR}/.claude/hooks/marketing-copy-review.ts' in hook.get('args', [])]
check(len(matching) == 1 and matching[0].get('command') == 'bun', 'Hook ausente, duplicado ou comando incorreto')
check((ROOT / '.claude/hooks/marketing-copy-review.ts').is_file(), 'Arquivo do hook ausente')

with (PACKAGE / 'inventario-origem.csv').open(encoding='utf-8-sig', newline='') as stream:
    rows = list(csv.DictReader(stream))
for category, count in manifest['sourceEntryCounts'].items():
    check(sum(row['categoria'] == category for row in rows) == count, f'Inventário incompleto: {category}')
check(len({row['origem'] for row in rows}) == len(rows), 'Inventário contém entradas duplicadas')
for row in rows:
    check(bool(row['decisao'] and row['motivo']) and bool(re.fullmatch('[0-9a-f]{64}', row['sha256'])), f'Entrada inválida: {row["origem"]}')

if errors:
    print('\n'.join(errors))
    sys.exit(1)
print(f'OK: {len(skills)} skills em 2 pastas, {len(manifest["agents"])} agentes, {len(manifest["commands"])} comandos, regra, hook, {len(markdown)} documentos e {len(rows)} entradas de origem.')
