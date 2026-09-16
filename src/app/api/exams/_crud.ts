import { defineCrud } from '@/lib/crud'
import { notifyRoles } from '@/lib/notify'
import type { Session } from '@/lib/auth'


export const examCrud = defineCrud({
  model: 'exam',
  module: 'examinations',
  searchFields: ['name'],
  filterFields: ['status', 'type', 'academicYearId', 'termId'],
  defaultSort: { field: 'startDate', dir: 'desc' },
  required: ['name', 'type', 'academicYearId', 'startDate', 'endDate'],
  afterUpdate: async (row: any, session: Session, before: any) => {
    // Result publication → notify all parents once
    if (row.resultPublished && !before.resultPublished) {
      await notifyRoles(
        ['PARENT'],
        `${row.name} results published`,
        `Results for ${row.name} are now available. Open the Examinations module to view the report card.`,
        { type: 'SUCCESS', link: 'examinations' },
      )
    }
  },
})
