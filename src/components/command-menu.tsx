"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  Activity,
  Building2,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Handshake,
  KanbanSquare,
  LayoutDashboard,
  ReceiptText,
  Search,
  Users,
} from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

const quickLinks = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/pipeline", label: "Воронка", icon: KanbanSquare },
  { href: "/deals", label: "Сделки", icon: Handshake },
  { href: "/invoices", label: "Счета", icon: ReceiptText },
  { href: "/contacts", label: "Контакты", icon: Users },
  { href: "/companies", label: "Компании", icon: Building2 },
  { href: "/tasks", label: "Задачи", icon: CheckSquare },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/activities", label: "Активности", icon: Activity },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
]

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const { data: deals = [] } = trpc.deals.getAll.useQuery(undefined, { enabled: open })
  const { data: contacts = [] } = trpc.contacts.getAll.useQuery(undefined, { enabled: open })
  const { data: companies = [] } = trpc.companies.getAll.useQuery(undefined, { enabled: open })
  const { data: invoices = [] } = trpc.invoices.getAll.useQuery(undefined, { enabled: open })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <Search className="h-4 w-4" />
        Поиск...
        <kbd className="ml-auto rounded border border-sidebar-border bg-sidebar-accent/60 px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Глобальный поиск</DialogTitle>
          <DialogDescription className="sr-only">
            Поиск по сделкам, контактам и компаниям
          </DialogDescription>
          <Command
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            loop
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="Сделки, контакты, компании..."
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-[360px] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </Command.Empty>

              <Command.Group heading="Навигация">
                {quickLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Command.Item
                      key={link.href}
                      value={`навигация ${link.label}`}
                      onSelect={() => go(link.href)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {link.label}
                    </Command.Item>
                  )
                })}
              </Command.Group>

              {deals.length > 0 && (
                <Command.Group heading="Сделки">
                  {deals.map((deal) => (
                    <Command.Item
                      key={deal.id}
                      value={`сделка ${deal.title} ${deal.company?.name ?? ""}`}
                      onSelect={() => go(`/deals/${deal.id}`)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                    >
                      <Handshake className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{deal.title}</span>
                      {deal.company && (
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {deal.company.name}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {contacts.length > 0 && (
                <Command.Group heading="Контакты">
                  {contacts.map((contact) => (
                    <Command.Item
                      key={contact.id}
                      value={`контакт ${contact.firstName} ${contact.lastName ?? ""} ${contact.email ?? ""}`}
                      onSelect={() => go(`/contacts/${contact.id}`)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.company && (
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {contact.company.name}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {invoices.length > 0 && (
                <Command.Group heading="Счета">
                  {invoices.map((invoice) => (
                    <Command.Item
                      key={invoice.id}
                      value={`счёт ${invoice.number} ${invoice.company?.name ?? ""}`}
                      onSelect={() => go(`/invoices/${invoice.id}`)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                    >
                      <ReceiptText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{invoice.number}</span>
                      {invoice.company && (
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {invoice.company.name}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {companies.length > 0 && (
                <Command.Group heading="Компании">
                  {companies.map((company) => (
                    <Command.Item
                      key={company.id}
                      value={`компания ${company.name} ${company.email ?? ""}`}
                      onSelect={() => go(`/companies/${company.id}`)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{company.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
