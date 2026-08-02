# Plano de implementação — Jogo 2D Avançado

1. Escrever regressões falhando para os dois defeitos do ponteiro.
2. Extrair shell/entrada/acessibilidade para um fragmento e corrigir o ciclo do
   ponteiro e o cálculo pela caixa de conteúdo.
3. Implementar o bloco de descrição acessível em todo o pipeline e cobrir foco e
   semântica das telas.
4. Introduzir `runtimeContract.ts`, tipar os harnesses, gerar/validar o inventário
   e adicionar o typecheck do JavaScript injetado.
5. Extrair um harness comum para os contratos dos exemplos e migrar os testes.
6. Extrair utilitários comuns dos scripts `__gen_*` e migrar os geradores.
7. Dividir os testes monolíticos por domínio suficiente para baixar os tamanhos e
   reforçar os limites arquiteturais.
8. Atualizar versão/contadores internos e remover o tipo morto.
9. Rodar Biome, testes direcionados, suíte completa, typecheck e E2E; revisar o
   diff final por compatibilidade e alterações alheias.
