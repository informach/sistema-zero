# Leitura comum de células — 21/11/2026

O leitor recebe a grade e sua extensão lógica, preserva índices/bits, recorta consultas,
reutiliza o índice esparso por gesto/quadro e informa apenas o tamanho dos buffers
ocupados. O limite de armazenamento permanece 2.048 chunks/4 MiB; não há cache global
retendo histórico. O documento do editor continua denso e com schema máximo 7.
Não foram ativados schema 8, regiões no palco, protocolo físico 3 ou cena 4.

A consulta pontual existente passa pelo mesmo cálculo denso, sem construir leitor
ou índice por célula. Corrige um alias demonstrado: em uma grade 3×2, consultar
(0,5; 0,5) devolvia a peça de (2; 0). Agora coordenadas fracionárias são recusadas.
O primeiro vermelho registra a API ausente; o segundo prova o defeito observável,
com sete novos casos passando e o acesso existente falhando (recebido 9, esperado −1).
Os testes cobrem origem negativa, espelhamento, lacunas, recortes, histórico e limites.

Verificação local da fonte congelada:
- 39 testes focados em quatro arquivos no primeiro verde.
- Suíte completa do Pinta: 2.288 aprovações, três skips de Pygame nativo, zero falhas.
- Os três casos ignorados passaram separadamente com pygame-ce no Python 3.12 preparado.
- Typecheck e Biome dos quatro arquivos passaram.
- Integração no Chromium desktop: 12 aprovações, sem skip/retry/flaky, incluindo
  atualização com programa preservado, portas, referências, recusa de leitor antigo
  e rollback de importação incompleta. É um laboratório local sem login, não staging.

Não há afirmação nova de fluidez, desempenho em aparelhos físicos, suporte de autoria
esparsa completo ou nova homologação externa Tiled/Phaser/Godot. A integração dos demais
consumidores, documento, persistência e adaptadores permanece pendente no plano de regiões.
