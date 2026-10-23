'use client'

import * as React from 'react'
import { list, api, updateOne, createOne } from '@/lib/api-client'
import { useErp } from '@/lib/store'
import { PageHeader, StatCard } from '@/components/erp/ui'
import { DataTable, Column, FormField, FilterDef } from '@/components/erp/DataTable'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import StudentSheet from './StudentSheet'
import { initials, fmtDate, titleCase } from '@/lib/format'
import { toast } from 'sonner'
import {
  GraduationCap, Bus, Building2, RefreshCw, UserPlus2, Eye,
  Users, BookOpen, DoorOpen, Search, ArrowRight, X, ShieldAlert,
  Sparkles, CheckCircle2, School, Bell, CalendarCheck, PenTool,
  Info, ShieldCheck
} from 'lucide-react'


const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const CLUBS = ['Robotics', 'Eco Club', 'Debate', 'Music', 'Chess', 'Photography', 'Art & Craft', 'Sports', 'Coding']
const STUDENT_STATUSES = ['ACTIVE', 'ALUMNI', 'WITHDRAWN', 'TRANSFERRED', 'GRADUATED']

const columns: Column[] = [
  {
    key: 'firstName', label: 'Student', sortable: true,
    render: (row: any) => {
      const name = `${row.firstName} ${row.lastName}`
      return (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border">
            {row.photoUrl && <AvatarImage src={row.photoUrl} alt={name} />}
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate font-medium">{name}</span>
        </div>
      )
    },
  },
  { key: 'admissionNo', label: 'Admission No', sortable: true, className: 'font-mono text-xs' },
  { key: 'klass', label: 'Class', sortable: false, render: (r: any) => r.klass?.name || '—' },
  { key: 'section', label: 'Section', sortable: false, render: (r: any) => r.section?.name || '—' },
  { key: 'rollNo', label: 'Roll No', hideOnMobile: true },
  { key: 'gender', label: 'Gender', hideOnMobile: true, render: (r: any) => titleCase(r.gender) },
  { key: 'parent', label: 'Parent', sortable: false, hideOnMobile: true, render: (r: any) => r.parent?.name || '—' },
  { key: 'status', label: 'Status', badge: true },
  { key: 'dob', label: 'Date of Birth', date: true, hideOnMobile: true },
]

const fields: FormField[] = [
  { name: 'firstName', label: 'First Name', type: 'text', required: true },
  { name: 'lastName', label: 'Last Name', type: 'text', required: true },
  { name: 'gender', label: 'Gender', type: 'select', options: [{ label: 'Male', value: 'MALE' }, { label: 'Female', value: 'FEMALE' }], defaultValue: 'MALE' },
  { name: 'dob', label: 'Date of Birth', type: 'date' },
  { name: 'admissionNo', label: 'Admission No', type: 'text', placeholder: 'NIS00001', help: 'Leave blank to auto-generate' },
  { name: 'rollNo', label: 'Roll No', type: 'text', placeholder: '01' },
  {
    name: 'classId', label: 'Class', type: 'select',
    optionsLoader: async () => {
      try {
        const res = await api<{ data?: any; classes?: any[] }>('/api/lookups')
        const cls = res?.data?.classes || res?.classes || []
        if (cls.length) return cls.map((c: any) => ({ label: c.name, value: c.id }))
      } catch {}
      const res = await api<{ data: any[] }>('/api/academics/classes?all=1')
      return (res?.data || []).map((c: any) => ({ label: c.name, value: c.id }))
    },
  },
  {
    name: 'sectionId', label: 'Section', type: 'select',
    optionsLoader: async () => {
      try {
        const res = await api<{ data?: any; classes?: any[] }>('/api/lookups')
        const cls = res?.data?.classes || res?.classes || []
        if (cls.length) {
          return cls.flatMap((c: any) => (c.sections || []).map((s: any) => ({ label: `${c.name} — ${s.name}`, value: s.id, classId: c.id })))
        }
      } catch {}
      const res = await api<{ data: any[] }>('/api/academics/sections?all=1')
      return (res?.data || []).map((s: any) => ({ label: s.name, value: s.id, classId: s.classId }))
    },
  },
  {
    name: 'parentId', label: 'Parent', type: 'select',
    optionsLoader: async () => (await list('api/parents', { all: true })).data.map((p: any) => ({ label: `${p.name} (${p.phone})`, value: p.id })),
  },
  { name: 'bloodGroup', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS.map(b => ({ label: b, value: b })) },
  {
    name: 'house', label: 'House', type: 'select',
    optionsLoader: async () => (await api<{ data: any }>('/api/lookups')).data.houses.map((h: any) => ({ label: h.name, value: h.name })),
  },
  { name: 'club', label: 'Club', type: 'select', options: CLUBS.map(c => ({ label: c, value: c })) },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Address', type: 'textarea', colSpan: 2, placeholder: 'House / street, area, Mumbai' },
  { name: 'status', label: 'Status', type: 'select', options: STUDENT_STATUSES.map(s => ({ label: titleCase(s), value: s })), defaultValue: 'ACTIVE' },
]

