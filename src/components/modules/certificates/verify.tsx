'use client'

import * as React from 'react'
import { BadgeCheck, Loader2, QrCode, Search, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { api, ApiError } from '@/lib/api-client'
import { fmtDate, titleCase } from '@/lib/format'


export default function VerifyTab() {
  const [code, setCode] = React.useState('')
  const [checking, setChecking] = React.useState(false)
  const [result, setResult] = React.useState<{ valid: boolean; certificate?: any } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const verify = async () => {
    if (!code.trim() || checking) return
    setChecking(true)
    setError(null)
    try {
      const res = await api<{ valid: boolean; certificate?: any }>('api/certificates/verify', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      })
      setResult(res)
    } catch (e) {
      setError((e as ApiError).message || 'Verification failed. Please try again.')
      setResult(null)
    } finally {
      setChecking(false)
    }
  }

  const cert = result?.certificate

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Verify a certificate</CardTitle>
          <CardDescription>
            Enter the verification code (VRF-XXXXXX) or certificate number (GWS/CERT/2025/XXX) printed at the bottom of the certificate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') verify() }}
              placeholder="e.g. VRF-483920"
              className="font-mono uppercase"
              aria-label="Verification code"
            />
            <Button onClick={verify} disabled={checking || !code.trim()} className="shrink-0">
              {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Verify
            </Button>
          </div>
          {error && <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        </CardContent>
      </Card>

      {result && !result.valid && (
        <Card className="border-rose-500/30">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-rose-700 dark:text-rose-400">Certificate not found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No certificate matches “<span className="font-mono">{code.trim().toUpperCase()}</span>”. Check the code and try again, or contact the school office.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result?.valid && cert && (
        <Card className="border-emerald-500/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">Valid certificate</p>
                <p className="mt-0.5 text-sm text-muted-foreground">This certificate was issued by Greenwood International School.</p>
              </div>
            </div>
            <Separator className="my-4" />
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Certificate</dt>
                <dd className="font-medium">{cert.title}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Type</dt>
                <dd>{titleCase(cert.type)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Student</dt>
                <dd className="font-medium">{cert.studentName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Certificate No.</dt>
                <dd className="font-mono">{cert.certificateNo}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Issued By</dt>
                <dd>{cert.issuedBy || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Issued On</dt>
                <dd>{fmtDate(cert.issuedAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Verification Code</dt>
                <dd className="font-mono font-semibold">{cert.verifyCode}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
