// app/page.js
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ResearchCard from './components/ResearchCard'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

export default function Dashboard() {
  const [researchList, setResearchList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchResearch() {
    try {
      const { data, error } = await supabase
        .from('research')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        setError(error.message)
      } else {
        setResearchList(data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function testInsert() {
    const testData = {
      title: `Test ${new Date().toLocaleTimeString()}`,
      description: 'Test insertion'
    }
    
    const { error } = await supabase
      .from('research')
      .insert([testData])
    
    if (!error) {
      fetchResearch()
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResearch()
    
    const subscription = supabase
      .channel('research_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'research' }, 
        () => fetchResearch()
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-sm mb-4">Error: {error}</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={fetchResearch} 
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
              >
                Retry
              </button>
              <button 
                onClick={testInsert} 
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md text-sm hover:bg-gray-300"
              >
                Test Insert
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="grow container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Research Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your plant research projects</p>
          </div>
          <Link 
            href="/research/new" 
            className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
          >
            New Research
          </Link>
        </div>
        
        {researchList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-4">No research projects yet.</p>
            <Link 
              href="/research/new" 
              className="inline-block bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
            >
              Create Your First Research
            </Link>
            <div className="mt-4">
              <button 
                onClick={testInsert}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Or click here to insert test data
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">Total: {researchList.length} projects</p>
              <button 
                onClick={fetchResearch}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {researchList.map((research) => (
                <ResearchCard key={research.id} research={research} />
              ))}
            </div>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  )
}