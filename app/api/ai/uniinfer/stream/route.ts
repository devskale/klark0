import { NextResponse } from "next/server";
import { streamUniinferResponse } from "@/lib/ai/uniinferApi";

export async function POST(request: Request) {
  try {
    const { queryType, context } = await request.json();
    console.log(
      "AI Stream request - queryType:",
      queryType,
      "context length:",
      context?.length || 0
    );

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamUniinferResponse(
            queryType,
            context,
            (chunk: string) => controller.enqueue(encoder.encode(chunk)),
            () => controller.close(),
            (err: any) => {
              console.error("Stream error:", err);
              controller.error(err);
            }
          );
        } catch (err) {
          console.error("Stream start error:", err);
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Stream endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to start AI stream", details: (error as Error).message },
      { status: 500 }
    );
  }
}
