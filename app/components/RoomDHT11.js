'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function RoomDHT11() {
  const [dhtData, setDhtData] = useState({ temperature: null, humidity: null })
  const [lastUpdate, setLastUpdate] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState('hour') // hour, day, week

  // Fetch data terbaru
  async function fetchLatestData() {
    try {
      const response = await fetch('/api/room-dht11?latest=true')
      const result = await response.json()
      
      if (result.success && result.data) {
        setDhtData({
          temperature: result.data.temperature,
          humidity: result.data.humidity
        })
        setLastUpdate(new Date(result.data.recorded_at))
      }
    } catch (error) {
      console.error('Error fetching latest DHT11:', error)
    }
  }

  // Fetch history data
  async function fetchHistory() {
    setIsLoading(true)
    try {
      let url = '/api/room-dht11?limit=100'
      
      // Set time range
      const now = new Date()
      let startDate = new Date()
      
      if (timeRange === 'hour') {
        startDate.setHours(now.getHours() - 1)
      } else if (timeRange === 'day') {
        startDate.setDate(now.getDate() - 1)
      } else if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7)
      }
      
      url += `&start_date=${startDate.toISOString()}`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setHistory(result.data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete old data
  async function deleteOldData(daysOld = 7) {
    if (!confirm(`Delete DHT11 data older than ${daysOld} days?`)) return
    
    try {
      const response = await fetch(`/api/room-dht11?days_old=${daysOld}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (result.success) {
        toast.success(result.message)
        if (showHistory) {
          fetchHistory()
        }
      } else {
        toast.error('Failed to delete old data')
      }
    } catch (error) {
      console.error('Error deleting data:', error)
      toast.error('Error deleting data')
    }
  }

  // Delete all data
  async function deleteAllData() {
    if (!confirm('⚠️ WARNING: Delete ALL DHT11 data? This action cannot be undone!')) return
    
    try {
      const response = await fetch('/api/room-dht11?delete_all=true', {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (result.success) {
        toast.success(result.message)
        setHistory([])
        fetchLatestData()
      } else {
        toast.error('Failed to delete all data')
      }
    } catch (error) {
      console.error('Error deleting all data:', error)
      toast.error('Error deleting data')
    }
  }

  // Manual refresh
  async function handleRefresh() {
    setIsLoading(true)
    await fetchLatestData()
    if (showHistory) {
      await fetchHistory()
    }
    toast.success('Data refreshed')
    setIsLoading(false)
  }

  // Real-time subscription
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLatestData()
    
    // Subscribe ke data baru
    const subscription = supabase
      .channel('room_dht11_realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'room_dht11_data' },
        (payload) => {
          setDhtData({
            temperature: payload.new.temperature,
            humidity: payload.new.humidity
          })
          setLastUpdate(new Date(payload.new.recorded_at))
          
          // Update history if open
          if (showHistory) {
            setHistory(prev => [payload.new, ...prev].slice(0, 100))
          }
          
          // Optional: Show toast notification
          toast.success('New DHT11 data received', {
            duration: 2000,
            icon: '🌡️'
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch history when modal opens or time range changes
  useEffect(() => {
    if (showHistory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchHistory()
    }
  }, [showHistory, timeRange])

  // Auto-refresh setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLatestData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Floating Widget */}
      <div className="fixed top-16 right-4 z-50 bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Temperature</div>
              <div className="font-semibold text-gray-800 text-lg">
                {dhtData.temperature ? `${dhtData.temperature}°C` : '--'}
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Humidity</div>
              <div className="font-semibold text-gray-800 text-lg">
                {dhtData.humidity ? `${dhtData.humidity}%` : '--'}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1.5 hover:bg-gray-100 rounded transition"
                title="Refresh data"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 hover:bg-gray-100 rounded transition"
                title="View history"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            </div>
          </div>
          {lastUpdate && (
            <div className="text-xs text-gray-400 mt-1 text-right">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">DHT11 Data History</h2>
                  <p className="text-sm text-gray-500">Room temperature and humidity records</p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              
              {/* Toolbar */}
              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  {[
                    { value: 'hour', label: 'Last Hour' },
                    { value: 'day', label: 'Last Day' },
                    { value: 'week', label: 'Last Week' }
                  ].map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setTimeRange(range.value)}
                      className={`px-3 py-1 text-xs rounded-md transition ${
                        timeRange === range.value
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteOldData(7)}
                    className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200"
                  >
                    Delete &gt; 7 days
                  </button>
                  <button
                    onClick={deleteAllData}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    Delete All
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No data available for the selected period
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Temperature</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Humidity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {record.recorded_at_local}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {record.temperature}°C
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {record.humidity}%
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={async () => {
                              if (confirm('Delete this record?')) {
                                const response = await fetch(`/api/room-dht11?id=${record.id}`, {
                                  method: 'DELETE'
                                })
                                if (response.ok) {
                                  toast.success('Record deleted')
                                  fetchHistory()
                                }
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}