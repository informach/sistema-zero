# Integração do lote publicado 9456c3da — 20/11/2026

O remoto publicado foi integrado no commit 132343b7c. O conflito do teste da
prévia conserva tanto a observação antes da montagem quanto a nova marca por
aba. O perfil foi conferido pelo gerador oficial: 4daf3280… . Os três SDKs 3D
autorizados continuaram idênticos; nenhuma regeneração ou edição funcional 3D
foi necessária neste lote. Fontes do Pinta continuam iguais ao lote já homologado.

Grupo completo de componentes: 602 aprovados, 69 arquivos e 3.405 asserções.
Tipos completos encontraram um erro na fixture remota E7: o objeto usado como
janela de teste era passado a MessageEventInit como se fosse uma Window completa.
A fixture agora define source explicitamente no evento, como já fazia com a
contentWindow. A autenticação por identidade e todas as asserções permanecem.
Após o ajuste: 52 testes/331 asserções da prévia aprovados e tipos completos
do Estúdio com saída 0. O grupo de 602 foi executado antes desse ajuste de fixture.

A CI 44749541850 parou antes dos testes globais: o novo JSON público de QA do
Firefox não seguia o formatador. O arquivo foi formatado e a igualdade semântica
do JSON foi conferida por deepEqual. Biome completo posterior: saída 0,
16.597 arquivos. A CI Linux precisa ser repetida; estes resultados locais
não representam uma execução global verde. Core ClassicShell: dez testes e
27 asserções. Perfil e três gerados: verificadores oficiais aprovados.
