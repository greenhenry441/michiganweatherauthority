import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="authenticated-layout-wrapper">
      {/* Add your shared sidebar, navbar, or layout components here */}
      <main>
        {/* The Outlet component acts as a placeholder that renders the child routes */}
        <Outlet />
      </main>
    </div>
  )
}
