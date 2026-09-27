# Evidências da análise autenticada do Brilliant

Este registro complementa a [proposta de evolução das experiências](../../plans/2026-09-12-brilliant-experiencias-ricas-proposta-v6.md). A observação ocorreu em 12/09/2026, em uma sessão autenticada autorizada, com viewport principal de 1366 × 900. Frações também foi inspecionada em 390 × 844. O redimensionamento representa inspeção responsiva em navegador desktop, não teste em um aparelho móvel físico.

## Alcance

Foram visitados a página inicial, o catálogo, os cursos Thinking in Code e Scientific Thinking e trechos de três aulas: Combining Parts, Connecting Gears e Writing Programs. Foram exercitados seleção, tentativa incorreta, nova tentativa, resposta correta, avanço e explicação contextual nos casos descritos abaixo. Nenhum desses percursos equivale a uma auditoria do catálogo inteiro ou à conclusão de todas as aulas.

A sessão disponibilizou as páginas internas. A pesquisa não verificou o tipo de assinatura. Os controles de tutor foram observados; não foi conduzida uma avaliação conversacional do Koji. Não foram testados compras, administração da conta, uso real com crianças, leitores de tela ou funcionamento offline do Brilliant.

As tentativas foram submetidas pela interface normal. O produto exibiu incrementos de XP em respostas corretas; portanto, a navegação pode ter registrado tentativas e progresso na conta. Cookies e identificadores de sessão não integram os artefatos.

## Percursos observados

