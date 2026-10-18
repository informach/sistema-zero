# VERIFICATION REPORT

- Claim: issue111001 resolvida; ferramenta síncrona promovida produz o pin correto no Node24.15Linux apresentado.
- Command: leitura compile-stdlib.mjs, vendor pinado e logs l8-stdlib-promoted-linux-1/l8-stdlib-wasm-linux-spike-2; browse https://blog.pyodide.org/posts/jspi/.
- Executed: sim; comandos de leitura exit0; página oficial obtida. Log real antes: AssertionError na linha11, typeof WebAssembly.Suspending=undefined, Node24.15. Mesmo ambiente offline tinha produzido o ZIP correto pelo spike síncrono.
- Output summary: runPython síncrono não usa stack switching; vendor faz detecção opcional. Remover só guard de build é coerente; manter todos os pins e requisito interativo browser separado.
- Command: CPython3.14.2 inline read-only comparando ZIP Linux promovido/cache pinado, quatro fontes staged/atuais e sete vendors staged.
- Executed: sim; exit0. ZIPs byte-a-byte iguais,7066273bytes/SHAafc02bfca854c42376d79358e1c808da58c49801de3b0e9e8b16e01b3a4d9b1a;4fontes raw byte-equal;7vendors bytes/SHA corretos.
- Evidence fornecida: l8-stdlib-promoted-linux-2.log/session51502 exit0, receiptv2 CPython3.14.2/magic2b0e0d0a/559módulos/fontes preservadas. Implementador executou Node24.15Linux offline com inputs confiáveis/saída própria; revisor verificou os arquivos/resultados, não repetiu Docker/build.
- Output summary final: guard JSPI de build removido; demais checks mantidos e staged igual ao atual. README experiments/studio-python-runtime/README.md separa o build Node24+Bun do requisito JSPI interativo.
- Warnings: a primeira tentativa de localizar vendors staged assumiu caminho .cache incorreto; inspeção mostrou vendor/ e a verificação corrigida passou sobre todos7arquivos. Isso foi navegação do revisor, não falha do artefato. Não aprovar distribuição nova/runtime/SDK/desempenho por essa prova de montagem.
- Errors: nenhum nas verificações leves finais; montagem antes do patch falhou como documentado.
- Verdict:1issue/1resolved/0unresolved; sem edição de produção ou prova pesada pelo revisor.
