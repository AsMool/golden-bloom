import { useEffect, useState } from 'react'
import logoMark from '../assets/art/logo-mark.svg'
import { href, type Route } from '../lib/router'
import { useSession } from '../lib/session'
import { useUi } from '../lib/ui'
import { Icon } from './Icon'
import './Chrome.css'

export function Brand() {
  return (
    <a className="brand" href={href.home} aria-label="Golden Bloom, home">
      <img src={logoMark} alt="" width="38" height="33" />
      <span className="brand__name">
        Golden <em>Bloom</em>
      </span>
    </a>
  )
}

export function Avatar({ name, size = 38, moderator = false }: { name: string; size?: number; moderator?: boolean }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.46 }} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
      {moderator && (
        <span className="avatar__badge">
          <Icon name="shield" size={12} />
        </span>
      )}
    </span>
  )
}

const isActive = (route: Route, name: Route['name']) => route.name === name || (name === 'home' && route.name === 'category')

export function Header({ route }: { route: Route }) {
  const { member } = useSession()
  const { write, withMember } = useUi()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}>
      <div className="container site-header__row">
        <Brand />
        <nav className="site-nav" aria-label="Main">
          <a href={href.home} aria-current={isActive(route, 'home') ? 'page' : undefined}>
            Garden
          </a>
          <a href={href.loved} aria-current={isActive(route, 'loved') ? 'page' : undefined}>
            Most Loved
          </a>
          <a href={href.about()} aria-current={isActive(route, 'about') ? 'page' : undefined}>
            About
          </a>
        </nav>
        <div className="site-header__actions">
          <button type="button" className="btn btn--primary btn--small site-header__write" onClick={() => write()}>
            <Icon name="pen" size={17} /> Write a note
          </button>
          {member ? (
            <a className="site-header__me" href={href.me} aria-label={`Your garden, ${member.first_name}`} aria-current={route.name === 'me' ? 'page' : undefined}>
              <Avatar name={member.first_name} moderator={member.is_moderator} />
            </a>
          ) : (
            <button type="button" className="btn btn--small" onClick={() => withMember(() => undefined)}>
              Join
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export function TabBar({ route }: { route: Route }) {
  const { member } = useSession()
  const { write, withMember } = useUi()
  return (
    <nav className="tab-bar" aria-label="Main">
      <a href={href.home} aria-current={isActive(route, 'home') ? 'page' : undefined}>
        <Icon name="flower" size={23} />
        <span>Garden</span>
      </a>
      <a href={href.loved} aria-current={isActive(route, 'loved') ? 'page' : undefined}>
        <Icon name="heart" size={23} />
        <span>Loved</span>
      </a>
      <button type="button" className="tab-bar__write" onClick={() => write()} aria-label="Write a note">
        <span className="tab-bar__plus">
          <Icon name="plus" size={26} />
        </span>
      </button>
      {member ? (
        <a href={href.me} aria-current={route.name === 'me' ? 'page' : undefined}>
          <Icon name="user" size={23} />
          <span>Me</span>
        </a>
      ) : (
        <button type="button" onClick={() => withMember(() => undefined)}>
          <Icon name="user" size={23} />
          <span>Join</span>
        </button>
      )}
      <a href={href.about()} aria-current={isActive(route, 'about') ? 'page' : undefined}>
        <Icon name="info" size={23} />
        <span>About</span>
      </a>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__row">
        <div className="site-footer__brand">
          <Brand />
          <p>A little garden of kind words, grown by a class who thinks every body deserves love.</p>
        </div>
        <nav className="site-footer__links" aria-label="More">
          <a href={href.about('rules')}>Garden rules</a>
          <a href={href.about('safety')}>How we keep it kind</a>
          <a href={href.about('help')}>Need to talk to someone?</a>
          <a href={href.about('privacy')}>Privacy</a>
        </nav>
      </div>
      <p className="container site-footer__small">No ads, no tracking, no likes for sale. Just kind words.</p>
    </footer>
  )
}
