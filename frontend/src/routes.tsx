import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { PetDetailScreen } from '@/features/pets/PetDetailScreen'
import { PetFormScreen } from '@/features/pets/PetFormScreen'
import { PetListScreen } from '@/features/pets/PetListScreen'
import { AppShell } from '@/features/shell/AppShell'

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

const routeTree = rootRoute.addChildren([listeRoute, neuRoute, detailRoute, bearbeitenRoute])

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
