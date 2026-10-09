const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  }

  try {
    const { text, voiceId } = JSON.parse(event.body || "{}");

    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Please enter a passage to read.",
        }),
      };
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const audio = await elevenlabs.textToSpeech.convert(
      voiceId || "JBFqnCBsd6RMkjVDRZzb",
      {
        text: text.trim(),
        model_id: "eleven_multilingual_v2",
      },
    );

    const chunks = [];

    for await (const chunk of audio) {
      chunks.push(Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
      isBase64Encoded: true,
      body: audioBuffer.toString("base64"),
    };
  } catch (error) {
    console.error("Speech generation failed:", error.message);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Speech generation failed. Please try again.",
      }),
    };
  }
};
