# Canvas infantil — correções do review

## Objetivo

Tornar a categoria Canvas 2D utilizável por crianças desde o nível iniciante, sem quebrar projetos existentes nem o ciclo Blocos ↔ Ponte.

## Decisões aprovadas

- Preservar todos os tipos de bloco e a leitura de projetos antigos.
- Tornar o caminho iniciante autossuficiente: criar a tela, preparar o pincel, escolher cor e desenhar sem depender de blocos de outro nível.
- Manter APIs manuais disponíveis, mas colocá-las somente nos degraus compatíveis com sua complexidade.
- Manter o teclado legado registrado para round-trip, porém fora da paleta; o caminho infantil passa a ser a leitura direta já fornecida pelo input bridge.
- Corrigir o ciclo de vida das imagens na origem: cada recurso é carregado uma vez e reutilizado ao desenhar, inclusive dentro de laços.
- Todo encaixe de valor visível na paleta recebe um shadow útil e executável.
- Textos falam em tela, pincel, quadro e nas áreas Estrutura/Eventos/Laços; nomes de APIs ficam para a Ponte.
- Blocos com muitos parâmetros são divididos em linhas para reduzir largura no celular.
- Uma auditoria genérica permanente cobre inventário, defaults, contratos, schema, gerador, parser, reconstrução, menus e source maps dos 55 blocos.

## Compatibilidade e round-trip

As mudanças de apresentação não alteram identificadores de blocos nem campos persistidos. Mudanças no código gerado terão reconhecimento correspondente no parser, e a IR de limpar tela será normalizada para uma única identidade canônica.

## Verificação

- Testes mínimos de regressão para imagem, progressão, textos, defaults e fidelidade.
- Auditoria dinâmica de todos os blocos e de todas as opções de dropdown.
- Testes focados do Canvas, typecheck e suíte completa de `packages/studio`.
