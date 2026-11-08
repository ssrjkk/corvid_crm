"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FilterSheet } from "@/components/filter-sheet"
import { Plus, Building2, Mail, Phone, Download } from "lucide-react"
import { toast } from "sonner"
import { usePermissions } from "@/lib/use-permissions"
import { downloadCsv } from "@/lib/csv"
import { ImportCsvButton } from "@/components/import-csv-button"

export default function CompaniesPage() {
  const { canWrite } = usePermissions()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  
  const utils = trpc.useUtils()
  const { data: companies, isLoading } = trpc.companies.getAll.useQuery()
  const createCompany = trpc.companies.create.useMutation({
    onSuccess: () => {
      utils.companies.getAll.invalidate()
      setOpen(false)
      setName("")
      setEmail("")
      setPhone("")
      setWebsite("")
      toast.success("Компания создана")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createCompany.mutate({
      name,
      email: email || undefined,
      phone: phone || undefined,
      website: website || undefined,
    })
  }

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase()
    return companies?.filter((company) => {
      if (
        query &&
        !company.name.toLowerCase().includes(query) &&
        !(company.email ?? "").toLowerCase().includes(query)
      ) {
        return false
      }
      const created = new Date(company.createdAt)
      if (dateFrom && created < new Date(dateFrom)) return false
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (created > end) return false
      }
      return true
    })
  }, [companies, search, dateFrom, dateTo])

  const activeFilterCount = [Boolean(search), Boolean(dateFrom), Boolean(dateTo)].filter(Boolean).length

  const resetFilters = () => {
    setSearch("")
    setDateFrom("")
    setDateTo("")
  }

  const exportCsv = () => {
    const rows = filteredCompanies ?? []
    downloadCsv("companies.csv", [
      ["Название", "Email", "Телефон", "Сайт", "Адрес", "Контактов", "Сделок", "Добавлена"],
      ...rows.map((company) => [
        company.name,
        company.email ?? "",
        company.phone ?? "",
        company.website ?? "",
        company.address ?? "",
        company._count?.contacts ?? 0,
        company._count?.deals ?? 0,
        new Date(company.createdAt).toISOString().slice(0, 10),
      ]),
    ])
    toast.success("CSV экспортирован")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Компании</h1>
          <p className="text-muted-foreground">Управление компаниями-клиентами</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <ImportCsvButton
            label="Импорт CSV"
            importRow={async (cells) =>
              createCompany.mutateAsync({
                name: cells[0]?.trim() || "",
                email: cells[1]?.trim() || undefined,
                phone: cells[2]?.trim() || undefined,
                website: cells[3]?.trim() || undefined,
              })
            }
            onDone={() => utils.companies.getAll.invalidate()}
          />
          <FilterSheet activeCount={activeFilterCount} onReset={resetFilters}>
            <div className="grid gap-2">
              <Label htmlFor="companies-search">Поиск</Label>
              <Input
                id="companies-search"
                placeholder="Название или email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="companies-date-from">Добавлена с</Label>
                <Input
                  id="companies-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companies-date-to">Добавлена по</Label>
                <Input
                  id="companies-date-to"
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
              Добавить компанию
            </DialogTrigger>
          )}
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Добавить компанию</DialogTitle>
                <DialogDescription>Создайте новую компанию</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Название *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">Сайт</Label>
                  <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createCompany.isPending}>
                  {createCompany.isPending ? "Создание..." : "Создать"}
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
          {filteredCompanies?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Нет компаний по выбранным фильтрам</p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies?.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <Link href={`/companies/${company.id}`} className="hover:underline">
                    {company.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {company.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {company.email}
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {company.phone}
                  </div>
                )}
                {company.website && (
                  <div className="text-sm text-primary hover:underline truncate">
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      {company.website}
                    </a>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2">Контактов: {company._count?.contacts || 0} • Сделок: {company._count?.deals || 0}</div>
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}
    </div>
  )
}
