"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Phone, Mail, MessageSquare, Users, FileText } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { activityTypeLabels } from "@/lib/labels"
import { usePermissions } from "@/lib/use-permissions"

export default function ActivitiesPage() {
  const { canWrite } = usePermissions()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState("NOTE")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  
  const utils = trpc.useUtils()
  const { data: activities, isLoading } = trpc.activities.getAll.useQuery()
  const createActivity = trpc.activities.create.useMutation({
    onSuccess: () => {
      utils.activities.getAll.invalidate()
      setOpen(false)
      setType("NOTE")
      setTitle("")
      setContent("")
      toast.success("Активность добавлена")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createActivity.mutate({
      type: type as "NOTE" | "CALL" | "EMAIL" | "MEETING" | "MESSAGE" | "OTHER",
      title: title || undefined,
      content,
    })
  }

  const getIcon = (activityType: string) => {
    switch (activityType) {
      case "CALL":
        return <Phone className="h-4 w-4" />
      case "EMAIL":
        return <Mail className="h-4 w-4" />
      case "MEETING":
        return <Users className="h-4 w-4" />
      case "MESSAGE":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeLabel = (activityType: string) => {
    const labels: Record<string, string> = {
      NOTE: "Заметка",
      CALL: "Звонок",
      EMAIL: "Письмо",
      MEETING: "Встреча",
      MESSAGE: "Сообщение",
      OTHER: "Другое",
    }
    return labels[activityType] || activityType
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Активности</h1>
          <p className="text-muted-foreground">История взаимодействий с клиентами</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          {canWrite && (
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить активность
            </DialogTrigger>
          )}
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Добавить активность</DialogTitle>
                <DialogDescription>Запишите взаимодействие с клиентом</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Тип</Label>
                  <Select value={type} onValueChange={(v: string) => setType(v)} items={activityTypeLabels}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOTE">Заметка</SelectItem>
                      <SelectItem value="CALL">Звонок</SelectItem>
                      <SelectItem value="EMAIL">Письмо</SelectItem>
                      <SelectItem value="MEETING">Встреча</SelectItem>
                      <SelectItem value="MESSAGE">Сообщение</SelectItem>
                      <SelectItem value="OTHER">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Заголовок</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Содержание *</Label>
                  <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createActivity.isPending}>
                  {createActivity.isPending ? "Создание..." : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {activities?.map((activity) => (
            <Card key={activity.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {getIcon(activity.type)}
                    {activity.title || getTypeLabel(activity.type)}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(activity.createdAt), "dd MMM yyyy HH:mm", { locale: ru })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap">{activity.content}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {activity.deal && <span>Сделка: {activity.deal.title}</span>}
                  {activity.contact && (
                    <span>
                      Контакт: {activity.contact.firstName} {activity.contact.lastName}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
