# Correções dos seis achados do full review

Os seis casos de `.audits/morada-full-review-2026-11-14.md` foram corrigidos preservando as peles Kids/adulta e a interface original do jogo.

1. **Chegada:** a cápsula real consulta o Rapier depois de os modelos e colisores estarem prontos. A busca cobre o lote inteiro e inclui malhas, caixas e moradores, excluindo o próprio corpo. Sem ponto livre, mantém acesso ao editor e mostra orientação, sem derrubar a casa. O importador acrescenta ocupação de navegação às nove peças que dependem exclusivamente de malhas; os vãos continuam livres, e a física mantém a malha original.
2. **Comandos:** a casa tem registro próprio de interativos, independente da ilha suspensa. E/Usar aciona peças, portas e moradores; altura separa os andares. O analógico direito e recentralizar controlam OrbitControls com as preferências de rapidez e inversão existentes.
3. **Descanso:** a instância escolhida fica vinculada ao descanso. Pontos elevados do pack ou superfícies dos colisores autorais determinam assento/colchão; a medida do clipe do avatar determina a altura do desenho. A cápsula fica em um ponto livre ao lado. O motor recebe `sentar`/`deitar` e usa os clipes reais. Construir, andar, pular, Usar, levantar e sair encerram o vínculo. Os botões de interação não se sobrepõem à barra inferior.
4. **Pausa:** a casa normaliza somente seu painel permanente e reutiliza todos os bloqueios comuns. O passo da física lê a loja sincronamente, cancelando deslocamento pendente quando surge conciliação; a animação também congela.
5. **Foto:** Viver permite a foto; Construir continua bloqueado. O Canvas da casa permanece montado na mesma superfície da HUD, registra seu capturador e devolve a captura à ilha ao fechar. O PNG vem da cena ativa.
6. **Apoios:** editor e validador compartilham `moradaFootprint`. A orientação que faz a peça caber é mantida ao escolher o encaixe, nas duas comunidades.

## Evidências locais

- Navegador, com o jogo real e recursos privados: E mudou a porta de 0 para −π/2; o comando de câmera mudou seu azimute; o corpo não se deslocou durante conflito; `sentar` e `deitar` receberam peso 1 no mixer. Foto da casa gerada e volta à ilha concluída sem erros de página.
- Reprodução da parede sobre a chegada: após salvar a peça real e voltar de Construir, o avatar chegou aproximadamente em `[-0.5, 0.46, 3.5]`, fora da malha. A consulta física confirmou espaço livre.
- Editor Kids real: prateleira apoiada no `slot_aberta_1` do guarda-roupa, gravada com rotação `π/2`; o validador aceita o arranjo. As duas peles usam o mesmo modelo e operação.
- Suíte compartilhada da plataforma: 2.429 testes passaram, zero falhas. Renderizadores compartilhados: 29 passaram. Members (serviço/HTTP): dez passaram. Postgres local descartável: três passaram, incluindo CAS e reembolso idempotente. Contrato visual Kids/troféus: 15 passaram.
- Jogo completo: execução de 2.032 testes aprovados, um teste de integração de tempo pulado por ausência da variável de banco e zero falhas. Esse número inclui a árvore compartilhada durante trabalho paralelo; o commit separa as alterações de avatar que não são da Morada.
- Biome: 169 arquivos conferidos sem correções. Tipos dos pacotes afetados passaram. Build independente do jogo passou. Conferência de arte: 3.106 peças e 6.693 arquivos privados íntegros.

Logs locais ficam em `.cache/morada-reparos-*`; imagens em `output/morada-qa/`. Nenhum recurso privado do pack entra no Git. Os oito troféus antigos são preservados em `art/trofeus`. Esta etapa de reparos foi local; posteriormente, a [publicação em staging e produção](../operations/2026-11-14-morada-publicacao.md) aplicou a migration, converteu as contas e publicou as artes privadas.

## Integração

A entrega inclui a migração que ainda estava sem commit e os reparos. Alterações paralelas de avatar/viagem rápida permanecem fora do índice, inclusive nos arquivos com trechos compartilhados. O histórico Git registra o commit e o merge local em staging; a conferência de integração é feita em checkout separado.
