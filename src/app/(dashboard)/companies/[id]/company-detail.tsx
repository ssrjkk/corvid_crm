"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User as UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc/client"
import type { RouterOutputs } from "@/server/routers/_app"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ActivityTimeline } from "@/components/detail/activity-timeline"
import { formatDate, formatMoney } from "@/lib/labels"
import { usePermissions } from "@/lib/use-permissions"

type Company = NonNullable<RouterOutputs["companies"]["getById"]>

function dealStatusBadge(status: string) {
  if (status === "WON") return <Badge className="bg-green-600 text-white">Выиграна</Badge>
  if (status === "LOST") return <Badge variant="destructive">Проиграна</Badge>
  return <Badge variant="secondary">Открыта</Badge>
}

export default function CompanyDetail({ companyId }: { companyId: string }) {
  const { canWrite } = usePermissions()
  const { data: company, isLoading } = trpc.companies.getById.useQuery({ id: companyId })
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка компании...</div>
  }

  if (!company) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Компания не найдена</p>
        <Button nativeButton={false} render={<Link href="/companies" />}>Вернуться к компаниям</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button nativeButton={false} variant="ghost" size="icon" render={<Link href="/companies" aria-label="Назад" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-muted-foreground">Карточка компании</p>
        </div>
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          {canWrite && (
            <SheetTrigger render={<Button variant="outline" />}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </SheetTrigger>
          )}
          <SheetContent>
            {editOpen && (
              <CompanyEditForm company={company} onDone={() => setEditOpen(false)} />
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Сделки компании ({company.deals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {company.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">У компании пока нет сделок</p>
              ) : (
                <div className="space-y-2">
                  {company.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:bg-accent"
                    >
                      <div>
                        <div className="font-medium">{deal.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {deal.stage?.name ?? "Без этапа"}
                          {deal.contact && ` · ${deal.contact.firstName} ${deal.contact.lastName ?? ""}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatMoney(deal.value, deal.currency)}</span>
                        {dealStatusBadge(deal.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Контакты компании ({company.contacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {company.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">У компании пока нет контактов</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {company.contacts.map((contact) => (
                    <Link
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent"
                    >
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {contact.firstName} {contact.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contact.position || contact.email || "Контакт"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>История активностей</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={company.activities} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Реквизиты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:underline">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {company.email}
                </a>
              )}
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center gap-2 hover:underline">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {company.phone}
                </a>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {company.website}
                </a>
              )}
              {company.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {company.address}
                </div>
              )}
              {!company.email && !company.phone && !company.website && !company.address && (
                <div className="text-muted-foreground">Реквизиты не заполнены</div>
              )}
            </CardContent>
          </Card>

          {company.description && (
            <Card>
              <CardHeader>
                <CardTitle>Описание</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{company.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Детали</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Добавлена: {formatDate(company.createdAt)}
              </div>
              <div className="text-muted-foreground">Обновлена: {formatDate(company.updatedAt)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function CompanyEditForm({ company, onDone }: { company: Company; onDone: () => void }) {
  const utils = trpc.useUtils()
  const [name, setName] = useState(company.name)
  const [email, setEmail] = useState(company.email ?? "")
  const [phone, setPhone] = useState(company.phone ?? "")
  const [website, setWebsite] = useState(company.website ?? "")
  const [address, setAddress] = useState(company.address ?? "")
  const [description, setDescription] = useState(company.description ?? "")

  const update = trpc.companies.update.useMutation({
    onSuccess: () => {
      utils.companies.getById.invalidate({ id: company.id })
      utils.companies.getAll.invalidate()
      toast.success("Компания обновлена")
      onDone()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        update.mutate({
          id: company.id,
          name,
          email: email || "",
          phone,
          website,
          address,
          description,
        })
      }}
    >
      <SheetHeader>
        <SheetTitle>Редактирование компании</SheetTitle>
        <SheetDescription>Обновите реквизиты и описание компании</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-4 overflow-y-auto px-4">
        <div className="grid gap-2">
          <Label htmlFor="company-name">Название *</Label>
          <Input id="company-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-email">Email</Label>
          <Input
            id="company-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-phone">Телефон</Label>
          <Input
            id="company-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-website">Сайт</Label>
          <Input
            id="company-website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-address">Адрес</Label>
          <Input
            id="company-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-description">Описание</Label>
          <Textarea
            id="company-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </div>
      </div>
      <SheetFooter>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Сохранение..." : "Сохранить"}
        </Button>
      </SheetFooter>
    </form>
  )
}
