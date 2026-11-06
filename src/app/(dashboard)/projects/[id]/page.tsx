import { Suspense } from "react"
import ProjectDetail from "./project-detail"

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка проекта...</div>}>
      <ProjectDetailLoader params={params} />
    </Suspense>
  )
}

async function ProjectDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectDetail projectId={id} />
}