const rowToForm = (row: any): Record<string, any> => ({
  firstName: row.firstName ?? '', lastName: row.lastName ?? '', gender: row.gender ?? 'MALE',
  dob: row.dob ? String(row.dob).slice(0, 10) : '', admissionNo: row.admissionNo ?? '', rollNo: row.rollNo ?? '',
  classId: row.classId ?? '', sectionId: row.sectionId ?? '', parentId: row.parentId ?? '',
  bloodGroup: row.bloodGroup ?? '', house: row.house ?? '', club: row.club ?? '',
  phone: row.phone ?? '', email: row.email ?? '', address: row.address ?? '', status: row.status ?? 'ACTIVE',
})

interface AssignedClass {
  id: string
  classId: string
  sectionId: string
  className: string
  sectionName: string
  displayName: string
  level: number
  room: string
  capacity: number
  studentCount: number
  isClassTeacher: boolean
  classTeacherName?: string
  subjects: Array<{ id: string; name: string; code: string }>
}

export default function StudentsModule() {
  const { setModule, moduleParams } = useErp()
  
  // Roster drill-down filter (initialized from moduleParams if provided)
  const [selectedRoster, setSelectedRoster] = React.useState<{ sectionId: string; classId: string; name: string } | null>(() => {
    if (moduleParams?.sectionId) {
      return {
        classId: moduleParams.classId || '',
        sectionId: moduleParams.sectionId,
        name: moduleParams.className || 'Selected Section',
      }
    }
    return null
  })

  // Active Tab: defaults to student directory (Students List) unless my-classes is explicitly requested
  const [activeTab, setActiveTab] = React.useState<string>(() => {
    if (moduleParams?.tab === 'my-classes') return 'my-classes'
    return 'directory'
  })

  React.useEffect(() => {
    if (moduleParams?.tab === 'my-classes') {
      setActiveTab('my-classes')
    } else if (moduleParams?.tab === 'directory' || moduleParams?.sectionId) {
      setActiveTab('directory')
    }
    if (moduleParams?.sectionId) {
      setSelectedRoster({
        classId: moduleParams.classId || '',
        sectionId: moduleParams.sectionId,
        name: moduleParams.className || 'Selected Section',
      })
    }
  }, [moduleParams])
  
  // My Classes state
  const [classesData, setClassesData] = React.useState<{ teacher: any; academicYear: string; classes: AssignedClass[] } | null>(null)
  const [classesLoading, setClassesLoading] = React.useState(true)
  const [classesError, setClassesError] = React.useState<string | null>(null)
  const [classSearch, setClassSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<'ALL' | 'CLASS_TEACHER' | 'SUBJECT_TEACHER'>('ALL')

  // Directory & Stats state
  const [stats, setStats] = React.useState<any>(null)
  const [statsLoading, setStatsLoading] = React.useState(true)
  const [lookups, setLookups] = React.useState<any>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [sheetId, setSheetId] = React.useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Class Notice Dialog State
  const [noticeOpen, setNoticeOpen] = React.useState(false)
  const [noticeTarget, setNoticeTarget] = React.useState<{ classId: string; name: string } | null>(null)
  const [noticeTitle, setNoticeTitle] = React.useState('')
  const [noticeBody, setNoticeBody] = React.useState('')
  const [noticePriority, setNoticePriority] = React.useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL')
  const [submittingNotice, setSubmittingNotice] = React.useState(false)

  const openNoticeDialog = (cls: AssignedClass) => {
    setNoticeTarget({ classId: cls.classId, name: cls.displayName })
    setNoticeTitle('')
    setNoticeBody('')
    setNoticePriority('NORMAL')
    setNoticeOpen(true)
  }

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noticeTarget?.classId || !noticeTitle.trim() || !noticeBody.trim()) {
      toast.error('Please enter a notice title and message.')
      return
    }
    setSubmittingNotice(true)
    try {
      await createOne('api/communication/announcements', {
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
        priority: noticePriority,
        audience: 'CLASS',
        targetClassId: noticeTarget.classId,
        status: 'PUBLISHED',
      })
      toast.success(`Notice broadcast successfully to ${noticeTarget.name}`)
      setNoticeOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Unable to publish class notice.')
    } finally {
      setSubmittingNotice(false)
    }
  }

  // Fetch Assigned Classes & Directory Stats on mount or refresh
  React.useEffect(() => {
    let alive = true
    api<{ data: { teacher: any; academicYear: string; classes: AssignedClass[] } }>('/api/portal/teacher/classes')
      .then(res => {
        if (alive && res?.data) {
          setClassesData(res.data)
        }
      })
      .catch(err => {
        if (alive) {
          setClassesError(err?.message || 'Unable to load assigned classes.')
        }
      })
      .finally(() => {
        if (alive) setClassesLoading(false)
      })
    return () => { alive = false }
  }, [refreshKey])

  React.useEffect(() => {
    let alive = true
    list('api/students/stats')
      .then(res => { if (alive) setStats(res.data) })
      .catch(() => { if (alive) setStats(null) })
      .finally(() => { if (alive) setStatsLoading(false) })
    return () => { alive = false }
  }, [refreshKey])

  React.useEffect(() => {
    let alive = true
    api<{ data?: any; classes?: any[] }>('/api/lookups')
      .then(res => {
        if (!alive) return
        const data = res?.data || res
        if (data?.classes?.length) {
          setLookups(data)
        } else {
          api<{ data: any[] }>('/api/academics/classes?all=1')
            .then(clsRes => { if (alive && clsRes?.data) setLookups({ classes: clsRes.data }) })
            .catch(() => {})
        }
      })
      .catch(() => {
        if (!alive) return
        api<{ data: any[] }>('/api/academics/classes?all=1')
          .then(clsRes => { if (alive && clsRes?.data) setLookups({ classes: clsRes.data }) })
          .catch(() => { if (alive) setLookups(null) })
      })
    return () => { alive = false }
  }, [])

  const refreshAll = React.useCallback(() => {
    setClassesLoading(true)
    setStatsLoading(true)
    setRefreshKey(k => k + 1)
  }, [])

  const retryClasses = React.useCallback(() => {
    setClassesLoading(true)
    setClassesError(null)
    setRefreshKey(k => k + 1)
  }, [])

  // Drill down from a Class Card into Student Directory
  const handleOpenRoster = (cls: AssignedClass) => {
    setSelectedRoster({
      classId: cls.classId,
      sectionId: cls.sectionId,
      name: cls.displayName,
    })
    setActiveTab('directory')
  }

  const clearRosterFilter = () => {
    setSelectedRoster(null)
  }

  // Filtered Assigned Classes
  const filteredClasses = React.useMemo(() => {
    if (!classesData?.classes) return []
    return classesData.classes.filter(c => {
      // Role filter
      if (roleFilter === 'CLASS_TEACHER' && !c.isClassTeacher) return false
      if (roleFilter === 'SUBJECT_TEACHER' && c.isClassTeacher) return false

      // Search filter (name, subjects)
      if (classSearch.trim()) {
        const query = classSearch.toLowerCase().trim()
        const matchesName = c.displayName.toLowerCase().includes(query)
        const matchesRoom = c.room.toLowerCase().includes(query)
        const matchesSubject = c.subjects.some(s => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query))
        return matchesName || matchesRoom || matchesSubject
      }
      return true
    })
  }, [classesData, roleFilter, classSearch])

  const totalAssignedStudents = React.useMemo(() => {
    if (!classesData?.classes) return 0
    return classesData.classes.reduce((acc, curr) => acc + (curr.studentCount || 0), 0)
  }, [classesData])

  const filters: FilterDef[] = React.useMemo(() => {
    const teacherClasses = classesData?.classes || []
    const classOpts = teacherClasses.length > 0
      ? Array.from(new Map(teacherClasses.map(c => [c.classId, { label: c.className, value: c.classId }])).values())
      : (lookups?.classes || []).map((c: any) => ({ label: c.name, value: c.id }))

    const sectionOpts = teacherClasses.length > 0
      ? teacherClasses.map(c => ({ label: c.displayName, value: c.sectionId, classId: c.classId }))
      : (lookups?.classes || []).flatMap((c: any) => (c.sections || []).map((s: any) => ({ label: `${c.name} — ${s.name}`, value: s.id, classId: c.id })))

    return [
      { key: 'classId', label: 'Classes', options: classOpts },
      { key: 'sectionId', label: 'Sections', options: sectionOpts },
      { key: 'status', label: 'Statuses', options: STUDENT_STATUSES.map(s => ({ label: titleCase(s), value: s })) },
      { key: 'gender', label: 'Genders', options: [{ label: 'Male', value: 'MALE' }, { label: 'Female', value: 'FEMALE' }] },
    ]
  }, [classesData, lookups])

  const bulkActions = React.useMemo(() => [
    {
      label: 'Move to Alumni',
      icon: <GraduationCap className="mr-1.5 h-3.5 w-3.5" />,
      onClick: async (ids: string[], _rows: any[], refresh: () => void) => {
        await Promise.all(ids.map(id => updateOne('api/students', id, { status: 'ALUMNI' })))
        toast.success(`${ids.length} student${ids.length > 1 ? 's' : ''} moved to Alumni.`)
        refresh()
        refreshAll()
      },
    },
  ], [refreshAll])

  const openSheet = React.useCallback((row: any) => {
    setSheetId(row.id)
    setSheetOpen(true)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students & Classes"
        subtitle="Manage assigned classes, view course rosters, track student performance, and update records."
        breadcrumbs={['Teacher Portal', 'Students & Classes']}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={classesLoading || statsLoading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${classesLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b pb-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="directory" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Student Directory</span>
              {selectedRoster && (
                <Badge variant="default" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-primary">
                  Filtered
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-classes" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              <span>My Classes</span>
              {classesData?.classes?.length ? (
                <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-5">
                  {classesData.classes.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            {classesData?.academicYear && (
              <Badge variant="outline" className="font-normal">
                Academic Year: {classesData.academicYear}
              </Badge>
            )}
            {classesData?.teacher?.name && (
              <span className="font-medium text-foreground">{classesData.teacher.name}</span>
            )}
          </div>
        </div>

        {/* TAB 1: MY CLASSES */}
        <TabsContent value="my-classes" className="space-y-5 pt-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-3 shadow-none border bg-card/60">
              <div className="text-xs text-muted-foreground font-medium">Assigned Classes</div>
              <div className="text-2xl font-bold text-foreground mt-0.5">{classesData?.classes?.length ?? 0}</div>
              <div className="text-[11px] text-muted-foreground">Across primary & secondary</div>
            </Card>
            <Card className="p-3 shadow-none border bg-card/60">
              <div className="text-xs text-muted-foreground font-medium">Enrolled Students</div>
              <div className="text-2xl font-bold text-foreground mt-0.5">{totalAssignedStudents}</div>
              <div className="text-[11px] text-muted-foreground">Across your assigned sections</div>
            </Card>
            <Card className="p-3 shadow-none border bg-card/60">
              <div className="text-xs text-muted-foreground font-medium">Class Teacher (Homeroom)</div>
              <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                {classesData?.classes?.filter(c => c.isClassTeacher).length ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">Direct class responsibility</div>
            </Card>
            <Card className="p-3 shadow-none border bg-card/60">
              <div className="text-xs text-muted-foreground font-medium">Subject Faculty</div>
              <div className="text-2xl font-bold text-indigo-600 mt-0.5">
                {classesData?.classes?.filter(c => !c.isClassTeacher).length ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">Course delivery assignments</div>
            </Card>
          </div>

          {/* Responsibility Guide Banner */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary shrink-0">
                <Info className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">Teacher Roles & Workflow Responsibilities</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-0.5">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Class Teacher (Homeroom)
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Assigned to a specific section. Manages morning roll-call attendance, student welfare, parent communication, and class notices.
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-medium text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> Subject Faculty
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Assigned to curriculum courses across classes. Manages lesson plans, grading assignments, and entering subject exam marks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search class, section, subject or room…"
                className="pl-8 h-9 text-sm"
                value={classSearch}
                onChange={e => setClassSearch(e.target.value)}
              />
              {classSearch && (
                <button
                  onClick={() => setClassSearch('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant={roleFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setRoleFilter('ALL')}
              >
                All ({classesData?.classes?.length || 0})
              </Button>
              <Button
                variant={roleFilter === 'CLASS_TEACHER' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setRoleFilter('CLASS_TEACHER')}
              >
                Class Teacher ({classesData?.classes?.filter(c => c.isClassTeacher).length || 0})
              </Button>
              <Button
                variant={roleFilter === 'SUBJECT_TEACHER' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setRoleFilter('SUBJECT_TEACHER')}
              >
                Subject Faculty ({classesData?.classes?.filter(c => !c.isClassTeacher).length || 0})
              </Button>
            </div>
          </div>

          {/* Classes Grid */}
          {classesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : classesError ? (
            <Card className="p-8 text-center border-dashed">
              <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Unable to load classes</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{classesError}</p>
              <Button variant="outline" size="sm" onClick={retryClasses}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </Card>
          ) : roleFilter === 'CLASS_TEACHER' && classesData?.classes?.filter(c => c.isClassTeacher).length === 0 ? (
            <Card className="p-8 text-center border-dashed bg-muted/20 max-w-2xl mx-auto my-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <School className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground text-base">No Homeroom (Class Teacher) Section Assigned</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-4 leading-relaxed">
                You are currently assigned as <strong>Subject Faculty</strong> across <strong>{classesData?.classes?.length || 0} classes</strong> ({classesData?.classes?.[0]?.subjects?.map(s => s.name).join(', ') || 'curriculum subjects'}).
                Homeroom class teacher duties (daily attendance custody and homeroom notices) are designated by administration per section.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="default" size="sm" onClick={() => setRoleFilter('ALL')}>
                  View All Assigned Classes ({classesData?.classes?.length || 0})
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('directory')}>
                  Go to Student Directory
                </Button>
              </div>
            </Card>
          ) : filteredClasses.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <School className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="font-medium text-foreground">No assigned classes found</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {classSearch || roleFilter !== 'ALL'
                  ? 'No classes match your current search filters.'
                  : 'You are currently not assigned to any homeroom sections or subjects.'}
              </p>
              {(classSearch || roleFilter !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setClassSearch('')
                    setRoleFilter('ALL')
                  }}
                >
                  Reset Filters
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map(cls => (
                <Card
                  key={cls.id}
                  className="flex flex-col justify-between transition-all hover:shadow-md border border-border/80 hover:border-primary/40"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
                          {cls.displayName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Grade {cls.level} • {cls.room}
                        </p>
                      </div>
                      {cls.isClassTeacher ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] shadow-none">
                          Class Teacher
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-medium text-[11px]">
                          Subject Faculty
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3.5 pb-4 text-xs">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-semibold text-foreground">{cls.studentCount} Students</div>
                          <div className="text-[10px] text-muted-foreground">Capacity: {cls.capacity}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-semibold text-foreground">{cls.room}</div>
                          <div className="text-[10px] text-muted-foreground">Allocated Room</div>
                        </div>
                      </div>
                    </div>

                    {/* Subjects taught */}
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>Curriculum Subjects</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cls.subjects.map(s => (
                          <Badge
                            key={s.id}
                            variant="outline"
                            className="text-[11px] bg-background/80 py-0.5 px-2 font-normal"
                          >
                            {s.name}
                            {s.code ? <span className="ml-1 text-[10px] text-muted-foreground">({s.code})</span> : null}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2.5 pb-2.5 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {cls.isClassTeacher ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            onClick={() => setModule('attendance', { classId: cls.classId, sectionId: cls.sectionId })}
                          >
                            <CalendarCheck className="h-3 w-3" />
                            <span>Attendance</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => openNoticeDialog(cls)}
                          >
                            <Bell className="h-3 w-3" />
                            <span>Notice</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            onClick={() => setModule('examinations', { tab: 'marks-entry', classId: cls.classId })}
                          >
                            <PenTool className="h-3 w-3" />
                            <span>Enter Marks</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => openNoticeDialog(cls)}
                          >
                            <Bell className="h-3 w-3" />
                            <span>Notice</span>
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-2.5 gap-1 text-[11px] font-medium"
                      onClick={() => handleOpenRoster(cls)}
                    >
                      <span>{cls.isClassTeacher ? 'Class Roster' : 'Course Roster'}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: STUDENT DIRECTORY */}
        <TabsContent value="directory" className="space-y-5 pt-4">
          {/* Active Roster Filter Banner */}
          {selectedRoster && (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-foreground">
                  Viewing roster for <strong>{selectedRoster.name}</strong>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearRosterFilter}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Show all students
              </Button>
            </div>
          )}

          {/* Stats Bar */}
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Total Active"
                value={stats?.active ?? '—'}
                icon={<GraduationCap className="h-5 w-5" />}
                tone="info"
                hint={`${stats?.total ?? 0} on record`}
              />
              <StatCard
                label="New This Term"
                value={stats?.newThisTerm ?? '—'}
                icon={<UserPlus2 className="h-5 w-5" />}
                tone="success"
                hint={`Admitted since ${stats?.termName || 'term'} start`}
              />
              <StatCard
                label="Transport Users"
                value={stats?.transportUsers ?? '—'}
                icon={<Bus className="h-5 w-5" />}
                tone="warning"
                hint="Active bus allocations"
                onClick={() => setModule('transport')}
              />
              <StatCard
                label="Hostel Boarders"
                value={stats?.boarders ?? '—'}
                icon={<Building2 className="h-5 w-5" />}
                tone="default"
                hint="Active hostel allocations"
                onClick={() => setModule('hostel')}
              />
            </div>
          )}

          {/* DataTable */}
          <DataTable
            endpoint="api/students"
            columns={columns}
            fields={fields}
            rowToForm={rowToForm}
            filters={filters}
            extraQuery={selectedRoster?.sectionId ? { sectionId: selectedRoster.sectionId } : undefined}
            defaultSort={{ sortBy: 'firstName', sortDir: 'asc' }}
            searchPlaceholder="Search student name or admission number…"
            exportEntity="students"
            createLabel="Add Student"
            refreshKey={refreshKey}
            bulkActions={bulkActions}
            onRowClick={openSheet}
            rowActions={(row) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`View profile of ${row.firstName} ${row.lastName}`}
                onClick={(e) => {
                  e.stopPropagation()
                  openSheet(row)
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            transformSave={(values, mode) => ({
              ...values,
              ...(mode === 'create' ? { admissionDate: new Date().toISOString() } : {}),
            })}
            emptyTitle={selectedRoster ? `No students enrolled in ${selectedRoster.name}` : 'No students match your filters'}
            emptyDescription={
              selectedRoster
                ? 'There are currently no active students assigned to this section.'
                : 'Try clearing the class/section filters or search with a different name or admission number.'
            }
            emptyAction={
              selectedRoster ? (
                <Button variant="outline" size="sm" onClick={clearRosterFilter}>
                  <X className="mr-2 h-4 w-4" /> Clear section filter
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={refreshAll}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Reset view
                </Button>
              )
            }
          />
        </TabsContent>
      </Tabs>

      {/* Comprehensive Student Profile Drawer */}
      <StudentSheet
        studentId={sheetId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={refreshAll}
      />

      {/* Broadcast Class Notice Dialog */}
      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Bell className="h-4 w-4 text-primary" />
              <span>Broadcast Notice to {noticeTarget?.name || 'Class'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Post an official announcement to all enrolled students and parents in this class.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendNotice} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="notice-title" className="text-xs font-medium">Notice Title</Label>
              <Input
                id="notice-title"
                placeholder="e.g. Science Lab Requirements / Homework Reminder"
                value={noticeTitle}
                onChange={e => setNoticeTitle(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-body" className="text-xs font-medium">Notice Message</Label>
              <Textarea
                id="notice-body"
                placeholder="Provide clear details, instructions, or deadlines for the class..."
                rows={4}
                value={noticeBody}
                onChange={e => setNoticeBody(e.target.value)}
                required
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-priority" className="text-xs font-medium">Priority Level</Label>
              <Select value={noticePriority} onValueChange={(v: any) => setNoticePriority(v)}>
                <SelectTrigger id="notice-priority" className="h-9 text-xs">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal Announcement</SelectItem>
                  <SelectItem value="HIGH">High Priority (Important Reminder)</SelectItem>
                  <SelectItem value="URGENT">Urgent Notice (Immediate Attention)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNoticeOpen(false)} disabled={submittingNotice}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submittingNotice || !noticeTitle.trim() || !noticeBody.trim()}>
                <Bell className="mr-1.5 h-3.5 w-3.5" />
                <span>{submittingNotice ? 'Publishing…' : 'Publish Notice'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
