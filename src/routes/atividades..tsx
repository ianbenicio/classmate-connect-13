import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/atividades/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/atividades/"!</div>
}
