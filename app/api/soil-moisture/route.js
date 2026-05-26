import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    let { moisture_value, status } = body
    
    console.log('📥 Received:', { moisture_value, status })
    
    if (!moisture_value) {
      return NextResponse.json({ 
        success: false,
        error: 'moisture_value is required' 
      }, { status: 400 })
    }
    
    // Clean value (hapus %)
    let cleanValue = String(moisture_value).replace(/[^0-9]/g, '')
    if (cleanValue === '') cleanValue = '0'
    let numericValue = parseInt(cleanValue) || 0
    
    // Konversi ke persen untuk response (0-4095 -> 0-100%)
    let percentage = Math.round((numericValue / 4095) * 100)
    percentage = Math.min(100, Math.max(0, percentage))
    
    // Ambil active plant
    const { data: activePlant } = await supabase
      .from('active_plant')
      .select('plant_id')
      .eq('id', 1)
      .single()
    
    let targetPlantId = null
    if (numericValue > 0 && activePlant?.plant_id) {
      targetPlantId = activePlant.plant_id
    }
    
    // Simpan ke database
    const { data, error } = await supabase
      .from('soil_moisture_data')
      .insert([{ 
        plant_id: targetPlantId,
        moisture_value: cleanValue,
        status: status || (numericValue === 0 ? 'SENSOR_DISCONNECTED' : 'ACTIVE'),
        recorded_at: new Date().toISOString()
      }])
      .select()
    
    if (error) {
      console.error('❌ Error:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      }, { status: 500 })
    }
    
    console.log(`✅ Saved: ${cleanValue} (${percentage}%) -> plant: ${targetPlantId || 'none'}`)
    
    // Return data dengan persen
    return NextResponse.json({ 
      success: true, 
      data: {
        ...data[0],
        percentage: percentage,
        display_value: `${percentage}%`
      },
      message: `Data saved: ${percentage}%`
    }, { status: 201 })
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}