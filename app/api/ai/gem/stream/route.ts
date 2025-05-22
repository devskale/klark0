import { NextResponse } from "next/server";
import { streamGeminiResponse } from "@/lib/ai/geminiApi";

export async function POST(request: Request) {
  const { queryType, context } = await request.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamGeminiResponse(
          queryType,
          context,
          (chunk: string) => controller.enqueue(encoder.encode(chunk)),
          () => controller.close(),
          (err: any) => controller.error(err)
        );
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
