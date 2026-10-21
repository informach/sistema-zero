# Leitura da integração Rootb641 e composição candidata

Root integrou localmente o lote em `b641c62916fedc9b08c145fba979a7b60716a75f`. A branch Lessons permanece limpa em `b763fb6e1773a122188fe37fa044b142c9442f62`; não houve merge, escrita de source/experimentos Games ou teste novo nesta revisão.

O commitb641 altera exatamente os13caminhos QA,1111adições/23remoções. Seus blobs são idênticos aos aprovados emb763. O diff binário do commit Root contra seu parent também é idêntico ao patchR4 preservado, SHA256 `0cd632bb551f900c02e721b253effff09427c2e860d634d920fb7fd8577e4edf`.

Entre a árvore Rootb641 e a própria b763 há somente duas diferenças: `experiments/studio-python-l0/corpus/space-arena.json` e `experiments/studio-python-runtime/gameVariants.ts`, do trabalho Space1.2. A produção em packages permanece igual843048, fora do lote QA integrado.

Ambos os arquivos de experimento constam nos861pins históricos do hostr4. Por isso a composição para o candidato **Rootb641** tem14diferenças host, em vez das12do checkout próprio, e6app. Os hashes candidatos desses dois arquivos vieram dos blobs Gitb641; os hashes atuais próprios também constam, explicitamente diferentes. Não houve escrita/merge desses fontes nem declaração de equivalência do host/seal antigo. Este registro é de composição candidata, não plano executável ou atualização de autoridade.

`future-composition.json` SHA256 `49a1f0d71b8930f04114e711c3d7ba82fdeadcb41cea33462102e420b252078e` e `receipt.json` SHA256 `4cdb41d8dd35c4124bfddafd45be5e6444f2e2171a8aad3c1eff989cb66452dc` vinculam a comparação, o patch aprovado e a preservação dos artefatos anteriores.

Evidência **reportada pelo Root** nesta integração:22testes/136assertions em2arquivos (admission+fixture),Biome7arquivos,5parsersPS/0erros,diffcheck0. Não são27testes. A evidência própria27/166 em9eda, que incluiu cleanup, permanece histórica e separada; nenhum teste foi repetido ou atribuído ao Rootb641 aqui.

Integração ainda featurelocal, sem staging/push conforme informado pelo Root, aguardando CI843/deploy. Primeiro Admin→Kids real continua pendente de source reconciliation autorizada, freeze/seal novo, host/state/approval/bind e janela. Sem Start/heavy. Frente pedagógica encerrada.
