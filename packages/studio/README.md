# Estúdio do Sistema Zero

O pacote oferece o Estúdio embarcado usado pelas comunidades. As entradas públicas estão
em `package.json`; as regras de manutenção estão em [CLAUDE.md](CLAUDE.md).

## Mini estúdio da rotina dos Lumis

`@sistemazero/studio/lumi-editor` exporta `RotinaLumiEditor`, uma ferramenta carregada sob demanda
pela plataforma. Reaproveita Blockly, o renderer Zelos, as cores das categorias e o tema da
comunidade Kids. Usa as fontes Baloo 2 e Nunito carregadas pelo host, com reserva de sistema no
playground. A paleta acompanha a escolhida na comunidade.

Os blocos são próprios da rotina. Não há projeto geral do Estúdio, seleção de linguagem,
Python ou execução de JavaScript livre. A implementação é JavaScript/TypeScript e converte os
blocos para o formato compacto de `RotinaSchema` nos dois sentidos.

- Entrada: `MoldeDaRotina` versão 1, com Lumi, abertura, rotina, cartas, horta e geladeira.
- Saída: `ResultadoDaFerramentaRotina` versão 1, ou `null` ao cancelar.
- `lerCartas` relê as conquistas pelo serviço. Controles bloqueados ficam visíveis e a seção
  de cursos mostra onde aprender. Guardar exige uma leitura atual.
- A prévia usa `rotina-execucao` do contrato, o mesmo intérprete do jogo, sobre uma cópia do
  mundo recebido. Não grava nem chama o serviço para executar a rotina.
- No computador, blocos e prévia lado a lado. No celular, as abas alternam as áreas.
- Os portais do Blockly ficam no diálogo durante a edição e retornam ao host ao fechar.
  A ferramenta não deixa menus globais presos em um diálogo desmontado.

O jogo não importa esta entrada. Pede `rotina-lumi` pela porta `abrirFerramenta` e a plataforma
abre a ferramenta. O host de QA em `member-shell/tests/fixtures` fornece a mesma experiência
ao playground sem entrar no bundle publicado do jogo.

Testes de conversão: `bun test src/lumi/blocks.test.ts` neste pacote. A comparação com a execução
do jogo e as recusas ficam em `arquipelago/tests/mini-estudio-lumis.test.ts`. A conferência local
com jogo, desktop e celular está em `arquipelago/playground/verificar-mini-estudio-browser.ts`.
