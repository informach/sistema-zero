# Contrato da coleção de nomes no CI — 20/11/2026

A CI 44752366629, na fonte 3bd4af434, aprovou os demais jobs e falhou no
typecheck de Members: a coleção SymbolNames implementava ReadonlySet, que ganha
sete operações na biblioteca ESNext do backend. O Estúdio isolado usa ES2022,
por isso sua checagem anterior não identificava a incompatibilidade. A compilação
mínima somente dessa classe com ESNext reproduziu TS2420, antes da correção.

O contrato agora descreve explicitamente a coleção lexical existente. Os pontos
que consultam classes importadas exigem somente has, sua dependência real. Nenhum
alvo de compilação foi reduzido, nenhuma validação desativada, nenhum cast usado.
As mudanças em schema e canvas3dContract são exclusivamente anotações de tipos,
sob a autorização restrita de QA/CI, preservando o projeto 3D funcional.

A comparação por transpilar os quatro arquivos antes/depois produziu JavaScript
idêntico, com hashes em javascript-identico.json. A checagem completa de Members
e do Estúdio passou. A rodada local usa NODE_OPTIONS=--max-old-space-size=6144,
o mesmo orçamento do CI. A primeira tentativa sem esse ajuste abortou no limite
padrão de 4 GiB; não foi tratada como aprovação. Uma tentativa intermediária
revelou dois consumidores adicionais, também corrigidos apenas nos tipos.

Os testes de símbolos, execução, lifecycle e segurança/referências 3D, o perfil
oficial do runtime e o Biome passaram; os resultados exatos estão nos arquivos.
Isso não transforma a CI remota anterior em verde: um novo commit ainda precisa
de qualificação remota antes do rollout. Nenhuma operação em produção.
