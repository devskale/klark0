import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Simulate worker system status
    const workerStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(Math.random() * 86400), // Random uptime in seconds
      version: '1.0.0',
      workers: {
        total: 4,
        available: 4,
        busy: 0,
        offline: 0
      },
      queue: {
        pending: Math.floor(Math.random() * 5),
        running: Math.floor(Math.random() * 3),
        completed: Math.floor(Math.random() * 50) + 100,
        failed: Math.floor(Math.random() * 3)
      },
      resources: {
        cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
        memoryUsage: Math.floor(Math.random() * 40) + 20, // 20-60%
        diskUsage: Math.floor(Math.random() * 20) + 30 // 30-50%
      },
      lastHealthCheck: new Date().toISOString(),
      errors: []
    };

    // Add some random warnings/info messages
    const messages = [
      'System läuft normal',
      'Alle Worker sind bereit',
      'Queue wird verarbeitet',
      'Letzte Wartung erfolgreich'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    return NextResponse.json({
      success: true,
      data: {
        ...workerStatus,
        message: randomMessage
      }
    });

  } catch (error) {
    console.error('Error fetching worker status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Abrufen des Worker-Status',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
