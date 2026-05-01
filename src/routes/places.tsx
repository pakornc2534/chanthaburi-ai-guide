import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pure layout route for /places — renders <Outlet /> so child routes
// (places.index = list, places.$id = detail) can mount.
export const Route = createFileRoute("/places")({
  component: PlacesLayout,
});

function PlacesLayout() {
  return <Outlet />;
}
