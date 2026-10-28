# Aulas interativas

Uma fonte editorial para as comunidades adulta e infantojuvenil, organizada em **posto → curso → materiais**. Cada curso reúne aulas, manifestos, roteiros de produção, falas prontas para ElevenLabs v4 e o **Passo a passo do projeto**. A professora grava a fala integral; a edição kids pode substituir frases exatas por Dedé ou Debinha, conforme a tabela do roteiro.

| Posto | Cursos e propostas nesta pasta |
| --- | --- |
| [Faísca](faisca/README.md) | A Chave do Farol (trilha 2D), A Ilha do Farol (trilha 3D), Cadê Todo Mundo? (extra) e missão O Jardim Secreto (2D e 3D) |
| [Construtor(a)](construtor/README.md) | Nave Contra Asteroides (trilha 2D), O Jogo do Meu Jeito (extra) |
| [Inventor(a)](inventor/README.md) | Corre, Dino! (trilha 2D) |
| [Explorador(a) de Mundos](explorador/README.md) | Organização reservada ao posto; cursos ainda sem autoria nesta árvore |
| [Mestre dos Jogos](mestre/README.md) | Organização reservada ao posto; cursos ainda sem autoria nesta árvore |
| [Arquiteto(a) de Mundos](arquiteto/README.md) | Organização reservada ao posto; cursos ainda sem autoria nesta árvore |
| [Gênio da Criação](genio/README.md) | Organização reservada ao posto; cursos ainda sem autoria nesta árvore |
| [Lenda](lenda/README.md) | Especialização e participação; sem nova missão obrigatória |

Os papéis seguem a [Jornada do Criador](../jornada-do-criador.md). Pastas e propostas não significam curso publicado. Fontes geradoras e orientações comuns continuam em `docs/aulas-interativas-tecnico/`; o acervo histórico continua em `docs/aulas-interativas-legado/`. Preservam-se slugs, nomes dos arquivos, IDs das aulas, certificados e conteúdo dos projetos.

| Curso | Aulas | Materiais e roteiros | Passo a passo do projeto |
| --- | --- | --- | --- |
| Cadê Todo Mundo? | 3 | [Abrir](faisca/cade-todo-mundo/README.md) | [PDF](faisca/cade-todo-mundo/passo-a-passo-do-projeto.pdf) |
| A Chave do Farol | 4 | [Abrir](faisca/desafio-primeiro-jogo/README.md) | [PDF](faisca/desafio-primeiro-jogo/passo-a-passo-do-projeto.pdf) |
| A Ilha do Farol | 3 | [Abrir](faisca/a-ilha-do-farol/README.md) | [PDF](faisca/a-ilha-do-farol/passo-a-passo-do-projeto.pdf) |
| Nave Contra Asteroides | 9 | [Abrir](construtor/nave-contra-asteroides/README.md) | [PDF](construtor/nave-contra-asteroides/passo-a-passo-do-projeto.pdf) |
| Corre, Dino! | 13 | [Abrir](inventor/corre-dino/README.md) | [PDF](inventor/corre-dino/passo-a-passo-do-projeto.pdf) |
| O Jogo do Meu Jeito | 8 | [Abrir](construtor/o-jogo-do-meu-jeito/README.md) | [PDF](construtor/o-jogo-do-meu-jeito/passo-a-passo-do-projeto.pdf) |

Em cada aula:

- `.md`: proposta e orientações pedagógicas.
- `.manifesto.json`: conteúdo para importar no Admin.
- `.roteiro.md`: produção, notas de tela e substituições kids com personagem, frase exata e âncoras.
- `.elevenlabs.txt`: professora, aula inteira, somente falas, tags e pausas. Selecione tudo e copie.
- `.debinha.elevenlabs.txt` ou `.dede.elevenlabs.txt`: somente falas do personagem, quando houver intervenção.
- `.edicao.json`: ordem dos clipes e índice de substituições, derivados do roteiro.

Os slugs dos cursos adultos continuam com `-adulto` no Admin; as aulas conservam seus `lessonSlug`. Na importação, confira o destino e use **Vincular ao destino aberto** para a mesma aula do curso correspondente. Preserve mídias publicadas: os manifestos locais contêm moldes de vídeo/material, não os anexos remotos. O PDF é o mesmo nos dois públicos; o vídeo kids pode ter a montagem com personagens.

Veja [apoio técnico](../aulas-interativas-tecnico/README.md), [contrato de voz](../aulas-interativas-tecnico/DIRETRIZES-VOZ-ELEVENLABS.md) e [estado da implementação](../continuity/2026-10-21-unificacao-aulas-plataforma/README.md).
