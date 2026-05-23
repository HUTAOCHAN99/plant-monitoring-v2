// app/components/Navbar.js
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import RoomDHT11 from './RoomDHT11'

export default function Navbar() {
  const pathname = usePathname()

  return (
    <>
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="font-semibold text-gray-800 hover:text-gray-600">
              Plant Monitoring System
            </Link>
            
            <div className="flex space-x-6">
              <Link 
                href="/" 
                className={`text-gray-600 hover:text-gray-900 transition ${
                  pathname === '/' ? 'text-gray-900 border-b-2 border-gray-900' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/research/new" 
                className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
              >
                New Research
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <RoomDHT11 />
    </>
  )
}