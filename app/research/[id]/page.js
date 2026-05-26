'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import PlantCard from '@/app/components/PlantCard'
import YouTubeEmbed from '@/app/components/YouTubeEmbed'
import ToggleSwitch from '@/app/components/ToggleSwitch'

export default function ResearchDetail() {
  const { id } = useParams()
  const [research, setResearch] = useState(null)
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [sensorStatus, setSensorStatus] = useState({ soil_moisture_on: 'LOW' })
  const [isToggling, setIsToggling] = useState(false)
  const [soilMoistureLogs, setSoilMoistureLogs] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [activePlant, setActivePlant] = useState(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPlant, setNewPlant] = useState({ plant_name: '', owner_name: '' })
  const [isAdding, setIsAdding] = useState(false)

  // Fetch functions
  const fetchGlobalSensorStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from('sensor_status')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    
    if (!error && data) {
      setSensorStatus(data)
      setIsRecording(data.soil_moisture_on === 'HIGH')
    }
  }, [])

  const fetchActivePlant = useCallback(async () => {
    console.log('Fetching active plant...')
    
    // First get the active plant ID
    const { data: activeData, error: activeError } = await supabase
      .from('active_plant')
      .select('plant_id, research_id, updated_at')
      .eq('id', 1)
      .single()
    
    if (activeError) {
      console.error('Error fetching active plant:', activeError)
      setActivePlant(null)
      return
    }
    
    console.log('Active plant ID:', activeData?.plant_id)
    
    // If there's a plant_id, fetch the plant details
    if (activeData?.plant_id) {
      const { data: plantData, error: plantError } = await supabase
        .from('plants')
        .select('id, plant_name, owner_name')
        .eq('id', activeData.plant_id)
        .single()
      
      if (plantError) {
        console.error('Error fetching plant details:', plantError)
        setActivePlant(null)
      } else {
        console.log('Plant details:', plantData)
        setActivePlant(plantData)
      }
    } else {
      setActivePlant(null)
    }
  }, [])

  const fetchSoilMoistureLogs = useCallback(async () => {
    // Get active plant first
    const { data: activeData } = await supabase
      .from('active_plant')
      .select('plant_id')
      .eq('id', 1)
      .single()
    
    if (activeData?.plant_id) {
      // Fetch data for active plant
      const { data } = await supabase
        .from('soil_moisture_data')
        .select('*')
        .eq('plant_id', activeData.plant_id)
        .order('recorded_at', { ascending: false })
        .limit(20)
      
      if (data) {
        setSoilMoistureLogs(data)
      }
    } else {
      // If no active plant, show all data or empty
      const { data } = await supabase
        .from('soil_moisture_data')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20)
      
      if (data) {
        setSoilMoistureLogs(data)
      }
    }
  }, [])

  const fetchPlants = useCallback(async () => {
    const { data: plantsData } = await supabase
      .from('plants')
      .select('*')
      .eq('research_id', id)
      .order('created_at', { ascending: true })
    
    if (plantsData) {
      setPlants(plantsData)
    }
  }, [id])

  const fetchResearchDetail = useCallback(async () => {
    setLoading(true)
    const { data: researchData, error } = await supabase
      .from('research')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      toast.error('Failed to load research data')
      setLoading(false)
    } else {
      setResearch(researchData)
      await Promise.all([
        fetchPlants(),
        fetchGlobalSensorStatus(),
        fetchActivePlant(),
        fetchSoilMoistureLogs()
      ])
      setLoading(false)
    }
  }, [id, fetchPlants, fetchGlobalSensorStatus, fetchActivePlant, fetchSoilMoistureLogs])

  const setActivePlantHandler = useCallback(async (plantId, plantName) => {
    setIsSwitching(true)
    
    console.log('Setting active plant to:', plantId, plantName)
    
    // Update active_plant table
    const { error } = await supabase
      .from('active_plant')
      .upsert({
        id: 1,
        plant_id: plantId,
        research_id: id,
        updated_at: new Date().toISOString(),
        updated_by: 'user'
      })
    
    if (!error) {
      toast.success(`Sensor switched to: ${plantName}`)
      await fetchActivePlant()
      await fetchSoilMoistureLogs()
      console.log('Active plant updated successfully')
    } else {
      console.error('Error updating active plant:', error)
      toast.error('Failed to switch sensor: ' + error.message)
    }
    setIsSwitching(false)
  }, [id, fetchActivePlant, fetchSoilMoistureLogs])

  const addNewPlant = useCallback(async () => {
    if (!newPlant.plant_name || !newPlant.owner_name) {
      toast.error('Plant name and owner name are required')
      return
    }

    setIsAdding(true)
    
    const { data, error } = await supabase
      .from('plants')
      .insert([{
        plant_name: newPlant.plant_name,
        owner_name: newPlant.owner_name,
        research_id: id
      }])
      .select()
    
    if (!error) {
      toast.success(`Plant "${newPlant.plant_name}" added`)
      setNewPlant({ plant_name: '', owner_name: '' })
      setShowAddModal(false)
      await fetchPlants()
      
      if (plants.length === 0 && data) {
        await setActivePlantHandler(data[0].id, data[0].plant_name)
      }
    } else {
      toast.error('Failed to add plant')
    }
    setIsAdding(false)
  }, [newPlant, id, fetchPlants, plants.length, setActivePlantHandler])

  const deletePlant = useCallback(async (plantId, plantName) => {
    if (activePlant?.id === plantId) {
      toast.error(`Cannot delete "${plantName}" because it is active. Switch to another plant first.`)
      return
    }
    
    if (confirm(`Delete plant "${plantName}"?`)) {
      const { error } = await supabase
        .from('plants')
        .delete()
        .eq('id', plantId)
      
      if (!error) {
        toast.success(`Plant "${plantName}" deleted`)
        await fetchPlants()
      } else {
        toast.error('Failed to delete plant')
      }
    }
  }, [activePlant?.id, fetchPlants])

  const toggleGlobalSensor = useCallback(async () => {
    setIsToggling(true)
    const newStatus = sensorStatus.soil_moisture_on === 'HIGH' ? 'LOW' : 'HIGH'
    
    const { error } = await supabase
      .from('sensor_status')
      .upsert({
        id: 1,
        soil_moisture_on: newStatus,
        updated_at: new Date(),
        updated_by: `research_${id}`
      })
    
    if (!error) {
      setSensorStatus({ ...sensorStatus, soil_moisture_on: newStatus })
      setIsRecording(newStatus === 'HIGH')
      toast.success(`Relay ${newStatus === 'HIGH' ? 'ON' : 'OFF'}`)
      
      if (newStatus === 'HIGH') {
        await fetchSoilMoistureLogs()
      }
    } else {
      toast.error('Failed to toggle relay')
    }
    setIsToggling(false)
  }, [sensorStatus, id, fetchSoilMoistureLogs])

  // Main effect for initial data loading
  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchResearchDetail()
    }
  }, [id, fetchResearchDetail])

  // Effect for real-time subscriptions
  useEffect(() => {
    if (!id) return

    // Subscribe to ALL new soil moisture data
    const moistureSubscription = supabase
      .channel('moisture_all_' + id)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'soil_moisture_data' },
        (payload) => {
          // Check if the new data belongs to active plant
          const { data: activeData } = supabase
            .from('active_plant')
            .select('plant_id')
            .eq('id', 1)
            .single()
          
          activeData.then(({ data }) => {
            if (data?.plant_id === payload.new.plant_id) {
              setSoilMoistureLogs(prev => [payload.new, ...prev].slice(0, 50))
            }
          })
        }
      )
      .subscribe()

    // Subscribe to active plant changes
    const activePlantSubscription = supabase
      .channel('active_plant_changes_' + id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'active_plant', filter: 'id=eq.1' },
        async () => {
          await fetchActivePlant()
          await fetchSoilMoistureLogs()
        }
      )
      .subscribe()

    // Subscribe to sensor status changes
    const sensorStatusSubscription = supabase
      .channel('sensor_status_changes_' + id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sensor_status', filter: 'id=eq.1' },
        (payload) => {
          setSensorStatus(payload.new)
          setIsRecording(payload.new.soil_moisture_on === 'HIGH')
        }
      )
      .subscribe()

    // Subscribe to plants changes
    const plantsSubscription = supabase
      .channel('plants_changes_' + id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'plants', filter: `research_id=eq.${id}` },
        () => fetchPlants()
      )
      .subscribe()

    return () => {
      moistureSubscription.unsubscribe()
      activePlantSubscription.unsubscribe()
      sensorStatusSubscription.unsubscribe()
      plantsSubscription.unsubscribe()
    }
  }, [id, fetchActivePlant, fetchPlants, fetchSoilMoistureLogs])

  // Effect for auto-refresh when recording
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        fetchSoilMoistureLogs()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [isRecording, fetchSoilMoistureLogs])

  function getMoistureStatus(value) {
    if (!value) return { text: 'No data', color: 'text-gray-500', bg: 'bg-gray-100' }
    let cleanValue = String(value).replace(/[^0-9]/g, '')
    let numericValue = parseInt(cleanValue) || 0
    if (numericValue === 0) return { text: 'No Reading', color: 'text-gray-500', bg: 'bg-gray-100' }
    let percentage = (numericValue / 4095) * 100
    if (percentage > 70) return { text: 'Dry', color: 'text-red-600', bg: 'bg-red-100' }
    if (percentage > 50) return { text: 'Moist', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (percentage > 30) return { text: 'Wet', color: 'text-blue-600', bg: 'bg-blue-100' }
    return { text: 'Very Wet', color: 'text-green-600', bg: 'bg-green-100' }
  }

  function getDisplayValue(rawValue) {
    if (!rawValue) return '--'
    let cleanValue = String(rawValue).replace(/[^0-9]/g, '')
    let numericValue = parseInt(cleanValue) || 0
    if (numericValue === 0) return 'No Reading'
    let percentage = (numericValue / 4095) * 100
    percentage = Math.min(100, Math.max(0, percentage))
    return `${Math.round(percentage)}%`
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="grow flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
      <Footer />
    </div>
  )

  if (!research) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="grow flex items-center justify-center">
        <p className="text-red-600">Research not found</p>
      </div>
      <Footer />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="grow container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{research.title}</h1>
              <p className="text-gray-600 mt-1">{research.description}</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
            >
              Add Plant
            </button>
          </div>
        </div>
        
        {/* YouTube Live Stream */}
        {research.youtube_url && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Live Stream</h2>
            <YouTubeEmbed url={research.youtube_url} />
          </div>
        )}
        
        {/* Control Panel */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Sensor Control</h2>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Relay Status</p>
              <p className={`text-sm font-medium ${sensorStatus.soil_moisture_on === 'HIGH' ? 'text-green-600' : 'text-gray-600'}`}>
                {sensorStatus.soil_moisture_on === 'HIGH' ? 'ACTIVE (ON)' : 'INACTIVE (OFF)'}
              </p>
            </div>
            <ToggleSwitch
              isOn={sensorStatus.soil_moisture_on === 'HIGH'}
              onToggle={toggleGlobalSensor}
              disabled={isToggling}
            />
          </div>
          
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Active Plant</p>
                <p className="text-base font-medium text-gray-900">
                  {activePlant?.plant_name || 'Not selected'}
                </p>
                {activePlant?.owner_name && (
                  <p className="text-xs text-gray-500">Owner: {activePlant.owner_name}</p>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {activePlant?.updated_at && `Updated: ${new Date(activePlant.updated_at).toLocaleTimeString()}`}
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Select Plant to Measure ({plants.length} total):</p>
              {plants.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">No plants yet. Click &quot;Add Plant&quot; to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {plants.map((plant) => (
                    <div key={plant.id} className="relative group">
                      <button
                        onClick={() => setActivePlantHandler(plant.id, plant.plant_name)}
                        disabled={isSwitching}
                        className={`
                          w-full px-3 py-2 rounded-md text-sm font-medium transition-all
                          ${activePlant?.id === plant.id 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                          ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="truncate">{plant.plant_name}</div>
                      </button>
                      <button
                        onClick={() => deletePlant(plant.id, plant.plant_name)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Select which plant currently has the soil moisture sensor attached.
              </p>
            </div>
          </div>
        </div>
        
        {/* Soil Moisture Data - Shows data for active plant */}
        {isRecording && activePlant && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Soil Moisture Sensor Data - {activePlant.plant_name}
            </h2>
            
            {soilMoistureLogs[0] && (
              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Latest Reading</p>
                <div className={`inline-block px-3 py-1 rounded-md mt-2 ${getMoistureStatus(soilMoistureLogs[0].moisture_value).bg}`}>
                  <span className={`text-2xl font-bold ${getMoistureStatus(soilMoistureLogs[0].moisture_value).color}`}>
                    {getDisplayValue(soilMoistureLogs[0].moisture_value)}
                  </span>
                  <span className={`ml-2 text-sm font-medium ${getMoistureStatus(soilMoistureLogs[0].moisture_value).color}`}>
                    {getMoistureStatus(soilMoistureLogs[0].moisture_value).text}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(soilMoistureLogs[0].recorded_at).toLocaleString()}
                </p>
              </div>
            )}
            
            {soilMoistureLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {soilMoistureLogs.slice(0, 10).map((log, idx) => {
                      const status = getMoistureStatus(log.moisture_value)
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {new Date(log.recorded_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm font-mono font-medium">
                            {getDisplayValue(log.moisture_value)}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8 text-sm">
                No soil moisture data yet. Waiting for sensor...
              </p>
            )}
          </div>
        )}
        
        {/* Plants List */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-700">All Plants</h2>
          <span className="text-xs text-gray-500">Total: {plants.length}</span>
        </div>
        
        {plants.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-4">No plants in this research yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
            >
              Add First Plant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plants.map((plant) => (
              <div key={plant.id} className="relative">
                <PlantCard plant={plant} />
                {activePlant?.id === plant.id && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    ACTIVE
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Add Plant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New Plant</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Plant Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm text-gray-800"
                    placeholder="e.g., Tomato Plant"
                    value={newPlant.plant_name}
                    onChange={(e) => setNewPlant({...newPlant, plant_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 text-gray-800 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm"
                    placeholder="e.g., Farmer Group"
                    value={newPlant.owner_name}
                    onChange={(e) => setNewPlant({...newPlant, owner_name: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={addNewPlant}
                  disabled={isAdding}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-md text-sm hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {isAdding ? 'Saving...' : 'Save Plant'}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  )
}