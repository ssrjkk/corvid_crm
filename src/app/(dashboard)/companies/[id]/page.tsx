import { Suspense } from "react"
import CompanyDetail from "./company-detail"

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка компании...</div>}>
      <CompanyDetailLoader params={params} />
    </Suspense>
  )
}

async function CompanyDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CompanyDetail companyId={id} />
}
