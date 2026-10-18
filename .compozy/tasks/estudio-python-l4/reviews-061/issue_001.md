---
status: resolved
file: packages/studio/src/components/tutor/ZappyPanel.tsx
line: 261
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Histórico do perfil anterior persiste sem runtime Python

## Review Comment

O efeito de histórico retornava quando o novo documento Python ainda não tinha `requestPythonAssistance`, antes de limpar `messages` e o cursor da conversa anterior. O reset por projeto/abertura/config também não limpava as mensagens. Portanto trocar o perfil/projeto/config para Python enquanto o runtime contextual estava indisponível deixava a conversa já carregada do perfil anterior visível na nova identidade. Não ocorre uma consulta indevida ao servidor: são dados antigos retidos no estado React.

Prova independente DOM `packages/studio/.cache/review061-history-scope.test.tsx`: carrega uma conversa legítima de perfilA/projeto JavaScript; troca namespace paraB, instala um documento PythonClassic válido e novo config, com runtimeEnvironment=null. A rota de histórico não é chamada novamente, mas `PRIVATE PROFILE A CONVERSATION` permanece visível sob o projetoB. Prova original:1 pass,0 fail,3 verificações,exit0, afirmando o defeito. Não depende da persistência de linguagem do histórico, ainda fora deste recorte.

Limpar conversa/cursor/erro antes dos guards de disponibilidade em toda abertura ou troca de identidade/contexto; manter a pergunta bloqueada enquanto falta a autorização Python. Quando a autoridade chegar, carregar o histórico pelo transporte contextual, sem fallback ao GET JavaScript.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e moveu a limpeza antes do guard; sem assistência Python, marca loading até a autoridade estar pronta. Prova independente adaptada confirma ausência da conversaA, Perguntar desabilitado e nenhuma consulta fallback. `bun test ./.cache/review061-history-scope.test.tsx ./src/components/tutor/ZappyPanel.test.tsx ./src/components/tutor/ZappyPanelBoundary.test.tsx` em Studio:35 pass,0 fail,90 verificações,exit0. Fortalecimento independente adicional A→PythonBsemruntime→A conserva apenas o histórico atual e recusa a resposta tardia da primeira abertura:cache2 pass,0 fail,8 verificações,exit0. Nenhuma produção modificada pelo revisor ou browser/build/TSC.
