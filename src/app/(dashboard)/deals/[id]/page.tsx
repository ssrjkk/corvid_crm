import { Suspense } from "react"
import DealDetail from "./deal-detail"

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка сделки...</div>}>
      <DealDetailLoader params={params} />
    </Suspense>
  )
}

async function DealDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DealDetail dealId={id} />
}
