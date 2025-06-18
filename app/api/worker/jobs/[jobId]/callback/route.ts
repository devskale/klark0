import { NextRequest, NextResponse } from "next/server";

// This route is likely no longer needed as the main job creation proxy
// now specifies a generic callback URL: /api/worker/jobs/callback_generic
// The external parser should call that generic endpoint instead.
// Keeping this file for now, but it should probably be deleted.

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  console.warn(
    `POST /api/worker/jobs/${jobId}/callback - This endpoint is deprecated and likely unused. The external parser should call the generic callback.`
  );
  return NextResponse.json(
    {
      success: false,
      error:
        "This callback endpoint is deprecated. Please use the generic callback URL provided during job creation.",
    },
    { status: 410 } // 410 Gone
  );
}
