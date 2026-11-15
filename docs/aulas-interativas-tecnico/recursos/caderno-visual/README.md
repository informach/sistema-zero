# Receita do Passo a passo do projeto

O visual de referência dos Passo a passo do projeto, aprovado pelo responsável em 14/11/2026 no Cadê Todo Mundo? e no A Chave do Farol. **Todo curso novo, e todo curso antigo que for refeito, segue esta receita.** Nada aqui muda o conteúdo pedagógico: o texto continua seguindo as [Diretrizes pedagógicas](../../DIRETRIZES-PEDAGOGICAS.md) e acompanhando a aula real.

Referências prontas para copiar:

- Gerador mais simples: [`../cade-todo-mundo/gerar-caderno.ts`](../cade-todo-mundo/gerar-caderno.ts), com o conteúdo em [`caderno-conteudo.json`](../cade-todo-mundo/caderno-conteudo.json).
- Gerador mais completo (galerias, índice, temas por dia): [`../desafio-farol/gerar-caderno.ts`](../desafio-farol/gerar-caderno.ts).
- Peças comuns: [`visual.ts`](visual.ts). Arte: [`arte/`](arte/).
- PDFs de referência: `docs/aulas-interativas/faisca/cade-todo-mundo/passo-a-passo-do-projeto.pdf` e `docs/aulas-interativas/faisca/desafio-primeiro-jogo/passo-a-passo-do-projeto.pdf`.

## A ideia

É material para criança. Não é uma folha de texto corrido:

- Tudo vem separado em blocos, com uma ideia por card. As coisas mais importantes aparecem em cards coloridos, com ícone.
- Os passos são numerados.
- O caminho da paleta aparece em cor.
- Os blocos são desenhados como no Estúdio.
- Cada página tem respiro, e uma página pode sobrar espaço embaixo. É melhor sobrar do que apertar.

## Capa

Função `capaHtml`. A capa é sempre a mesma composição, com medidas fixas para a folha de 794 × 1123 px:

| Parte | Como é |
| --- | --- |
| Arte | A arte do curso ocupa a metade de cima, até a borda (0 a 690 px), e funde no painel por um degradê suave |
| Painel | Cor do curso de 640 px até o pé (cor lisa ou degradê) |
| Faixa | Pílula centralizada, com ícone de traço e "PASSO A PASSO DO PROJETO" em maiúsculas, fundo na cor de contraste do curso, borda branca translúcida e sombra |
| Título | Duas linhas em Baloo 2 extra-negrito, maiúsculas, centralizadas: a primeira branca (92 px), a segunda amarela (86 px) |
| Frase | "Todos os passos para construir ..." em 21 px, numa cor clara do painel |
| Frase de baixo | A promessa do curso ("Do primeiro ... ao ...") em 17 px, branca |
| Logo | Sistema Zero kids no pé, a partir de `packages/community-kids/public/logo_kids_vertical.svg` |

Cada curso define, na classe `capa--<curso>`:

- as cores: `--capa-painel` (ou `--capa-painel-fundo` para degradê), `--capa-amarelo`, `--capa-frase` e `--selo-fundo`;
- o tamanho da faixa: `--selo-topo`, `--selo-altura`, `--selo-largura` e `--selo-letra`, para a faixa caber no texto;
- `--titulo-topo` (692 px nas duas referências) e, se a frase for longa, `--frase-largura`.

O título usa o nome do curso dividido em duas linhas de peso parecido. Exemplos: "Cadê / Todo Mundo?" e "A Chave / do Farol".

**Arte da capa.** É a ilustração do curso (a mesma da capa do curso), em JPEG, dentro de `arte/capa-<curso>.jpg`, com pelo menos 1300 px de largura. Os personagens ficam na metade de cima, porque a faixa cobre a altura de 590 a 660 px.

