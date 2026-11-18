---
provider: manual
pr: https://github.com/informach/sistema-zero/pull/274
round: 1
created_at: 2026-11-18T07:58:37.799413+00:00
---

## Summary

- Total: 26
- Resolved: 25
- Unresolved: 1

As resoluções são locais nesta branch; a issue 018 foi corrigida no remoto integrado.
A [issue 026](issue_026.md) permanece aberta, com perda local-only reproduzida.
Este PR é draft de revisão, sem prontidão para release ou missão integral concluída.
O [QA](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md) registra a falha
preexistente de lint e distingue testes locais, navegador, motores e aparelhos físicos.

| Achado | Severidade | Estado |
|---|---|---|
| [Issue 001: Memória de formato desaparece quando a escrita no storage falha](issue_001.md) | high | resolved |
| [Issue 002: Propriedades tipadas de camada ainda são gravadas no formato 3](issue_002.md) | high | resolved |
| [Issue 003: Referências tipadas a recursos escapam da travessia e remapeamento](issue_003.md) | high | resolved |
| [Issue 004: Reconciliação não confere a versão atual retornada pelo download](issue_004.md) | high | resolved |
| [Issue 005: Balde de terreno confunde decoração e vazio e apaga peças](issue_005.md) | high | resolved |
| [Issue 006: Pintura Wang ignora os flags existentes dos vizinhos](issue_006.md) | high | resolved |
| [Issue 007: Recorte de conjunto perde conteúdo quando a camada tem offset](issue_007.md) | high | resolved |
| [Issue 008: Miniatura de conjunto vivo ignora mudanças de suas dependências](issue_008.md) | medium | resolved |
| [Issue 009: Inserção e colagem usam posição mundial como local](issue_009.md) | high | resolved |
| [Issue 010: Nível Começar omite recursos essenciais da missão](issue_010.md) | medium | resolved |
| [Issue 011: Referências object de camadas e peças não usam IDs Tiled](issue_011.md) | high | resolved |
| [Issue 012: Importação desloca coordenadas negativas sem relatório](issue_012.md) | high | resolved |
| [Issue 013: Expansão de conjuntos altera geometria e quebra relações](issue_013.md) | high | resolved |
| [Issue 014: Consulta de área de polilinha usa retângulo em vez do caminho](issue_014.md) | high | resolved |
| [Issue 015: Autoria de aula aceita desenho que o aluno não pode enviar](issue_015.md) | high | resolved |
| [Issue 016: Composição portátil falha após minificação e pesa no bundle inicial](issue_016.md) | high | resolved |
| [Issue 017: API Python pública não consulta objetos expandidos da cena](issue_017.md) | high | resolved |
| [Issue 018: Mídia padrão externa do Blockly impede gate limpo do Estúdio](issue_018.md) | medium | resolved |
| [Issue 019: Colisão de conjunto escalado deixa células sólidas vazias](issue_019.md) | high | resolved |
| [Issue 020: Godot não cria colisão de peças após ler índices do JSON](issue_020.md) | high | resolved |
| [Issue 021: Cor opaca muda de representação após reexportar no Tiled real](issue_021.md) | medium | resolved |
| [Issue 022: Leitor completo de formato 4 ainda arredonda novos offsets fracionários](issue_022.md) | high | resolved |
| [Issue 023: Reinício após quota permite ao cliente novo subir o cache cortado como formato atual](issue_023.md) | high | resolved |
| [Issue 024: Personagem do pacote Phaser anda, mas não aparece](issue_024.md) | high | resolved |
| [Issue 025: Floor e assinatura sem vínculo causal permitem reenviar cache antigo](issue_025.md) | high | resolved |
| [Issue 026: Aba antiga com RAM4 apaga documento5 do IndexedDB sem recuperação local](issue_026.md) | high | valid |
