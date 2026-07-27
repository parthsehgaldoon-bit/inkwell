import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { parseEntryId } from "@/hooks/useEntries";
import { EditorPage } from "@/pages/EditorPage";
import { EntryDetailPage } from "@/pages/EntryDetailPage";
import MyEntriesPage from "@/pages/MyEntriesPage";
import { PublicFeedPage } from "@/pages/PublicFeedPage";
import { ReviewPage } from "@/pages/ReviewPage";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

/**
 * Inkwell router.
 *
 * Routes:
 *  - /            → redirect to /feed
 *  - /my-entries  → auth-gated, author's own entries
 *  - /editor/new  → auth-gated, create a new entry
 *  - /editor/:id  → auth-gated, edit an existing entry
 *  - /review/:id  → auth-gated, style review panel for an entry
 *  - /feed        → public, shared published feed
 *  - /entry/:id   → public, single published entry
 *
 * Page bodies are minimal placeholders — page tasks will fill them in.
 */

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/feed" });
  },
  component: () => null,
});

/** Auth guard: redirects unauthenticated visitors to the public feed. */
function useRequireAuth() {
  const { isAuthenticated, isInitializing } = useAuth();
  return { isAuthenticated, isInitializing };
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useRequireAuth();
  if (isInitializing) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-ocid="auth.loading_state"
      >
        <p className="font-body text-muted-foreground">
          Connecting to Internet Identity…
        </p>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div
        className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-subtle"
        data-ocid="auth.sign_in_required"
      >
        <h2 className="font-display text-2xl text-foreground">
          Sign in required
        </h2>
        <p className="mt-2 font-body text-muted-foreground">
          Use the Sign in button in the header to create, edit, and publish
          entries.
        </p>
        <p className="mt-4 font-body text-sm text-muted-foreground">
          The{" "}
          <Link
            to="/feed"
            className="text-primary underline-offset-2 hover:underline"
          >
            public feed
          </Link>{" "}
          is open without signing in.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

const myEntriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-entries",
  component: () => (
    <AuthGate>
      <MyEntriesPage />
    </AuthGate>
  ),
});

const editorNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/new",
  component: () => (
    <AuthGate>
      <EditorPage mode="new" />
    </AuthGate>
  ),
});

const editorEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$id",
  component: () => {
    const { id } = editorEditRoute.useParams();
    return (
      <AuthGate>
        <EditorPage mode="edit" idParam={id} />
      </AuthGate>
    );
  },
});

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/review/$id",
  component: () => {
    const id = parseEntryId(reviewRoute.useParams().id);
    return (
      <AuthGate>
        {id === null ? (
          <div
            className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-subtle"
            data-ocid="review.invalid_id"
          >
            <h2 className="font-display text-2xl text-foreground">
              Invalid entry
            </h2>
            <p className="mt-2 font-body text-muted-foreground">
              The entry identifier in the link isn’t valid.
            </p>
          </div>
        ) : (
          <ReviewPage id={id} />
        )}
      </AuthGate>
    );
  },
});

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/feed",
  component: () => <PublicFeedPage />,
});

const entryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/entry/$id",
  component: () => <EntryDetailPage />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  myEntriesRoute,
  editorNewRoute,
  editorEditRoute,
  reviewRoute,
  feedRoute,
  entryRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
