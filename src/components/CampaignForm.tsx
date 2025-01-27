import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useMutation, useQueryClient } from "react-query"
import { v4 as uuidv4 } from "uuid"
import toast from "react-hot-toast"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { parse} from "date-fns"
import type { Campaign, Person, CampaignStatus } from "../types"
import { saveCampaigns, getCampaigns, formatDate } from "../utils"

interface CampaignFormProps {
  onClose: () => void
  campaign?: Campaign
}

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

const validateDates = (
  status: CampaignStatus,
  startDate: Date | null,
  endDate: Date | null,
): { startDateError: string | null; endDateError: string | null; isValid: boolean } => {
  const now = new Date()
  let startDateError: string | null = null
  let endDateError: string | null = null

  if (status === "En espera" && startDate) {
    if (startDate < now) {
      startDateError = "La fecha y hora de inicio debe ser igual o posterior a la fecha y hora actual."
    }
  }

  if (endDate) {
    if (endDate <= (status === "En espera" ? startDate || now : now)) {
      endDateError = "La fecha y hora de fin debe ser posterior a la fecha y hora actual o de inicio."
    }
  }

  return { startDateError, endDateError, isValid: !startDateError && !endDateError }
}

const CampaignForm: React.FC<CampaignFormProps> = ({ onClose, campaign }) => {
  const [name, setName] = useState(campaign?.name || "")
  const [startDate, setStartDate] = useState<Date | null>(() => {
    if (campaign?.startDate) {
      return parse(campaign.startDate, "dd/MM/yyyy HH:mm", new Date())
    }
    return null
  })
  const [endDate, setEndDate] = useState<Date | null>(() => {
    if (campaign?.endDate) {
      return parse(campaign.endDate, "dd/MM/yyyy HH:mm", new Date())
    }
    return null
  })
  const [recordingStatus, setRecordingStatus] = useState(campaign?.recordingStatus || false)
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status || "En espera")
  const [people, setPeople] = useState<Person[]>(campaign?.people || [])
  const [personName, setPersonName] = useState("")
  const [personLastName, setPersonLastName] = useState("")
  const [personPhone, setPersonPhone] = useState("")
  const [startDateError, setStartDateError] = useState<string | null>(null)
  const [endDateError, setEndDateError] = useState<string | null>(null)
  const [personNameError, setPersonNameError] = useState("")
  const [personLastNameError, setPersonLastNameError] = useState("")
  const [personPhoneError, setPersonPhoneError] = useState("")

  const queryClient = useQueryClient()

  const updateStartDate = useCallback((newStatus: CampaignStatus, currentStartDate: Date | null) => {
    if (newStatus === "Activa") {
      return new Date()
    }
    return currentStartDate
  }, [])

  useEffect(() => {
    setStartDate((prevStartDate) => updateStartDate(status, prevStartDate))
  }, [status, updateStartDate])

  useEffect(() => {
    const { startDateError, endDateError } = validateDates(status, startDate, endDate)
    setStartDateError(startDateError)
    setEndDateError(endDateError)
  }, [status, startDate, endDate])

  const isFormValid = useCallback((): boolean => {
    if (!name.trim() || people.length === 0) {
      return false
    }
    return validateDates(status, startDate, endDate).isValid
  }, [name, people.length, status, startDate, endDate])

  const mutation = useMutation<Campaign, Error, Campaign>(
    async (newCampaign: Campaign) => {
      const campaigns = await getCampaigns()
      const updatedCampaigns = campaign
        ? campaigns.map((c) => (c.id === campaign.id ? newCampaign : c))
        : [...campaigns, newCampaign]
      await saveCampaigns(updatedCampaigns)
      return newCampaign
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("campaigns")
        toast.success(campaign ? "Campaña actualizada" : "Campaña creada")
        onClose()
      },
    },
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid()) {
      return
    }

    const now = new Date()
    const actualStartDate = status === "Activa" ? now : startDate || now

    const newCampaign: Campaign = {
      id: campaign?.id || uuidv4(),
      name,
      createdAt: campaign?.createdAt || formatDate(now),
      startDate: formatDate(actualStartDate),
      endDate: formatDate(endDate!),
      recordingStatus,
      status,
      people: [...(campaign?.people || []), ...people],
    }

    mutation.mutate(newCampaign)
  }

  const addPerson = () => {
    let isValid = true

    if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(personName)) {
      setPersonNameError("El nombre solo debe contener letras y espacios")
      isValid = false
    } else {
      setPersonNameError("")
    }

    if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(personLastName)) {
      setPersonLastNameError("El apellido solo debe contener letras y espacios")
      isValid = false
    } else {
      setPersonLastNameError("")
    }

    if (!isValidPhoneNumber(personPhone)) {
      setPersonPhoneError("El número de teléfono debe tener entre 7 y 15 dígitos")
      isValid = false
    } else {
      setPersonPhoneError("")
    }

    if (!isValid) {
      return
    }

    if (people.some((p) => p.phone === personPhone)) {
      toast.error("Ya existe una persona con este número de teléfono en la campaña.")
      return
    }

    const newPerson: Person = {
      id: uuidv4(),
      name: personName,
      lastName: personLastName,
      phone: personPhone,
    }

    setPeople([...people, newPerson])
    setPersonName("")
    setPersonLastName("")
    setPersonPhone("")
    toast.success("Persona agregada a la campaña")
  }

  const isSubmitDisabled = useMemo(() => {
    return !name.trim() || !endDate || people.length === 0 || (status === "En espera" && !startDate) || !isFormValid()
  }, [name, endDate, people.length, status, startDate, isFormValid])

  const renderAssociatedPeople = useCallback(() => {
    const allPeople = (campaign?.people || []).concat(people)
    return allPeople.length > 0 ? (
      <ul className="space-y-2">
        {allPeople.map((person) => (
          <li key={person.id} className="bg-gray-100 rounded-lg p-3 shadow-sm">
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
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500 italic">No hay personas asociadas a esta campaña.</p>
    )
  }, [campaign?.people, people])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white w-full max-w-md mx-auto p-6 rounded-lg shadow-xl overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          {campaign ? "Editar Campaña" : "Crear Nueva Campaña"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Nombre
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {setName(e.target.value)}}
              className={"shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
              Estado inicial
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as CampaignStatus)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="En espera">En espera</option>
              <option value="Activa">Activa</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
              Fecha y hora de inicio
            </label>
            <DatePicker
              selected={startDate}
              onChange={(date: Date | null) => {
                setStartDate(date)
                if (date && (!endDate || endDate <= date)) {
                  setEndDate(new Date(date.getTime() + 60 * 60 * 1000))
                }
              }}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Hora"
              dateFormat="dd/MM/yyyy HH:mm"
              placeholderText="Seleccione fecha y hora de inicio"
              minDate={status === "En espera" ? new Date() : undefined}
              className={`w-full py-2 px-3 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                startDateError ? "border-red-500" : ""
              }`}
              disabled={status === "Activa"}
              wrapperClassName="w-full"
            />
            {startDateError && <p className="text-red-500 text-xs italic mt-1">{startDateError}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endDate">
              Fecha y hora de fin
            </label>
            <DatePicker
              selected={endDate}
              onChange={(date: Date | null) => {
                setEndDate(date)
              }}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Hora"
              dateFormat="dd/MM/yyyy HH:mm"
              placeholderText="Seleccione fecha y hora de fin"
              minDate={startDate || new Date()}
              className={`w-full py-2 px-3 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                endDateError ? "border-red-500" : ""
              }`}
              wrapperClassName="w-full"
            />
            {endDateError && <p className="text-red-500 text-xs italic mt-1">{endDateError}</p>}
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={recordingStatus}
                onChange={(e) => setRecordingStatus(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="ml-2 text-gray-700">Grabar llamada</span>
            </label>
          </div>
          <div className="mb-4">
            <h4 className="text-md font-medium mb-2">Agregar Persona</h4>
            <div className="space-y-4 mb-4">
              <div>
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => {
                    setPersonName(e.target.value)
                    if (/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(e.target.value)) {
                      setPersonNameError("")
                    } else {
                      setPersonNameError("El nombre solo debe contener letras y espacios")
                    }
                  }}
                  placeholder="Nombre"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    personNameError ? "border-red-500" : ""
                  }`}
                />
                {personNameError && <p className="text-red-500 text-xs mt-0.5">{personNameError}</p>}
              </div>
              <div>
                <input
                  type="text"
                  value={personLastName}
                  onChange={(e) => {
                    setPersonLastName(e.target.value)
                    if (/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/.test(e.target.value)) {
                      setPersonLastNameError("")
                    } else {
                      setPersonLastNameError("El apellido solo debe contener letras y espacios")
                    }
                  }}
                  placeholder="Apellido"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    personLastNameError ? "border-red-500" : ""
                  }`}
                />
                {personLastNameError && <p className="text-red-500 text-xs mt-0.5">{personLastNameError}</p>}
              </div>
              <div>
                <input
                  type="tel"
                  value={personPhone}
                  onChange={(e) => {
                    const formattedNumber = formatPhoneNumber(e.target.value)
                    setPersonPhone(formattedNumber)
                    if (isValidPhoneNumber(formattedNumber)) {
                      setPersonPhoneError("")
                    } else {
                      setPersonPhoneError("El número de teléfono debe tener entre 7 y 15 dígitos")
                    }
                  }}
                  placeholder="Número de teléfono"
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    personPhoneError ? "border-red-500" : ""
                  }`}
                />
                {personPhoneError && <p className="text-red-500 text-xs mt-0.5">{personPhoneError}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={addPerson}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
              Agregar Persona
            </button>
          </div>
          <div className="mb-4">
            <h4 className="text-lg font-semibold mb-3">Personas Asociadas</h4>
            {renderAssociatedPeople()}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                isSubmitDisabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isSubmitDisabled}
            >
              {campaign ? "Actualizar Campaña" : "Crear Campaña"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CampaignForm

