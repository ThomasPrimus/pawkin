import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { BookingsScreen } from '@/features/bookings/BookingsScreen'
import { PetDetailScreen } from '@/features/pets/PetDetailScreen'
import { PetFormScreen } from '@/features/pets/PetFormScreen'
import { PetListScreen } from '@/features/pets/PetListScreen'
import { SearchScreen } from '@/features/search/SearchScreen'
import { SitterDetailScreen } from '@/features/search/SitterDetailScreen'
import { AppShell } from '@/features/shell/AppShell'
import { CareTaskScreen } from '@/features/sitter/CareTaskScreen'
import { SitterScreen } from '@/features/sitter/SitterScreen'

/**
 * Echte Routen statt Zustand im Kopf: auf dem Handy soll der Zurück-Knopf
 * tun, was er soll, und ein Tierprofil soll teilbar sein. Als PWA zählt das
 * doppelt, weil die App im Standalone-Modus keine Adresszeile hat.
 *
 * Die Routen werden im Code definiert, nicht über Dateikonvention – bei
 * einer Handvoll Screens ist das weniger Gerüst.
 */

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})

const listeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: PetListScreen,
})

const neuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tier/neu',
  component: () => <PetFormScreen petId={null} />,
})

const detailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tier/$petId',
  component: PetDetailScreen,
})

const bearbeitenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tier/$petId/bearbeiten',
  component: function Bearbeiten() {
    const { petId } = useParams({ from: '/tier/$petId/bearbeiten' })
    return <PetFormScreen petId={petId} />
  },
})

const buchungenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/buchungen',
  component: BookingsScreen,
})

const sitterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sitter',
  component: SitterScreen,
})

const betreuungRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/betreuung/$bookingId',
  component: CareTaskScreen,
})

const suchenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/suchen',
  component: SearchScreen,
})

// Achtung: liegt vor /sitter, damit /sitter nicht als sitterId gelesen wird.
const sitterDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sitter/$sitterId',
  component: SitterDetailScreen,
})

const routeTree = rootRoute.addChildren([
  suchenRoute,
  sitterDetailRoute,
  listeRoute,
  neuRoute,
  detailRoute,
  bearbeitenRoute,
  buchungenRoute,
  sitterRoute,
  betreuungRoute,
])

export const router = createRouter({
  routeTree,
  // Die App liegt während der Migration unter /app/ – ohne basepath würden
  // alle Links auf die Wurzel zeigen und die alte App treffen.
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/** Typisiertes Navigieren, damit Screens den Router nicht direkt kennen. */
export function useGehZu() {
  const navigate = useNavigate()
  return {
    liste: () => navigate({ to: '/' }),
    detail: (petId: string) => navigate({ to: '/tier/$petId', params: { petId } }),
    bearbeiten: (petId: string) => navigate({ to: '/tier/$petId/bearbeiten', params: { petId } }),
    neu: () => navigate({ to: '/tier/neu' }),
  }
}
