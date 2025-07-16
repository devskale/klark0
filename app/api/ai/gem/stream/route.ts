import { NextResponse } from "next/server";
import { streamGeminiResponse } from "@/lib/ai/geminiApi";

export async function POST(request: Request) {
  try {
    const { queryType, context, maxContextLength } = await request.json();
    console.log(
      "AI Stream request - queryType:",
      queryType,
      "context length:",
      context?.length || 0,
      "max context length:",
      maxContextLength || "unlimited"
    );

    // Apply context length limit if specified
    let limitedContext = context;
    if (maxContextLength && typeof maxContextLength === 'number' && context && context.length > maxContextLength) {
      limitedContext = context.substring(0, maxContextLength);
      console.log(`Context truncated from ${context.length} to ${limitedContext.length} characters`);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamGeminiResponse(
            queryType,
            limitedContext,
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
