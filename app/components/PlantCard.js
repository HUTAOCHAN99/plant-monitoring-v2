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

  function convertToPercentage(rawValue) {
    if (!rawValue && rawValue !== 0) return 0
    let cleanValue = String(rawValue).replace(/[^0-9]/g, '')
    let numericValue = parseInt(cleanValue) || 0
    if (numericValue === 0) return 0
    let percentage = (numericValue / 4095) * 100
    percentage = Math.min(100, Math.max(0, percentage))
    return Math.round(percentage)
  }

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
        console.log(`📊 Card ${plant.plant_name}: Latest data = ${data[0].moisture_value}`)
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
    
    const active = data?.plant_id === plant.id
    setIsActive(active)
    console.log(`📍 Card ${plant.plant_name}: Active = ${active}`)
    return active
  }

  // Real-time subscription dan polling untuk semua card
  useEffect(() => {
    let activeSubscription = null
    let dataSubscription = null
    let pollingInterval = null

    async function init() {
      setLoading(true)
      const active = await checkActive()
      await fetchLatestForPlant()
      setLoading(false)
    }
    
    init()

    // Subscribe ke perubahan active plant
    activeSubscription = supabase
      .channel('active_changes_card_' + plant.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'active_plant', filter: 'id=eq.1' },
        async (payload) => {
          const isNowActive = payload.new?.plant_id === plant.id
          console.log(`🔄 Card ${plant.plant_name}: Active changed to ${isNowActive}`)
          setIsActive(isNowActive)
          // Jika jadi aktif, ambil data terbaru
          if (isNowActive) {
            await fetchLatestForPlant()
          }
        }
      )
      .subscribe()

    // Subscribe ke data baru untuk plant ini (REAL-TIME)
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
          console.log(`🔴 LIVE: Card ${plant.plant_name} received new data:`, payload.new.moisture_value)
          // Langsung update state dengan data baru
          setLatestSoilMoisture(payload.new)
        }
      )
      .subscribe()

    // Polling setiap 3 detik untuk card yang AKTIF saja (fallback)
    pollingInterval = setInterval(async () => {
      const currentActive = await checkActive()
      if (currentActive) {
        console.log(`🔄 Polling: Checking latest for active card ${plant.plant_name}`)
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

  function getMoistureStatus(rawValue) {
    if (!rawValue) return { text: 'No Data', color: 'text-gray-500', bg: 'bg-gray-100' }
    
    const cleanValue = String(rawValue).replace(/[^0-9]/g, '')
    const numericValue = parseInt(cleanValue) || 0
    
    if (numericValue === 0) {
      return { text: 'No Reading', color: 'text-gray-500', bg: 'bg-gray-100' }
    }
    
    const percentage = convertToPercentage(rawValue)
    if (percentage > 70) return { text: 'Dry', color: 'text-red-600', bg: 'bg-red-100' }
    if (percentage > 50) return { text: 'Moist', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (percentage > 30) return { text: 'Wet', color: 'text-blue-600', bg: 'bg-blue-100' }
    return { text: 'Very Wet', color: 'text-green-600', bg: 'bg-green-100' }
  }

  function formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  function getDisplayValue(rawValue) {
    if (!rawValue) return '--'
    const percentage = convertToPercentage(rawValue)
    if (percentage === 0) return '0%'
    return `${percentage}%`
  }

  function getRawValue(rawValue) {
    if (!rawValue) return '--'
    return String(rawValue).replace(/[^0-9]/g, '')
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

  const displayPercentage = latestSoilMoisture ? convertToPercentage(latestSoilMoisture.moisture_value) : 0
  const status = getMoistureStatus(latestSoilMoisture?.moisture_value)
  const rawDisplay = latestSoilMoisture ? getRawValue(latestSoilMoisture.moisture_value) : '--'

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
              <div className={`p-3 rounded-md ${status.bg}`}>
                <p className="text-2xl font-bold" style={{ color: status.color }}>
                  {displayPercentage === 0 ? 'No Reading' : `${displayPercentage}%`}
                </p>
                <p className={`text-xs font-medium ${status.color}`}>
                  {status.text}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Raw: {rawDisplay}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatTime(latestSoilMoisture.recorded_at)}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">
                  {isActive ? 'Waiting for sensor data...' : 'Not active'}
                </p>
                {isActive && (
                  <p className="text-xs text-gray-400 mt-1">
                    Data will appear automatically when sensor sends reading
                  </p>
                )}
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