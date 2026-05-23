// app/research/new/page.js
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'

export default function NewResearch() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [researchData, setResearchData] = useState({
    title: '',
    description: '',
    youtube_url: ''
  })
  
  const [plants, setPlants] = useState([
    { plant_name: '', owner_name: '' }
  ])

  function addPlant() {
    setPlants([...plants, { plant_name: '', owner_name: '' }])
  }

  function removePlant(index) {
    if (plants.length === 1) {
      toast.error('At least 1 plant is required')
      return
    }
    const newPlants = plants.filter((_, i) => i !== index)
    setPlants(newPlants)
  }

  function updatePlant(index, field, value) {
    const newPlants = [...plants]
    newPlants[index][field] = value
    setPlants(newPlants)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const validPlants = plants.filter(p => p.plant_name && p.owner_name)
    if (validPlants.length === 0) {
      toast.error('At least 1 plant is required')
      setLoading(false)
      return
    }

    try {
      const { data: research, error: researchError } = await supabase
        .from('research')
        .insert([{
          title: researchData.title,
          description: researchData.description,
          youtube_url: researchData.youtube_url
        }])
        .select()
        .single()

      if (researchError) throw researchError

      for (const plant of validPlants) {
        const { error: plantError } = await supabase
          .from('plants')
          .insert([{
            plant_name: plant.plant_name,
            owner_name: plant.owner_name,
            research_id: research.id
          }])

        if (plantError) throw plantError
      }

      toast.success(`Research created with ${validPlants.length} plant(s)`)
      router.push(`/research/${research.id}`)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create research: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="grow container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Research</h1>
          <p className="text-sm text-gray-500 mt-1">Add research project information and plants</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Research Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Research Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm"
                  value={researchData.title}
                  onChange={(e) => setResearchData({...researchData, title: e.target.value})}
                  placeholder="e.g., Hydroponic Tomato Research"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm"
                  value={researchData.description}
                  onChange={(e) => setResearchData({...researchData, description: e.target.value})}
                  placeholder="Brief description of the research..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  YouTube Live Stream URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm"
                  value={researchData.youtube_url}
                  onChange={(e) => setResearchData({...researchData, youtube_url: e.target.value})}
                />
                <p className="text-xs text-gray-400 mt-1">Optional: Add a live stream URL</p>
              </div>
            </div>
          </div>
          
          {/* Plants List */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Plants</h2>
              <button
                type="button"
                onClick={addPlant}
                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition"
              >
                Add Plant
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Minimum 1 plant required</p>
            
            <div className="space-y-3">
              {plants.map((plant, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 relative">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Plant {index + 1}</h3>
                    {plants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlant(index)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Plant Name *"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                      value={plant.plant_name}
                      onChange={(e) => updatePlant(index, 'plant_name', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Owner Name *"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                      value={plant.owner_name}
                      onChange={(e) => updatePlant(index, 'owner_name', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-900 text-white px-6 py-2 rounded-md text-sm hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Research'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md text-sm hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
      
      <Footer />
    </div>
  )
}