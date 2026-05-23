import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST - Terima data dari ESP32
export async function POST(request) {
  try {
    const body = await request.json()
    const { moisture_value, status } = body
    
    // Validasi input
    if (!moisture_value) {
      return NextResponse.json({ 
        success: false,
        error: 'moisture_value is required' 
      }, { status: 400 })
    }
    
    // Ambil tanaman yang sedang aktif dari tabel active_plant
    const { data: activePlant, error: activeError } = await supabase
      .from('active_plant')
      .select('plant_id, research_id')
      .eq('id', 1)
      .single()
    
    if (activeError) {
      console.error('Error fetching active plant:', activeError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to get active plant' 
      }, { status: 500 })
    }
    
    if (!activePlant?.plant_id) {
      return NextResponse.json({ 
        success: false,
        error: 'No active plant selected. Please select a plant in the web dashboard.' 
      }, { status: 400 })
    }
    
    // Simpan data soil moisture ke database
    // moisture_value disimpan sebagai TEXT (string)
    const { data, error } = await supabase
      .from('soil_moisture_data')
      .insert([{ 
        plant_id: activePlant.plant_id,
        moisture_value: String(moisture_value), // Konversi ke string/TEXT
        status: status || null,
        recorded_at: new Date().toISOString()
      }])
      .select()
    
    if (error) {
      console.error('Error saving soil moisture:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: `Soil moisture data saved for plant: ${activePlant.plant_id}`
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error in soil-moisture API:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}

// GET - Ambil data soil moisture (untuk web dashboard)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const plant_id = searchParams.get('plant_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    // Build query
    let query = supabase
      .from('soil_moisture_data')
      .select(`
        *,
        plants (
          id,
          plant_name,
          owner_name
        )
      `)
      .order('recorded_at', { ascending: false })
      .limit(limit)
    
    // Filter by plant_id jika ada
    if (plant_id) {
      query = query.eq('plant_id', plant_id)
    }
    
    // Filter by date range jika ada
    if (startDate) {
      query = query.gte('recorded_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('recorded_at', endDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching soil moisture data:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }
    
    // Format data untuk memudahkan frontend
    const formattedData = data?.map(item => ({
      id: item.id,
      plant_id: item.plant_id,
      plant_name: item.plants?.plant_name,
      owner_name: item.plants?.owner_name,
      moisture_value: item.moisture_value,
      status: item.status,
      recorded_at: item.recorded_at,
      recorded_at_local: new Date(item.recorded_at).toLocaleString('id-ID')
    })) || []
    
    return NextResponse.json({ 
      success: true, 
      data: formattedData,
      count: formattedData.length,
      filters: {
        plant_id: plant_id || 'all',
        limit,
        start_date: startDate || null,
        end_date: endDate || null
      }
    })
    
  } catch (error) {
    console.error('Error in soil-moisture GET API:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}

// DELETE - Hapus data soil moisture (opsional, untuk maintenance)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const plant_id = searchParams.get('plant_id')
    const daysOld = parseInt(searchParams.get('days_old') || '30')
    
    // Jika ada ID spesifik, hapus berdasarkan ID
    if (id) {
      const { error } = await supabase
        .from('soil_moisture_data')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        message: `Data with ID ${id} deleted successfully` 
      })
    }
    
    // Jika ada plant_id, hapus berdasarkan plant_id
    if (plant_id) {
      const { error } = await supabase
        .from('soil_moisture_data')
        .delete()
        .eq('plant_id', plant_id)
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        message: `All data for plant ${plant_id} deleted successfully` 
      })
    }
    
    // Hapus data lama (lebih dari daysOld hari)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    
    const { error, count } = await supabase
      .from('soil_moisture_data')
      .delete()
      .lt('recorded_at', cutoffDate.toISOString())
      .select('count')
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${count || 0} old records (older than ${daysOld} days)` 
    })
    
  } catch (error) {
    console.error('Error deleting soil moisture data:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}