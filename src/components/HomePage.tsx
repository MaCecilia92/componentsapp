import { useState, useMemo } from "react"
import { useQuery } from "react-query"
import { getCampaigns, saveCampaigns, parseDate } from "../utils"
import CampaignForm from "./CampaignForm"
import CampaignList from "./CampaignList"
import type { Campaign, CampaignStatus } from "../types"

const HomePage = () => {
  const [showForm, setShowForm] = useState(false)
  // const queryClient = useQueryClient()

  const {
    data: campaigns = [],
    isLoading,
    isError,
  } = useQuery<Campaign[]>(
    "campaigns",
    async () => {
      const fetchedCampaigns = await getCampaigns()

      const updateCampaignStatuses = (campaigns: Campaign[]) => {
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

          return newStatus !== campaign.status ? { ...campaign, status: newStatus } : campaign
        })

        if (updated) {
          saveCampaigns(updatedCampaigns)
        }

        return updatedCampaigns
      }

      return updateCampaignStatuses(fetchedCampaigns)
    },
    {
      refetchInterval: 60000, // Revalidate every 60 seconds
    },
  )

  const campaignStats = useMemo(() => {
    const totalPeople = campaigns.reduce((sum, campaign) => sum + campaign.people.length, 0)
    const activeCampaigns = campaigns.filter((c) => c.status === "Activa").length
    const finishedCampaigns = campaigns.filter((c) => c.status === "Finalizada").length
    const waitingCampaigns = campaigns.filter((c) => c.status === "En espera").length

    return { totalPeople, activeCampaigns, finishedCampaigns, waitingCampaigns }
  }, [campaigns])

  const { totalPeople, activeCampaigns, finishedCampaigns, waitingCampaigns } = campaignStats

  if (isLoading) {
    return <div>Cargando campañas...</div>
  }

  if (isError) {
    return <div>Error al cargar las campañas. Por favor, intente de nuevo.</div>
  }

  return (
    <div>
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Resumen de Campañas</h2>

        {campaigns.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <p className="text-lg font-semibold">{totalPeople}</p>
              <p className="text-sm text-gray-600">Personas a contactar</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg">
              <p className="text-lg font-semibold">{activeCampaigns}</p>
              <p className="text-sm text-gray-600">Campañas Activas</p>
            </div>
            <div className="bg-red-100 p-4 rounded-lg">
              <p className="text-lg font-semibold">{finishedCampaigns}</p>
              <p className="text-sm text-gray-600">Campañas Finalizadas</p>
            </div>
            <div className="bg-yellow-100 p-4 rounded-lg">
              <p className="text-lg font-semibold">{waitingCampaigns}</p>
              <p className="text-sm text-gray-600">Campañas En espera</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">No hay campañas creadas aún.</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-semibold">Lista de Campañas</h2>
        <button
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          onClick={() => setShowForm(true)}
        >
          Crear Nueva Campaña
        </button>
      </div>
      {showForm && <CampaignForm onClose={() => setShowForm(false)} />}
      {campaigns.length > 0 ? (
        <CampaignList campaigns={campaigns} />
      ) : (
        <p className="text-center text-gray-600">No hay campañas creadas. ¡Crea tu primera campaña!</p>
      )}
    </div>
  )
}

export default HomePage

