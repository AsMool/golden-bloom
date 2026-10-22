import { useEffect, useRef } from 'react'
import { Footer, Header, TabBar } from './components/Chrome'
import { categoryBySlug } from './lib/categories'
import { startLive } from './lib/live'
import { useRoute, type Route } from './lib/router'
import { SessionProvider } from './lib/session'
import { UiProvider } from './lib/ui'
import { AboutPage } from './pages/AboutPage'
import { CategoryPage } from './pages/CategoryPage'
import { Home } from './pages/Home'
import { MePage } from './pages/MePage'
import { ModeratePage } from './pages/ModeratePage'
import { MostLovedPage } from './pages/MostLovedPage'
import { NotePage } from './pages/NotePage'
import { NotFound } from './pages/NotFound'

const SITE = 'Golden Bloom'

function titleFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return `${SITE} · A little garden of kind words`
    case 'category':
      return `${categoryBySlug(route.slug)?.name ?? 'Not found'} · ${SITE}`
    case 'loved':
      return `Most Loved Messages · ${SITE}`
    case 'note':
      return `A kind note · ${SITE}`
    case 'me':
      return `Your garden · ${SITE}`
    case 'moderate':
      return `Moderation · ${SITE}`
    case 'about':
      return `About · ${SITE}`
    default:
      return `Not found · ${SITE}`
  }
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />
    case 'category':
      return <CategoryPage slug={route.slug} />
    case 'loved':
      return <MostLovedPage />
    case 'note':
      return <NotePage id={route.id} />
    case 'me':
      return <MePage />
    case 'moderate':
      return <ModeratePage />
    case 'about':
      return <AboutPage section={route.section} />
    default:
      return <NotFound />
  }
}

function Shell() {
  const route = useRoute()
  const main = useRef<HTMLElement>(null)
  const pageKey = route.name === 'about' ? 'about' : JSON.stringify(route)
  const shownKey = useRef(pageKey)

  useEffect(() => startLive(), [])

  useEffect(() => {
    document.title = titleFor(route)
  }, [route])

  useEffect(() => {
    if (shownKey.current === pageKey) return
    shownKey.current = pageKey
    // a new page starts at the top, and screen readers land on it
    window.scrollTo({ top: 0 })
    main.current?.focus({ preventScroll: true })
  }, [pageKey])

  return (
    <>
      <a
        className="skip-link"
        href="#/"
        onClick={(e) => {
          e.preventDefault()
          main.current?.focus()
        }}
      >
        Skip to content
      </a>
      <Header route={route} />
      <main id="main" ref={main} tabIndex={-1} className="site-main">
        <Page key={pageKey} route={route} />
      </main>
      <Footer />
      <TabBar route={route} />
    </>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <UiProvider>
        <Shell />
      </UiProvider>
    </SessionProvider>
  )
}
