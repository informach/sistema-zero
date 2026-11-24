# Gravador 6 com o leitor 85

A preparação incorporou o leitor `66e3c5458`, incluindo a proteção de cenas
desconhecidas na sincronia dos desenhos e as correções compartilhadas de QA.
O ajuste posterior da fixture de materiais também entrou e foi verificado no
gravador. A incorporação de `85d16fcd9` preservou **a árvore inteira de packages**
byte a byte: acrescenta as evidências dessa mesma fixture já corrigida.

Em relação ao leitor 85, permanecem seis arquivos de pacote diferentes: a
declaração de nuvem e seu teste em Core, os testes Kids, a fixture e o teste de
autoridade local do host, e o seletor de staging do Worker preparado para fa8847….
Mapas, peças e conjuntos declaram escrita 6; o teto de leitura continua em 6.
Demais desenhos, schemas nativos, perfil e programação são preservados.

Passaram treze categorias locais, incluindo **3.191 testes do Core**, **213 do
host**, **72 de nuvem Kids**, **70 dos handlers de formatos do backend** e os
testes de armazenamento do Estúdio (47 externos com o wrapper dos 91 casos de
sincronia). Os 70 handlers usam dependências em memória: não são validação nova
de PostgreSQL real. Passaram os tipos de Core, host e Estúdio, perfil, lint e
**12 fluxos locais de navegador**, sem falha, skip ou flaky. O reforço posterior
passou nos 73 casos isolados de persistência, tipos do Estúdio e lint; as outras
fontes verificadas permaneceram iguais, conforme os recibos.

Os executáveis Worker de leitor e gravador coincidem com o qualificado:
1.979.073 bytes, SHA-256 `670c8c32d33cf541dc16b6ff81e3c5acf0978626ef6844f7fefaf316f668cf6a`,
perfil da629a58…. Os **126 arquivos da distribuição Windows** também coincidem
com o leitor Windows. A qualificação Linux e a relação entre as representações
gzip estão em `qa/leitor-linux-598-2026-11-21/`; não se igualam indiscriminadamente
os hashes de pacotes Windows e Linux.

A CI verde 44868877191 pertence ao gravador anterior e92cbdc9a. Os merges novos
exigem CI própria. A escrita 6 permanece **inativa**: primeiro é necessário
comprovar o leitor 85 em staging, o catálogo Python e a política de autoria;
depois executar a subida real, cliente antigo, CAS, edição offline e rollback.
O rollback altera as aplicações escritoras e conserva o Worker, a imagem, a
distribuição e a política comuns já qualificados. Nada foi implantado por estes ensaios.
