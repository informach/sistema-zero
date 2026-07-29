# Registry de codecs para HTML, CSS, SVG e Canvas

**Data:** 20/07/2026  
**Status:** aprovado

## Objetivo

Migrar somente os 153 blocos web do Studio para codecs registrados por categoria:
24 HTML, 53 CSS, 21 SVG e 55 Canvas. A mudança reduz os pontos centrais que precisam
ser editados ao criar ou alterar um bloco e preserva o comportamento atual da Ponte
Blocos ⇄ Código.

O mesmo lote corrige os dois problemas de acessibilidade encontrados na revisão:
nomes acessíveis vazios em HTML e ausência de fallback textual no Canvas.

## Escopo

O registry cobre os blocos com prefixos `sz_html_`, `sz_css_`, `sz_svg_` e
`sz_canvas_`, inclusive `sz_canvas_keyboard`, que permanece oculto por
compatibilidade. Blocos de Programação, Jogo 2D, Jogo 3D e extensões continuam no
fluxo legado.

A migração não altera:

- IDs e campos serializados dos blocos;
- o formato do IR;
- o código HTML, CSS e JavaScript gerado;
- as regras de parsing e canonicalização;
- níveis pedagógicos, toolbox, tooltips ou visibilidade;
- projetos salvos e exemplos existentes.

## Arquitetura

`src/codecs/web` passa a ser a fronteira das quatro categorias. Um registry tipado e
imutável indexa cada tipo de bloco e rejeita tipos duplicados ou entradas
incompletas. Cada entrada declara sua categoria e as capacidades que possui nos
fluxos reais do Studio:

- definição e inventário;
- bloco → IR;
- IR → bloco;
- IR → código;
- código → IR;
- schema/validação quando a direção exige contrato próprio.

Alguns blocos são atalhos forward-only e convergem para IR genérico. O codec declara
essa capacidade em vez de inventar uma volta específica. O teste de contrato cobra a
capacidade correta, não uma simetria que o produto nunca prometeu.

Os pontos centrais consultam o registry primeiro. Se o tipo ou nó pertence às quatro
categorias, o registry decide o handler; as demais categorias seguem para os switches
legados. Ao fim da migração, os switches centrais deixam de conter casos dos 153
blocos. Essa separação impede que um bloco web novo exija alterações espalhadas pelos
arquivos centrais.

Os codecs recebem contextos pequenos e tipados. Esses contextos expõem apenas helpers
de leitura de campos, soquetes, corpos, criação de blocos e compilação necessários à
direção atual. O registry não importa estado global do Blockly e não usa casts para
contornar tipos.

## Fluxo de dados

1. O catálogo registra as 153 entradas e valida unicidade no carregamento.
2. `buildIR` oferece o bloco ao registry web antes do fluxo legado.
3. `workspaceState` oferece nós de IR web ao registry antes do fluxo legado.
4. Geradores HTML/CSS/JS delegam os nós web ao codec correspondente.
5. Parsers HTML/CSS/JS usam os matchers registrados, em ordem explícita, antes dos
   fallbacks genéricos.
6. Um retorno `undefined` significa “não reconhecido por este registry”; erros de uma
   entrada reconhecida não são engolidos nem desviados silenciosamente ao legado.

## Acessibilidade

O analisador HTML passa a calcular texto significativo, e não apenas a existência de
uma associação estrutural. Ele avisa quando:

- `button` não possui texto ou nome acessível;
- `a` não possui texto ou nome acessível;
- `label` associado ou aninhado está vazio;
- `aria-labelledby` aponta apenas para conteúdo inexistente ou vazio;
- `canvas` não possui texto alternativo entre as tags.

Texto visível, `aria-label` não vazio e `aria-labelledby` resolvido para texto não
vazio satisfazem o nome acessível. O aviso do Canvas é pedagógico e não bloqueia a
geração ou o preview.

## Erros e compatibilidade

O registry falha cedo para tipos duplicados, categoria divergente e codec incompleto.
Ele preserva o fallback legado somente para categorias fora do escopo. Um bloco web
registrado que falhar não vira `rawHTML`, `rawCSS` ou `rawJS` silenciosamente.

Estados salvos continuam válidos porque os IDs, campos, `extraState` e IR permanecem
iguais. O teste cobre explicitamente o Canvas legado oculto.

## Estratégia de implementação

A migração segue cortes verificáveis:

1. contrato do registry e testes de inventário;
2. testes vermelhos e correção da acessibilidade;
3. codecs de HTML e SVG;
4. codecs de CSS, incluindo atalhos forward-only;
5. codecs de Canvas, incluindo statements e expressões JavaScript;
6. remoção dos casos web remanescentes dos switches centrais;
7. verificação completa de round-trip, tipos, lint e E2E.

Cada corte mantém a suíte verde antes do próximo. A implementação preserva as
alterações já existentes no worktree e não cria commit automático.

## Testes de aceitação

- O registry contém exatamente 153 tipos: 24 HTML, 53 CSS, 21 SVG e 55 Canvas.
- Nenhum tipo aparece duas vezes ou fica sem categoria/capacidades válidas.
- Os 153 blocos continuam definidos e aceitos nas allowlists existentes.
- Todos os contratos atuais de bloco → IR → bloco e IR → código → IR permanecem
  verdes, respeitando os casos forward-only.
- Projetos e fixtures existentes geram o mesmo código canônico.
- HTML vazio (`button`, `a`, `label` e `aria-labelledby`) produz aviso; conteúdo
  significativo não produz falso positivo.
- Canvas sem fallback textual produz aviso; Canvas com fallback não produz.
- `bun test src`, `bun run typecheck`, `bun run check` e os E2E direcionados passam.
