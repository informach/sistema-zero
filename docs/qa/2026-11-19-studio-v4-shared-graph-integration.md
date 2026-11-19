# Laboratório v4: integração dos contratos 3D e codec compartilhado

Merge da missão `e46f579f03efc8605fae3ae17b073f32321ddb36` sobre `d8b3fdd4b`. Inclui o snapshot remoto deb6a3e36 e suas correções de identidade do preparo 3D. A escrita padrão permanece v3.

Os codecs de grafo locais foram substituídos por fachadas dos módulos Core; não há duas implementações. Foram preservados a separação de leitura rara, transporte físico v4, validação/versionamento de ancestrais, migrações v1/v2 e v3, replay, reconhecimento imutável e adaptação de bases sem journal. Os formatos e as cotas permanecem os mesmos.

Verificação local final:

- 620 testes / 3.210 asserções, 87 arquivos, zero falhas, 59,99 s. Execução iniciada após a instalação congelada terminar; inclui recuperação nativa em Chromium/WebKit, modelos profundos, contratos/importação 3D e Raylib.
- O primeiro ensaio encontrou dependência nova do workspace ainda não vinculada. A instalação congelada foi conferida e a qualificação repetida; o resultado inicial não foi tratado como falha do produto nem como aprovação.
- Typecheck completo final aprovado. A primeira checagem encontrou import duplicado introduzido pelo merge automático num teste; foi removido, sem alterar comportamento.
- Biome dos 56 arquivos alterados do Estúdio aprovado; whitespace aprovado.
- Bundle inicial: 367.122 bytes brutos / 119.820 gzip, 45 asserções aprovadas. Tetos originais mantidos; transporte e leitura rara fora do carregamento inicial.

Próximo avanço: ligar a preparação v3→v4 à abertura e à listagem, isolando pendências por projeto; preparar transporte antes de edição/saída fria; ativar apenas no laboratório e homologar novamente. A prova de persistência de 10.000 registros não é renderização visual de 10.000 blocos. R1/R2 e as etapas profissionais seguem abertas.