**Curso para pais (15/11/2026).** O material se chama "Apostila do curso", porque não tem projeto. Só o nome muda: `capaHtml({ …, selo: 'Apostila do curso' })` e `rodape(curso, numero, 'Apostila do curso')`. Referência: [`../transformando-o-vilao-em-aliado/gerar-caderno.ts`](../transformando-o-vilao-em-aliado/gerar-caderno.ts), com o slide da aula aberta no lugar da cena do jogo no `cabecalho`. Conferência: `python recursos/desafio-farol/gerar-materiais.py transformando-o-vilao-em-aliado`.

## Cores do curso

Cada curso define as cores em `body`, no CSS do próprio gerador:

| Variável | Para que serve | Cadê | Farol |
| --- | --- | --- | --- |
| `--fundo` | fundo das folhas, sempre bem claro | `#fafbf7` creme | `#f7fafe` azul-claro |
| `--tinta` | títulos | `#133826` | `#0e2340` |
| `--texto` | texto | `#3f4a45` | `#3d4a5c` |
| `--destaque` / `--destaque-claro` | kicker, filete, números, rodapé | verde | azul |
| `--caminho` | caminho da paleta | verde | `#3d5ce0` |
| `--entrega-*` | o card de fechamento | verde claro, rótulo em pílula verde | azul escuro, rótulo e destaques em amarelo |

Uma cor de destaque por curso, puxada da arte. Quando o curso tem dias ou fases, cada folha pode trocar o destaque com as classes `tema-azul`, `tema-ambar`, `tema-vermelho`, `tema-roxo` e `tema-verde`. No Farol, por exemplo, cada dia tem uma cor (função `tema`).

## Estrutura das folhas

1. **Capa.**
2. **Abertura** (página 2): kicker, título grande, frase de apoio e uma cena ou faixa com a arte. Depois vem "O que você vai fazer" ou "Encontre seu passo" em cards coloridos, um por aula ou dia, com as páginas de cada um.
3. **Conheça a plataforma**, só na Aula 1 dos cursos de entrada ([guia-da-plataforma](../guia-da-plataforma/README.md)).
4. **Uma folha por parte da aula.** Abre com o `cabecalho` (cena do jogo à esquerda, kicker "Aula N · Parte N · tipo", título e resumo à direita, com o filete do destaque em cima). Depois vêm os cards, os passos e o esquema dos blocos, nesta ordem.
5. **Surpresa do final e galerias**, quando o curso tiver.
6. **Publicação, revisão e certificado.**

Rodapé em toda folha (`rodape`): "Curso | Passo a passo do projeto" na cor do destaque e "N / total" à direita. A capa conta como página 1. As referências de página no texto usam `{{pagina:<id>}}` e nunca um número escrito à mão.

## Peças e quando usar

| Peça (`visual.ts`) | Uso |
| --- | --- |
| `caixa({ tom, icone, titulo, html })` | Card colorido com ícone. Azul para explicar ou consultar (a ideia do vídeo na experiência, "Use quando precisar", nomes que os blocos usam). Amarelo para o que a criança faz ou investiga ("Antes de montar", "O que investigar", testes). Verde para a experiência no curso verde. Lilás e vermelho para variar quando o curso tem mais temas |
| `passo(n, título, html)` | Passo numerado da montagem. Um título curto e um parágrafo por ação: onde deixar à vista, o caminho da paleta, qual bloco, o que trocar |
| `secao(título, html)` | Teste ou comparação sem número ("Compare com a seta apertada") |
| `nota(html)` | Lembrete com ícone "i" e filete à esquerda: rever, onde achar, o que a criança fez |
| `entrega(rótulo, html)` | O card que fecha a parte: "Verificar e continuar", "Verificar e enviar", "Teste suas escolhas" |
| `rotulo(texto)` | Pílula antes de um grupo ("Montar no Estúdio") |
| `cabecalho({...})` | Topo de cada folha de parte |
| `comCaminhos` / `paragrafos` | Automáticos: cada `<br/>` vira parágrafo, e um caminho em negrito com `&gt;` ("Jogo 2D &gt; Sprites &gt; Aparência") ganha a cor de caminho |
| `icone(nome)` | Ícones de traço da própria lista. Para um novo, acrescente à lista, sempre no mesmo estilo |

