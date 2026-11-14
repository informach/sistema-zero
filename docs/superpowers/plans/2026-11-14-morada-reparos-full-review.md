# Reparos do full review Morada

**Objetivo:** corrigir os seis achados aprovados em `.audits/morada-full-review-2026-11-14.md` e integrar a migração à staging local.

**Arquitetura:** preservar o documento canônico, os estilos existentes e a física nativa. Reutilizar os contratos de pausa, comandos, interativos e captura. Os pontos autorais dos móveis determinam o descanso; a chegada é conferida contra colisores reais. As opções de apoio usam o mesmo cálculo do validador.

**Restrições:** arte privada fora do git; oito troféus preservados; nenhum deploy, push, upload ou operação em banco da aplicação. A branch parte dos clipes do avatar já implementados; a integração local inclui esses ancestrais necessários.

- [x] Reproduzir os seis casos com testes de regras, física e navegador.
- [x] Compartilhar o cálculo de dimensões giradas entre validador e editor e preservar a orientação no apoio (`core/morada/house`, `morada-editor-model`, builder e testes).
- [x] Reutilizar pausa completa normalizando o painel da casa; manter a cena montada durante a foto, registrar a câmera ativa e restaurar a ilha ao sair (`sistemas/pausa`, foto, HUD, Morada).
- [x] Escolher chegada livre com consultas reais à física, aguardando os colisores; representar malhas na análise de acesso sem fechar seus vãos (`morada-colisao`, chegada e importador/catálogo se necessário).
- [x] Consumir Usar, analógico direito e recentralizar; integrar objetos, portas e moradores ao registro nativo de interativos, com separação da ilha.
- [x] Vincular descanso à instância e aos pontos do pack; usar clipes sentar/deitar e saída ao andar, levantar, construir, remover móvel ou fechar casa.
- [x] Rodar regressões, suítes afetadas, tipos, lint e build; conferir no navegador os controles, chegada, descanso e foto.

Entrega final: criar commit da migração e dos reparos, conferir o checkout isolado e fazer merge na staging local. O histórico Git é a evidência dessa etapa.
