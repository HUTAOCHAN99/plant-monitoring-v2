'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PlantDetailModal from './PlantDetailModal'

export default function PlantCard({ plant: initialPlant }) {
  const [plant, setPlant] = useState(initialPlant)
  const [latestSoilMoisture, setLatestSoilMoisture] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    // Subscribe ke perubahan soil moisture data
    const moistureSubscription = supabase
      .channel(`moisture_${plant.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'soil_moisture_data', filter: `plant_id=eq.${plant.id}` },
        (payload) => {
          setLatestSoilMoisture(payload.new)
        }
      )
      .subscribe()

    // Ambil data soil moisture terbaru
    async function fetchLatestSoilMoisture() {
      const { data } = await supabase
        .from('soil_moisture_data')
        .select('*')
        .eq('plant_id', plant.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
      
      if (data && data.length > 0) {
        setLatestSoilMoisture(data[0])
      }
    }
    
    fetchLatestSoilMoisture()

    return () => {
      moistureSubscription.unsubscribe()
    }
  }, [plant.id])

  // Edit nama tanaman
  async function editPlantName() {
    const newName = prompt('Edit plant name:', plant.plant_name)
    if (newName && newName !== plant.plant_name) {
      const { error } = await supabase
        .from('plants')
        .update({ plant_name: newName })
        .eq('id', plant.id)
      
      if (!error) {
        setPlant(prev => ({ ...prev, plant_name: newName }))
      } else {
        alert('Failed to update plant name')
      }
    }
  }

  // Fungsi untuk mendapatkan status kelembaban tanah
  function getMoistureStatus(value) {
    if (!value) return { text: 'No data', color: 'text-gray-500', bg: 'bg-gray-100' }
    
    // Parse value karena bisa dalam bentuk string (TEXT)
    const numericValue = typeof value === 'string' ? parseInt(value) : value
    
    if (isNaN(numericValue)) return { text: 'Invalid', color: 'text-gray-500', bg: 'bg-gray-100' }
    
    if (numericValue > 3000) return { text: 'Dry', color: 'text-red-600', bg: 'bg-red-100' }
    if (numericValue > 2000) return { text: 'Moist', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (numericValue > 1000) return { text: 'Wet', color: 'text-blue-600', bg: 'bg-blue-100' }
    return { text: 'Very Wet', color: 'text-green-600', bg: 'bg-green-100' }
  }

  // Format waktu
  function formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition">
        {/* Header Card */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">
            {plant.plant_name || `Plant ${plant.id.slice(0,4)}`}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Owner: {plant.owner_name || '-'}
          </p>
        </div>
        
        {/* Body Card */}
        <div className="p-4">
          {/* Soil Moisture Section */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Soil Moisture
            </h4>
            
            {latestSoilMoisture ? (
              <div className={`p-3 rounded-md ${getMoistureStatus(latestSoilMoisture.moisture_value).bg}`}>
                <p className="text-xl font-bold">
                  {latestSoilMoisture.moisture_value}
                </p>
                <p className={`text-xs font-medium ${getMoistureStatus(latestSoilMoisture.moisture_value).color}`}>
                  {getMoistureStatus(latestSoilMoisture.moisture_value).text}
                </p>
                {latestSoilMoisture.status && (
                  <p className="text-xs text-gray-500 mt-1">
                    Status: {latestSoilMoisture.status}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatTime(latestSoilMoisture.recorded_at)}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">Waiting for data...</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={editPlantName}
              className="flex-1 text-xs bg-gray-50 text-gray-600 py-2 rounded hover:bg-gray-100 transition"
            >
              Edit Name
            </button>
            <button
              onClick={() => setShowDetailModal(true)}
              className="flex-1 text-xs bg-gray-900 text-white py-2 rounded hover:bg-gray-800 transition"
            >
              View History
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <PlantDetailModal
        plant={plant}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </>
  )
}