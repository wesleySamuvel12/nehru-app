/**
 * Leave / OD / IOD Constants and Metadata (Client-Safe).
 * Can be safely imported in both client and server components.
 */

export type RouteKey =
  | 'ROUTE_A'
  | 'ROUTE_B'
  | 'ROUTE_C'
  | 'ROUTE_D'
  | 'ROUTE_E'
  | 'ROUTE_F'
  // Compatibility aliases
  | 'TEACHING_9_12'
  | 'TEACHING_KG_8'
  | 'ADMINISTRATIVE'
  | 'NON_TEACHING'
  | 'ROUTE_A_PRINCIPAL'
  | 'ROUTE_B_COORDINATOR'
  | 'ROUTE_C_HEADMISTRESS'
  | 'ROUTE_D_TEACHING_9_12'
  | 'ROUTE_E_TEACHING_KG_8'
  | 'ROUTE_F_ADMINISTRATIVE'

export const ROUTE_METADATA: Record<string, { label: string; description: string; requiresPrincipal: boolean }> = {
  ROUTE_A: {
    label: "Route A — Principal's Own Request",
    description: 'CEO & Secretary (TO), Correspondent (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: false,
  },
  ROUTE_B: {
    label: 'Route B — Academic Coordinator',
    description: 'Correspondent (TO), Principal (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: true,
  },
  ROUTE_C: {
    label: 'Route C — Headmistress',
    description: 'Correspondent (TO), Principal (TO), Academic Coordinator (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: true,
  },
  ROUTE_D: {
    label: 'Route D — Teaching Staff, Grade 9 to 12',
    description: 'Principal (TO), HOD (TO), Academic Coordinator (TO), Alternative Staff (TO)',
    requiresPrincipal: true,
  },
  ROUTE_E: {
    label: 'Route E — Teaching Staff, KG to Grade 8',
    description: 'Principal (TO), Headmistress (TO), Academic Coordinator (TO), Alternative Staff (TO)',
    requiresPrincipal: true,
  },
  ROUTE_F: {
    label: 'Route F — Administrative Staff',
    description: 'Correspondent (TO), Principal (TO), Admin Executive (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: true,
  },
  // Aliases
  ROUTE_A_PRINCIPAL: {
    label: "Route A — Principal's Own Request",
    description: 'CEO & Secretary (TO), Correspondent (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: false,
  },
  ROUTE_B_COORDINATOR: {
    label: 'Route B — Academic Coordinator',
    description: 'Correspondent (TO), Principal (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: true,
  },
  ROUTE_C_HEADMISTRESS: {
    label: 'Route C — Headmistress',
    description: 'Correspondent (TO), Principal (TO), Academic Coordinator (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: true,
  },
  ROUTE_D_TEACHING_9_12: {
    label: 'Route D — Teaching Staff, Grade 9 to 12',
    description: 'Principal (TO), HOD (TO), Academic Coordinator (TO), Alternative Staff (TO)',
    requiresPrincipal: true,
  },
  ROUTE_E_TEACHING_KG_8: {
    label: 'Route E — Teaching Staff, KG to Grade 8',
    description: 'Principal (TO), Headmistress (TO), Academic Coordinator (TO), Alternative Staff (TO)',
    requiresPrincipal: true,
  },
  ROUTE_F_ADMINISTRATIVE: {
    label: 'Route F — Administrative Staff',
    description: 'Correspondent (TO), Principal (TO), Admin Executive (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: true,
  },
  TEACHING_9_12: {
    label: 'Route D — Teaching Staff, Grade 9 to 12',
    description: 'Principal (TO), HOD (TO), Academic Coordinator (TO), Alternative Staff (TO)',
    requiresPrincipal: true,
  },
  TEACHING_KG_8: {
    label: 'Route E — Teaching Staff, KG to Grade 8',
    description: 'Principal (TO), Headmistress (TO), Academic Coordinator (TO), Alternative Staff (TO)',
    requiresPrincipal: true,
  },
  ADMINISTRATIVE: {
    label: 'Route F — Administrative Staff',
    description: 'Correspondent (TO), Principal (TO), Admin Executive (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: true,
  },
  NON_TEACHING: {
    label: 'Route F — Administrative Staff',
    description: 'Correspondent (TO), Principal (TO), Admin Executive (TO), Alternative Staff (TO), Head-AO (CC), HR (CC)',
    requiresPrincipal: true,
  },
}

