---
status: resolved
file: packages/pinta/src/export/godot/project.ts
line: 50
severity: high
author: codex
provider_ref:
---

# Issue 020: Godot não cria colisão de peças após ler índices do JSON

## Triage

- Decision: VALID, reproduzida no Godot 4.7.2 real.
- JSON carrega `solid` e `platform` como arrays de float. `18 in [18.0]` é falso no teste
  de membership; nenhuma forma era criada para paredes baseadas em flags de peças.
- RED: máscara de física 1, colisão habilitada, tile presente, zero polígonos;
  personagem atravessou a casa até x=104.

## Implementation

Normalização na fronteira de carga com `PackedInt32Array` para sólidos e plataformas,
em todos os mapas. O documento JSON permanece inteiro, sem aproximar física ou criar
obstáculos de demonstração.

## Verification

GREEN no projeto exportado real: índice presente, um polígono da parede, personagem para
em x=74.79642. O ensaio também valida 18 camadas, IDs de duas instâncias, referências
internas/externas, transformação afim, animação e portas nos dois sentidos.
`test-godot.gd` versionado e integrado a `check:homologacao` quando GODOT está configurado;
`--exigir-godot` recusa ausência do motor. Comandos e limites no QA.

## Fechamento da rodada

Godot 4.7.2 real: importação e execução obrigatórias, parede com polígono e personagem parando antes da casa; portas nos dois sentidos.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
