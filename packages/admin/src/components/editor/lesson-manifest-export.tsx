'use client'

import type { LessonDraftDocument } from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { downloadJson } from '@/lib/download-json'
import {
  buildLessonManifest,
  type ManifestExport,
  ManifestExportError,
} from '@/lib/lesson-manifest-export'
import type { LessonBlockContent } from '@/lib/types'

/**
 * A metade que faltava do `LessonManifestImport`: baixa o roteiro desta aula no formato que a
 * importação entende, para a mesma aula ser montada em outro ambiente (staging → produção).
 *
 * ⚠️ A lista "cadastre no destino" é o ponto da tela. O manifesto referencia mídia, Estúdio/Pinta,
 * e-book, certificado e materiais pelo n-ésimo bloco daquele tipo, e o serviço RECUSA a
 * importação inteira quando a referência não existe lá. Sem a lista, a autora só descobriria
 * isso na mensagem de erro do outro ambiente, um bloco por vez.
 */
export function LessonManifestExport({
  document,
  courseSlug,
}: {
  document: LessonDraftDocument<LessonBlockContent>
  courseSlug: string
}) {
  // ⚠️ Só monta o manifesto com o painel ABERTO. O `document` ganha identidade nova a cada tecla
  // digitada na aba Dados, e montar aqui roda o `isLearningManifest`, que REPLAYA o roteiro de
  // todas as cenas da aula (`isSceneScript` → `playsOut`). Fechado, isso era trabalho puro jogado
  // fora a cada caractere.
  const [aberto, setAberto] = useState(false)
  const resultado = useMemo<{ ok: ManifestExport } | { erro: string } | null>(() => {
    if (!aberto) return null
    try {
      return { ok: buildLessonManifest(document, courseSlug) }
    } catch (e) {
      // Só a mensagem NOSSA é mostrada: um `TypeError` de conteúdo legado torto viraria texto de
      // programador na cara da autora.
      if (e instanceof ManifestExportError) return { erro: e.message }
      console.error('[manifesto] falha ao montar o export', e)
      return {
        erro: 'Não consegui ler esta aula para exportar. Avise no chamado com o nome da aula.',
      }
    }
  }, [aberto, document, courseSlug])

  return (
    <details
      className="rounded-2xl border border-border bg-card p-5"
      onToggle={(e) => setAberto(e.currentTarget.open)}
    >
      <summary className="cursor-pointer font-semibold">Exportar roteiro com seções</summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Origem:{' '}
          <strong>
            {courseSlug} / {document.slug}
          </strong>
          . O arquivo leva a organização das seções e o conteúdo escrito aqui. No destino, abra a
          aula, use <strong>Vincular ao destino aberto</strong> e confira a importação.
        </p>
        {resultado === null ? null : 'erro' in resultado ? (
          <p role="alert" className="text-sm text-destructive">
            {resultado.erro}
          </p>
        ) : (
          <>
            <p className="text-sm">
              {contagem(resultado.ok.levados, 'bloco viaja', 'blocos viajam')} com o conteúdo ·{' '}
              {contagem(resultado.ok.videos, 'vídeo viaja', 'vídeos viajam')} só como orientação ·{' '}
              {contagem(resultado.ok.paraCadastrar.length, 'bloco vai', 'blocos vão')} como
              referência · {contagem(resultado.ok.manifest.sections.length, 'seção', 'seções')}
            </p>
            {resultado.ok.paraCadastrar.length > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <h3 className="font-semibold text-sm">
                  Cadastre estes blocos no destino antes de importar
                </h3>
                <p className="text-sm text-muted-foreground">
                  O manifesto aponta para eles pela posição entre os blocos do mesmo tipo. Faltando
                  um, a importação é recusada inteira.
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {resultado.ok.paraCadastrar.map((item) => (
                    <li key={`${item.kind}-${item.index}`}>
                      <strong>
                        {item.label} nº {item.index + 1}
                      </strong>{' '}
                      — hoje na seção “{item.secao}”
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultado.ok.avisos.map((aviso) => (
              <p key={aviso} className="text-sm text-muted-foreground">
                {aviso}
              </p>
            ))}
            <p className="text-sm text-muted-foreground">
              A voz do Zappy não viaja: o áudio fica no armazenamento deste ambiente. No destino,
              clique em “Gerar a voz do Zappy” uma vez.
            </p>
            <Button
              variant="outline"
              onClick={() => downloadJson(resultado.ok.filename, resultado.ok.manifest)}
            >
              <Download className="size-4" /> Baixar o manifesto desta aula
            </Button>
          </>
        )}
      </div>
    </details>
  )
}

/** "1 bloco viaja" × "3 blocos viajam" — a linha do resumo tem quatro contadores. */
function contagem(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`
}
