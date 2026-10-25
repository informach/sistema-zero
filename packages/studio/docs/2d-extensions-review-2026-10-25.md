# Revisão das extensões JavaScript de jogos — 25/10/2026

Implementa a proposta aprovada na conversa, com o núcleo inicial cobrindo também
**Cadê Todo Mundo?** e **A Chave do Farol**. Exemplos e jogos com extensão usam as
ferramentas visuais do motor; HTML, CSS, SVG, Canvas e código visual manual ficam
na etapa sem extensão. Variáveis, condições, laços, funções e matemática continuam
expressando as regras dos jogos.

Versões: **Jogo 2D 2.0.0 → 2.1.0**; **Jogo 2D Avançado 0.63.0 → 0.64.0**.
Trabalho local; sem implantação nem alteração de dados remotos.

## Progressão e oferta

- `game-2d/initialCore.ts` declara um núcleo editorial de **100 blocos**. A prova
  usa os quatro exemplos de entrada e 14 montagens dos dois cursos, reconstruindo
  o workspace real. Não depende de uma lista escrita de nomes de blocos por curso.
- Os **307 blocos visíveis** do Jogo 2D pertencem ao Iniciante 2D. As aulas e as
  ferramentas conquistadas fazem a apresentação gradual; o complemento do 2D
  deixou de depender da classificação Iniciante 3D.
- O Avançado continua começando no Intermediário 2D, com peças técnicas de motor
  no Avançado 2D. Sua paleta tem **12 famílias**, com sete kits na última família.
- Com extensão de jogo instalada, a paleta não oferece ferramentas manuais de
  página, desenho, manipulação visual de DOM nem leitores Canvas sem prefixo.
  O filtro alcança Programação/Valores, listas de aula e ferramentas históricas.
  Eventos genéricos e tela cheia continuam disponíveis. Projetos sem extensão
  conservam a oferta manual. Definições antigas continuam registradas para abrir
  documentos existentes.
- Manual, tutor, busca e dicas foram alinhados às famílias e às unidades reais.
  Todas as dicas visíveis das duas extensões têm até 220 caracteres. Valores de
  física e a diferença entre quadros do básico e segundos do Avançado foram
  preservados.

## Exemplos e recursos nativos

| Catálogo | Antes | Depois | Blocos visíveis com exemplo |
|---|---:|---:|---:|
| Jogo 2D | 36 | 45 | 307/307 |
| Jogo 2D Avançado | 38 | 48 | 388/388 |

As fontes dos 35 exemplos básicos que ainda declaravam página foram convertidas
para preparar palco, descrição e bordas pela extensão. O catálogo inicia com
demonstrações e jogos simples e avança para jogos maiores, kits e receitas.

No Avançado, quatro comandos completos substituem as operações Canvas dos 26
exemplos afetados: **retângulo, círculo, triângulo e texto**. São blocos reais,
com IR, codecs bidirecionais, sombras e API do motor. A cor pertence à figura;
não há estado de pincel escondido entre blocos. Aparências e mapas usam o mesmo
vocabulário. Desenho cabe nos contextos de aparência, mapa e desenho de jogo/HUD;
é recusado no início, na atualização e em eventos. Condições preservam o contexto.

As 19 receitas demonstram recursos antes sem exemplo: arte/animação do Pinta,
mapas de peças, som de arquivo, física, colisão, texto, inimigos, fases, efeitos,
campanha, saves, replay, cartas, criaturas e cópias na pista. Elas têm fontes
autorais, materiais embutidos e IR estática gerada; o catálogo não carrega o parser
nem converte HTML/CSS/Canvas durante sua abertura.

`extensionOnlyExamples.test.ts` percorre os cinco catálogos de extensões e recusa
HTML/CSS, blocos visuais manuais e chamadas diretas ao contexto Canvas escondidas
em blocos genéricos. Também prova que os exemplos manuais não declaram extensões.
`twoDExampleCoverage.test.ts` mede cobertura pelo workspace real e exige todos os
blocos visíveis das duas extensões, sem lista aceita de exceções.

## Integridade da Ponte e execução

- O parser de campanha preserva callbacks `async`, geradores e funções nomeadas
  que não têm representação equivalente em blocos, em vez de perder modificadores.
- O parser de Figuras do básico reconhece o parâmetro canônico `ctx`; chamadas
  com outro parâmetro, assincronismo, gerador ou autorreferência ficam preservadas
  integralmente. Uma regressão executa o callback personalizado depois da Ponte.
- A API de contexto `isLifecycleRootAllowed` e o schema concordam sobre os quatro
  comandos de desenho novos.
- Iniciar uma gravação no primeiro callback de simulação não cria checksum de
  passo zero. Esse checksum era recusado ao reproduzir. A regressão cobre gravação,
  checkpoint válido, reprodução física e progresso equivalente.
- A exportação conserva `style.css` mesmo vazio quando o HTML o referencia.
  Os exemplos sem CSS autoral expuseram um 404 nessa composição. Projetos com
  estilo inline continuam dispensando esse arquivo; a regressão confere também
  a lista de arquivos do PWA.
- O filtro visual recebe os IDs das extensões instaladas, mesmo quando o nível
  esconde sua categoria. A política não depende mais da visibilidade da categoria.
- Na receita do Pinta, a tecla I mantém a imagem fixa, inclusive ao andar.
  Espaço volta à animação e R restaura a partida. A fonte representa os três
  modos visuais explicitamente; o motor de animação mantém sua semântica.
