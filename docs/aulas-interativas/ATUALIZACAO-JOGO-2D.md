# Cursos com o Jogo 2D atual

Edição de autoria: `jogo-2d-1.0-documento-2`. As 27 aulas em `*-v6` são as candidatas atuais. Os diretórios anteriores e os trechos identificados como originais conservam a referência das gravações.

| Curso | Aulas | Tipos usados, incluindo núcleo e pré-requisito | Lista para consulta/configuração |
| --- | --- | --- | --- |
| Corre Dino | 13 | 44 | [blocos-corre-dino.json](corre-dino-v6/blocos-corre-dino.json) |
| Desafio do Primeiro Jogo | 6 | 45 | [blocos-desafio-primeiro-jogo.json](desafio-primeiro-jogo-v6/blocos-desafio-primeiro-jogo.json) |
| O Jogo do Meu Jeito | 8 | 49 | [blocos-o-jogo-do-meu-jeito.json](o-jogo-do-meu-jeito-v6/blocos-o-jogo-do-meu-jeito.json) |

Cada pasta contém `blocos-por-aula.json`, com tipos em ordem, primeira utilização, rótulos, caminhos completos na paleta e ajuda. A união inclui peças transitórias e o programa herdado. No Meu Jeito, a aula 1 importa o jogo completo do Dia 5; as aulas 2–5 trabalham no Pinta; as aulas 6–8 alteram e publicam aquele jogo. Os quatro tipos adicionais são criar sprite com imagem, carregar folha, animar sprite e criar sprite com imagem no grupo. A lista de 49 tipos é o uso completo, não uma concessão adicional de 49 ferramentas.

## Mudanças nas aulas

- Os endereços de busca e montagem seguem as 14 famílias atuais. Cada roteiro termina com a tabela de peças e ajuda do catálogo real. As direções revisadas de imagem e fala também usam os endereços novos.
- Sons de pulo, tiro e explosão usam **Tocar efeito**, em **Jogo 2D › Som › Efeitos prontos**. Os critérios conferem o valor da opção, o evento/colisão e a ordem. Um efeito errado não satisfaz o objetivo.
- A comparação com os dois JSONs originais de Dino e Desafio não encontrou outra retirada ou adição: a diminuição de um tipo por curso resulta da consolidação dos sons. Placar e perguntas de colisão já estavam compostos com variáveis/perguntas nas aulas atuais.
- O Meu Jeito tem programas independentes de QA para as aulas 6–8: dimensões, folhas, animações, criação de cada asteroide e continuidade de controles, disparos e reinício. As entregas continuam pela galeria; nenhuma aula do Pinta vira um editor de blocos.
- Dino tem configuração de Estúdio por aula; Desafio conserva sua configuração incremental. Mantenha os vínculos existentes de aula, projeto e entrega ao aplicar essas configurações. A atualização de concessões e de cópias congeladas ocorre no lote de staging, preservando progresso e histórico.

## Gravação e publicação

Os mapas `montagem.json` conservam arquivo-fonte, hash, âncoras e narração original. As capturas de Estúdio marcadas `regravar-estudio-atual` precisam ser refeitas na versão candidata de staging. Substitua as indicações antigas usando a fala revisada e a tabela atual; não publique a fala histórica como instrução nova. Timecodes permanecem nulos até conferir a mídia real.

Antes de publicar cada aula, grave com o perfil de aluno e confira: localização das peças, opções dos seletores, encaixes, execução, critérios, salvamento e retomada. Nas aulas de publicação, abra o jogo no mural, faça uma versão, modifique e reabra a cópia. A aparência e o áudio precisam de revisão humana. Nenhuma aprovação automática destes documentos certifica mídia, banco, mural ou aprendizado com crianças.

## Reprodução da autoria e QA

Na raiz do repositório, informe as pastas dos roteiros originais como argumento dos respectivos geradores e validadores:

```powershell
bun docs/aulas-interativas/qa/gerar-candidatos-v6.ts <roteiros-corre-dino>
bun docs/aulas-interativas/qa/gerar-desafio-v6.ts <roteiros-desafio>
bun docs/aulas-interativas/qa/gerar-meu-jeito-v6.ts <roteiros-meu-jeito>
bun docs/aulas-interativas/qa/gerar-blocos-cursos.ts
bun docs/aulas-interativas/qa/validar-revisao-completa.ts <roteiros-corre-dino>
bun docs/aulas-interativas/qa/validar-desafio-v6.ts <roteiros-desafio>
bun docs/aulas-interativas/qa/validar-meu-jeito-v6.ts <roteiros-meu-jeito>
bun docs/aulas-interativas/qa/gerar-blocos-cursos.ts --check
```

Os testes `correDinoEditorial`, `desafioEditorial` e `meuJeitoEditorial` no pacote Studio compilam os blocos reais e exercitam o motor. Os validadores editoriais conferem fontes, hashes, âncoras, manifestos e reprodução dos arquivos. Os geradores não escrevem no banco nem publicam cursos.

As cenas nativas de cada aula (experimentação e demonstração) são dados das receitas (`cena:` em cada passo, com o bloco na ordem das chaves do manifesto), e o roteiro descreve cada uma lendo o catálogo do core: instrução, previsão, pedidos e rótulos das metas, pistas e roteiro da demonstração ficam em dia sozinhos.

⭐ **O cenário da cena sai do CURSO, não de cada bloco.** Desde 18/09/2026 o palco desenha a arte da extensão Jogo 2D, e cada bloco de cena carrega um campo `cenario` dizendo QUAL jogo ele retrata. A tabela é uma só, em `qa/cenas-editorial.ts`:

| Curso | `cenario` | O que a criança vê |
| --- | --- | --- |
| Corre Dino | `corre-dino` | floresta com sol, nuvens e morros; Dino e cacto |
| Desafio do Primeiro Jogo | `nave` | céu estrelado; nave, asteroide e tiro |
| O Jogo do Meu Jeito | `meu-jeito` | céu estrelado; pedra e chama |

`conteudoDaCena(cena, cenario)` e `blocoDaCena(cena, cenario)` inserem o campo logo depois do `cast` (ou do `scene`, quando não há elenco), e os quatro editoriais passam `CENARIO_DO_CURSO['<curso>']`. São **38 cenas declaradas**: 20 no Corre Dino, 8 no Desafio e 10 no Meu Jeito. Sem o campo o player deriva o cenário pelas figuras do elenco — rede para cena solta, e não o caminho de um curso: uma cena do Desafio com o elenco de fábrica do Corre Dino apareceria com um dinossauro na grama. `packages/core/tests/learning.test.ts` cobra as duas metades (toda cena declara; o declarado é o do curso) e o `validar-manifestos-v6.ts` segue sendo o portão do formato. Depois de rodar os três geradores, `git diff -- 'docs/aulas-interativas/**/manifesto.json'` sai vazio: JSON com o mesmo conteúdo não é regravado (o Biome preserva o desenho de cada objeto, e os blocos de cena editados à mão estão fechados numa linha só), e o que muda passa pelo Biome do repositório.
