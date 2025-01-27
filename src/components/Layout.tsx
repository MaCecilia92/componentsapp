import type React from "react"

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100" suppressHydrationWarning={true}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Gestión de Campañas Telefónicas</h1>
        {children}
      </div>
    </div>
  )
}

export default Layout

