# Aulas interativas

Uma fonte editorial para as comunidades adulta e infantojuvenil. Cada pasta reúne aulas, manifestos, roteiros de produção, falas prontas para ElevenLabs v4 e o **Passo a passo do projeto**. A professora grava a fala integral; a edição kids pode substituir frases exatas por Dedé ou Debinha, conforme a tabela do roteiro.

| Curso | Aulas | Materiais e roteiros | Passo a passo do projeto |
| --- | --- | --- | --- |
| Cadê Todo Mundo? | 3 | [Abrir](cade-todo-mundo/README.md) | [PDF](cade-todo-mundo/passo-a-passo-do-projeto.pdf) |
| A Chave do Farol | 4 | [Abrir](desafio-primeiro-jogo/README.md) | [PDF](desafio-primeiro-jogo/passo-a-passo-do-projeto.pdf) |
| Nave Contra Asteroides | 9 | [Abrir](nave-contra-asteroides/README.md) | [PDF](nave-contra-asteroides/passo-a-passo-do-projeto.pdf) |
| Corre, Dino! | 13 | [Abrir](corre-dino/README.md) | [PDF](corre-dino/passo-a-passo-do-projeto.pdf) |
| O Jogo do Meu Jeito | 8 | [Abrir](o-jogo-do-meu-jeito/README.md) | [PDF](o-jogo-do-meu-jeito/passo-a-passo-do-projeto.pdf) |

Em cada aula:

- `.md`: proposta e orientações pedagógicas.
- `.manifesto.json`: conteúdo para importar no Admin.
- `.roteiro.md`: produção, notas de tela e substituições kids com personagem, frase exata e âncoras.
- `.elevenlabs.txt`: professora, aula inteira, somente falas, tags e pausas. Selecione tudo e copie.
- `.debinha.elevenlabs.txt` ou `.dede.elevenlabs.txt`: somente falas do personagem, quando houver intervenção.
- `.edicao.json`: ordem dos clipes e índice de substituições, derivados do roteiro.

Os slugs dos cursos adultos continuam com `-adulto` no Admin; as aulas conservam seus `lessonSlug`. Na importação, confira o destino e use **Vincular ao destino aberto** para a mesma aula do curso correspondente. Preserve mídias publicadas: os manifestos locais contêm moldes de vídeo/material, não os anexos remotos. O PDF é o mesmo nos dois públicos; o vídeo kids pode ter a montagem com personagens.

Veja [apoio técnico](../aulas-interativas-tecnico/README.md), [contrato de voz](../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md) e [estado da implementação](../continuity/2026-10-21-unificacao-aulas-plataforma/README.md).
