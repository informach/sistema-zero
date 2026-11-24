# Mundo editável completo — prova local de 20/11/2026

A reprodução autenticada em staging omitiu a cabana: cinco recursos em vez de
seis. O piloto autenticado vizinho conserva essa prova vermelha. A resolução
das portas foi extraída do resolvedor existente e compartilhada com o arquivo
editável. Importação reconhece o conjunto conectado completo e usa o restauro
atômico existente. Portas ocultas e de conjuntos, nomes legados, ciclos, destino
inválido e o orçamento nativo independente dos 16 mapas do jogo estão cobertos.

A regressão focada passou: 53 testes, 236 asserções. A suíte do Pinta passou
2.269 testes e pulou três que procuram Pygame no PATH. Esses três foram depois
executados com a instalação real de pygame-ce desta máquina, dentro de uma
rodada separada de 18 testes, zero pulos e 5.231 asserções. Os números não devem
ser somados como se fossem uma única execução da suíte.

Chrome instalado, desktop e toque emulado: dois ensaios passaram. O arquivo
baixado pela interface contém os seis recursos e duas cenas nativas 7; conserva
o SHA-256 integral depois de fechar/reabrir. Outro contexto do navegador importa
o arquivo real e reexporta ambos os mapas a partir da cabana. O teste automatizado
versionado é pinta-native-world-scenes.flow.ts; a comparação integral dos seis
documentos com a fixture oficial também está no teste unitário assetJsonWorld.

Esses dois ensaios usam o build de produção do Pinta no harness local, sem conta.
Ainda é necessário publicar o frontend de staging e repetir a exportação com
login. Não comprovam publicação de jogo, nuvem 6, aparelho adicional nem uso
infantil. Nenhuma mudança visual, no schema, no gravador de nuvem ou em produção.
