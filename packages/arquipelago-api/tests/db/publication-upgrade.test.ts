import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import postgres from 'postgres'

const url = process.env.TEST_DATABASE_URL

test.skipIf(!url)(
  'migra publicações já existentes sem perder projetos, revisões ou conquistas',
  async () => {
    const sql = postgres(url!, { max: 1, onnotice: () => {} })
    // Schema exclusivo no banco de testes: não altera as tabelas usadas pelas outras suítes.
    const schema = `arq_upgrade_${randomUUID().replaceAll('-', '')}`
    const folder = join(import.meta.dir, '../../src/infrastructure/persistence/drizzle/migrations')
    const files = (await readdir(folder)).filter((file) => /^000[0-6]_.*\.sql$/.test(file)).sort()
    async function apply(file: string) {
      const source = (await readFile(join(folder, file), 'utf8')).replaceAll('arquipelago', schema)
      for (const statement of source.split('--> statement-breakpoint')) {
        if (statement.trim()) await sql.unsafe(statement)
      }
    }
    const id = randomUUID(),
      actor = randomUUID()
    try {
      for (const file of files.slice(0, 4)) await apply(file)
      await sql.unsafe(
        `insert into ${schema}.desafios
      (id,slug,publico,ilha,tipo,quadro,ordem,situacao,revisao,revisao_publicada,conteudo,criado_em,atualizado_em,atualizado_por)
      values ($1,'cor-antiga','kids','bosque','quadro-das-cores',1,0,'publicado',3,2,'{"titulo":"rascunho"}',now(),now(),$2)`,
        [id, actor],
      )
      for (const revision of [1, 2]) {
        await sql.unsafe(
          `insert into ${schema}.desafio_publicacoes
        (desafio_id,revisao,conteudo,blocos_derivados,blocos_exigidos,vista,analise,publicado_em,publicado_por)
        values ($1,$2,jsonb_build_object('titulo',$3::text),'{bloco-a}','{bloco-a,bloco-b}','[]','{}',now(),$4)`,
          [id, revision, `publicado-${revision}`, actor],
        )
      }
      await sql.unsafe(
        `insert into ${schema}.desafios_concluidos
      (jogador_id,desafio_id,publico,revisao,concluido_em,moedas,moedas_situacao,moedas_extra,moedas_extra_situacao)
      values ($1,$2,'kids',1,now(),20,'creditado',0,'nenhuma')`,
        [actor, id],
      )
      for (const file of files.slice(4)) await apply(file)
      const publications = await sql.unsafe(
        `select revisao,conteudo,metadados,blocos_exigidos from ${schema}.desafio_publicacoes order by revisao`,
      )
      expect(publications.map((p) => p.conteudo)).toEqual([
        { titulo: 'publicado-1' },
        { titulo: 'publicado-2' },
      ])
      for (const publication of publications) {
        expect(publication.metadados).toEqual({
          slug: 'cor-antiga',
          publico: 'kids',
          ilha: 'bosque',
          tipo: 'quadro-das-cores',
          quadro: 1,
          ordem: 0,
        })
        expect(publication.blocos_exigidos).toEqual(['bloco-a', 'bloco-b'])
      }
      const [draft] = await sql.unsafe(
        `select revisao,revisao_publicada,conteudo,metadados_publicados from ${schema}.desafios`,
      )
      expect(draft).toMatchObject({
        revisao: 3,
        revisao_publicada: 2,
        conteudo: { titulo: 'rascunho' },
        metadados_publicados: publications[1]?.metadados,
      })
      const [completion] = await sql.unsafe(
        `select revisao,moedas,moedas_situacao from ${schema}.desafios_concluidos`,
      )
      expect({ ...completion }).toEqual({ revisao: 1, moedas: 20, moedas_situacao: 'creditado' })
      const [column] =
        await sql`select is_nullable from information_schema.columns where table_schema=${schema} and table_name='desafio_publicacoes' and column_name='metadados'`
      expect(column?.is_nullable).toBe('NO')
    } finally {
      await sql.unsafe(`drop schema if exists ${schema} cascade`)
      await sql.end()
    }
  },
)
