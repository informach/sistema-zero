# Artefatos de cena após integração na staging

O job Linux de contratos `135989549335`, no run `44646269807`, parou em
`generate-scene3d-runtime.ts --check` antes da suíte isolada: os artefatos
do Estúdio não acompanhavam a integração do motor de cenários.

Regenerados somente os dois arquivos de `packages/studio/src/three/`, com
Bun 1.3.11 e fontes então limpas em `823214381`. Não foram alterados os
fontes do Pinta/Molda, permissões, dependências ou o limite do gerador.

| Artefato | Caracteres | SHA-256 |
|---|---:|---|
| Clássico | 504.610 | `cdd595011b9552a874ecad63a0ffef8d772338bf210b85c2f9840a99b5081a4d` |
| Pro | 504.847 | `c09bf9ef01ba7f702cce87e87e0a3f877b67052bd4fc330f933b11c1ad67e8f9` |

Ambos conservam três imports Three compartilhados. A geração mantém o
orçamento de um milhão de caracteres e a inspeção de imports/autoria.

Verificação: o check falhou antes e passou imediatamente após a geração;
20 testes/115 asserções passaram; prévia e exportação da cena pública
passaram no Chromium, com desenho e descarte em três ciclos. O perfil de
validação hospedado continuou válido, sem necessidade de atualização.
São testes locais e três ciclos, não uma homologação de mundo extenso,
FPS sustentado ou ausência de vazamento prolongado.

Depois da geração, outra frente voltou a editar `runtime-three.ts` e
`colisoes.ts` na árvore compartilhada. O check dessa árvore em movimento
voltou a divergir. Os artefatos desta entrega correspondem aos fontes
**commitados** em `823214381`; não incorporam essas alterações ainda não
commitadas. Qualquer integração posterior do motor exige regenerar e
revalidar os dois consumidores do Estúdio novamente. A CI do commit deve
confirmar a reprodução em checkout limpo.
