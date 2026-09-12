'use client'

import {
  LEARNING_SCENE_DEFINITIONS,
  type LearningScene,
  simulationFrame,
} from '@sistemazero/core/learning'
import { useId, useRef } from 'react'

function Dino({ y = 0, faded = false }: { y?: number; faded?: boolean }) {
  return (
    <g transform={`translate(110 ${183 - y})`} opacity={faded ? 0.2 : 1}>
      <path
        d="M-25 0V-30H-15V-42H-4V-65H31V-38H10V-28H25V-17H14V-24H3V-9H-5V8H-17V-2Z"
        fill="#39a769"
        stroke="#196142"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M-27-13-40-27v21l14 12" fill="#39a769" stroke="#196142" strokeWidth="3" />
      <rect x="17" y="-57" width="5" height="5" rx="1" fill="#142b23" />
      <path d="M19-42h12M-16 9h9M-4-1h9" stroke="#142b23" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}
function Cactus({ x, collision = false }: { x: number; collision?: boolean }) {
  return (
    <g transform={`translate(${x} 183)`}>
      <path
        d="M-7 0v-43q7-10 14 0v43M-7-15h-10q-6 0-6-7v-11M7-23h12q5 0 5-6v-10"
        fill="none"
        stroke={collision ? '#d25939' : '#497f65'}
        strokeWidth="10"
        strokeLinecap="round"
      />
    </g>
  )
}

export function LearningSimulationScene({
  scene,
  parameters,
  progress,
  onDistanceChange,
}: {
  scene: LearningScene
  parameters: Record<string, number>
  progress: number
  onDistanceChange?: (distance: number) => void
}) {
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const frame = simulationFrame(scene, parameters, progress)
  const family = LEARNING_SCENE_DEFINITIONS[scene].family
  const world = family === 'world'
  const forest = (
    <g fill="#2d6d55">
      <path d="M55 186 110 85 165 186ZM125 186 178 103 224 186Z" />
      <path d="M98 125h17v64H98Z" />
    </g>
  )
  return (
    <div
      ref={container}
      className="relative overflow-hidden rounded-2xl border border-border bg-[#f8f0d8]"
    >
      <svg
        viewBox="0 0 480 242"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        className="block w-full"
      >
        <title id={`${id}-title`}>{LEARNING_SCENE_DEFINITIONS[scene].title}</title>
        <desc id={`${id}-description`}>{frame.caption}</desc>
        <rect width="480" height="242" fill="#f8f0d8" />
        <circle cx="404" cy="48" r="22" fill="#edbd59" />
        <path d="M0 160Q70 99 150 160T315 154T480 145v64H0" fill="#d7e3c4" />
        <path d="M0 193H480" stroke="#a1b68b" strokeWidth="3" />
        {scene === 'layers' && frame.dinoFront && forest}
        {frame.dinoVisible && <Dino y={frame.dinoY} />}
        {scene === 'layers' && !frame.dinoFront && forest}
        {scene === 'layers' && parameters.clear === 0 && (
          <>
            <g transform="translate(80 0)">
              <Dino faded />
            </g>
            <g transform="translate(160 0)">
              <Dino faded />
            </g>
          </>
        )}
        {frame.cacti.map((cactus) => (
          <Cactus key={cactus.id} x={cactus.x} collision={frame.collision} />
        ))}
        {scene === 'hitbox' && (
          <g
            fill="none"
            stroke={frame.collision ? '#bc472d' : '#4b68ab'}
            strokeWidth="2.5"
            strokeDasharray="5 4"
          >
            <rect
              x={110 - 24 * (parameters.scale ?? 1)}
              y="118"
              width={48 * (parameters.scale ?? 1)}
              height="72"
              rx="4"
            />
            <rect x={(frame.cacti[0]?.x ?? 160) - 18} y="134" width="36" height="55" rx="4" />
          </g>
        )}
        <g fontFamily="inherit" fontSize="13" fontWeight="600" fill="#243a2f">
          {world && (
            <text x="18" y="26">
              {scene === 'world'
                ? `Bastidores: ${frame.stored} Dino`
                : `Último desenho: ${frame.dinoFront ? 'Dino' : 'floresta'}`}
            </text>
          )}
          {family === 'population' && (
            <text x="18" y="26">
              No grupo: {frame.stored} cactos
            </text>
          )}
          {family === 'events' && (
            <text x="18" y="26">
              {['Início', 'Jogando', 'Fim'][frame.screen]}
              {scene === 'score' ? ` · Pontos: ${frame.points}` : ''}
            </text>
          )}
          {family === 'speed' && (
            <>
              <text x="18" y="26">
                {scene === 'acceleration' ? `Base: ${frame.base}` : 'Sorteio de um novo cacto'}
              </text>
              <text x="18" y="48">
                ← velocidade {frame.velocity.toFixed(1)}
              </text>
            </>
          )}
          {family === 'motion' && (
            <text x="18" y="26">
              {parameters.gravity === 0 ? 'Sem gravidade' : `Gravidade: ${parameters.gravity}`}
            </text>
          )}
          {scene === 'jump-sound' && (
            <text x="18" y="222">
              {frame.sound ? '♪ O som tocou' : 'O som espera'}
            </text>
          )}
          {scene === 'hitbox' && (
            <text x="18" y="222">
              {frame.collision ? 'As áreas encostaram!' : 'Ainda há espaço entre as áreas'}
            </text>
          )}
          {scene === 'controls' && (
            <text x="18" y="222">
              {frame.screen === 0 ? 'Toque ou aperte Enter para começar' : 'A partida começou!'}
            </text>
          )}
          {scene === 'restart' && (
            <text x="18" y="222">
              {frame.screen === 2
                ? 'Fim da partida'
                : progress >= 0.9
                  ? 'Uma nova chance!'
                  : 'Vamos jogar'}
            </text>
          )}
        </g>
      </svg>
      {scene === 'hitbox' && onDistanceChange && (
        <button
          type="button"
          aria-label="Mover cacto: arraste ou use as setas"
          className="absolute top-[49%] h-[31%] w-12 -translate-x-1/2 cursor-grab touch-none rounded-lg border-2 border-transparent focus-visible:border-primary focus-visible:outline-none active:cursor-grabbing"
          style={{ left: `${((frame.cacti[0]?.x ?? 160) / 480) * 100}%` }}
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId) || !container.current)
              return
            const bounds = container.current.getBoundingClientRect()
            const distance =
              Math.round((((event.clientX - bounds.left) / bounds.width) * 480 - 110) / 5) * 5
            onDistanceChange(Math.max(10, Math.min(160, distance)))
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            onDistanceChange(
              Math.max(
                10,
                Math.min(160, (parameters.distance ?? 50) + (event.key === 'ArrowLeft' ? -5 : 5)),
              ),
            )
          }}
        />
      )}
    </div>
  )
}
