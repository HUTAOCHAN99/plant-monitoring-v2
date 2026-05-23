// app/components/PlantDetailModal.js
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

export default function PlantDetailModal({ plant, isOpen, onClose }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('day') // day, week, month
  const [roomDHT, setRoomDHT] = useState([])
  const [loadingRoom, setLoadingRoom] = useState(true)

  useEffect(() => {
    if (isOpen && plant) {
      fetchPlantData()
      fetchRoomData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, plant, timeRange])

  async function fetchPlantData() {
    setLoading(true)
    
    let startDate = new Date()
    if (timeRange === 'day') {
      startDate.setHours(0, 0, 0, 0)
    } else if (timeRange === 'week') {
      startDate.setDate(startDate.getDate() - 7)
    } else if (timeRange === 'month') {
      startDate.setMonth(startDate.getMonth() - 1)
    }
    
    const { data: soilData } = await supabase
      .from('soil_moisture_data')
      .select('*')
      .eq('plant_id', plant.id)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true })
    
    if (soilData) {
      const formattedData = soilData.map(item => ({
        time: new Date(item.recorded_at).toLocaleString(),
        moisture: item.moisture_value,
        timestamp: item.recorded_at
      }))
      setData(formattedData)
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
    
    const { data: roomData } = await supabase
      .from('room_dht11_data')
      .select('*')
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true })
    
    if (roomData) {
      const formattedData = roomData.map(item => ({
        time: new Date(item.recorded_at).toLocaleString(),
        temperature: item.temperature,
        humidity: item.humidity,
        timestamp: item.recorded_at
      }))
      setRoomDHT(formattedData)
    }
    setLoadingRoom(false)
  }

  async function refreshData() {
    await fetchPlantData()
    await fetchRoomData()
  }

  function getMoistureStatus(value) {
    if (!value) return { text: 'No data', color: 'text-gray-500' }
    if (value > 3000) return { text: 'Dry', color: 'text-red-600' }
    if (value > 2000) return { text: 'Moist', color: 'text-yellow-600' }
    if (value > 1000) return { text: 'Wet', color: 'text-blue-600' }
    return { text: 'Very Wet', color: 'text-green-600' }
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

          {/* Soil Moisture Chart */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Soil Moisture History</h3>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : data.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      label={{ value: 'Moisture Value', angle: -90, position: 'insideLeft', fontSize: 12 }}
                      domain={[0, 4095]}
                    />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="moisture" 
                      stroke="#1f2937" 
                      name="Soil Moisture"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">No data available for this period</p>
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
                  <LineChart data={roomDHT}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight', fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#ef4444" 
                      name="Temperature (°C)"
                      dot={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#3b82f6" 
                      name="Humidity (%)"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500">No room data available for this period</p>
              </div>
            )}
          </div>

          {/* Latest Data Summary */}
          <div className="bg-gray-50 rounded-md p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Latest Readings Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Latest Soil Moisture</p>
                {data[data.length - 1] ? (
                  <>
                    <p className="text-lg font-semibold">{data[data.length - 1].moisture}</p>
                    <p className={`text-xs font-medium ${getMoistureStatus(data[data.length - 1].moisture).color}`}>
                      {getMoistureStatus(data[data.length - 1].moisture).text}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(data[data.length - 1].timestamp).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Latest Room Temperature</p>
                {roomDHT[roomDHT.length - 1] ? (
                  <>
                    <p className="text-lg font-semibold">{roomDHT[roomDHT.length - 1].temperature}°C</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(roomDHT[roomDHT.length - 1].timestamp).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Latest Room Humidity</p>
                {roomDHT[roomDHT.length - 1] ? (
                  <>
                    <p className="text-lg font-semibold">{roomDHT[roomDHT.length - 1].humidity}%</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(roomDHT[roomDHT.length - 1].timestamp).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}