# Correções do review das áreas de comportamento

**Status:** aprovado em 2026-07-20

## Objetivo

Concluir a divisão do antigo bloco Comportamento nas áreas **⚙️ Ao iniciar**,
**⚡ Quando acontecer** e **🔁 Enquanto estiver rodando**. A correção deve manter
Blockly, IR, geradores, parsers, runtimes, persistência, extensões oficiais e
documentação sob o mesmo contrato.

## Problemas confirmados

O review encontrou quatro causas-raiz:

1. O `ProjectRunContext` tem testes, mas a factory gerada não o usa. Por isso,
   reiniciar Jogo 2D ou Jogo 2D Avançado recria listeners DOM e RAFs sem descartar
   os anteriores.
2. Catálogos, allowlists, sombras e conjuntos semânticos repetem parte do contrato
   de blocos. Cinco blocos novos de Jogo 2D ficaram fora da persistência; dois
   também ficaram fora da restauração de sombras.
3. Três comandos que iniciam recursos persistentes continuam classificados como
   comandos comuns. Dentro de um loop, eles reiniciam o próprio relógio a cada
   quadro. Dois comandos exclusivos de início também não chegaram à validação da
   IR.
4. Os testes E2E de colagem avançam antes de o Blockly e a persistência refletirem
   o bloco colado. A corrida aparece como área ausente, bloco perdido ou elemento
   desmontado durante a navegação.

## Arquitetura escolhida

Cada factory terá um escopo de execução descartável. Antes de executar a factory
novamente, o envelope gerado encerra o escopo anterior e cria o próximo. Assim, a
factory — e não cada motor — possui os recursos genéricos que criou.

O escopo oferece:

- um `AbortSignal` para listeners DOM;
- registro LIFO de funções de descarte;
- cancelamento dos RAFs genéricos ainda ativos;
- descarte idempotente;
- encerramento no fim do documento do preview.

Os motores continuam responsáveis pelos próprios recursos. Jogo 2D e Jogo 2D
Avançado continuam chamando a factory no restart; o envelope compartilhado passa
a limpar os recursos genéricos antes de reconstruí-los. Os outros targets usam o
mesmo contrato, o que evita uma regra especial para cada extensão.

O código gerado preservará as formas JavaScript reconhecíveis —
`addEventListener`, `requestAnimationFrame` e `cancelAnimationFrame`. O parser
aceitará somente a infraestrutura exata emitida pelo gerador e a removerá ao
reconstruir as três áreas. Código escrito pela criança continuará sagrado e cairá
em `rawJS` quando não corresponder a um padrão conhecido.

## Contratos de blocos

A implementação sincronizará os contratos atuais:

- adicionar os cinco blocos novos de Jogo 2D à allowlist de persistência;
- restaurar as sombras numéricas de dano e barra de vida;
- classificar `sz_gk_start_spawner`, `sz_g3k_start_spawner` e
  `sz_g3k_start_timer` como `resource-creator`;
- mapear esses blocos para `gk:startSpawner`, `g3k:startSpawner` e
  `g3k:startTimer` no contrato persistente compartilhado;
- incluir `g2d:setHealth` e `g2d:setStageDescription` no conjunto semântico
  `start-only`;
- elevar as versões patch das extensões cujo contrato público de posicionamento
  mudou.

O Blockly impedirá a conexão física inválida, e a IR repetirá a validação para
proteger projetos vindos de código, importação ou versões antigas.

## Testes

As regressões devem falhar sem a correção e cobrir comportamento real:

- executar uma factory, reiniciar e provar que um evento dispara uma única vez;
- provar que só um RAF genérico permanece ativo após o restart;
- verificar allowlist e sombras de todos os blocos catalogados;
- rejeitar os cinco comandos restritos quando aninhados em evento ou loop, com
  dependências válidas para evitar falhas por motivo incidental;
- verificar round-trip das três áreas com a infraestrutura de lifecycle;
- esperar no E2E pela presença do bloco e pela serialização persistida, sem pausa
  arbitrária.

A conclusão exige testes focais, suíte completa, typecheck, formatação/lint e E2E
de lifecycle executados novamente.

## Documentação

O manual do Studio, os manifests, os relatórios de auditoria e as missões do
Member Shell passarão a nomear as três áreas. Documentos históricos receberão um
aviso quando descrevem o estado anterior. Afirmações sobre cleanup e scheduler só
permanecerão quando corresponderem ao código verificado.
