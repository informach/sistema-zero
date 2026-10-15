"""Scope inventory for the second live-workshop review; does not modify product files."""
import json
import subprocess
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[2]
previous = json.loads((root / '.audits/live-review-2026-10-14/changed-files.json').read_text(encoding='utf-8-sig'))
paths = {item['path'] for item in previous}
for command in (
    ['git', 'diff', '--name-only', '--', 'packages'],
    ['git', 'ls-files', '--others', '--exclude-standard', '--', 'packages'],
):
    paths.update(subprocess.check_output(command, cwd=root, text=True, encoding='utf-8').splitlines())
items = []
for name in sorted(paths):
    path = root / name
    if not path.is_file():
        continue
    category = (
        'generated migration snapshot' if '/migrations/meta/' in name else
        'test/support' if '/tests/' in name or '.test.' in name or '/__tests__/' in name else
        'documentation' if path.suffix == '.md' else
        'binary/runtime asset' if '/assets/' in name else
        'source/configuration'
    )
    items.append({'path': name, 'bytes': path.stat().st_size, 'category': category})
summary = {
    'scope': 'Live-workshop changes and shared integrations; excludes unrelated marketing and product proposals.',
    'method': 'Prior review inventory plus current package diff and untracked package files. Inclusion is not a claim of line-by-line review or external deployment validation.',
    'files': len(items),
    'packages': dict(sorted(Counter(item['path'].split('/')[1] for item in items if item['path'].startswith('packages/')).items())),
    'categories': dict(Counter(item['category'] for item in items)),
    'items': items,
}
(Path(__file__).parent / 'scope-inventory.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in summary.items() if key != 'items'}, ensure_ascii=False, indent=2))
