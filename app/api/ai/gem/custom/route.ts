import { NextResponse } from "next/server";
import { streamGeminiResponseWithPrompt } from "@/lib/ai/geminiApi";

export async function POST(request: Request) {
  const { customPrompt, context } = await request.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamGeminiResponseWithPrompt(
          customPrompt,
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
