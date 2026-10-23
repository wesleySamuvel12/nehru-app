'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { useErp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  User, Bus, Users, FileText, Calendar, BookOpen, GraduationCap,
  BadgeCheck, Hash, Droplet, Globe, Building2, Tag, HeartPulse,
  Phone, Mail, MapPin, UploadCloud, FilePlus2, CheckCircle2,
  FileCheck2, ShieldCheck, Loader2, Sparkles, ExternalLink,
} from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */

function BarcodeStrip() {
  return (
    <div
      aria-hidden
      className="h-6 w-full rounded-sm"
      style={{
        background: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 4px, currentColor 4px 5px, transparent 5px 9px, currentColor 9px 12px, transparent 12px 14px)',
      }}
    />
  )
}

export function StudentProfile({ data }: { data?: any }) {
  const { session } = useErp()
  const p = data?.profile || {}

  // Active tab inside Profile
  const [profileTab, setProfileTab] = React.useState('personal')

  // Modals for Certificates & Documents
  const [requestCertOpen, setRequestCertOpen] = React.useState(false)
  const [certType, setCertType] = React.useState('BONAFIDE')
  const [certReason, setCertReason] = React.useState('')
  const [submittingCert, setSubmittingCert] = React.useState(false)

  const [uploadDocOpen, setUploadDocOpen] = React.useState(false)
  const [docName, setDocName] = React.useState('')
  const [docType, setDocType] = React.useState('MARKSHEET')
  const [uploadingDoc, setUploadingDoc] = React.useState(false)
  const [uploadedDocs, setUploadedDocs] = React.useState<Array<{ name: string; type: string; date: string }>>([])
  const [requestedCerts, setRequestedCerts] = React.useState<Array<{ type: string; reason: string; date: string; status: string }>>([])

  // Student details with database priority and matching video fallback
  const studentName = p.name || session?.name || 'Aditya Malhotra'
  const initials = studentName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'AM'
  const className = p.className || 'Grade 8'
  const sectionName = p.sectionName || 'A'
  const admissionNo = p.admissionNo || 'NIS00071'
  const rollNo = p.rollNo || '01'
  const house = p.house || 'Emerald'
  const barcode = p.barcode || 'STU00000072'

  const handleRequestCert = () => {
    if (!certReason.trim()) {
      toast.error('Please specify the reason for the certificate request.')
      return
    }
    setSubmittingCert(true)
    setTimeout(() => {
      setRequestedCerts(prev => [
        { type: certType, reason: certReason.trim(), date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), status: 'PENDING' },
        ...prev,
      ])
      setSubmittingCert(false)
      setRequestCertOpen(false)
      setCertReason('')
      toast.success('Certificate request submitted successfully', {
        description: 'The school administrative office will process your request shortly.',
      })
    }, 600)
  }

  const handleUploadDoc = () => {
    if (!docName.trim()) {
      toast.error('Please provide a document title or name.')
      return
    }
    setUploadingDoc(true)
    setTimeout(() => {
      setUploadedDocs(prev => [
        { name: docName.trim(), type: docType, date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
        ...prev,
      ])
      setUploadingDoc(false)
      setUploadDocOpen(false)
      setDocName('')
      toast.success('Document uploaded successfully', {
        description: 'Uploaded copy has been attached to your verified student records.',
      })
    }, 600)
  }

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your personal details, transport information and uploaded documents.
        </p>
      </div>

      {/* Profile Header Banner */}
      <div className="flex flex-col gap-6 rounded-2xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-xl font-bold text-white shadow-md ring-4 ring-sky-500/10">
            {initials}
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">{studentName}</h2>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{className} · Section {sectionName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Admission No <strong className="text-foreground font-mono">{admissionNo}</strong></span>
              <span>•</span>
              <span>Roll No <strong className="text-foreground">{rollNo}</strong></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                House <span className="h-2 w-2 rounded-full bg-emerald-500" /> <strong className="text-emerald-700 dark:text-emerald-400 font-medium">{house}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Mini Student ID Card Preview */}
        <div className="hidden sm:flex items-center gap-3.5 rounded-xl border bg-muted/30 p-3 max-w-xs shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nis-mark.png" alt="NIS" className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold leading-tight truncate">Nehru International School</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">STUDENT IDENTITY CARD · 2025-26</p>
            <div className="mt-1 text-muted-foreground/80">
              <BarcodeStrip />
              <p className="text-center font-mono text-[9px] tracking-widest">{barcode}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={profileTab} onValueChange={setProfileTab} className="space-y-6">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted/60 p-1.5 overflow-x-auto">
          <TabsTrigger value="personal" className="gap-2 rounded-lg py-2 px-3.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <User className="h-4 w-4" /> Personal Information
          </TabsTrigger>
          <TabsTrigger value="transport" className="gap-2 rounded-lg py-2 px-3.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Bus className="h-4 w-4" /> Transport Information
          </TabsTrigger>
          <TabsTrigger value="parent" className="gap-2 rounded-lg py-2 px-3.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Users className="h-4 w-4" /> Parent / Guardian
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 rounded-lg py-2 px-3.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <FileText className="h-4 w-4" /> Certificates & Documents
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: PERSONAL INFORMATION ── */}
        <TabsContent value="personal" className="space-y-6 focus-visible:outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Official Registered Student Record */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">Personal Information</h3>
                <p className="text-xs text-muted-foreground">Official registered student record</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoItem icon={<User className="h-4 w-4 text-primary" />} label="Full Name" value={studentName} />
                <InfoItem icon={<Calendar className="h-4 w-4 text-primary" />} label="Date of Birth" value="11 Mar 2013" />
                <InfoItem icon={<User className="h-4 w-4 text-primary" />} label="Gender" value="Male" />
                <InfoItem icon={<BookOpen className="h-4 w-4 text-primary" />} label="Class" value={className} />
                <InfoItem icon={<GraduationCap className="h-4 w-4 text-primary" />} label="Section" value={sectionName} />
                <InfoItem icon={<BadgeCheck className="h-4 w-4 text-primary" />} label="Admission Number" value={admissionNo} isMono />
                <InfoItem icon={<Hash className="h-4 w-4 text-primary" />} label="Roll Number" value={rollNo} />
                <InfoItem icon={<Building2 className="h-4 w-4 text-emerald-600" />} label="House" value={house} valueColor="text-emerald-700 dark:text-emerald-400" />
                <InfoItem icon={<Droplet className="h-4 w-4 text-rose-500" />} label="Blood Group" value="A+" />
                <InfoItem icon={<Globe className="h-4 w-4 text-primary" />} label="Nationality" value="Indian" />
                <InfoItem icon={<Building2 className="h-4 w-4 text-primary" />} label="Religion" value="Parsi" />
                <InfoItem icon={<Tag className="h-4 w-4 text-primary" />} label="Category" value="General" />
              </div>
            </div>

            {/* Medical Information */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">Medical Information</h3>
                <p className="text-xs text-muted-foreground">Health conditions & precautions</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={<HeartPulse className="h-4 w-4 text-rose-500" />} label="Medical Conditions" value="Myopia" />
                <InfoItem icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} label="Allergies" value="None" />
                <InfoItem icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} label="Regular Medication" value="None" />
                <InfoItem icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />} label="Special Considerations" value="None" />
                <div className="col-span-2">
                  <InfoItem icon={<Phone className="h-4 w-4 text-primary" />} label="Emergency Contact" value="+91 9819327581" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contact Information */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">Contact Information</h3>
                <p className="text-xs text-muted-foreground">Communication details for student</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={<Mail className="h-4 w-4 text-primary" />} label="Student Email" value={p.email || session?.email || 'student@nis.edu.in'} />
                <InfoItem icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Phone Number" value="Not provided" />
              </div>
            </div>

            {/* Address Information */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">Address Information</h3>
                <p className="text-xs text-muted-foreground">Residential location details</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={<MapPin className="h-4 w-4 text-primary" />} label="Address" value="Khar, Mumbai" />
                <InfoItem icon={<MapPin className="h-4 w-4 text-primary" />} label="City" value="Mumbai" />
                <InfoItem icon={<MapPin className="h-4 w-4 text-primary" />} label="State" value="Maharashtra" />
                <InfoItem icon={<Globe className="h-4 w-4 text-primary" />} label="Country" value="India" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: TRANSPORT INFORMATION ── */}
        <TabsContent value="transport" className="focus-visible:outline-none">
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-12 text-center shadow-xs">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Bus className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">No Transport Service Allocated</h3>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
              You are currently not enrolled in school bus transportation. If you require bus pickup and drop-off services, please contact the School Transport Office.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="outline" className="text-xs py-1 px-3">
                Status: <strong className="ml-1 text-foreground">Not Enrolled</strong>
              </Badge>
              <Badge variant="outline" className="text-xs py-1 px-3">
                Mode: <strong className="ml-1 text-foreground">Self Commute / Parent Drop</strong>
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-6 rounded-xl"
              onClick={() => toast.info('Transport Office Contact: transport@nis.edu.in | +91 9820011223')}
            >
              Contact Transport Office
            </Button>
          </div>
        </TabsContent>

        {/* ── TAB 3: PARENT / GUARDIAN ── */}
        <TabsContent value="parent" className="space-y-6 focus-visible:outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Primary Guardian Details */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">Primary Guardian Details</h3>
                <p className="text-xs text-muted-foreground">Parent/guardian profile on school record</p>
              </div>

              <div className="flex items-center gap-3.5 mb-5 rounded-xl border bg-muted/20 p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-xs">
                  KM
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">Kavita Malhotra</p>
                    <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30 text-[10px] font-semibold">
                      PRIMARY CONTACT
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Mother</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={<Phone className="h-4 w-4 text-primary" />} label="Primary Phone" value="+91 9814597604" />
                <InfoItem icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Alternate Phone" value="Not provided" />
                <InfoItem icon={<Mail className="h-4 w-4 text-primary" />} label="Email Address" value="kavita.malhotra@gmail.com" />
                <InfoItem icon={<Phone className="h-4 w-4 text-rose-500" />} label="Emergency Contact" value="+91 9819328510" />
              </div>
            </div>

            {/* Guardian Address */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">Guardian Address</h3>
                <p className="text-xs text-muted-foreground">Official address for school correspondence</p>
              </div>

              <div className="space-y-3">
                <InfoItem icon={<MapPin className="h-4 w-4 text-primary" />} label="Residential Address" value="Bandra West, Mumbai" />
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem icon={<MapPin className="h-4 w-4 text-primary" />} label="City" value="Mumbai" />
                  <InfoItem icon={<Globe className="h-4 w-4 text-primary" />} label="Country" value="India" />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: CERTIFICATES & DOCUMENTS ── */}
        <TabsContent value="documents" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Documents & Records</h3>
              <p className="text-xs text-muted-foreground">Access verified certificates and upload your enrollments</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 text-xs"
                onClick={() => setRequestCertOpen(true)}
              >
                <FilePlus2 className="mr-1.5 h-3.5 w-3.5" /> + Request Certificate
              </Button>
              <Button
                size="sm"
                className="rounded-xl h-9 text-xs shadow-xs"
                onClick={() => setUploadDocOpen(true)}
              >
                <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Upload Document
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Student Uploaded Documents */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-foreground">Student Uploaded Documents</h4>
                <p className="text-xs text-muted-foreground">Official marksheets, transfer certificates, and identity proofs</p>
              </div>

              {uploadedDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">No documents uploaded yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Click &apos;Upload Document&apos; above to submit marksheets or certificates.</p>
                </div>
              ) : (
                <div className="divide-y rounded-xl border">
                  {uploadedDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 text-xs">
                      <div className="flex items-center gap-3">
                        <FileCheck2 className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="font-semibold text-foreground">{doc.name}</p>
                          <p className="text-muted-foreground">{doc.type} · Uploaded on {doc.date}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">Verified</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* School Issued Certificates */}
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-foreground">School Issued Certificates</h4>
                <p className="text-xs text-muted-foreground">Official certificates verified and issued by school administration</p>
              </div>

              {requestedCerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">No official certificates issued yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">You can request a Bonafide or Study Certificate from the school office using the button above.</p>
                </div>
              ) : (
                <div className="divide-y rounded-xl border">
                  {requestedCerts.map((req, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 text-xs">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{req.type} Certificate</p>
                          <p className="text-muted-foreground">Reason: {req.reason} · Requested on {req.date}</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">Processing</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Request Certificate Dialog ── */}
      <Dialog open={requestCertOpen} onOpenChange={setRequestCertOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request Official Certificate</DialogTitle>
            <DialogDescription>
              Submit an official request to the administrative office for student certificates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="cert-type">Certificate Type</Label>
              <Select value={certType} onValueChange={setCertType}>
                <SelectTrigger id="cert-type" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BONAFIDE">Bonafide Certificate</SelectItem>
                  <SelectItem value="STUDY">Study & Conduct Certificate</SelectItem>
                  <SelectItem value="CHARACTER">Character Certificate</SelectItem>
                  <SelectItem value="TRANSFER">Transfer Certificate (TC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cert-reason">Purpose / Justification</Label>
              <Textarea
                id="cert-reason"
                rows={3}
                placeholder="e.g. Required for passport verification, competitive exam application..."
                value={certReason}
                onChange={e => setCertReason(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setRequestCertOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl shadow-xs" onClick={handleRequestCert} disabled={submittingCert}>
              {submittingCert ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Document Dialog ── */}
      <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Attach verified files, marksheets, or identity documents to your student record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Document Title</Label>
              <Input
                id="doc-title"
                placeholder="e.g. Previous Year Grade 7 Marksheet"
                value={docName}
                onChange={e => setDocName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-type">Document Category</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger id="doc-type" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKSHEET">Academic Marksheet</SelectItem>
                  <SelectItem value="TRANSFER_CERT">Transfer Certificate</SelectItem>
                  <SelectItem value="IDENTITY_PROOF">Aadhaar / ID Proof</SelectItem>
                  <SelectItem value="MEDICAL_RECORD">Medical Fitness Record</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-dashed p-4 text-center">
              <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-1 text-xs font-semibold text-foreground">Select file from device</p>
              <p className="text-[10px] text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setUploadDocOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl shadow-xs" onClick={handleUploadDoc} disabled={uploadingDoc}>
              {uploadingDoc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Upload & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
  isMono,
  valueColor = 'text-foreground',
}: {
  icon: React.ReactNode
  label: string
  value: string
  isMono?: boolean
  valueColor?: string
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-2.5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className={`mt-1 truncate text-xs font-bold ${valueColor} ${isMono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}
