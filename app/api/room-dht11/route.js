import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST - Terima data DHT11 dari ESP32
export async function POST(request) {
  try {
    const body = await request.json()
    const { temperature, humidity } = body
    
    // Validasi input
    if (temperature === undefined || humidity === undefined) {
      return NextResponse.json({ 
        success: false,
        error: 'temperature and humidity are required' 
      }, { status: 400 })
    }
    
    // Simpan data ke database
    const { data, error } = await supabase
      .from('room_dht11_data')
      .insert([{ 
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        recorded_at: new Date().toISOString()
      }])
      .select()
    
    if (error) {
      console.error('Error saving DHT11 data:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: 'DHT11 data saved successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error in room-dht11 POST:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}

// GET - Ambil data DHT11 dengan berbagai filter
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const latest = searchParams.get('latest') === 'true'
    
    // Jika hanya ingin data terbaru
    if (latest) {
      const { data, error } = await supabase
        .from('room_dht11_data')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        data: data[0] || null,
        isLatest: true
      })
    }
    
    // Build query untuk multiple data
    let query = supabase
      .from('room_dht11_data')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(limit)
    
    // Filter by date range
    if (startDate) {
      query = query.gte('recorded_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('recorded_at', endDate)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Format data untuk frontend
    const formattedData = data?.map(item => ({
      id: item.id,
      temperature: item.temperature,
      humidity: item.humidity,
      recorded_at: item.recorded_at,
      recorded_at_local: new Date(item.recorded_at).toLocaleString('id-ID'),
      temperature_celsius: `${item.temperature}°C`,
      humidity_percent: `${item.humidity}%`
    })) || []
    
    return NextResponse.json({ 
      success: true, 
      data: formattedData,
      count: formattedData.length,
      filters: { limit, startDate, endDate }
    })
    
  } catch (error) {
    console.error('Error in room-dht11 GET:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}

// DELETE - Hapus data DHT11
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const daysOld = parseInt(searchParams.get('days_old') || '7')
    const deleteAll = searchParams.get('delete_all') === 'true'
    
    // Hapus semua data
    if (deleteAll) {
      const { error, count } = await supabase
        .from('room_dht11_data')
        .delete()
        .neq('id', 0)
        .select('count', { count: 'exact', head: true })
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        message: `All ${count || 0} DHT11 records deleted successfully` 
      })
    }
    
    // Hapus berdasarkan ID spesifik
    if (id) {
      const { error } = await supabase
        .from('room_dht11_data')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        message: `DHT11 record with ID ${id} deleted successfully` 
      })
    }
    
    // Hapus data lama (lebih dari daysOld hari)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    
    const { error, count } = await supabase
      .from('room_dht11_data')
      .delete()
      .lt('recorded_at', cutoffDate.toISOString())
      .select('count', { count: 'exact', head: true })
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${count || 0} old DHT11 records (older than ${daysOld} days)`,
      deletedCount: count || 0,
      cutoffDate: cutoffDate.toISOString()
    })
    
  } catch (error) {
    console.error('Error deleting DHT11 data:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}