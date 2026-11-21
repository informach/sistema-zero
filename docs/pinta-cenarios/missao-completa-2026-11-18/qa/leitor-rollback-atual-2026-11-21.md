# Leitor de rollback com as fontes atuais

Branch temporária `pinta-rollout6-leitor-atual-20261121`, baseada na integração
34b06c905 (staging 61ef mais os testes do Pinta). Não deve ser integrada à staging.

O único delta executável é `PINTA_MAP_WRITE_FORMAT_VERSION: 6 → 4`. Leitura 6,
documento nativo, runtime, distribuições, política, interface e demais melhorias
permanecem iguais. Os testes históricos correspondentes são os mesmos do leitor
85. A finalidade é comprovar B → A → B sem restaurar fontes antigas de outros
projetos. Nenhum backend ou Worker deve ser implantado a partir desta branch.

Passaram os 79 casos de formato/persistência Kids (466 asserções) e os 3.211
casos de Core mais memória de formato do host (160.281 asserções), sem falhas.
Biome dos três arquivos e `git diff --check` passaram. Isso prepara o candidato;
somente CI própria aprovada e inventário sem implantação concorrente permitem
iniciar o ensaio em staging. Ainda não se declara rollback executado.
