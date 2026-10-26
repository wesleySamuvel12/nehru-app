'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { fmtDate, initials } from '@/lib/format'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  User, GraduationCap, Users, FileText, HeartPulse, PenLine, Phone,
  Shield, CheckCircle2, ChevronDown, Download, MapPin, Mail, Clock,
  Lock, Plus, FilePlus, CloudUpload, Trash2, Info, UploadCloud,
  Image as ImageIcon, Loader2,
} from 'lucide-react'

export function ChildProfile({
  data,
  selectedId,
  onSelectChild,
  initialTab = 'personal',
  onReload,
}: {
  data: any
  selectedId: string
  onSelectChild: (id: string) => void
  initialTab?: 'personal' | 'academic' | 'parent' | 'documents' | 'medical'
  onReload?: () => void
}) {
  const [userTab, setUserTab] = React.useState<
    'personal' | 'academic' | 'parent' | 'documents' | 'medical' | null
  >(null)
  const activeTab = userTab || initialTab

  const [editOpen, setEditOpen] = React.useState(false)

  const child = React.useMemo(() => {
    return (
      data?.children?.find((c: any) => c.student?.id === selectedId) ||
      data?.children?.[0] ||
      null
    )
  }, [data, selectedId])

  const student = child?.student || {}
  const parent = data?.parent || {}

  // ── Edit profile dialog state ──
  const [phone, setPhone] = React.useState(parent.phone || '+91 98765 43210')
  const [altPhone, setAltPhone] = React.useState(parent.altPhone || '+91 91234 56789')
  const [email, setEmail] = React.useState(parent.email || 'rohan.gupta@gmail.com')
  const [address, setAddress] = React.useState(parent.address || '123 Green Park, Coimbatore, Tamil Nadu – 641001')

  const handleSaveProfile = () => {
    toast.success('Profile details updated successfully!')
    setEditOpen(false)
  }

  // ── Medical Information State (matching Image 3) ──
  const [bloodGroup, setBloodGroup] = React.useState(child?.health?.bloodGroup || student.bloodGroup || 'O+')
  const [allergyOption, setAllergyOption] = React.useState<'none' | 'yes' | 'not_sure'>('none')
  const [allergyText, setAllergyText] = React.useState(child?.health?.allergies || '')
  const [conditionsOption, setConditionsOption] = React.useState<'none' | 'yes' | 'discuss'>('none')
  const [conditionsText, setConditionsText] = React.useState(child?.health?.chronicConditions || '')
  const [medicationOption, setMedicationOption] = React.useState<'no' | 'yes'>('no')
  const [medicationText, setMedicationText] = React.useState(child?.health?.medications || '')
  const [instructionsText, setInstructionsText] = React.useState(child?.health?.notes || '')
  const [savingMedical, setSavingMedical] = React.useState(false)

  // Emergency contact fields (Right card in Image 3)
  const [emName, setEmName] = React.useState(parent.name || 'Rohan Gupta')
  const [emRelation, setEmRelation] = React.useState(parent.relation || 'Father')
  const [emPrimaryPhone, setEmPrimaryPhone] = React.useState(parent.phone || '+91 98765 43210')
  const [emAltPhone, setEmAltPhone] = React.useState(parent.altPhone || '+91 91234 56789')
  const [emEmail, setEmEmail] = React.useState(parent.email || 'rohan.gupta@email.com')

  // Medical documents (Right card in Image 3)
  const [medicalDocs, setMedicalDocs] = React.useState<Array<{ id: string; name: string; size: string; date: string; type: 'pdf' | 'image' }>>([
    { id: 'm-1', name: 'Vaccination_Certificate.pdf', size: '1.2 MB', date: '12 Aug 2025', type: 'pdf' },
    { id: 'm-2', name: 'Medical_Report.jpg', size: '850 KB', date: '12 Aug 2025', type: 'image' },
  ])
  const medicalFileInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleMedicalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5 MB limit')
      return
    }
    const isImg = file.type.startsWith('image/')
    const newDoc = {
      id: `m-${Date.now()}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      type: (isImg ? 'image' : 'pdf') as 'pdf' | 'image',
    }
    setMedicalDocs(prev => [newDoc, ...prev])
    toast.success(`Uploaded ${file.name}`)
    if (medicalFileInputRef.current) medicalFileInputRef.current.value = ''
  }

  const handleDeleteMedicalDoc = (id: string, name: string) => {
    setMedicalDocs(prev => prev.filter(d => d.id !== id))
    toast.info(`Removed ${name}`)
  }

  const handleSaveMedical = async () => {
    setSavingMedical(true)
    try {
      await api('/api/portal/parent', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_medical',
          studentId: student.id,
          bloodGroup,
          allergies: allergyOption === 'yes' ? allergyText : allergyOption === 'none' ? 'None' : 'Not sure',
          conditions: conditionsOption === 'yes' ? conditionsText : conditionsOption === 'none' ? 'None' : 'Prefer to discuss with school',
          medication: medicationOption === 'yes' ? medicationText : 'No regular medications',
          instructions: instructionsText,
          emergencyContact: emPrimaryPhone,
          emergencyName: emName,
          emergencyRelation: emRelation,
          emergencyAltPhone: emAltPhone,
          emergencyEmail: emEmail,
        }),
      })
      toast.success('Medical details and emergency contact saved successfully!')
      onReload?.()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save medical details')
    } finally {
      setSavingMedical(false)
    }
  }

  // ── Certificates & Documents State (matching Image 2) ──
  const [uploadedDocs, setUploadedDocs] = React.useState<any[]>(student.documents || [])
  const [issuedCertificates, setIssuedCertificates] = React.useState<any[]>(child?.certificates || [])
  const [requestModalOpen, setRequestModalOpen] = React.useState(false)
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false)
  const [reqCertType, setReqCertType] = React.useState('BONAFIDE')
  const [reqPurpose, setReqPurpose] = React.useState('')
  const [submittingReq, setSubmittingReq] = React.useState(false)

  const [docName, setDocName] = React.useState('')
  const [docCategory, setDocCategory] = React.useState('Marksheet')
  const [submittingDoc, setSubmittingDoc] = React.useState(false)

  const handleRequestCertificate = async () => {
    if (!reqPurpose.trim()) {
      toast.error('Please specify the purpose for this certificate')
      return
    }
    setSubmittingReq(true)
    try {
      const res = await api<{ success: boolean; data: any }>('/api/portal/parent', {
        method: 'POST',
        body: JSON.stringify({
          action: 'request_certificate',
          studentId: student.id,
          type: reqCertType,
          purpose: reqPurpose.trim(),
        }),
      })
      toast.success('Certificate request submitted!', {
        description: 'The school administration office will review and issue it within 2 working days.',
      })
      setRequestModalOpen(false)
      setReqPurpose('')
      if (res?.data) {
        setIssuedCertificates(prev => [res.data, ...prev])
      }
      onReload?.()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit certificate request')
    } finally {
      setSubmittingReq(false)
    }
  }

  const handleUploadDocumentSubmit = async () => {
    if (!docName.trim()) {
      toast.error('Please enter a document title')
      return
    }
    setSubmittingDoc(true)
    try {
      const res = await api<{ success: boolean; documents: any[] }>('/api/portal/parent', {
        method: 'POST',
        body: JSON.stringify({
          action: 'upload_document',
          studentId: student.id,
          document: {
            name: docName.trim(),
            type: docCategory,
            size: '1.4 MB',
          },
        }),
      })
      toast.success('Document uploaded successfully!')
      setUploadModalOpen(false)
      setDocName('')
      if (res?.documents) {
        setUploadedDocs(res.documents)
      }
      onReload?.()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload document')
    } finally {
      setSubmittingDoc(false)
    }
  }

  const handleDeleteUploadedDoc = async (docId: string, name: string) => {
    try {
      const res = await api<{ success: boolean; documents: any[] }>('/api/portal/parent', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_document',
          studentId: student.id,
          documentId: docId,
        }),
      })
      toast.info(`Removed ${name}`)
      if (res?.documents) setUploadedDocs(res.documents)
      onReload?.()
    } catch {
      toast.error('Failed to remove document')
    }
  }

  const childInitials = student.firstName && student.lastName
    ? `${student.firstName[0]}${student.lastName[0]}`.toUpperCase()
    : initials(child?.name || 'Diya Gupta')

  const childFullName = child?.name || `${student.firstName || 'Diya'} ${student.lastName || 'Gupta'}`
  const className = student.className || 'Grade 8'
  const sectionName = student.sectionName || 'A'
  const admissionNo = student.admissionNo || 'NIS00071'
  const rollNo = student.rollNo || '01'
  const house = student.house || 'Ruby'
  const classTeacher = student.classTeacher || 'Kavita Iyer'

  const formattedDob = student.dob
    ? new Date(student.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '14 Mar 2012'

  const formattedJoinDate = student.admissionDate
    ? new Date(student.admissionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '10 Jun 2020'

  return (
    <div className="space-y-6">
      {/* ── Page Header with Child Switcher Dropdown ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {activeTab === 'medical' ? 'Medical Information' : 'Child Profile'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === 'medical'
              ? "Provide and update your child's medical details to help the school ensure their safety and well-being."
              : "View your child's personal details, academic information and important records."}
          </p>
        </div>

        {/* Child Selector Dropdown */}
        {data?.children && data.children.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 rounded-2xl border bg-card px-3.5 py-2 text-left shadow-2xs transition-all hover:bg-muted/60"
                aria-label="Select student"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                  {childInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground leading-tight">{childFullName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{className} • Section {sectionName}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              {data.children.map((c: any) => {
                const cInitials = initials(c.name || 'Student')
                const isSelected = (c.student?.id || c.name) === (student.id || childFullName)
                return (
                  <DropdownMenuItem
                    key={c.student?.id || c.name}
                    onClick={() => onSelectChild(c.student?.id || '')}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                      {cInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{c.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{c.student?.className || 'Grade 8'} · Section {c.student?.sectionName || 'A'}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 shrink-0 ml-auto" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── Banner Card matching Image 2 & 3 ── */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-50/60 via-blue-50/40 to-cyan-50/50 p-6 dark:border-sky-900/40 dark:from-sky-950/20 dark:via-blue-950/15 dark:to-cyan-950/20 shadow-2xs">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-sky-200/30 blur-2xl dark:bg-sky-700/10" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-cyan-200/25 blur-xl dark:bg-cyan-700/10" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 shadow-2xs dark:bg-emerald-950/80 dark:text-emerald-400">
              {childInitials}
            </div>

            {/* Name, Class, and Active Badge */}
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{childFullName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {className} • Section {sectionName}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  Active Student
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button (hidden on medical tab to match Image 3) */}
          {activeTab !== 'medical' && (
            <Button
              onClick={() => setEditOpen(true)}
              className="h-10 gap-2 self-start rounded-xl bg-sky-600 font-semibold text-white hover:bg-sky-700 shadow-xs sm:self-center transition-all"
            >
              <PenLine className="h-4 w-4" /> Edit Profile
            </Button>
          )}
        </div>

        {/* Info Chips Row matching Images 2 & 3 */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-sky-100/80 pt-5 sm:grid-cols-4 dark:border-sky-900/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Admission No</p>
              <p className="truncate text-xs font-bold text-foreground">{admissionNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Roll No</p>
              <p className="truncate text-xs font-bold text-foreground">{rollNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">House</p>
              <p className="truncate text-xs font-bold text-foreground">{house}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class Teacher</p>
              <p className="truncate text-xs font-bold text-foreground">{classTeacher}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 Navigation Tabs (matching Screenshots) ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Profile Tabs">
        {[
          { key: 'personal', label: 'Personal Information', icon: User },
          { key: 'academic', label: 'Academic Details', icon: GraduationCap },
          { key: 'parent', label: 'Parent / Guardian', icon: Users },
          { key: 'documents', label: 'Certificates & Documents', icon: FileText },
          { key: 'medical', label: 'Medical Information', icon: HeartPulse },
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setUserTab(t.key as any)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-600 font-bold dark:bg-sky-500/20 dark:text-sky-400 shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : ''}`} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── TAB 1. PERSONAL INFORMATION (2x2 Grid) ── */}
      {activeTab === 'personal' && (
        <div className="grid gap-5 md:grid-cols-2">
          {/* Card 1: Personal Information */}
          <div className="rounded-2xl border bg-card p-5 shadow-2xs">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                <User className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Personal Information</h3>
            </div>
            <div className="divide-y divide-border/60 text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-semibold text-foreground">{childFullName}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-semibold text-foreground">{formattedDob}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Gender</span>
                <span className="font-semibold text-foreground capitalize">{student.gender?.toLowerCase() || 'Female'}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Blood Group</span>
                <span className="font-semibold text-foreground">{bloodGroup}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Nationality</span>
                <span className="font-semibold text-foreground">Indian</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Phone (Student)</span>
                <span className="font-semibold text-foreground">{student.phone && student.phone !== '-' ? student.phone : '—'}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Email (Student)</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">{student.email || 'diya.gupta@nehruis.edu.in'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Academic Information */}
          <div className="rounded-2xl border bg-card p-5 shadow-2xs">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                <GraduationCap className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Academic Information</h3>
            </div>
            <div className="divide-y divide-border/60 text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Academic Year</span>
                <span className="font-semibold text-foreground">2025–2026</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Grade & Section</span>
                <span className="font-semibold text-foreground">{className} • Section {sectionName}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Admission Number</span>
                <span className="font-semibold text-foreground">{admissionNo}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Roll Number</span>
                <span className="font-semibold text-foreground">{rollNo}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Date of Admission</span>
                <span className="font-semibold text-foreground">{formattedJoinDate}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">House</span>
                <span className="font-semibold text-foreground">{house}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Class Teacher</span>
                <span className="font-semibold text-foreground">{classTeacher}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Parent / Guardian Information */}
          <div className="rounded-2xl border bg-card p-5 shadow-2xs">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Parent / Guardian Information</h3>
            </div>
            <div className="divide-y divide-border/60 text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Father's Name</span>
                <span className="font-semibold text-foreground">{emName}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Mother's Name</span>
                <span className="font-semibold text-foreground">Anita Gupta</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Primary Contact</span>
                <span className="font-semibold text-foreground">{emPrimaryPhone}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Alternate Contact</span>
                <span className="font-semibold text-foreground">{emAltPhone}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Parent Email</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">{emEmail}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Residential Address</span>
                <span className="font-semibold text-foreground text-right max-w-[240px] truncate">{address}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Emergency Contact */}
          <div className="rounded-2xl border bg-card p-5 shadow-2xs">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <Phone className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Emergency Contact</h3>
            </div>
            <div className="divide-y divide-border/60 text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Contact Person</span>
                <span className="font-semibold text-foreground">{emName}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Relationship</span>
                <span className="font-semibold text-foreground">{emRelation}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Emergency Phone</span>
                <span className="font-semibold text-foreground">{emPrimaryPhone}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Alternate Emergency Phone</span>
                <span className="font-semibold text-foreground">{emAltPhone}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">School Clinic Permission</span>
                <span className="font-semibold text-emerald-600">Authorized for First Aid</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2. ACADEMIC DETAILS ── */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5 shadow-2xs text-center">
              <p className="text-xs text-muted-foreground font-semibold">Current Evaluation</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{child?.reportCard?.examName || 'Term 1 Exam'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Grade 8 • Academic Year 2025–26</p>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-2xs text-center">
              <p className="text-xs text-muted-foreground font-semibold">Aggregate Score</p>
              <p className="mt-1 text-3xl font-extrabold text-foreground">{child?.reportCard?.percentage ?? 72}%</p>
              <p className="mt-1 text-xs text-emerald-600 font-semibold">Class Rank: {child?.reportCard?.rank ?? 4}</p>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-2xs text-center">
              <p className="text-xs text-muted-foreground font-semibold">Latest Grade</p>
              <p className="mt-1 text-3xl font-extrabold text-sky-600">{child?.reportCard?.grade || 'B+'}</p>
              <p className="mt-1 text-xs text-muted-foreground">Passing Status: Promoted</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-2xs">
            <h3 className="font-bold text-sm text-foreground mb-4">Subject-wise Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-semibold">Subject</th>
                    <th className="pb-3 font-semibold">Marks</th>
                    <th className="pb-3 font-semibold">Score</th>
                    <th className="pb-3 font-semibold">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(child?.subjectMarks || [
                    { subject: 'English', marks: 55, maxMarks: 100, pct: 55, grade: 'C' },
                    { subject: 'Hindi', marks: 92, maxMarks: 100, pct: 92, grade: 'A+' },
                    { subject: 'Mathematics', marks: 47, maxMarks: 100, pct: 47, grade: 'D' },
                    { subject: 'Physics', marks: 72, maxMarks: 100, pct: 72, grade: 'B+' },
                    { subject: 'Chemistry', marks: 81, maxMarks: 100, pct: 81, grade: 'A' },
                  ]).map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 font-medium text-foreground">{m.subject}</td>
                      <td className="py-3 tabular-nums">{m.marks}/{m.maxMarks}</td>
                      <td className="py-3 font-medium">{m.pct}%</td>
                      <td className="py-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/10 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                          {m.grade || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3. PARENT / GUARDIAN ── */}
      {activeTab === 'parent' && (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 font-bold text-base">
                RG
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{emName}</h3>
                <p className="text-xs text-muted-foreground">{emRelation} • {parent.occupation || 'Professional'}</p>
              </div>
            </div>
            <div className="space-y-2 border-t pt-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-sky-600" /> {emPrimaryPhone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-sky-600" /> {emEmail}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-sky-600 shrink-0" /> {address}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-base">
                AG
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Anita Gupta</h3>
                <p className="text-xs text-muted-foreground">Mother • Educator</p>
              </div>
            </div>
            <div className="space-y-2 border-t pt-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-emerald-600" /> +91 98765 43210
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-emerald-600" /> anita.gupta@gmail.com
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {address}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4. CERTIFICATES & DOCUMENTS (matching Screenshot 2) ── */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Header Row with Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Documents & Records</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Access verified certificates and upload your enrollments
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => setRequestModalOpen(true)}
                className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-2xs hover:bg-muted"
              >
                <FilePlus className="h-4 w-4" /> + Request Certificate
              </Button>
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="h-9 gap-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold shadow-xs"
              >
                <UploadCloud className="h-4 w-4" /> Upload Document
              </Button>
            </div>
          </div>

          {/* Card 1: Student Uploaded Documents */}
          <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-3">
            <div>
              <h3 className="font-bold text-sm text-foreground">Student Uploaded Documents</h3>
              <p className="text-xs text-muted-foreground">Official marksheets, transfer certificates, and identity proofs</p>
            </div>

            {uploadedDocs.length > 0 ? (
              <div className="divide-y divide-border/60 pt-2">
                {uploadedDocs.map((doc: any, idx: number) => (
                  <div key={doc.id || idx} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{doc.name}</p>
                        <p className="text-[11px] text-muted-foreground">{doc.type || 'Document'} • {doc.size || '1.2 MB'} • Uploaded {fmtDate(doc.uploadedAt || new Date())}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button size="sm" variant="outline" className="h-8 gap-1 rounded-xl text-xs" onClick={() => toast.success(`Downloaded ${doc.name}`)}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10 rounded-xl" onClick={() => handleDeleteUploadedDoc(doc.id, doc.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Dashed Empty Box matching Screenshot 2 */
              <div className="rounded-2xl border-2 border-dashed border-border/70 p-10 sm:p-14 text-center bg-card/40 my-3">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="font-bold text-sm text-foreground">No documents uploaded yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click &apos;Upload Document&apos; above to submit marksheets or certificates.
                </p>
              </div>
            )}
          </div>

          {/* Card 2: School Issued Certificates */}
          <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-3">
            <div>
              <h3 className="font-bold text-sm text-foreground">School Issued Certificates</h3>
              <p className="text-xs text-muted-foreground">Official certificates verified and issued by school administration</p>
            </div>

            {issuedCertificates.length > 0 ? (
              <div className="divide-y divide-border/60 pt-2">
                {issuedCertificates.map((cert: any, idx: number) => (
                  <div key={cert.id || idx} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{cert.title || `${cert.type} Certificate`}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {cert.certificateNo || 'NIS-CERT-001'} • Issued {fmtDate(cert.issuedAt || new Date())}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 gap-1 text-[11px]">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                      <Button size="sm" variant="outline" className="h-8 gap-1 rounded-xl text-xs" onClick={() => toast.success(`Downloaded Certificate`)}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Dashed Empty Box matching Screenshot 2 */
              <div className="rounded-2xl border-2 border-dashed border-border/70 p-10 sm:p-14 text-center bg-card/40 my-3">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <p className="font-bold text-sm text-foreground">No official certificates issued yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can request a Bonafide or Study Certificate from the school office using the button above.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5. MEDICAL INFORMATION (matching Image 3) ── */}
      {activeTab === 'medical' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Main Medical Information Form */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-6">
              {/* Header with Heart Icon */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Medical Information</h3>
              </div>

              {/* 1. Blood Group */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Blood Group</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(bg => {
                    const isSelected = bloodGroup === bg
                    return (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => setBloodGroup(bg)}
                        className={`flex items-center justify-center rounded-xl px-3.5 py-1.5 text-xs transition-all ${
                          isSelected
                            ? 'border-2 border-sky-500 bg-sky-50 font-bold text-sky-600 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500 shadow-2xs'
                            : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted/60 font-medium'
                        }`}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-400 mr-1.5" />}
                        {bg}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Known Allergies */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-bold text-foreground">Known Allergies</Label>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allergyOption"
                      checked={allergyOption === 'none'}
                      onChange={() => setAllergyOption('none')}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span>No known allergies</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allergyOption"
                      checked={allergyOption === 'yes'}
                      onChange={() => setAllergyOption('yes')}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span>Yes (please specify)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allergyOption"
                      checked={allergyOption === 'not_sure'}
                      onChange={() => setAllergyOption('not_sure')}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span>Not sure</span>
                  </label>
                </div>
                <div className="relative">
                  <Textarea
                    placeholder="E.g. Food, medicine, insect, dust, etc. Mention reaction and severity."
                    value={allergyText}
                    onChange={e => setAllergyText(e.target.value.slice(0, 300))}
                    className="min-h-[85px] rounded-xl text-xs resize-none"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-muted-foreground select-none">
                    {allergyText.length}/300
                  </span>
                </div>
              </div>

              {/* 3. Existing Medical Conditions */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-bold text-foreground">Existing Medical Conditions</Label>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="conditionsOption"
                      checked={conditionsOption === 'none'}
                      onChange={() => setConditionsOption('none')}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span>None</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="conditionsOption"
                      checked={conditionsOption === 'yes'}
                      onChange={() => setConditionsOption('yes')}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span>Yes (please specify)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="conditionsOption"
                      checked={conditionsOption === 'discuss'}
                      onChange={() => setConditionsOption('discuss')}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span>Prefer to discuss with school</span>
                  </label>
                </div>
                <div className="relative">
                  <Textarea
                    placeholder="E.g. Asthma, diabetes, epilepsy, heart condition, etc."
                    value={conditionsText}
                    onChange={e => setConditionsText(e.target.value.slice(0, 300))}
                    className="min-h-[85px] rounded-xl text-xs resize-none"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-muted-foreground select-none">
                    {conditionsText.length}/300
                  </span>
                </div>
              </div>

              {/* 4. Regular Medication */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-bold text-foreground">Regular Medication</Label>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="medicationOption"
                      checked={medicationOption === 'no'}
                      onChange={() => setMedicationOption('no')}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span>No</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="medicationOption"
                      checked={medicationOption === 'yes'}
                      onChange={() => setMedicationOption('yes')}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span>Yes (please specify)</span>
                  </label>
                </div>
                <div className="relative">
                  <Textarea
                    placeholder="Medication name, dosage, timing and special instructions."
                    value={medicationText}
                    onChange={e => setMedicationText(e.target.value.slice(0, 300))}
                    className="min-h-[85px] rounded-xl text-xs resize-none"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-muted-foreground select-none">
                    {medicationText.length}/300
                  </span>
                </div>
              </div>

              {/* 5. Additional Instructions (Optional) */}
              <div className="space-y-2.5">
                <Label className="text-xs font-bold text-foreground">Additional Instructions (Optional)</Label>
                <div className="relative">
                  <Textarea
                    placeholder="Any other important health information, precautions or instructions for school staff."
                    value={instructionsText}
                    onChange={e => setInstructionsText(e.target.value.slice(0, 500))}
                    className="min-h-[85px] rounded-xl text-xs resize-none"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-muted-foreground select-none">
                    {instructionsText.length}/500
                  </span>
                </div>
              </div>

              {/* Action Buttons matching Image 3 */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAllergyText('')
                    setConditionsText('')
                    setMedicationText('')
                    setInstructionsText('')
                    toast.info('Changes discarded')
                  }}
                  className="rounded-xl h-10 px-4 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={savingMedical}
                  onClick={handleSaveMedical}
                  className="rounded-xl h-10 px-5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold gap-1.5 shadow-xs"
                >
                  {savingMedical ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Save Information
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Emergency Contact & Medical Documents */}
          <div className="space-y-6 lg:col-span-5 xl:col-span-4">
            {/* Card 1: Emergency Contact (matching Image 3) */}
            <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Emergency Contact</h3>
                  <p className="text-xs text-muted-foreground">Contact person in case of a medical emergency.</p>
                </div>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Name</Label>
                    <Input
                      value={emName}
                      onChange={e => setEmName(e.target.value)}
                      placeholder="Rohan Gupta"
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Relationship</Label>
                    <Select value={emRelation} onValueChange={setEmRelation}>
                      <SelectTrigger className="h-9 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Guardian</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Primary Contact Number</Label>
                    <Input
                      value={emPrimaryPhone}
                      onChange={e => setEmPrimaryPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Alternate Contact Number</Label>
                    <Input
                      value={emAltPhone}
                      onChange={e => setEmAltPhone(e.target.value)}
                      placeholder="+91 91234 56789"
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px]">Email (Optional)</Label>
                  <Input
                    value={emEmail}
                    onChange={e => setEmEmail(e.target.value)}
                    placeholder="rohan.gupta@email.com"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Medical Documents (matching Image 3) */}
            <div className="rounded-2xl border bg-card p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Medical Documents</h3>
                  <p className="text-xs text-muted-foreground">Upload relevant medical reports, prescriptions or certificates.</p>
                </div>
              </div>

              {/* Dropzone matching Image 3 */}
              <input
                ref={medicalFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleMedicalFileUpload}
                className="hidden"
              />
              <div
                onClick={() => medicalFileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-sky-300/80 bg-sky-50/50 p-6 text-center cursor-pointer transition-all hover:bg-sky-50/80 dark:bg-sky-950/20 dark:border-sky-800"
              >
                <CloudUpload className="mx-auto h-8 w-8 text-sky-500 mb-2" />
                <p className="text-xs text-foreground">
                  <span className="font-bold text-sky-600 dark:text-sky-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG (Max 5 MB)</p>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-2.5 pt-1">
                {medicalDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between rounded-xl border p-3 text-xs bg-card/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        doc.type === 'pdf' ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/60' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60'
                      }`}>
                        {doc.type === 'pdf' ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.size} • {doc.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => toast.success(`Downloaded ${doc.name}`)}
                        className="p-1 text-sky-600 hover:text-sky-700 transition-colors"
                        aria-label="Download document"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMedicalDoc(doc.id, doc.name)}
                        className="p-1 text-rose-500 hover:text-rose-600 transition-colors"
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog: Edit Profile (Personal/Guardian details) ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile Details</DialogTitle>
            <DialogDescription>
              Update your contact and residential address. Academic details can only be changed by school office.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="prof-phone">Primary Phone</Label>
              <Input id="prof-phone" value={phone} onChange={e => setPhone(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prof-alt-phone">Alternate Phone</Label>
              <Input id="prof-alt-phone" value={altPhone} onChange={e => setAltPhone(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prof-email">Email Address</Label>
              <Input id="prof-email" value={email} onChange={e => setEmail(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prof-address">Residential Address</Label>
              <Input id="prof-address" value={address} onChange={e => setAddress(e.target.value)} className="h-9 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold" onClick={handleSaveProfile}>
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Request Certificate (matching Screenshot 2) ── */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request Certificate</DialogTitle>
            <DialogDescription>
              Submit an official request to the school administration office for {childFullName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Certificate Type</Label>
              <Select value={reqCertType} onValueChange={setReqCertType}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BONAFIDE">Bonafide Certificate</SelectItem>
                  <SelectItem value="STUDY">Study / Enrollment Certificate</SelectItem>
                  <SelectItem value="TRANSFER">Transfer Certificate (TC)</SelectItem>
                  <SelectItem value="CHARACTER">Character / Conduct Certificate</SelectItem>
                  <SelectItem value="FEE_CLEARANCE">Fee Clearance Certificate</SelectItem>
                  <SelectItem value="BIRTH">Date of Birth Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Purpose of Request</Label>
              <Input
                placeholder="E.g. Passport application, Higher education, Visa"
                value={reqPurpose}
                onChange={e => setReqPurpose(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setRequestModalOpen(false)}>Cancel</Button>
            <Button
              disabled={submittingReq}
              onClick={handleRequestCertificate}
              className="rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold"
            >
              {submittingReq ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Upload Document (matching Screenshot 2) ── */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload verified documents, transfer certificates or marksheets for {childFullName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Document Title</Label>
              <Input
                placeholder="E.g. Previous Grade Marksheet, Transfer Certificate"
                value={docName}
                onChange={e => setDocName(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Marksheet">Marksheet</SelectItem>
                  <SelectItem value="Transfer Certificate">Transfer Certificate</SelectItem>
                  <SelectItem value="Identity Proof">Identity Proof</SelectItem>
                  <SelectItem value="Address Proof">Address Proof</SelectItem>
                  <SelectItem value="Medical Certificate">Medical Certificate</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border-2 border-dashed border-sky-300/80 bg-sky-50/50 p-5 text-center dark:bg-sky-950/20 dark:border-sky-800">
              <CloudUpload className="mx-auto h-7 w-7 text-sky-500 mb-1.5" />
              <p className="text-xs text-foreground font-semibold">Select a file from your device</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">PDF, JPG, PNG up to 5 MB</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
            <Button
              disabled={submittingDoc}
              onClick={handleUploadDocumentSubmit}
              className="rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold"
            >
              {submittingDoc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
