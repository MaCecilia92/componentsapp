import { QueryClient, QueryClientProvider } from "react-query"
import { Toaster } from "react-hot-toast"
import HomePage from "./components/HomePage"

const queryClient = new QueryClient()
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-center">Gestión de Campañas Telefónicas</h1>
          <HomePage />
        </div>
      </div>
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}

export default App
