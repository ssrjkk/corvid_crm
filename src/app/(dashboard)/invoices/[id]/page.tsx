import { Suspense } from "react"
import InvoiceDetail from "./invoice-detail"

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Загрузка счёта…</div>}>
      <InvoiceDetailLoader params={params} />
    </Suspense>
  )
}

async function InvoiceDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InvoiceDetail invoiceId={id} />
}
