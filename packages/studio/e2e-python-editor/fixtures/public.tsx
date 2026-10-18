import { createRoot } from 'react-dom/client'
import { PublicPlayer } from '../../../community-kids/src/components/kids/public-player'
import './styles.css'

const playId = new URLSearchParams(location.search).get('playId')
if (!playId) throw new Error('A published playId is required')
createRoot(document.getElementById('root')!).render(<PublicPlayer id={playId} />)
