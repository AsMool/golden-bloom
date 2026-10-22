import heroSvg from '../assets/art/hero.svg?raw'
import './HeroArt.css'

// The golden rectangle drawing. Inlined so it can draw itself when the page opens.
export function HeroArt() {
  return <div className="hero-art" role="img" aria-label="A golden spiral drawn inside a golden rectangle, with a flower in its centre" dangerouslySetInnerHTML={{ __html: heroSvg }} />
}
