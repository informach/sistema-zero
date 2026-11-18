# Continuação da missão, na ordem original

A entrega é um **PR draft de revisão**, com a issue 026 aberta e sem prontidão para release.

Esta lista complementa a [matriz R01–R33](cobertura.md). Não transforma um requisito
parcial em concluído. A revisão corrigiu defeitos do fluxo existente; a missão integral
ainda exige as entregas abaixo, com núcleo, interface, adaptadores e prova funcional juntos.

1. **Etapa 0 — prioridade bloqueante, dados locais e frota:** resolver a
   [issue 026](../../../.compozy/tasks/pinta-full-review-20261118/reviews-001/issue_026.md)
   antes de liberar: a aba antiga com RAM4 sobrescreve o documento 5 confirmado no
   IndexedDB e não existe recuperação local sem nuvem. Definir autoridade única do
   documento nativo com revisão/proveniência e gravação atômica do estado protegido
   e espelho; preservar a edição antiga como cópia recuperável. Cobrir quota/crash,
   lista/captura/backup, dependências, tombstone/exclusão/ressurreição e capacidades
   futuras, com migração reversível sem trocar irreversivelmente o banco. Não basta
   instalar um guard no gravador novo ou confiar em BroadcastChannel. Implementar
   e validar o fluxo completo, inclusive IndexedDB real; não acrescentar journal
   às pressas. A proteção do canônico na conta das issues 023/025 é separada desse
   bloqueio local-only. Depois, executar rollout de leitores antes de gravadores,
   rollback controlado e conflitos/recuperação com clientes reais; manter a trava
   na reserva/commit. O procedimento de frota está documentado, sem implantação.
2. **Etapa 1 — núcleo:** ampliar a autoria além de oito camadas/128×128/64 peças somente
   com medição representativa. Completar referências a animações específicas e versões de
   recursos, sem confundir um tile animado com um sprite animado.
3. **Etapa 2 — Estúdio:** transportar os recursos usados apenas por propriedades lógicas;
   homologar Usar no Estúdio, Trazer do Pinta, Jogar meu mapa e atualização da mesma
   programação no host autenticado. Colisão JS por grade continua aproximada fora das
   transformações alinhadas; colisão por formas arbitrárias requer contrato físico comum.
4. **Etapa 3 — terrenos:** o núcleo Wang e os gestos têm regressões automatizadas. Ampliar
   o ensaio interativo com diferentes folhas e regras, sem contar somente a fixture da Vila.
5. **Etapa 4 — composição:** implementar arrasto da biblioteca com prévia; pincel de
   objetos/conjuntos com densidade, afastamento e variação. Espalhar células não satisfaz
   espalhar objetos. Conservar a distinção entre instância vinculada e cópia independente.
6. **Etapa 5 — level design:** completar colisão física de formas personalizadas nos
   consumidores. Uma zona consultável, polilinha ou desenho de forma não se torna parede
   automaticamente. Preservar a separação entre dados de cenário e comportamento.
7. **Etapa 6 — experiência:** completar a auditoria de teclado/foco/cancelamento e todos os
   gestos em layouts menores; executar testes em hardware físico e com o público infantil.
   Os ensaios Chromium com toque emulado não substituem essas provas.
8. **Etapa 7 — destinos externos:** manter o subconjunto Tiled e seus relatórios explícitos;
   validar visualmente o Godot com GPU. Tiled CLI, Phaser no navegador e Pygame/Godot
   headless foram exercitados, sem comprovar qualquer versão/faixa de motores ou dispositivo.
9. **Etapa 8 — profissional:** implementar carga/salvamento incremental, perfil de memória,
   mapas expansíveis, automapping de várias camadas e projeções isométrica/hexagonal completas.
   O cache inicial de 32 MiB pode crescer; arrays/RLE e culling não são streaming.
10. **Aceitação final:** criar livremente a referência de 16+ camadas pela interface e
    executar os dez passos como um único ciclo entre Pinta, Estúdio, destinos externos e
    dispositivos. A referência importada de 18 camadas já exercita diversas partes desse
    ciclo, mas não comprova autoria ampliada, atualização autenticada ou conflito físico.

As etapas não devem ser encerradas apenas por novos campos, seletores, imagens ou testes
isolados. Preservar os formatos nativos e os limites comprovados durante a continuação.
