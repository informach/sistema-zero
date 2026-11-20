# CSS salvo e integridade de editar/desfazer

## Problemas reproduzidos

A observação do documento real do exemplo `Vale Ensolarado (na mão)` mostrou uma segunda navegação que apenas trocava `margin` e `background`. A carga também pode normalizar o estado serializado dos blocos; por isso, comparar somente esse estado não identifica todas as fontes equivalentes.

No CI da revisão `b5f76c0fc`, o teste de blocos fora da tela falhou em Linux e Windows: depois de editar e desfazer, o JavaScript original voltava com um comentário de geração adicional. O teste continua exigindo igualdade do código original.

## Contratos implementados

- Na carga, preservar o CSS salvo quando regras, seletores, valores e cascata são equivalentes. Não preservar uma alteração semântica.
- Só permitir inversões entre famílias explicitamente independentes: margens físicas, preenchimentos físicos, fundo, cor e opacidade. A ordem dentro de cada família é preservada. Propriedades desconhecidas, aliases, propriedades lógicas, variáveis CSS e `all` não são comutadas. Declarações duplicadas consideram caixa de propriedades padrão, mas respeitam caixa das variáveis CSS.
- Não otimizar at-rules ou sintaxe desconhecida. Limitar a análise de inversões a 128 declarações por regra; além disso, usar a geração existente. Nenhum limite do projeto foi aumentado.
- Mapear o CSS efetivamente exibido, reaproveitando o parser posicional existente. O mapa canônico fica intacto; um único mapa exibido por IR é mantido em WeakMap. Não expor posições canônicas incorretas para declarações que não foram encontradas.
- Preservar a presença ou ausência do cabeçalho JavaScript salvo também em edições e desfazer, incluindo scripts inline. Projetos novos sem fonte anterior continuam usando o cabeçalho padrão.

Sem alterações visuais, novos controles, mudanças nos blocos dos cursos, enfraquecimento de CSP ou aumento de tempos de espera.

## Verificação

- 18 testes focados, 55 asserções: aprovados.
- TypeScript completo do pacote: saída 0, sem diagnósticos.
- Chromium real no Windows: 9 casos aprovados em 2,0 minutos. Incluem os três exemplos em 390/1280 px, troca real de fonte nos dois tamanhos, metadados do documento e os dois fluxos de blocos fora da tela. A ausência de navegação é observada por dois segundos, cobrindo o debounce existente, sem aumentar seu prazo. Log: `.cache/mission/css-retention-browser-final.txt`.
- A regressão CSS foi reproduzida no navegador com diferença limitada do documento e código; não foi inferida apenas da contagem de mutações.

## Pendências independentes

O CI anterior também registra falhas na prévia hostil antes do primeiro load e na colagem na Ponte. A galeria nativa ainda tem um aviso legítimo de qualidade adaptativa tratado como falha pelo verificador. Essas evidências continuam abertas; esta correção não é uma declaração de homologação global.

Continuam pendentes as demais etapas da missão e a homologação física/de produção. Não houve implantação nem acesso a dados de alunos.
