# Implementação da remediação completa do Reino Zero Ultra

Referência: `2026-08-12-reino-zero-ultra-full-remediation-design.md`

## Lote 1 — Contratos e defeitos críticos

1. Criar um harness de simulação e regressões para poços, queda, trigger vazio,
   gemas repetidas, economia, vidas, barra de chefe, plataforma vertical e
   descarte de projéteis. Confirmar que cada regressão falha no código atual.
2. Corrigir limites do mapa, colisão, validação semântica, estado por fase,
   economia, vidas, chefes, plataformas e ciclo de vida de objetos. Executar os
   testes após cada causa corrigida.
3. Criar regressões de replay e implementar uma sessão isolada, com snapshot,
   seed, checksum e bloqueio de efeitos persistentes.

Verificação: testes do Reino Zero Ultra, round-trip da IR e Biome nos arquivos
alterados.

## Lote 2 — Save e input

4. Criar regressões para save v1, save v2, backup, corrupção parcial e corrupção
   total. Implementar schema v2, migração, backup e feedback de recuperação.
5. Criar regressões para teclado, leitura única de gamepad, multitouch,
   cancelamento e perda de captura. Implementar o input semântico e teardown.
6. Corrigir anúncios `aria-live`, confirmação de exclusão, DPR, layout estreito
   e movimento reduzido. Validar por teste DOM e E2E móvel.

Verificação: testes de persistência/input/áudio, E2E dirigido e Biome.

## Lote 3 — Motor e campanha completa

7. Implementar blocos interativos, estados do jogador, natação, escadas,
   plataformas frágeis, trampolins, portais, salas bônus, chegada contextual e
   música procedural. Escrever uma regressão por família.
8. Implementar os arquétipos de inimigo, estados de casco, projéteis e oito
   guardiões distintos. Cobrir transições e dano com simulação determinística.
9. Substituir o gerador formulaico por 32 fases autorais. Adicionar validação de
   referências e rota conservadora e executar um playthrough dirigido por fase.

Verificação: testes de mecânicas, campanha, schema, geração e round-trip.

## Lote 4 — Modos e apresentação

10. Implementar 1P, 2P alternado e 2P cooperativo com estado separado, câmera
    compartilhada e recuperação do jogador atrasado. Cobrir cada modo.
11. Completar arte vetorial, HUD, feedback de recuperação, áudio por tema e
    estados de vitória/derrota. Verificar acessibilidade e movimento reduzido.
12. Atualizar documentação, instruções e descrição da galeria para refletir
    somente recursos comprovados pelos testes.

Verificação: E2E dos três modos, acessibilidade e screenshots funcionais.

## Lote 5 — Integração e desempenho

13. Dividir o catálogo core em imports dinâmicos por exemplo e criar orçamento
    para o chunk do Reino Zero Ultra.
14. Corrigir o volume zero da síntese e os erros globais registrados no review:
    catálogos gerados, presets legados, tipos de campanha 2D, tipos do Game 3D e
    contrato do parser. Não usar casts de evasão ou supressões.
15. Regenerar artefatos derivados e revisar o diff contra todos os achados.

Verificação: testes de bundle/catálogos, Biome e typecheck.

## Lote 6 — Aceite final

16. Executar testes focados e playthroughs das 32 fases.
17. Executar suíte completa, Biome, typecheck e build de produção.
18. Executar E2E do exemplo, galeria, acessibilidade, segurança e smoke.
    Registrar qualquer bloqueio externo com evidência; não declarar conclusão
    enquanto um gate pertencente ao escopo falhar.
