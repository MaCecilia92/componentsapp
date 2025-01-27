import type { Campaign, CampaignStatus } from "../types"
import { format, isAfter, isBefore, parse } from "date-fns"

export const saveCampaigns = async (campaigns: Campaign[]): Promise<void> => {
  return new Promise((resolve) => {
    localStorage.setItem("campaigns", JSON.stringify(campaigns))
    resolve()
  })
}

export const getCampaigns = async (): Promise<Campaign[]> => {
  return new Promise((resolve) => {
    const campaigns = localStorage.getItem("campaigns")
    resolve(campaigns ? JSON.parse(campaigns) : [])
  })
}

export const isDateInFuture = (date: Date): boolean => {
  return isAfter(date, new Date())
}

export const formatDate = (date: Date): string => {
  return format(date, "dd/MM/yyyy HH:mm")
}

export const parseDate = (dateString: string): Date => {
  return parse(dateString, "dd/MM/yyyy HH:mm", new Date())
}

export const hasCampaigns = async (): Promise<boolean> => {
  const campaigns = await getCampaigns()
  return campaigns.length > 0
}

export const isDateInPast = (date: Date): boolean => {
  return isBefore(date, new Date())
}

export const updateCampaignStatuses = async (): Promise<Campaign[]> => {
  const campaigns = await getCampaigns()
  const now = Date.now()
  let updated = false

  const updatedCampaigns = campaigns.map((campaign) => {
    const startDate = parseDate(campaign.startDate).getTime()
    const endDate = parseDate(campaign.endDate).getTime()

    let newStatus: CampaignStatus = campaign.status

    if (campaign.status === "En espera" && now >= startDate) {
      newStatus = "Activa"
      updated = true
    } else if (campaign.status === "Activa" && now >= endDate) {
      newStatus = "Finalizada"
      updated = true
    }

    return { ...campaign, status: newStatus }
  })

  if (updated) {
    await saveCampaigns(updatedCampaigns)
  }

  return updatedCampaigns
}

