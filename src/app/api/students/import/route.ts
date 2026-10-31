import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { resolveTenantContext } from '@/lib/tenant'
import { audit } from '@/lib/audit'

/* eslint-disable @typescript-eslint/no-explicit-any */

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur.trim())
  return result
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowedRoles = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'PRINCIPAL',
    'PRO',
    'ADMISSION_ADMIN',
    'ADMIN_EXECUTIVE',
  ]

  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Only Admission Administrators can import students.' }, { status: 403 })
  }

  const tenantRes = await resolveTenantContext(req, session)
  if (tenantRes.error) return tenantRes.error
  const tenant = tenantRes.context
  const schoolId = tenant.schoolId || null

  try {
    const contentType = req.headers.get('content-type') || ''
    let rows: Array<Record<string, string>> = []

    if (contentType.includes('application/json')) {
      const body = await req.json()
      rows = Array.isArray(body) ? body : body.rows || []
    } else {
      // Parse CSV from text or form-data
      const text = await req.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
      if (lines.length < 2) {
        return NextResponse.json({ error: 'CSV must contain at least a header and one data row.' }, { status: 400 })
      }

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim())
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx] || ''
        })
        rows.push(row)
      }
    }

    if (!rows.length) {
      return NextResponse.json({ error: 'No data rows found to import.' }, { status: 400 })
    }

    // Pre-cache classes and sections for fast resolution
    const [classes, sections] = await Promise.all([
      db.class.findMany({ where: schoolId ? { schoolId } : {}, select: { id: true, name: true } }),
      db.section.findMany({ where: schoolId ? { schoolId } : {}, select: { id: true, name: true, classId: true } }),
    ])

    const classByName = new Map(classes.map(c => [c.name.toLowerCase().trim(), c.id]))
    const sectionByKey = new Map(sections.map(s => [`${s.classId}_${s.name.toLowerCase().trim()}`, s.id]))

    let importedCount = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const firstName = (r.firstName || r['First Name'] || '').trim()
      const lastName = (r.lastName || r['Last Name'] || firstName).trim()

      if (!firstName) {
        errors.push(`Row ${i + 1}: First name is required.`)
        continue
      }

      let admissionNo = (r.admissionNo || r['Admission No'] || r.admission_no || '').trim()
      if (!admissionNo) {
        const count = await db.student.count({ where: schoolId ? { schoolId } : {} })
        admissionNo = `NIS${String(count + i + 1).padStart(5, '0')}`
      }

      // Check if student with admissionNo already exists
      const existing = await db.student.findFirst({
        where: { admissionNo, ...(schoolId ? { schoolId } : {}) }
      })
      if (existing) {
        errors.push(`Row ${i + 1}: Student with Admission No ${admissionNo} already exists.`)
        continue
      }

      // Resolve Class & Section
      const className = (r.className || r['Class'] || r.class || '').toLowerCase().trim()
      const sectionName = (r.sectionName || r['Section'] || r.section || 'A').toLowerCase().trim()

      const classId = className ? classByName.get(className) || null : null
      const sectionId = (classId && sectionName) ? (sectionByKey.get(`${classId}_${sectionName}`) || null) : null

      // Parent details (Father & Mother)
      const fatherName = (r.fatherName || r["Father's Name"] || r.father_name || '').trim()
      const fatherPhone = (r.fatherPhone || r["Father's Phone"] || r.father_phone || '').trim()
      const fatherEmail = (r.fatherEmail || r["Father's Email"] || r.father_email || '').trim()
      const fatherOccupation = (r.fatherOccupation || r["Father's Occupation"] || '').trim()

      const motherName = (r.motherName || r["Mother's Name"] || r.mother_name || '').trim()
      const motherPhone = (r.motherPhone || r["Mother's Phone"] || r.mother_phone || '').trim()
      const motherEmail = (r.motherEmail || r["Mother's Email"] || r.mother_email || '').trim()
      const motherOccupation = (r.motherOccupation || r["Mother's Occupation"] || '').trim()

      const primaryContact = (r.primaryContact || r['Primary Contact'] || 'FATHER').toUpperCase().trim()

      // Link or create Parent record
      let parentId: string | null = null
      const primePhone = primaryContact === 'MOTHER' ? (motherPhone || fatherPhone) : (fatherPhone || motherPhone)
      const primeName = primaryContact === 'MOTHER' ? (motherName || fatherName) : (fatherName || motherName)

      if (primePhone && primeName) {
        let parent = await db.parent.findUnique({ where: { phone: primePhone } }).catch(() => null)
        if (!parent) {
          parent = await db.parent.create({
            data: {
              schoolId,
              name: primeName,
              phone: primePhone,
              relation: primaryContact === 'MOTHER' ? 'MOTHER' : 'FATHER',
              email: (primaryContact === 'MOTHER' ? motherEmail : fatherEmail) || null,
              occupation: (primaryContact === 'MOTHER' ? motherOccupation : fatherOccupation) || null,
            }
          }).catch(() => null)
        }
        if (parent) parentId = parent.id
      }

      await db.student.create({
        data: {
          schoolId,
          admissionNo,
          firstName,
          lastName,
          gender: (r.gender || r['Gender'] || 'MALE').toUpperCase().trim(),
          dob: r.dob ? new Date(r.dob) : null,
          rollNo: r.rollNo || r['Roll No'] || null,
          bloodGroup: r.bloodGroup || r['Blood Group'] || null,
          phone: r.phone || primePhone || null,
          email: r.email || null,
          address: r.address || r['Address'] || null,
          classId,
          sectionId,
          parentId,
          fatherName: fatherName || null,
          fatherPhone: fatherPhone || null,
          fatherEmail: fatherEmail || null,
          fatherOccupation: fatherOccupation || null,
          motherName: motherName || null,
          motherPhone: motherPhone || null,
          motherEmail: motherEmail || null,
          motherOccupation: motherOccupation || null,
          primaryContact: ['FATHER', 'MOTHER', 'GUARDIAN'].includes(primaryContact) ? primaryContact : 'FATHER',
          status: 'ACTIVE',
          admissionDate: new Date(),
        }
      })

      importedCount++
    }

    await audit({
      schoolId,
      userId: session.sub,
      userName: session.name,
      userRole: session.role,
      action: 'IMPORT',
      entity: 'students',
      details: { imported: importedCount, totalRows: rows.length, errorsCount: errors.length },
      ip: req.headers.get('x-forwarded-for'),
    })

    return NextResponse.json({
      success: true,
      imported: importedCount,
      totalRows: rows.length,
      errors: errors.slice(0, 20),
    })
  } catch (err: any) {
    console.error('[students import error]', err)
    return NextResponse.json({ error: err.message || 'Import failed.' }, { status: 500 })
  }
}

