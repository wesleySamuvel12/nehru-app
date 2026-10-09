import { counsellorApi } from '@/role/counsellor/api'
export const counsellorService = { loadLeads: counsellorApi.leads, loadApplications: counsellorApi.applications, loadCampaigns: counsellorApi.campaigns }
