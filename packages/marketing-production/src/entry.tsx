import { Composition, registerRoot } from 'remotion'
import { defaultStory, type StoryProps, storySchema } from './story'
import { StoryComposition } from './story-composition'

function Root() {
  return (
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
  )
}
registerRoot(Root)
