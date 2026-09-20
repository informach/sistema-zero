'use client'

import {
  actorFigure,
  type SceneAction,
  type SceneCast,
  type SceneCopyColor,
  type SceneState,
  sceneNativeCast,
} from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { FundoDoCenario } from './scene-arte'
import { Escolha } from './scene-bench'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

const PALETTE: Record<SceneCopyColor, { body: string; wings: string }> = {
  azul: { body: '#35e8ff', wings: '#2568ff' },
  rosa: { body: '#ff6ba9', wings: '#ad397a' },
  verde: { body: '#74cf77', wings: '#2f9448' },
  laranja: { body: '#ffb13b', wings: '#cf6422' },
}
const COLORS: SceneCopyColor[] = ['azul', 'rosa', 'verde', 'laranja']

function PaintedShip({
  figure,
  x,
  y,
  color,
  scale = 1,
}: {
  figure: ReturnType<typeof actorFigure>
  x: number
  y: number
  color: SceneCopyColor
  scale?: number
}) {
  return (
    <ActorFigure
      figure={figure}
      x={x}
      y={y}
      escala={scale}
      cor={PALETTE[color].body}
      corSecundaria={PALETTE[color].wings}
    />
  )
}

export function CopyVsOriginalStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('copy-vs-original', cast)
  const mundo = useSceneCenario(actors, 'copy-vs-original')
  const figure = actorFigure(actors, 'hero')
  const copies = state.copies
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="A aula, o arquivo e o Estúdio"
      descricao={`O jogo da aula continua ${copies.lessonColor}. ${copies.fileColor ? `O arquivo jogo-da-nave.szproject.json guarda a versão ${copies.fileColor}.` : 'Ainda não há arquivo.'} ${copies.studioColor ? `O projeto do Estúdio está ${copies.studioColor}.` : 'O Estúdio ainda não tem projetos.'}`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={275} detalhe="calmo" />
          <rect
            x={12}
            y={20}
            width={260}
            height={183}
            rx={12}
            className="fill-scene-card stroke-scene-line"
          />
          <rect
            x={288}
            y={20}
            width={260}
            height={183}
            rx={12}
            className="fill-scene-card stroke-scene-line"
          />
          <Texto
            x={27}
            y={47}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            A aula do Desafio
          </Texto>
          <Texto
            x={303}
            y={47}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            O Estúdio Completo
          </Texto>
          <PaintedShip figure={figure} x={140} y={145} color={copies.lessonColor} />
          <Texto
            x={27}
            y={188}
            tamanho={palco.estreito ? 16 : 13}
            className="fill-scene-ink"
          >{`nave ${copies.lessonColor}`}</Texto>
          {copies.studioColor ? (
            <>
              <PaintedShip figure={figure} x={416} y={145} color={copies.studioColor} />
              <Texto
                x={303}
                y={188}
                tamanho={palco.estreito ? 16 : 13}
                className="fill-scene-ink"
              >{`nave ${copies.studioColor}`}</Texto>
            </>
          ) : (
            <Texto x={312} y={126} tamanho={palco.estreito ? 17 : 15} className="fill-scene-ink">
              Você ainda não tem projetos
            </Texto>
          )}
          {copies.fileColor && (
            <g>
              <rect
                x={165}
                y={215}
                width={230}
                height={73}
                rx={12}
                className="fill-scene-card stroke-scene-b"
                strokeWidth={2}
              />
              <Texto
                x={180}
                y={239}
                tamanho={palco.estreito ? 16 : 14}
                className="fill-scene-ink"
                fontWeight="700"
              >
                jogo-da-nave
              </Texto>
              <Texto x={180} y={263} tamanho={palco.estreito ? 16 : 14} className="fill-scene-ink">
                .szproject.json
              </Texto>
              <Texto
                x={316}
                y={263}
                tamanho={palco.estreito ? 15 : 12}
                className="fill-scene-b-ink"
              >
                {copies.fileColor}
              </Texto>
            </g>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

export function CopyVsOriginalControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const copies = state.copies
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'export-file' })}>
          Exportar
        </SceneButton>
        <SceneButton fechado={!copies.fileColor} onClick={() => dispatch({ type: 'import-file' })}>
          Importar
        </SceneButton>
      </div>
      {!copies.fileColor && (
        <p className="text-sm text-muted-foreground">Importar abre depois que o arquivo existir.</p>
      )}
      <Escolha
        label="Cor da nave na aula"
        valor={copies.lessonColor}
        opcoes={COLORS.map((color) => ({ id: color, label: color }))}
        onChange={(color) => dispatch({ type: 'recolor', side: 'lesson', color })}
      />
      <Escolha<SceneCopyColor | 'nenhuma'>
        label="Cor da nave no Estúdio"
        valor={copies.studioColor ?? 'nenhuma'}
        opcoes={[
          { id: 'nenhuma', label: 'Sem projeto', fechado: true },
          ...COLORS.map((color) => ({
            id: color,
            label: color,
            fechado: copies.studioColor === null,
          })),
        ]}
        nota={copies.studioColor === null ? 'Abre quando o arquivo for importado.' : undefined}
        onChange={(color) => {
          if (color !== 'nenhuma') dispatch({ type: 'recolor', side: 'studio', color })
        }}
      />
    </div>
  )
}

