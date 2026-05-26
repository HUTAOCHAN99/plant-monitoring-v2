'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// CustomTooltip defined outside component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const getMoistureStatusForTooltip = (value) => {
      if (!value && value !== 0) return 'No data'
      if (value === 0) return 'Sensor Disconnected'
      if (value > 70) return 'Dry'
      if (value > 50) return 'Moist'
      if (value > 30) return 'Wet'
      return 'Very Wet'
    }
    
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-semibold text-gray-900">
          Moisture: {payload[0].value === 0 ? 'No Reading' : `${payload[0].value}%`}
        </p>
        <p className="text-xs text-gray-500">
          Status: {getMoistureStatusForTooltip(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export default function PlantDetailModal({ plant, isOpen, onClose }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('day')
  const [roomDHT, setRoomDHT] = useState([])
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [error, setError] = useState(null)

  // Fungsi untuk konversi raw value ke persen (0-4095 -> 0-100%)
  function convertToPercentage(rawValue) {
    if (!rawValue && rawValue !== 0) return 0
    // Bersihkan nilai dari karakter non-digit
    let cleanValue = String(rawValue).replace(/[^0-9]/g, '')
    let numericValue = parseInt(cleanValue) || 0
    if (numericValue === 0) return 0 // Sensor disconnected
    // Konversi ke persen (0-4095 -> 0-100%)
    let percentage = (numericValue / 4095) * 100
    // Batasi antara 0-100%
    percentage = Math.min(100, Math.max(0, percentage))
    return Math.round(percentage)
  }

  useEffect(() => {
    if (isOpen && plant) {
      fetchPlantData()
      fetchRoomData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, plant, timeRange])

  async function fetchPlantData() {
    setLoading(true)
    setError(null)
    
    let startDate = new Date()
    if (timeRange === 'day') {
      startDate.setHours(0, 0, 0, 0)
    } else if (timeRange === 'week') {
      startDate.setDate(startDate.getDate() - 7)
    } else if (timeRange === 'month') {
      startDate.setMonth(startDate.getMonth() - 1)
    }
    
    console.log(`Fetching data for plant ${plant.id} (${plant.plant_name}) from ${startDate.toISOString()}`)
    
    // Fetch data ONLY for this specific plant
    const { data: soilData, error: fetchError } = await supabase
      .from('soil_moisture_data')
      .select('*')
      .eq('plant_id', plant.id)  // Filter by plant_id
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true })
    
    if (fetchError) {
      console.error('Error fetching soil data:', fetchError)
      setError(fetchError.message)
      setLoading(false)
      return
    }
    
    console.log(`Found ${soilData?.length || 0} total records for ${plant.plant_name}`)
    
    if (soilData && soilData.length > 0) {
      // Filter: hanya tampilkan data dengan moisture_value > 0
      // (abaikan data saat sensor tidak membaca / nilai 0)
      const validData = soilData.filter(item => {
        const cleanValue = String(item.moisture_value).replace(/[^0-9]/g, '')
        const numericValue = parseInt(cleanValue) || 0
        return numericValue > 0
      })
      
      console.log(`Filtered to ${validData.length} valid records (excluded ${soilData.length - validData.length} disconnected/zero records)`)
      
      if (validData.length > 0) {
        const formattedData = validData.map(item => {
          const percentage = convertToPercentage(item.moisture_value)
          
          return {
            time: new Date(item.recorded_at).toLocaleString(),
            moisture: percentage,
            originalValue: item.moisture_value,
            timestamp: item.recorded_at,
            status: item.status
          }
        })
        
        setData(formattedData)
        console.log('Sample data point (persen):', formattedData[0])
        console.log('Latest data point:', formattedData[formattedData.length-1])
      } else {
        setData([])
      }
    } else {
      setData([])
    }
    setLoading(false)
  }

  async function fetchRoomData() {
    setLoadingRoom(true)
    
    let startDate = new Date()
    if (timeRange === 'day') {
      startDate.setHours(0, 0, 0, 0)
    } else if (timeRange === 'week') {
      startDate.setDate(startDate.getDate() - 7)
    } else if (timeRange === 'month') {
      startDate.setMonth(startDate.getMonth() - 1)
    }
    
    const { data: roomData, error: fetchError } = await supabase
      .from('room_dht11_data')
      .select('*')
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true })
    
    if (fetchError) {
      console.error('Error fetching room data:', fetchError)
      setLoadingRoom(false)
      return
    }
    
    if (roomData && roomData.length > 0) {
      const formattedData = roomData.map(item => ({
        time: new Date(item.recorded_at).toLocaleString(),
        temperature: parseFloat(item.temperature) || 0,
        humidity: parseFloat(item.humidity) || 0,
        timestamp: item.recorded_at
      }))
      setRoomDHT(formattedData)
    } else {
      setRoomDHT([])
    }
    setLoadingRoom(false)
  }

  async function refreshData() {
    await Promise.all([fetchPlantData(), fetchRoomData()])
  }

  function getMoistureStatus(percentage) {
    if (!percentage && percentage !== 0) return { text: 'No data', color: 'text-gray-500', bg: 'bg-gray-100' }
    if (percentage === 0) return { text: 'No Reading', color: 'text-gray-500', bg: 'bg-gray-100' }
    if (percentage > 70) return { text: 'Dry', color: 'text-red-600', bg: 'bg-red-100' }
    if (percentage > 50) return { text: 'Moist', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (percentage > 30) return { text: 'Wet', color: 'text-blue-600', bg: 'bg-blue-100' }
    return { text: 'Very Wet', color: 'text-green-600', bg: 'bg-green-100' }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{plant.plant_name}</h2>
            <p className="text-sm text-gray-500">Owner: {plant.owner_name}</p>
            {data.length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {data.length} valid readings recorded
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshData}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Refresh Data
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Time Range Selector */}
          <div className="mb-6">
            <label className="text-xs font-medium text-gray-700 mr-3">Time Range:</label>
            <div className="inline-flex gap-2">
              {[
                { value: 'day', label: 'Today' },
                { value: 'week', label: 'Last 7 Days' },
                { value: 'month', label: 'Last 30 Days' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-3 py-1 text-sm rounded-md transition ${
                    timeRange === range.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info when no data */}
          {data.length === 0 && !loading && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
              <p className="font-medium">No valid data for {plant.plant_name} yet</p>
              <p className="text-xs mt-1">
                Make sure:
                <br />1. This plant is selected as ACTIVE in the sensor control panel
                <br />2. The sensor is properly connected and reading values &gt; 0
                <br />3. New data will appear here automatically
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              Error: {error}
            </div>
          )}

          {/* Debug Info (only in development) */}
          {data.length > 0 && process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              Debug: {data.length} records loaded | 
              Range: {new Date(data[0]?.timestamp).toLocaleString()} - 
              {new Date(data[data.length-1]?.timestamp).toLocaleString()} |
              Latest: {data[data.length-1]?.moisture}%
            </div>
          )}

          {/* Soil Moisture Chart */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Soil Moisture History - {plant.plant_name}
            </h3>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : data.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      label={{ value: 'Moisture (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="moisture" 
                      stroke="#1f2937" 
                      name="Soil Moisture (%)"
                      dot={{ r: 2 }}
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">No valid data available for {plant.plant_name}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Only readings with moisture value &gt; 0 are displayed in the chart
                </p>
              </div>
            )}
          </div>

          {/* Room Temperature & Humidity Chart */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Room Temperature & Humidity History</h3>
            {loadingRoom ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : roomDHT.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={roomDHT} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight', fontSize: 12 }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#ef4444" 
                      name="Temperature (°C)"
                      dot={{ r: 2 }}
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#3b82f6" 
                      name="Humidity (%)"
                      dot={{ r: 2 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">No room temperature/humidity data available</p>
              </div>
            )}
          </div>

          {/* Latest Data Summary */}
          <div className="bg-gray-50 rounded-md p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary for {plant.plant_name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Valid Readings</p>
                <p className="text-lg font-semibold">{data.length}</p>
                <p className="text-xs text-gray-400 mt-1">
                  (Only readings with moisture &gt; 0)
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Latest Reading</p>
                {data.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold">{data[data.length - 1].moisture}%</p>
                    <p className="text-xs font-medium" style={{ color: getMoistureStatus(data[data.length - 1].moisture).color }}>
                      {getMoistureStatus(data[data.length - 1].moisture).text}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(data[data.length - 1].timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      Raw value: {data[data.length - 1].originalValue}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}