Galerias de imagens (`.galeria`, `.galeria-item`) ficam em cartões brancos, com a imagem e o nome exato que aparece na lista do Estúdio, sem quebra de linha.

Prints da plataforma vão em cartões, com marca numerada sobre o controle e legenda curta embaixo. Veja "Veja como é na tela" no Cadê e as páginas do guia.

## Blocos como no Estúdio

`criarBlocos(definições)` recebe as definições reais dos blocos e só desenha com a **cor oficial de cada tipo**. Um tipo sem cor faz o gerador parar, e o `gerar-materiais.py` confere a cor de cada bloco desenhado.

- `area(nome, corpo)`: a área do projeto ("Ao iniciar", "Quando acontecer", "Enquanto estiver rodando"), com chapéu, ícone, braço e pé na cor dela.
- `comBoca(tipo, topo, dentro, "fazer")`: bloco de evento ou repetição, com a palavra do Estúdio à esquerda da boca.
- `se(tipo, condição, ramos)`: Se/senão com o rótulo de cada ramo, a explicação em itálico e o "+ senão se −".
- `bloco`, `valor`, `texto`, `campo` (com `lista: true` mostra a setinha da lista; com `miniatura` mostra o desenho do sprite), `numero`.
- `pronto(texto, cor)`: o que já vem no projeto, com contorno na cor do bloco e "(já vêm no projeto)".
- `vazio(texto)`: o encaixe que a criança ainda vai preencher.
- `esquema(título, área, corpo)`: o quadro "confira se ficou assim", com o painel cinza do Estúdio e a nota "Esquema dos encaixes, com as cores dos blocos do Estúdio."

Os rótulos dos blocos são os do Estúdio, palavra por palavra. Se o Estúdio mudar um rótulo, o desenho muda junto.

## Texto

- **Fica num JSON de conteúdo** (`caderno-conteudo.json`), nunca no código do gerador. Cada página tem `id`, `kicker`, `title`, `subtitle` e `items`. Uma página do guia é `{ "id": "guia-…", "guia": true }`.
- O vocabulário é o das aulas, sem travessão. Acrescente o curso a `qa/guia-da-plataforma.test.ts` (o teste "segue a régua das aulas") para o texto passar pela régua.
- Os nomes dos botões são os da tela, em negrito.

## Como fazer um curso novo

1. Copie o gerador do Cadê (ou do Farol, se precisar de galerias por categoria e índice por dia) para `recursos/<curso>/gerar-caderno.ts`. Ponha a arte da capa em `caderno-visual/arte/` e as cores do curso no CSS dele.
2. Escreva `recursos/<curso>/caderno-conteudo.json` a partir da aula real.
3. Desenhe os encaixes com `criarBlocos` e as definições do pacote `studio`.
4. Gere e confira com o pipeline (`gerar-materiais.py`). Ele confere fontes, imagens, cores dos blocos e se algum conteúdo invade o rodapé.
5. **Olhe página por página.** A capa deve ficar lado a lado com a do Cadê ou do Farol, e nenhuma página pode ter número em cima de texto, card cortado ou palavra sozinha.
6. Rode `bun test docs/aulas-interativas-tecnico/qa` e o Biome.
7. **Uma página que passe do limite se resolve compactando aquela página** (com `[data-id="…"]` no CSS do curso) **ou dividindo em duas.** Nunca diminua tudo.

## Cursos que ainda estão no visual antigo

Os geradores de `a-ponte-apressada`, `corre-dino`, `ilha-farol`, `jardim-secreto`, `meu-jeito`, `meu-primeiro-desenho`, `moedas-no-caminho`, `nave-contra-asteroides`, `o-bau-dos-simbolos` e `o-segredo-da-cabana` ainda usam o CSS do antigo `cade-todo-mundo/caderno-do-aluno.template.html`. Esse template só continua no repositório por causa deles. Ao refazer um desses cursos, passe-o para esta receita. Quando o último sair, apague o template.
