const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { ElevenLabsClient } = require("elevenlabs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

app.get("/", (req, res) => {
  res.json({
    message: "AI Passage Reader backend is running",
  });
});

app.post("/api/speak", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({
        error: "Text is required",
      });
    }

    console.log("Generating speech for:", text.substring(0, 100));

    const audio = await elevenlabs.textToSpeech.convert(
      "JBFqnCBsd6RMkjVDRZzb",
      {
        text: text,
        model_id: "eleven_multilingual_v2",
      },
    );

    res.setHeader("Content-Type", "audio/mpeg");

    for await (const chunk of audio) {
      res.write(chunk);
    }

    res.end();

    console.log("Speech generated successfully.");
  } catch (error) {
    console.error("ElevenLabs error:", error);

    res.status(500).json({
      error: "Failed to generate speech",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
