"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterSheet } from "@/components/filter-sheet"
import { Plus, Mail, Phone, Download } from "lucide-react"
import { toast } from "sonner"
import { downloadCsv } from "@/lib/csv"
import { ImportCsvButton } from "@/components/import-csv-button"
import { usePermissions } from "@/lib/use-permissions"

export default function ContactsPage() {
  const { canWrite } = usePermissions()
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [companyFilter, setCompanyFilter] = useState("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  
  const utils = trpc.useUtils()
  const { data: contacts, isLoading } = trpc.contacts.getAll.useQuery()
  const { data: companies = [] } = trpc.companies.getAll.useQuery()
  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.getAll.invalidate()
      setOpen(false)
      setFirstName("")
      setLastName("")
      setEmail("")
      setPhone("")
      toast.success("Контакт создан")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createContact.mutate({
      firstName,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
    })
  }

  const filteredContacts = useMemo(() => {
    return contacts?.filter((contact) => {
      if (companyFilter !== "ALL" && contact.companyId !== companyFilter) return false
      const created = new Date(contact.createdAt)
      if (dateFrom && created < new Date(dateFrom)) return false
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (created > end) return false
      }
      return true
    })
  }, [contacts, companyFilter, dateFrom, dateTo])

  const activeFilterCount = [
    companyFilter !== "ALL",
    Boolean(dateFrom),
    Boolean(dateTo),
  ].filter(Boolean).length

  const resetFilters = () => {
    setCompanyFilter("ALL")
    setDateFrom("")
    setDateTo("")
  }

  const exportCsv = () => {
    downloadCsv("contacts.csv", [
      ["Имя", "Фамилия", "Email", "Телефон", "Должность", "Компания", "Добавлен"],
      ...(filteredContacts ?? []).map((contact) => [
        contact.firstName,
        contact.lastName ?? "",
        contact.email ?? "",
        contact.phone ?? "",
        contact.position ?? "",
        contact.company?.name ?? "",
        new Date(contact.createdAt).toISOString().slice(0, 10),
      ]),
    ])
    toast.success("CSV экспортирован")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Контакты</h1>
          <p className="text-muted-foreground">База контактов</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <ImportCsvButton
            label="Импорт CSV"
            importRow={async (cells) =>
              createContact.mutateAsync({
                firstName: cells[0]?.trim() || "",
                lastName: cells[1]?.trim() || undefined,
                email: cells[2]?.trim() || undefined,
                phone: cells[3]?.trim() || undefined,
              })
            }
            onDone={() => utils.contacts.getAll.invalidate()}
          />
          <FilterSheet activeCount={activeFilterCount} onReset={resetFilters}>
            <div className="grid gap-2">
              <Label>Компания</Label>
              <Select
                value={companyFilter}
                onValueChange={(next: string) => setCompanyFilter(next)}
                items={{
                  ALL: "Все компании",
                  ...Object.fromEntries(companies.map((company) => [company.id, company.name])),
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все компании</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="contacts-date-from">Добавлен с</Label>
                <Input
                  id="contacts-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contacts-date-to">Добавлен по</Label>
                <Input
                  id="contacts-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>
            </div>
          </FilterSheet>
          <Dialog open={open} onOpenChange={setOpen}>
          {canWrite && (
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить контакт
            </DialogTrigger>
          )}
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Добавить контакт</DialogTitle>
                <DialogDescription>Создайте новый контакт</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Имя *</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createContact.isPending}>
                  {createContact.isPending ? "Создание..." : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <>
          {filteredContacts?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Нет контактов по выбранным фильтрам</p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts?.map((contact) => (
            <Card key={contact.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Link href={`/contacts/${contact.id}`} className="hover:underline">
                    {contact.firstName} {contact.lastName}
                  </Link>
                </CardTitle>
                {contact.position && (
                  <p className="text-sm text-muted-foreground">{contact.position}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {contact.phone}
                  </div>
                )}
                {contact.company && <div className="text-sm text-muted-foreground">{contact.company.name}</div>}
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}
    </div>
  )
}
