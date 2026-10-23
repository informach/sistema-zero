"""Confere os roteiros de produção e a fala copiável da fonte única dos cursos."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'aulas-interativas'
CURSOS = ('cade-todo-mundo', 'desafio-primeiro-jogo', 'nave-contra-asteroides', 'corre-dino', 'o-jogo-do-meu-jeito')
LEGADO = re.compile(r'Concluir fase|Próxima (?:fase|seção|etapa)|Mapa da Aventura|Caderno do Aluno|Enviar para o professor', re.I)
CLIP = re.compile(r'^\*\*Clipe:\*\* `([^`]+)`\s*$', re.M)
FALA = re.compile(r'\*\*Fala para ElevenLabs:\*\*\s*\n```text\r?\n([\s\S]*?)\r?\n```')
TAGS = set(json.loads((Path(__file__).resolve().parent / 'qa/direcoes-voz.json').read_text(encoding='utf-8')))


def extrair_falas(body):
    return '\n\n'.join(m.group(1).strip() for m in FALA.finditer(body))


def audit(path):
    manifest = json.loads(path.read_text(encoding='utf-8'))
    script_path = path.with_name(path.name.replace('.manifesto.json', '.roteiro.md'))
    if not script_path.exists():
        return [f'{script_path.name}: roteiro ausente'], None
    script = script_path.read_text(encoding='utf-8').replace('\r\n', '\n')
    videos = {b['key'] for b in manifest['blocks'] if b.get('plannedVideo')}
    expected = [k for s in manifest['sections'] for k in s['blockKeys'] if k in videos]
    markers = list(CLIP.finditer(script))
    found = [m.group(1) for m in markers]
    errors = []
    if found != expected or len(found) != len(set(found)):
        errors.append(f'{script_path.name}: clipes ausentes, repetidos ou fora da ordem: {found} != {expected}')
    falas = []
    for i, marker in enumerate(markers):
        body = script[marker.end():markers[i + 1].start() if i + 1 < len(markers) else len(script)]
        matches = list(FALA.finditer(body))
        if len(matches) != 1:
            errors.append(f'{script_path.name}/{marker.group(1)}: precisa de um bloco integral de fala')
            continue
        texto = matches[0].group(1).strip()
        if not texto:
            errors.append(f'{script_path.name}/{marker.group(1)}: fala vazia')
        if re.search(r'<\/?(?:break|speak|prosody)\b', texto, re.I):
            errors.append(f'{script_path.name}: SSML indevido no v4')
        for tag in re.findall(r'\[[^\]\n]+\]', texto):
            if tag not in TAGS:
                errors.append(f'{script_path.name}: tag fora do contrato de produção: {tag}')
        sem_tags = re.sub(r'\[[^\]\n]+\]', '', texto)
        if '[' in sem_tags or ']' in sem_tags:
            errors.append(f'{script_path.name}: colchetes de tag incompletos')
        if re.search(r'^(?:#{1,6}\s|\*\*|Professora:|Professor:|Na tela:|Debinha:|Dedé:)', texto, re.M):
            errors.append(f'{script_path.name}: informação de produção na fala')
        if LEGADO.search(sem_tags):
            errors.append(f'{script_path.name}: rótulo antigo na fala: {LEGADO.search(sem_tags).group(0)}')
        for paragraph in re.split(r'\n\s*\n', texto):
            if paragraph.strip() and not paragraph.lstrip().startswith('['):
                errors.append(f'{script_path.name}: segmento sem direção vocal')
        falas.append(texto)
    full = '\n\n[long pause]\n\n'.join(falas) + '\n'
    txt = path.with_name(path.name.replace('.manifesto.json', '.elevenlabs.txt'))
    if not txt.exists() or txt.read_text(encoding='utf-8') != full:
        errors.append(f'{txt.name}: fala copiável ausente ou desatualizada')
    for section in manifest['sections']:
        if not any(k in videos for k in section['blockKeys']):
            # Quiz, certificado ou recado sem vídeo não viram um novo clipe por causa do modelo.
            continue
        required = section.get('completion', {}).get('blockIds', [])
        if section.get('externalTool') and required and all(k in videos for k in required):
            scoped = [falas[found.index(k)] for k in section['blockKeys'] if k in found]
            if not any('Pause aqui' in t or 'pausa' in t.lower() for t in scoped):
                errors.append(f'{script_path.name}/{section["key"]}: falta encaminhamento para a ferramenta externa')
    return errors, (script_path.name, len(expected), len(found), [])


if __name__ == '__main__':
    prefix = sys.argv[1] if len(sys.argv) > 1 else ''
    paths = sorted(p for course in CURSOS for p in (ROOT / course).glob('*.manifesto.json') if not prefix or p.name.startswith(prefix))
    if not paths or (not prefix and len(paths) != 37):
        raise SystemExit(f'ERRO: quantidade de manifestos inesperada: {len(paths)}')
    all_errors = []
    total = 0
    for path in paths:
        errors, summary = audit(path)
        if summary:
            print(*summary[:3])
            total += summary[2]
        all_errors.extend(errors)
    for error in all_errors:
        print('ERRO:', error)
    print('TOTAL:', total, 'clipes;', len(paths), 'aulas;', len(all_errors), 'erros')
    raise SystemExit(bool(all_errors))
