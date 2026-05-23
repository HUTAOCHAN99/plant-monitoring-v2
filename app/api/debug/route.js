// app/api/debug/route.js - Updated version
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {}
  }

  // 1. Cek environment variables
  results.checks.env = {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
      process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...' : 
      'MISSING',
    keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 15) + '...' : 
      'MISSING'
  }

  // 2. Cek koneksi ke tabel research
  try {
    const { data: research, error: researchError } = await supabase
      .from('research')
      .select('*')
      .limit(5)
    
    results.checks.research = {
      success: !researchError,
      data: research,
      error: researchError?.message,
      count: research?.length || 0
    }
  } catch (err) {
    results.checks.research = {
      success: false,
      error: err.message
    }
  }

  // 3. Cek koneksi ke tabel plants
  try {
    const { data: plants, error: plantsError } = await supabase
      .from('plants')
      .select('*')
      .limit(5)
    
    results.checks.plants = {
      success: !plantsError,
      data: plants,
      error: plantsError?.message,
      count: plants?.length || 0
    }
  } catch (err) {
    results.checks.plants = {
      success: false,
      error: err.message
    }
  }

  // 4. Cek koneksi ke tabel soil_moisture_data
  try {
    const { data: soil, error: soilError } = await supabase
      .from('soil_moisture_data')
      .select('*')
      .limit(5)
    
    results.checks.soilMoisture = {
      success: !soilError,
      data: soil,
      error: soilError?.message,
      count: soil?.length || 0
    }
  } catch (err) {
    results.checks.soilMoisture = {
      success: false,
      error: err.message
    }
  }

  // 5. Cek koneksi ke tabel sensor_status (GLOBAL RELAY)
  try {
    const { data: sensorStatus, error: sensorStatusError } = await supabase
      .from('sensor_status')
      .select('*')
      .eq('id', 1)
      .single()
    
    results.checks.sensorStatus = {
      success: !sensorStatusError,
      data: sensorStatus,
      error: sensorStatusError?.message,
      status: sensorStatus?.soil_moisture_on || 'unknown'
    }
  } catch (err) {
    results.checks.sensorStatus = {
      success: false,
      error: err.message
    }
  }

  // 6. Cek koneksi ke tabel room_dht11_data (GLOBAL DHT11)
  try {
    const { data: roomDHT, error: roomDHTError } = await supabase
      .from('room_dht11_data')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(5)
    
    results.checks.roomDHT11 = {
      success: !roomDHTError,
      data: roomDHT,
      error: roomDHTError?.message,
      count: roomDHT?.length || 0
    }
  } catch (err) {
    results.checks.roomDHT11 = {
      success: false,
      error: err.message
    }
  }

  // Print ke terminal (server console)
  console.log('\n========== SUPABASE DEBUG ==========')
  console.log(`Time: ${results.timestamp}`)
  console.log('\n--- Environment Variables ---')
  console.log(`SUPABASE_URL: ${results.checks.env.hasUrl ? '✅ OK' : '❌ MISSING'}`)
  console.log(`SUPABASE_KEY: ${results.checks.env.hasKey ? '✅ OK' : '❌ MISSING'}`)
  
  console.log('\n--- Database Tables ---')
  console.log(`research: ${results.checks.research.success ? '✅ Connected' : '❌ Failed'} (${results.checks.research.count} records)`)
  console.log(`plants: ${results.checks.plants.success ? '✅ Connected' : '❌ Failed'} (${results.checks.plants.count} records)`)
  console.log(`soil_moisture_data: ${results.checks.soilMoisture.success ? '✅ Connected' : '❌ Failed'} (${results.checks.soilMoisture.count} records)`)
  console.log(`sensor_status: ${results.checks.sensorStatus.success ? '✅ Connected' : '❌ Failed'} (status: ${results.checks.sensorStatus.status || 'unknown'})`)
  console.log(`room_dht11_data: ${results.checks.roomDHT11.success ? '✅ Connected' : '❌ Failed'} (${results.checks.roomDHT11.count} records)`)
  
  console.log('=====================================\n')

  return NextResponse.json(results)
}