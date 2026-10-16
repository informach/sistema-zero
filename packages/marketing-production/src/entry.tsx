import { Composition, registerRoot, Still } from 'remotion'
import { ArtCompositionView } from './art-composition'
import { type ArtProps, artPropsSchema, defaultArt } from './art-props'
import { defaultStory, type StoryProps, storySchema } from './story'
import { StoryComposition } from './story-composition'
import { TimelineComposition } from './video/composition'
import { defaultTimeline, type TimelineProps, timelinePropsSchema } from './video/props'

function Root() {
  return (
    <>
      <Composition
        id="MarketingTimeline"
        component={TimelineComposition}
        defaultProps={defaultTimeline}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={150}
        calculateMetadata={({ props }: { props: TimelineProps }) => {
          const value = timelinePropsSchema.parse(props),
            { timeline } = value
          return {
            props: value,
            width: timeline.width,
            height: timeline.height,
            fps: timeline.fps.numerator / timeline.fps.denominator,
            durationInFrames: timeline.durationInFrames,
          }
        }}
      />
      <Still
        id="MarketingArt"
        component={ArtCompositionView}
        width={defaultArt.composition.width}
        height={defaultArt.composition.height}
        defaultProps={defaultArt}
        calculateMetadata={({ props }: { props: ArtProps }) => {
          const value = artPropsSchema.parse(props)
          return { props: value, width: value.composition.width, height: value.composition.height }
        }}
      />
      <Composition
        id="MarketingStory"
        component={StoryComposition}
        width={defaultStory.width}
        height={defaultStory.height}
        fps={defaultStory.fps}
        durationInFrames={defaultStory.durationInFrames}
        defaultProps={defaultStory}
        calculateMetadata={({ props }: { props: StoryProps }) => {
          const value = storySchema.parse(props)
          return {
            props: value,
            width: value.width,
            height: value.height,
            fps: value.fps,
            durationInFrames: value.durationInFrames,
          }
        }}
      />
    </>
  )
}
registerRoot(Root)
