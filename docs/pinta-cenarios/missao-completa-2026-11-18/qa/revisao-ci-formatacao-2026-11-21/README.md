# Correção de formatação da qualificação integrada

A CI 44900380936 da integração 34b06c905 parou no Biome por quatro arquivos de
evidência incorporados da staging 61ef. A reprodução local identificou os mesmos
quatro erros. Somente os quatro JSONs listados em comparison.json foram formatados.
A comparação com `assert.deepStrictEqual` conserva todos os valores e a ordem dos
arrays. Os bytes originais foram preservados em gzip, com seus hashes.

Não foram repetidas medições de desempenho, alteradas fontes funcionais, movidos
limites ou modificados arquivos do Molda. O sucesso 44899054202 citado inicialmente
para a fonte 61ef era do diagnóstico SSH, não da CI completa 44899054214, que falhou
no mesmo lint. A CI 44887571933 da preparação 5d é realmente a CI completa aprovada.
Nenhum deployment foi solicitado pelo operador desta retomada: ele parou antes da
mutação ao detectar a publicação concorrente, posteriormente concluída em 61ef.
