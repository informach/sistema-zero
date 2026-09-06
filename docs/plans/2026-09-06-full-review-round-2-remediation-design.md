# Full review — remediação dos achados da rodada 2

Data: 06/09/2026

## Escopo aprovado

Corrigir os três achados restantes do full review de hoje sem alterar o comportamento válido das ferramentas.

## Desenho

1. **Molda — corte mínimo:** o `loopCut` arredonda cada midpoint para `meshPrecision` antes de criar faces. Se o ponto arredondado colidir com uma extremidade ou outro vértice, a operação inteira retorna `null`. Depois do commit, a ferramenta confirma que todos os vértices e faces planejados sobreviveram à normalização.
2. **Molda — movimento de grupo:** `movePartsBy` projeta todas as fontes selecionadas com o mesmo delta, valida o orçamento sincronizado uma única vez e só então sincroniza os gêmeos. Se peças ou triângulos não couberem, devolve o modelo original sem movimento parcial.
3. **Ranking — paginação mutável:** a API pública deixa de aceitar offset e passa a devolver `nextCursor`. O cursor é autenticado e cifrado, vinculado ao perfil/audiência, e contém o instante do snapshot e a chave da última linha. Páginas seguintes reconstroem o XP naquele instante pelo ledger e usam keyset `(xp DESC, userId ASC)`, preservando total e ordem mesmo que alguém ganhe XP durante a navegação. O endpoint administrativo mantém offset.

## Provas

- Regressão de aresta com comprimento `1/16` não pode abrir a malha.
- Regressão com 128 peças e espelho não pode mover apenas parte do grupo.
- Regressão de duas páginas concede XP entre as requisições e ainda recebe cada participante do snapshot exatamente uma vez.
- Verificações focadas, typecheck, testes e checks dos pacotes Molda, Members, member-shell e community-kids.
