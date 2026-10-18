---
status: resolved
file: packages/studio/src/runtime/python/standalone.ts
line: 72
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Restauração do BFCache deixa o launcher sem controles ativos

## Review Comment

O handler de pagehide aborta lifetime incondicionalmente. Esse sinal remove os listeners de iniciar, parar, entrada e captura, e run também passa a retornar imediatamente. Quando pagehide.persisted é true, o navegador pode preservar este mesmo documento no BFCache e restaurá-lo por pageshow.persisted, sem executar novamente o módulo standalone. Não há tratamento de pageshow nem outra maneira de renovar o lifetime. A página volta com seus controles visíveis e o iframe descartado, mas Reiniciar não cria mais uma execução; é necessário recarregar a página.

Prova independente DOM em `packages/studio/.cache/review065-standalone-lifecycle.test.ts`, usando o módulo standalone real e substituindo somente as fronteiras loader/session: a primeira execução e um reinício normal criam duas sessões; pagehide({persisted:true}) descarta a segunda sessão e remove o iframe; pageshow({persisted:true}) seguido de clique no botão start mantém apenas duas sessões, quando deveria criar a terceira. `bun test ./.cache/review065-standalone-lifecycle.test.ts`, no pacote Studio: exit1, sete verificações, falha final Expected length:3 / Received length:2. O probe usa URL HTTP e permite apenas o about:blank inicial na sua instância isolada de HappyDOM, restaurando a configuração após o teste. Não modifica o setup global e não é qualificação de BFCache em navegador real.

Separar a vida do documento da geração de execução ao tratar navegação preservada, ou renovar explicitamente a montagem/listeners em pageshow.persisted. Continuar encerrando worker/frame e suprimindo respostas antigas durante pagehide; a recuperação não deve reutilizar uma sessão descartada nem acumular handlers.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e acrescentou remontagem por pageshow.persisted, preservando aborto/descarte no pagehide, com geração para erros tardios e controles desabilitados enquanto o novo payload é verificado. Revalidação independente do módulo real em `packages/studio/.cache/review065-standalone-lifecycle.test.ts`:1 pass,0 fail,30 verificações,exit0. Confirma execução/reinício antes e depois de restauração, descarte do frame/sessão anteriores, aborto de loader pendente, erro antigo sem sobrescrever o estado da montagem atual, descarte de sessão preparada tardiamente sem executá-la, supressão de console antigo e ausência de acúmulo de handlers após várias restaurações. HappyDOM não implementa persisted no construtor PageTransitionEvent; o probe define a propriedade no Event para modelar o evento da plataforma. Testes de snapshot/loader:11/61; Corecontent:3/28; Biome8 arquivos:exit0,sem alterações. Nenhuma produção modificada pelo revisor. Prova DOM/unit somente, sem qualificação de BFCache/exportação em navegador, desempenho ou integração ainda em implementação.