export function PublishedCopyStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const actors = sceneNativeCast('published-copy', cast)
  const mundo = useSceneCenario(actors, 'published-copy')
  const figure = actorFigure(actors, 'hero')
  const copies = state.copies
  const shown = copies.posts.slice(-2)
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="O projeto e as publicações do Mural"
      descricao={`Seu projeto está ${copies.projectColor}. ${copies.posts.length ? `O Mural tem ${copies.posts.length} publicações; a primeira permanece ${copies.posts[0]?.color} e a última está ${copies.posts.at(-1)?.color}.` : 'Nada publicado ainda.'}`}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} chao={275} detalhe="calmo" />
          <rect
            x={12}
            y={20}
            width={250}
            height={262}
            rx={12}
            className="fill-scene-card stroke-scene-line"
          />
          <rect
            x={278}
            y={20}
            width={270}
            height={262}
            rx={12}
            className="fill-scene-card stroke-scene-line"
          />
          <Texto
            x={27}
            y={47}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            O seu projeto
          </Texto>
          <Texto
            x={293}
            y={47}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
            fontWeight="700"
          >
            A versão no Mural
          </Texto>
          <PaintedShip figure={figure} x={137} y={156} color={copies.projectColor} />
          <Texto
            x={29}
            y={244}
            tamanho={palco.estreito ? 16 : 14}
            className="fill-scene-ink"
          >{`nave ${copies.projectColor}`}</Texto>
          {shown.length === 0 ? (
            <Texto x={304} y={153} tamanho={palco.estreito ? 17 : 15} className="fill-scene-ink">
              nada publicado ainda
            </Texto>
          ) : (
            shown.map((post, index) => {
              const x = shown.length === 1 ? 310 : 290 + index * 127
              return (
                <g key={post.id}>
                  <rect
                    x={x}
                    y={70}
                    width={shown.length === 1 ? 214 : 120}
                    height={170}
                    rx={10}
                    className={
                      post.id === copies.muralOpenedId
                        ? 'fill-scene-card stroke-scene-a'
                        : 'fill-scene-card stroke-scene-line'
                    }
                    strokeWidth={2}
                  />
                  <Texto
                    x={x + 10}
                    y={96}
                    tamanho={palco.estreito ? 15 : 13}
                    className="fill-scene-ink"
                    fontWeight="700"
                  >{`Publicação ${post.id}`}</Texto>
                  <PaintedShip
                    figure={figure}
                    x={x + (shown.length === 1 ? 107 : 60)}
                    y={170}
                    color={post.color}
                    scale={0.8}
                  />
                  <Texto
                    x={x + 10}
                    y={226}
                    tamanho={palco.estreito ? 15 : 13}
                    className="fill-scene-ink"
                  >
                    {post.color}
                  </Texto>
                </g>
              )
            })
          )}
          {copies.muralOpenedId !== null && (
            <Texto
              x={294}
              y={267}
              tamanho={palco.estreito ? 14 : 12}
              className="fill-scene-ink"
            >{`Aberta: publicação ${copies.muralOpenedId}`}</Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

export function PublishedCopyControls({
  state,
  dispatch,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const copies = state.copies
  return (
    <div className="space-y-3">
      <Escolha
        label="Cor da nave no seu projeto"
        valor={copies.projectColor}
        opcoes={COLORS.filter((color) => color !== 'laranja').map((color) => ({
          id: color,
          label: color,
        }))}
        onChange={(color) => dispatch({ type: 'recolor', side: 'project', color })}
      />
      <div className="flex flex-wrap gap-2">
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'publish' })}>
          Publicar
        </SceneButton>
        <SceneButton
          fechado={copies.posts.length === 0}
          onClick={() => dispatch({ type: 'open-mural' })}
        >
          Abrir a versão do Mural
        </SceneButton>
      </div>
      {copies.posts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Abrir a versão do Mural fica disponível depois de publicar.
        </p>
      )}
      {copies.posts.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Cada publicação é um cartão novo. O anterior continua no Mural.
        </p>
      )}
    </div>
  )
}
