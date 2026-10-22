import logoMark from '../assets/art/logo-mark.svg'
import { href } from '../lib/router'
import './pages.css'

export function NotFound() {
  return (
    <div className="container container--narrow section">
      <div className="empty">
        <img src={logoMark} alt="" />
        <h3>This path doesn't lead anywhere</h3>
        <p>Maybe a petal blew the link away. Let's head back to the flowers.</p>
        <a className="btn btn--primary" href={href.home}>
          Back to the garden
        </a>
      </div>
    </div>
  )
}
