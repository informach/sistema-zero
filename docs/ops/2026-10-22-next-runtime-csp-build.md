# Origens do Estúdio na imagem Next

Na validação autenticada de staging de 22 de outubro, a galeria abriu o Pac-Man
Python, mas o navegador recusou o iframe do Runtime por `frame-src`. O analisador
e a execução terminaram com timeout. O cabeçalho recebido permitia apenas a
própria origem, `blob:`, YouTube e Vimeo.

Os três `next.config.ts` já aceitam `STUDIO_PYTHON_FRAME_ORIGINS` e
`STUDIO_PRO_RUNTIME_URL`, validadas pelo contrato compartilhado de CSP. Porém os
Dockerfiles de Admin, Adultos e Kids não declaravam essas variáveis como `ARG`
antes de `npm run build`. A [documentação do Railway](https://docs.railway.com/builds/dockerfiles)
exige essa declaração para disponibilizar variáveis de serviço ao build Docker.
O Next serializa os headers no `routes-manifest.json`; configurar a variável
somente no processo de execução não altera esse manifesto.

A correção declara exclusivamente essas duas variáveis públicas no estágio de
build dos três aplicativos. Não acrescenta tokens, HMAC ou credenciais ao build;
preserva a validação de origens HTTPS e não acrescenta curingas à CSP. Cada imagem
deve ser construída com as origens do seu próprio ambiente. Trocar essas origens
exige uma nova imagem: reiniciar ou reutilizar a imagem anterior não corrige o
cabeçalho já compilado.

O teste `scripts/ci/next-csp-build.test.ts` confere a passagem no estágio que
realmente executa o build. Os testes existentes em
`packages/core/src/studio/runtime-csp.test.ts` importam os três Next configs e
conferem seus headers e recusas. A reprodução anterior à correção resultou em
oito testes aprovados e três falhas; após a correção, os onze testes passaram,
com 135 asserções. Isso prova o contrato local, ainda não os headers de uma
nova imagem hospedada.

Seis leituras Railway, encerradas às 00:19:27 UTC de 23 de outubro, confirmaram
que os três aplicativos já tinham ambas as variáveis com a origem exata do
Runtime de seu próprio ambiente. Uma leitura HTTP independente às 00:19:50 UTC
confirmou que os três documentos de login de staging ainda não permitiam essa
origem em `frame-src`. Portanto não foi necessário mudar os valores do Railway.

O [recibo do teste autenticado](../continuity/2026-10-22-python-reference-games-visual-evidence/hosted-staging-admin-smoke-r1.json.snapshot)
registra também o recorte JavaScript aprovado: abrir o exemplo em blocos, iniciar
pelo teclado, abrir a Ponte, parar e reabrir a cópia guardada. Isso não qualifica
todo o JavaScript, um aluno real ou o fluxo Python ainda bloqueado.

Após a implantação, conferir o `Content-Security-Policy` recebido nas páginas de
entrada, Estúdio, aula, sala e jogador público; a navegação do cliente mantém o
cabeçalho do documento inicial. Repetir a abertura Python, o analisador, a
execução e Stop. Conferir também JavaScript. Não considerar timeout resolvido
somente porque o build ou o deployment terminou com sucesso.
