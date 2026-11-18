---
status: resolved
file: packages/pinta/src/export/phaser/player.ts
line: 14
severity: high
author: codex
provider_ref:
---

# Issue 024: Personagem do pacote Phaser anda, mas não aparece

## Triage

- Decision: VALID, encontrada pelo novo teste de pixels no Phaser 3.90.0 real.
- `setPosition`/`body.reset` zeram a coordenada de transformação `w`. O exemplo usava esse campo
  auxiliar; colisão e controles funcionavam com o corpo real, mas o retângulo tinha largura
  de desenho zero. Testes anteriores só verificavam corpo, canvas e movimento.
- RED: pixel do personagem era grama `[119,174,82,255]`; varredura do canvas não encontrou
  pixels do personagem; objeto tinha `w=0`, `width=12`.

## Implementation

O exemplo usa as dimensões públicas `width`/`height` do GameObject Phaser e não cria os
campos auxiliares `w`/`h`. O tocador já aceita as dimensões públicas para áreas e portas.
O teste real também verifica água animada, frente cobrindo o personagem, parede e portas.

## Verification

Gate Playwright final registrado no QA após regenerar o pacote; sem alterar o mapa nem
substituir o cenário por uma imagem de demonstração.

## Fechamento da rodada

Pacote Phaser 3.90.0 real em desktop e viewport móvel: pixels do personagem, água animada, frente, colisão e portas verificados pelo Playwright; controles desse exemplo são de teclado.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
