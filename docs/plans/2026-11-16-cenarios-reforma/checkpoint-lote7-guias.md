# Lote 7 — Guias editoriais integradas ao palco

18/11/2026. Recorte de 7.2; **lote 7 permanece aberto**. Núcleo 7.1 já fechado; interface Jogo, gestos dos marcadores, câmeras autorais, inspeção de colisões e iluminação ainda não estão entregues.

## Implementado e revisado neste recorte

- Oito funções do marcador existente desenhadas como guias de edição: ponto, início, zona (caixa/esfera/polígono), rota, câmera, luz, régua e escala. Coordenadas locais, giro e relevo usam os contratos do núcleo.
- Um lote de linhas, buffers reutilizados, teto de 600 mil vértices e falha explícita por marcador. Sem colisores e sem alteração do documento. Liberação idempotente dos recursos CPU/GPU.
- Picking das linhas por tolerância de seis pixels e índice espacial; seleção por clique e área no palco comum. Ocultação por organização e terreno ainda carregando respeitados.
- Rotas invalidam o cache somente quando o relevo pertinente muda; pintura não refaz a amostragem.
- API `definirGuiasDoJogo`, inicialmente desligada para a interface atual. Testar oculta as guias e protege sua ativação; sair restaura a edição. Retratos excluem as guias mesmo quando estão ligadas.

As linhas são ferramentas editoriais, não arte do cenário. O desenho de luz/câmera ainda não significa luz renderizada ou edição de câmera entregue. O adaptador de alvos foi preparado e testado isoladamente; os gizmos ainda não operam sobre os marcadores na interface.

## Verificação local

- Motor: 135 testes, 3.855 asserções, zero falhas. Oficina: 101 testes, 652 asserções, zero falhas. Tipagem dos dois pacotes aprovada.
- Build da oficina aprovado; permanece o aviso de chunks maiores que 500 kB, que não constitui aprovação de desempenho.
- `verificar-marcadores-palco.mjs`: oito funções e nove marcadores; três ciclos estáveis com duas geometrias, nenhuma textura, dois desenhos (chão e guias), 228 linhas. Ocultação e documento sem mutação conferidos.
- `verificar-guias-palco-integracao.mjs`: palco real, clique e seleção retangular; retratos com/sem guias resultaram nos mesmos bytes. Entrada/saída do Testar, bloqueio da ativação durante Testar e autoria preservada; nenhum erro de console.
- Regressão `verificar-caminhos-oficina.mjs`: seis variantes, cancelamento, alças pelo mouse, histórico e workers; nenhum erro.

Evidências reproduzíveis em `output/cenarios-reforma/lote7-guias` e `lote7-guias-integracao`. Os scripts são versionados; o laboratório não comprova o acabamento artístico da Faísca nem desempenho em dispositivos físicos.

## Continuidade exclusiva de 7.2

Integrar transformações e edição de pontos pelo fluxo comum, câmera autoral, colisões reais, início principal e referência de escala; testar e revisar antes de fechar 7.2. Só depois executar 7.3 e 7.4. Lotes 8–10, revisão global, CI e implantação/validação em staging continuam pendentes.
