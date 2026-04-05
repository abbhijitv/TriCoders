import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!process.env.ELEVENLABS_API_KEY) {
      return new Response("Missing ELEVENLABS_API_KEY", { status: 500 });
    }

    if (!process.env.ELEVENLABS_VOICE_ID) {
      return new Response("Missing ELEVENLABS_VOICE_ID", { status: 500 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2"
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(errText, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg"
      }
    });
  } catch (error: any) {
    return new Response(error.message || "Voice generation failed", { status: 500 });
  }
}
