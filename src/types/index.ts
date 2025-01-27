export type CampaignStatus = "Activa" | "Finalizada" | "En espera"

export interface Person {
  id: string
  name: string
  lastName: string
  phone: string
}

export interface Campaign {
  id: string
  name: string
  createdAt: string
  startDate: string
  endDate: string
  recordingStatus: boolean
  status: CampaignStatus
  people: Person[]
}

