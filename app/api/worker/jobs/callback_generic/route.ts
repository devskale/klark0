import { NextRequest, NextResponse } from "next/server";

// This is a generic callback endpoint that the external parser will call.
// It's specified in the payload sent to the external parser during job creation.

export async function POST(request: NextRequest) {
  try {
    const callbackData = await request.json();
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Log the received callback data
    // In a production environment, you might want to process this data further,
    // e.g., send notifications, update a different system, etc.
    // For now, we just log it.
    console.log(
      `🔔 Received generic job callback from ${clientIp}:`,
      JSON.stringify(callbackData, null, 2)
    );

    // You could also inspect headers for authentication if the external parser sends a secret token
    // const authToken = request.headers.get('X-Callback-Auth-Token');
    // if (authToken !== process.env.EXTERNAL_PARSER_CALLBACK_TOKEN) {
    //   console.warn('⚠️ Generic callback: Invalid or missing auth token.');
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    // Respond to the external parser that the callback was received successfully
    return NextResponse.json({
      success: true,
      message: "Callback received successfully.",
    });
  } catch (error) {
    console.error("💀 Error processing generic job callback:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process callback.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests to this endpoint, e.g., for verification by the external service
export async function GET(request: NextRequest) {
  console.log(
    `ℹ️ Received GET request on generic callback endpoint from ${request.headers.get('x-forwarded-for') || 'unknown'}.`
  );
  return NextResponse.json({
    message: "Generic callback endpoint is active. Use POST to send job updates.",
  });
}