- O provider detalhado do Jogo 2D recebe a política visual compartilhada e deixou
  de recomendar traçado e recorte manuais com Canvas.
- Nenhum bloco ou método público antigo foi removido; não houve conversão de
  documentos salvos nem mudança silenciosa de unidades.

## Payload dos motores

O contexto serializado da partida é inserido **depois** da compactação. Isso
preserva templates que o build minificado pode produzir no `toString()` dessa
função. Só o corpo autoral do motor tem comentários/indentação compactados.
Testes comparam tokens e quebras significativas e verificam sintaxe e tetos.

| Motor | Caracteres antes | Caracteres depois | Gzip antes | Gzip depois |
|---|---:|---:|---:|---:|
| Jogo 2D | 462.584 | 415.166 | 123.764 | 119.134 |
| Jogo 2D Avançado | 521.697 | 408.593 | 160.860 | 122.315 |

Tetos de bytes foram reduzidos. Nesta revisão, o ganho veio da composição e
compactação dos motores existentes; não foi introduzida remoção seletiva de kits
que exigisse alterar a API de jogos salvos.

## Verificação e reprodução

O índice server-safe contém **183 exemplos**, dos quais 148 usam extensões.
Os geradores das duas famílias de receitas têm comandos `gen`/`check` e gates no
CI. A verificação do Avançado compara também os materiais resolvidos e recusa
referências a material inexistente.

Os geradores substituem os arquivos por escrita atômica, permitindo regeneração
no Windows mesmo quando outro processo mantém a versão anterior mapeada.

```sh
bun run check:game-2d-recipes
bun run check:game-2d-advanced-recipes
bun run check:game-3d-examples
bun run check:world-3d-examples
bun run check:snow-descent
bun run gen:server-examples
bun run test
bun run typecheck
bun run e2e:gallery
bunx playwright test e2e/course-game-extensions.spec.ts e2e/advanced-recipes.spec.ts e2e/export-2d-extensions.spec.ts e2e/export-3d-assets.spec.ts e2e/reload-flush.spec.ts --project=chromium
```

Provas de navegador específicas: `e2e/course-game-extensions.spec.ts` joga Cadê e
Farol com entradas reais, incluindo vitória e reinício; `e2e/advanced-recipes.spec.ts`
exercita gravação/reprodução, saves e coleta de cópias. Reutilizam a instrumentação
dos objetivos para ler o estado, sem acrescentar métodos de teste ao produto.
Os 37 manifestos atuais também são conferidos; seus 31 projetos iniciais com
extensão não têm ferramentas visuais manuais.

A suíte canônica completa do Studio passou: **10.959 testes, zero falhas**, em
147 grupos isolados. Quatro testes do executor de objetivos foram pulados pelo
próprio contrato da suíte por faltar o caminho Linux configurado para o Chromium;
os cenários Playwright usam o Chromium local. Os typechecks de Studio, Members e
Member Shell também passaram.
O typecheck do Studio foi repetido após a correção da exportação e a inclusão do
E2E correspondente, com saída zero e nenhum diagnóstico.

A rodada completa de navegador exercitou **209 casos**: 208 passaram e um
revelou que a checagem de descrição acessível não reconhecia a instrução numérica
“Use 1 a 6”. Corrigida a regra do teste, esse caso passou na rodada complementar.
Todos os 183 cartões da galeria foram assim conferidos, além dos percursos dos
cursos, replay, geometria lógica e telas estreitas.

A rodada complementar terminou com **13/13 aprovações**: quatro casos da galeria
repetidos, duas exportações 2D com artes do Pinta e minificadores reais, quatro
exportações 3D e três cenários de persistência imediata após recarga/saída da aba.
O build foi preparado pelo mesmo `serve:e2e` e reutilizado pela opção documentada
`PW_REUSE_SERVER=1`, após uma tentativa ultrapassar o prazo de inicialização;
o build separado concluiu em 13 segundos. Nenhum limite de interação foi ampliado.

A correção final da exportação passou em **43 testes** de composição de pacotes,
HTML de produção e exportação de fonte. Os 39 testes dos manifestos dos cursos
também passaram. Biome e `git diff --check` aprovaram os arquivos revisados.

## Encerramento após o full review

Os achados R1–R4 foram corrigidos, com regressões permanentes: a política visual
usa IDs instalados, o modo de imagem fixa do Pinta persiste, os callbacks nomeados
mantêm sua identidade e o provider detalhado deixou de ensinar Canvas manual.
Os nove casos novos falharam antes das mudanças; os 48 testes direcionados
passaram depois. A receita e o índice server-safe foram regenerados.

A suíte canônica final aprovou **10.969 testes, zero falhas e quatro skips** de
configuração do Chromium do executor, em 147 grupos. Os manifestos tiveram
**39/39 aprovações**. Os seis E2Es de cursos, replay/pista e exportações 2D passaram
em 27,2 segundos; o de exportação agora verifica a imagem fixa após I e quadros
adicionais, com leitura de pixels e captura visual. Biome: 178 arquivos, zero erros,
um aviso do teste intencional de template e uma informação de estilo do runtime.
Os checks das receitas 2D, dos exemplos 3D/Mundo 3D e da Descida da Neve passaram.
Os typechecks de Studio, Members e Member Shell foram repetidos após todas as
correções e terminaram com saída zero. `git diff --check` também passou.