| Referência | Página e ações | Constatação | Limite |
| --- | --- | --- | --- |
| B1 | [Home](https://brilliant.org/home/) e [Courses](https://brilliant.org/courses/) | Retomada destacada, trilhas, níveis e revisões; gamificação aparece fora e dentro das aulas. | A home contém dados da conta e não foi incluída nas capturas compartilháveis. |
| B2 | [Combining Parts](https://brilliant.org/courses/math-fundamentals/mt-fractions-intro/combining-parts/) | Selecionar uma região altera a própria figura. Uma tentativa com área insuficiente recebeu retorno genérico, ajuda e nova tentativa. Após selecionar a faixa correspondente a um terço e confirmar, apareceu acerto; a etapa seguinte pediu dois terços. | A primeira tentativa não trouxe diagnóstico específico da área selecionada. Não foi testada a conversa de ajuda. |
| B3 | [Connecting Gears](https://brilliant.org/courses/puzzle-science/gears/connecting-gears/) | Introdução ilustrada, demonstração com duas engrenagens, previsão para três, explicação acessível por “Why?”, generalização e seleção direta numa cadeia de cinco. A primeira previsão e a seleção das engrenagens alternadas foram aceitas. | Trata-se dos primeiros momentos da aula; não foi auditada a física de todas as famílias. |
| B4 | [Writing Programs](https://brilliant.org/courses/thinking-in-code/first-steps-cs/tappy-onboarding-tic/) | Exemplo ilustrado passa para uma missão de caminhão, com espaços de programa e pequena paleta de comandos. Inserção parcial e submissão produziram retorno de erro e possibilidade de tentar novamente. | A montagem correta completa não foi concluída nesta amostra; não há alegação de validação de todas as operações do editor. |
| B5 | DOM da cena de programação | SVG de aproximadamente 536 × 217, grupos com transformações, polylines e imagem SVG referenciada; a ilustração anterior inclui máscaras e imagens. Existe a classe `diagrammarRoot` no markup inspecionado. | O nome da classe não identifica uma biblioteca pública. A presença de Canvas em outras regiões não permite atribuir todo o produto a um motor. Não houve acesso ao repositório do Brilliant. |
| B6 | Frações com viewport estreito | A figura se adapta e a ação principal permanece na região inferior; a navegação secundária é reduzida. | Redimensionamento desktop não valida ergonomia de toque, teclado virtual ou desempenho móvel. |

## Capturas

As imagens documentam a referência para análise interna. Não são assets propostos para uso no Sistema Zero.

| Arquivo | Estado |
| --- | --- |
| [01-fracoes-entrada.png](01-fracoes-entrada.png) | Uma instrução e a figura manipulável antes da primeira seleção. |
| [02-fracoes-feedback.png](02-fracoes-feedback.png) | Seleção insuficiente, retorno de erro e ações de recuperação. |
| [03-engrenagens-demonstracao.png](03-engrenagens-demonstracao.png) | Demonstração de sentidos opostos. |
| [04-fracoes-acerto.png](04-fracoes-acerto.png) | Resposta aceita e possibilidade de consultar explicação/continuar. |
| [05-programacao-primeiro-desafio.png](05-programacao-primeiro-desafio.png) | Paleta curta, programa e resultado espacial. |
| [06-engrenagens-previsao.png](06-engrenagens-previsao.png) | Resultado da previsão sobre três engrenagens. |
| [07-programacao-resultado.png](07-programacao-resultado.png) | Programa parcial e feedback de erro. |
| [08-engrenagens-explicacao.png](08-engrenagens-explicacao.png) | Explicação vinculada à questão resolvida. |
| [09-fracoes-mobile.png](09-fracoes-mobile.png) | Segunda etapa em viewport de 390 × 844. |
| [10-programacao-correcao.png](10-programacao-correcao.png) | Segunda tentativa ainda incorreta; o nome do arquivo não indica acerto. |
| [11-engrenagens-selecao-direta.png](11-engrenagens-selecao-direta.png) | Pergunta que pede seleção dos objetos na própria cena. |
| [12-engrenagens-selecao-resultado.png](12-engrenagens-selecao-resultado.png) | Seleção das engrenagens alternadas aceita. |

## Diagnóstico reproduzível do modelo local

O [script de diagnóstico](model-probe.ts) importa o modelo existente, compara divisões de tempo e mede o replay de históricos sintéticos. Ele não modifica arquivos de produto nem escreve progresso de alunos. Execute a partir da raiz:

```powershell
bun run docs/research/brilliant-2026-09-12/model-probe.ts
```

Os [resultados registrados](model-probe-results.json) mostram que um avanço de 1 segundo e 25 avanços de 0,04 segundo resultam em quantidades físicas iguais, mas descobertas diferentes, nas missões `spawn` e `score`. No código observado, o reconhecimento contém condições sobre a duração da chamada individual (`seconds >= 0.1` e `seconds >= 0.5`).

O player atual agrupa avanços e reproduz o histórico. Por isso, a diferença do redutor isolado não demonstra que o aluno fique bloqueado no player atual. Ela identifica uma condição que precisa mudar antes de substituir replay contínuo por execução incremental: o significado de uma descoberta deve depender do intervalo observado e dos acontecimentos, não do tamanho do lote de atualização.

No cenário sintético de camadas, foram aceitas 869 das 900 ações solicitadas antes do limite de tamanho do estado. O limite de 32.000 restringe esse caso antes do teto nominal de 1.000 ações. É um argumento para segmentação e compactação com confirmação do servidor, preservando a evidência; não para remover os limites de validação.

As medições de replay são uma execução local em Bun, com 30 aquecimentos e 200 amostras por tamanho. Não medem DOM, renderização, rede, GPU ou dispositivos infantis. Os tempos absolutos são pequenos nessa máquina e variam entre execuções. Demonstram crescimento de custo com o histórico; não comprovam queda de FPS em produção.

## Estado do repositório

O workspace já continha mudanças em andamento antes desta análise, inclusive a implementação v5 e seus documentos. A proposta se refere ao código lido durante a consulta, não a uma versão publicada ou homologada. A análise não altera esses arquivos. O [inventário de fontes locais](source-inventory.json) registra hashes e tamanhos para identificar o estado dos arquivos ao final da consulta; ele não congela o restante do repositório.
