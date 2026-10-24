# Pygame Zero no Estúdio: origem dos arquivos

Base: **pgzero 1.2.1** (PyPI, `pgzero-1.2.1.tar.gz`, SHA-256
`8cadc020f028cbac3e0cbd3bb9311a1c045f1deedac7917ff433f986c38e6106`), LGPL-3.0
(`LICENSE-pgzero.txt`). Comportamento de referência: **pygame-ce 2.5.8**.

| Arquivo em `py/` | Origem |
| --- | --- |
| `pgzrun.py`, `pgzero/__init__.py`, `animation.py`, `builtins.py`, `clock.py`, `keyboard.py`, `spellcheck.py` | idênticos ao pgzero 1.2.1 |
| `pgzero/rect.py` | pgzero 1.2.1; `pygame.rect.Rect` trocado por `_pgrect.Rect` |
| `pgzero/actor.py` | pgzero 1.2.1; `pygame.transform.rotate` trocado por `_sz.rotate` |
| `pgzero/constants.py`, `pgzero/_colors.py` | gerados dos valores do pygame-ce 2.5.8 (teclas, modificadores, nomes de cores) |
| `pgzero/_pgrect.py` | `Rect` do pygame-ce reescrito em Python (conferido contra o pygame-ce) |
| `pgzero/_sz.py`, `game.py`, `loaders.py`, `screen.py`, `music.py`, `runner.py`, `tone.py` | reescritos: desenho no canvas do navegador, sons pelo serviço de mídia do Estúdio |
| `freesansbold.ttf` | fonte padrão do Pygame Zero (pygame-ce), GNU FreeFont (`LICENSE-freefont.txt`) |

O teste `pgzero/provenance.test.ts` confere que os arquivos idênticos continuam idênticos.
