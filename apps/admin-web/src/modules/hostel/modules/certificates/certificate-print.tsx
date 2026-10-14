'use client'

import * as React from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { fmtDate } from '@/lib/format'


/** Deterministic 21×21 QR-style pattern derived from the verify code (char-code seeded LCG). */
function qrGrid(code: string, size = 21): boolean[][] {
  const s = String(code || 'NIS-CERT')
  let seed = 7
  for (let i = 0; i < s.length; i++) seed = (seed * 131 + s.charCodeAt(i)) >>> 0
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const grid: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) grid[y][x] = rnd() > 0.52
  }
  // QR-like finder patterns in three corners with light separator rings
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const gx = ox + x
        const gy = oy + y
        if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue
        const inRing = x >= 0 && x <= 6 && y >= 0 && y <= 6
        const edge = x === 0 || y === 0 || x === 6 || y === 6
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
        grid[gy][gx] = inRing ? (edge || core) : false
      }
    }
  }
  finder(0, 0)
  finder(size - 7, 0)
  finder(0, size - 7)
  return grid
}

function QrCode({ code, className }: { code: string; className?: string }) {
  const grid = React.useMemo(() => qrGrid(code), [code])
  return (
    <svg viewBox="0 0 21 21" className={className} role="img" aria-label={`Verification pattern for ${code}`}>
      <rect width="21" height="21" fill="#ffffff" />
      {grid.flatMap((row, y) =>
        row.map((on, x) => on
          ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#1c1917" />
          : null),
      )}
    </svg>
  )
}

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .cert-print-area, .cert-print-area * { visibility: visible !important; }
  .cert-print-area { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; }
  @page { margin: 10mm; }
}`

export default function CertificatePrintDialog({ open, onOpenChange, cert }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  cert: any | null
}) {
  if (!cert) return null
  const studentName = cert.studentName || 'Student'
  const typeLabel = String(cert.title || 'Certificate').replace(/ Certificate$/, '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <style>{PRINT_CSS}</style>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Print / QR — {cert.certificateNo}</DialogTitle>
          <DialogDescription>Official certificate preview. Print or share the verification code.</DialogDescription>
        </DialogHeader>

        {/* Printable certificate */}
        <div className="cert-print-area mx-auto w-full bg-white text-neutral-900 shadow-sm print:shadow-none">
          <div className="border-[3px] border-double border-amber-700/70 bg-white p-1">
            <div className="border border-amber-700/40 px-6 py-8 sm:px-10 sm:py-10">
              {/* Header */}
              <div className="text-center">
                <p className="font-serif text-[11px] uppercase tracking-[0.3em] text-amber-800">Nehru International School</p>
                <h2 className="mt-1 font-serif text-2xl font-bold uppercase tracking-wide text-neutral-900 sm:text-3xl">
                  {cert.title || 'Certificate'}
                </h2>
                <div className="mx-auto mt-2 h-0.5 w-24 bg-amber-600/70" />
              </div>

              {/* Body */}
              <div className="mt-7 text-center">
                <p className="font-serif text-sm italic text-neutral-600">This is to certify that</p>
                <p className="mt-2 font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl">{studentName}</p>
                <p className="mx-auto mt-4 max-w-md font-serif text-sm leading-relaxed text-neutral-700">
                  {typeLabel === 'Academic Transcript'
                    ? 'has been issued this official academic transcript of records, verified against the school register.'
                    : 'is a bonafide student of Nehru International School, Mumbai, and has been granted this certificate on the strength of the school records.'}
                </p>
                {cert.contentJson && (() => {
                  try {
                    const meta = JSON.parse(cert.contentJson)
                    return meta?.purpose
                      ? <p className="mx-auto mt-3 max-w-md text-xs italic text-neutral-500">Purpose: {meta.purpose}</p>
                      : null
                  } catch { return null }
                })()}
              </div>

              {/* QR + codes */}
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="rounded border border-neutral-300 bg-white p-1.5">
                  <QrCode code={cert.verifyCode || cert.certificateNo} className="h-24 w-24" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500">Verification Code</p>
                  <p className="font-mono text-sm font-semibold text-neutral-900">{cert.verifyCode}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 flex items-end justify-between gap-6 text-xs text-neutral-600">
                <div>
                  <p className="font-mono text-[11px] text-neutral-800">{cert.certificateNo}</p>
                  <p className="mt-1">Issued: {fmtDate(cert.issuedAt || new Date())}</p>
                </div>
                <div className="text-center">
                  <div className="mb-1 h-8 w-40 border-b border-neutral-400" />
                  <p className="text-[10px] uppercase tracking-widest">{cert.issuedBy || 'Authorised Signatory'}</p>
                  <p className="text-[10px] text-neutral-500">Principal, Nehru International School</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
