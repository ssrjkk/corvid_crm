import { Suspense } from "react"
import ContactDetail from "./contact-detail"

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка контакта...</div>}>
      <ContactDetailLoader params={params} />
    </Suspense>
  )
}

async function ContactDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ContactDetail contactId={id} />
}
