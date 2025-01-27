import { useState } from "react"
import { useMutation, useQueryClient } from "react-query"
import toast from "react-hot-toast"
import type { Campaign, Person } from "../types"
import { saveCampaigns } from "../utils"
import ConfirmationModal from "./ConfirmationModal"
import { v4 as uuidv4 } from "uuid"

const isValidPhoneNumber = (phone: string) => {
  const digitsOnly = phone.replace(/\D/g, "")
  return digitsOnly.length >= 7 && digitsOnly.length <= 15
}

const formatPhoneNumber = (value: string) => {
  if (!value) return value
  const phoneNumber = value.replace(/[^\d]/g, "")
  const phoneNumberLength = phoneNumber.length
  if (phoneNumberLength < 4) return phoneNumber
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
}

interface CampaignListProps {
  campaigns: Campaign[]
}

const CampaignList: React.FC<CampaignListProps> = ({ campaigns }) => {
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null)
  const [addingPersonToCampaign, setAddingPersonToCampaign] = useState<Campaign | null>(null)
  const [newPersonName, setNewPersonName] = useState("")
  const [newPersonLastName, setNewPersonLastName] = useState("")
  const [newPersonPhone, setNewPersonPhone] = useState("")
  const [nameError, setNameError] = useState("")
  const [lastNameError, setLastNameError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const queryClient = useQueryClient()

  const finishCampaign = useMutation<void, Error, string>(
    async (id: string) => {
      const updatedCampaigns = campaigns.map((c) => (c.id === id ? { ...c, status: "Finalizada" as const } : c))
      await saveCampaigns(updatedCampaigns)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("campaigns")
        toast.success("Campaña finalizada")
      },
    },
  )

  const deleteCampaign = useMutation<void, Error, string>(
    async (id: string) => {
      const updatedCampaigns = campaigns.filter((c) => c.id !== id)
      await saveCampaigns(updatedCampaigns)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("campaigns")
        toast.success("Campaña eliminada")
        setDeletingCampaign(null)
      },
    },
  )

  const updateCampaign = useMutation<void, Error, Campaign>(
    async (updatedCampaign: Campaign) => {
      const updatedCampaigns = campaigns.map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c))
      await saveCampaigns(updatedCampaigns)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("campaigns")
        toast.success("Campaña actualizada")
      },
    },
  )

  const handleFinish = (id: string) => {
    const campaign = campaigns.find((c) => c.id === id)
    if (campaign && campaign.status === "Activa") {
      finishCampaign.mutate(id)
    } else {
      toast.error("Solo se pueden finalizar campañas activas")
    }
  }

  const handleDelete = (campaign: Campaign) => {
    if (campaign.status === "En espera") {
      setDeletingCampaign(campaign)
    } else {
      toast.error("Solo se pueden eliminar campañas en espera")
    }
  }

  const confirmDelete = () => {
    if (deletingCampaign) {
      deleteCampaign.mutate(deletingCampaign.id)
    }
  }

  const handleDeletePerson = (campaignId: string, personId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId)
    if (campaign) {
      if (campaign.status === "Finalizada") {
        toast.error("No se pueden eliminar personas de una campaña finalizada.")
        return
      }
      if (campaign.people.length <= 1) {
        toast.error("No se puede eliminar la última persona asociada a la campaña.")
        return
      }
      const updatedPeople = campaign.people.filter((p) => p.id !== personId)
      const updatedCampaign = { ...campaign, people: updatedPeople }
      updateCampaign.mutate(updatedCampaign)
    }
  }

  const handleAddPerson = (campaignId: string) => {
    let isValid = true

    if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(newPersonName)) {
      setNameError("El nombre solo debe contener letras y espacios")
      isValid = false
    } else {
      setNameError("")
    }

    if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(newPersonLastName)) {
      setLastNameError("El apellido solo debe contener letras y espacios")
      isValid = false
    } else {
      setLastNameError("")
    }

    if (!isValidPhoneNumber(newPersonPhone)) {
      setPhoneError("El número de teléfono debe tener entre 7 y 15 dígitos")
      isValid = false
    } else {
      setPhoneError("")
    }

    if (!isValid) {
      return
    }

    const campaign = campaigns.find((c) => c.id === campaignId)
    if (campaign) {
      if (campaign.people.some((person) => person.phone === newPersonPhone)) {
        toast.error("Ya existe una persona con este número de teléfono en la campaña.")
        return
      }

      const newPerson: Person = {
        id: uuidv4(),
        name: newPersonName,
        lastName: newPersonLastName,
        phone: newPersonPhone,
      }
      const updatedPeople = [...campaign.people, newPerson]
      const updatedCampaign = { ...campaign, people: updatedPeople }
      updateCampaign.mutate(updatedCampaign)
      setNewPersonName("")
      setNewPersonLastName("")
      setNewPersonPhone("")
      setAddingPersonToCampaign(null)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Activa":
        return "bg-green-100 text-green-800"
      case "Finalizada":
        return "bg-red-100 text-red-800"
      case "En espera":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white shadow rounded-lg p-4 sm:p-6 flex flex-col min-h-[500px] relative">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg sm:text-xl font-semibold">{campaign.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-gray-600 mb-2">Fecha de inicio: {campaign.startDate}</p>
            <p className="text-gray-600 mb-2">Fecha de fin: {campaign.endDate}</p>
            <div className="mb-1 flex-grow overflow-hidden">
              <h4 className="text-md sm:text-lg font-semibold mb-2">Personas asociadas:</h4>
              <div className="overflow-y-auto max-h-[160px] pr-2">
                {campaign.people.length > 0 ? (
                  <ul className="space-y-2">
                    {campaign.people.map((person) => (
                      <li key={person.id} className="bg-gray-100 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center text-white font-semibold mr-3">
                              {person.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">
                                {person.name} {person.lastName}
                              </p>
                              <p className="text-sm text-gray-600">{formatPhoneNumber(person.phone)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeletePerson(campaign.id, person.id)}
                            className={`text-red-500 hover:text-red-700 ${
                              campaign.status === "Finalizada" ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            disabled={campaign.status === "Finalizada"}
                          >
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 italic text-sm sm:text-base">No hay personas asociadas</p>
                )}
              </div>
            </div>
            {campaign.status !== "Finalizada" && (
              <button
                onClick={() => setAddingPersonToCampaign(campaign)}
                className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-sm w-full"
              >
                Agregar Persona
              </button>
            )}
            {addingPersonToCampaign?.id === campaign.id && (
              <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10">
                <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-sm">
                  <h3 className="text-lg font-semibold mb-4">Agregar Persona</h3>
                  <div className="space-y-4 mb-4">
                    <div>
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="Nombre"
                        className={`w-full p-2 border rounded ${nameError ? "border-red-500" : ""}`}
                      />
                      {nameError && <p className="text-red-500 text-xs mt-0.5">{nameError}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newPersonLastName}
                        onChange={(e) => setNewPersonLastName(e.target.value)}
                        placeholder="Apellido"
                        className={`w-full p-2 border rounded ${lastNameError ? "border-red-500" : ""}`}
                      />
                      {lastNameError && <p className="text-red-500 text-xs mt-0.5">{lastNameError}</p>}
                    </div>
                    <div>
                      <input
                        type="tel"
                        value={newPersonPhone}
                        onChange={(e) => {
                          const formattedNumber = formatPhoneNumber(e.target.value)
                          setNewPersonPhone(formattedNumber)
                          if (isValidPhoneNumber(formattedNumber)) {
                            setPhoneError("")
                          } else {
                            setPhoneError("El número de teléfono debe tener entre 7 y 15 dígitos")
                          }
                        }}
                        placeholder="Número de teléfono"
                        className={`w-full p-2 border rounded ${phoneError ? "border-red-500" : ""}`}
                      />
                      {phoneError && <p className="text-red-500 text-xs mt-0.5">{phoneError}</p>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAddPerson(campaign.id)}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex-grow"
                    >
                      Agregar
                    </button>
                    <button
                      onClick={() => setAddingPersonToCampaign(null)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded flex-grow"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => handleFinish(campaign.id)}
                className={`bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded text-sm sm:text-base flex-grow ${
                  campaign.status !== "Activa" ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={campaign.status !== "Activa"}
              >
                Finalizar
              </button>
              <button
                onClick={() => handleDelete(campaign)}
                className={`bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 sm:py-2 sm:px-4 rounded text-sm sm:text-base flex-grow ${
                  campaign.status !== "En espera" ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={campaign.status !== "En espera"}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmationModal
        isOpen={!!deletingCampaign}
        onClose={() => setDeletingCampaign(null)}
        onConfirm={confirmDelete}
        message={`¿Está seguro de que desea eliminar la campaña "${deletingCampaign?.name}"?`}
      />
    </>
  )
}

export default CampaignList

