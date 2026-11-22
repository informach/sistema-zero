# Conheça a plataforma

Páginas dos Passo a passo do projeto que mostram a plataforma com prints reais da área das crianças, marcas numeradas por cima e a legenda de cada controle. Estão nos dois cursos de entrada, só na Aula 1, junto da parte em que cada tela aparece pela primeira vez:

| Página | Parte da Aula 1 | Tela |
| --- | --- | --- |
| `guia-aula` | 1 | a tela da aula: vídeo, recado do Zappy, atividade, navegação e ajuda |
| `guia-modo-focado` | 1 | Ampliar jogo e Voltar à aula |
| `guia-passo-a-passo` | 2 | o passo a passo na aula: Livro 3D, Ler por páginas, tela cheia e Baixar |
| `guia-experiencia` | 3 | os controles que toda experiência tem |
| `guia-estudio` | 4 | o Estúdio na aula, em abas |
| `guia-estudio-expandido` | 4 | o Estúdio expandido, blocos e jogo lado a lado |

No Cadê Todo Mundo? as páginas entram depois do mapa (`<!--GUIA-->` no template). No A Chave do Farol, entram pela ordem de `caderno-conteudo.json` (páginas com `"guia": true`).

A Ilha do Farol (22/11/2026) tem uma página só dela, `guia-jogo-3d`, na Parte 1 da Aula 1: o jogo em 3D ampliado, com o aviso, a dica das teclas e os botões da vista (Aproximar, Afastar, os dois de girar a cena e Voltar à vista do começo). Os botões ficam dentro do iframe do jogo, e `capturar-telas.py` mede lá dentro (`no_jogo`). A página diz os seus cursos (`"cursos"` em `conteudo.json`); sem esse campo, a página é dos dois cursos de entrada.

O mesmo script tira as fotos sem marcas das páginas de conceito do caderno da Ilha (`FOTOS`): a ilha na vista do começo e girada (página da câmera) e a experiência de encostar, de cima e de lado (Aula 2, Parte 3). Elas ficam em `telas/ilha-do-farol/` e não entram em `marcas.json`.

## Arquivos

- `conteudo.json`: todo o texto que a criança lê (títulos, textos, notas e legendas). Conferido por `qa/guia-da-plataforma.test.ts`: régua de vocabulário das aulas e nomes dos botões. Cada `<b>Nome</b>` de uma legenda precisa ser um controle do print daquela tela, com o nome que aparece nele.
- `guia.ts`: monta as folhas (`guiaSecao`) e o estilo (`GUIA_CSS`) para os dois geradores.
- `capturar-telas.py`: tira os prints no staging e mede a caixa de cada marca.
- `telas/<curso>/`: os prints (`.jpg`) e `marcas.json`. O PDF é gerado só a partir deles, sem login.

## Quando a tela da plataforma mudar

1. Crie uma sessão de criança no staging (ver o cabeçalho de `capturar-telas.py`).
2. `SZ_KIDS_SESSAO=<sessão.json> python docs/aulas-interativas-tecnico/recursos/guia-da-plataforma/capturar-telas.py`
3. `bun test docs/aulas-interativas-tecnico/qa/guia-da-plataforma.test.ts`: se um botão mudou de nome, o teste aponta a legenda.
4. Gere os PDFs (`gerar-materiais.py cade-todo-mundo`, `gerar-materiais.py` e `gerar-materiais.py ilha-farol`, em `../desafio-farol/`) e confira as páginas: número de marca em cima de texto se corrige pela âncora da marca em `capturar-telas.py`.

Os prints mostram a tela da primeira vez. Se o perfil de testes já enviou o projeto, o script troca `Enviar de novo` por `Enviar meu projeto` e esconde o aviso do envio antigo. Também esconde a marca d'água do vídeo, que mostra o identificador do perfil.
