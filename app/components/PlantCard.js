'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import PlantDetailModal from './PlantDetailModal'

export default function PlantCard({ plant: initialPlant }) {
  const [plant, setPlant] = useState(initialPlant)
  const [latestSoilMoisture, setLatestSoilMoisture] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)

  async function fetchLatestForPlant() {
    try {
      const { data } = await supabase
        .from('soil_moisture_data')
        .select('*')
        .eq('plant_id', plant.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
      
      if (data && data.length > 0) {
        setLatestSoilMoisture(data[0])
      } else {
        setLatestSoilMoisture(null)
      }
    } catch (error) {
      console.error('Error fetching latest data:', error)
    }
  }

  async function checkActive() {
    const { data } = await supabase
      .from('active_plant')
      .select('plant_id')
      .eq('id', 1)
      .single()
    
    setIsActive(data?.plant_id === plant.id)
  }

  useEffect(() => {
    let activeSubscription = null
    let dataSubscription = null
    let pollingInterval = null

    async function init() {
      setLoading(true)
      await checkActive()
      await fetchLatestForPlant()
      setLoading(false)
    }
    
    init()

    activeSubscription = supabase
      .channel('active_changes_card_' + plant.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'active_plant', filter: 'id=eq.1' },
        async (payload) => {
          setIsActive(payload.new?.plant_id === plant.id)
          if (payload.new?.plant_id === plant.id) {
            await fetchLatestForPlant()
          }
        }
      )
      .subscribe()

    dataSubscription = supabase
      .channel('plant_data_card_' + plant.id)
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'soil_moisture_data',
          filter: `plant_id=eq.${plant.id}`
        },
        (payload) => {
          setLatestSoilMoisture(payload.new)
        }
      )
      .subscribe()

    pollingInterval = setInterval(async () => {
      const { data } = await supabase
        .from('active_plant')
        .select('plant_id')
        .eq('id', 1)
        .single()
      
      if (data?.plant_id === plant.id) {
        await fetchLatestForPlant()
      }
    }, 3000)

    return () => {
      if (activeSubscription) activeSubscription.unsubscribe()
      if (dataSubscription) dataSubscription.unsubscribe()
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [plant.id, plant.plant_name])

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

  // Cuma tambah % doang
  function formatValue(value) {
    if (!value && value !== 0) return '--'
    return `${value}%`
  }

  function formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Fungsi untuk warna background berdasarkan status
  function getStatusStyle(status) {
    if (!status) return 'bg-gray-100'
    
    const statusLower = status.toLowerCase()
    if (statusLower === 'dry') return 'bg-red-100'
    if (statusLower === 'moist') return 'bg-yellow-100'
    if (statusLower === 'wet') return 'bg-blue-100'
    if (statusLower === 'very wet') return 'bg-green-100'
    return 'bg-gray-100'
  }

  function getStatusColor(status) {
    if (!status) return 'text-gray-500'
    
    const statusLower = status.toLowerCase()
    if (statusLower === 'dry') return 'text-red-600'
    if (statusLower === 'moist') return 'text-yellow-600'
    if (statusLower === 'wet') return 'text-blue-600'
    if (statusLower === 'very wet') return 'text-green-600'
    return 'text-gray-500'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition">
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900">
                {plant.plant_name || `Plant ${plant.id.slice(0,4)}`}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Owner: {plant.owner_name || '-'}
              </p>
            </div>
            {isActive && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                ACTIVE
              </span>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Soil Moisture
            </h4>
            
            {latestSoilMoisture ? (
              <div className={`p-3 rounded-md ${getStatusStyle(latestSoilMoisture.status)}`}>
                <p className="text-2xl font-bold text-gray-900">
                  {formatValue(latestSoilMoisture.moisture_value)}
                </p>
                {latestSoilMoisture.status && (
                  <p className={`text-xs font-medium ${getStatusColor(latestSoilMoisture.status)}`}>
                    {latestSoilMoisture.status}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatTime(latestSoilMoisture.recorded_at)}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">
                  {isActive ? 'Waiting for sensor data...' : 'Not active'}
                </p>
              </div>
            )}
          </div>
          
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

      <PlantDetailModal
        plant={plant}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </>
  )
}