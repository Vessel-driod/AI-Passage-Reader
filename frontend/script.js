// ==========================================
// VESSEL AI PASSAGE READER
// ElevenLabs AI Voice + Free Browser Voice
// ==========================================

const passage = document.getElementById("passage");

const readBtn = document.getElementById("readBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");

const status = document.getElementById("status");
const wordCount = document.getElementById("wordCount");
const readingTime = document.getElementById("readingTime");
const speedSelect = document.getElementById("speed");
const voiceSelect = document.getElementById("voice");

const progress = document.getElementById("progress");
const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");

// ElevenLabs voice configuration
const ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

// Audio variables
let audio = null;
let audioURL = null;

// Browser speech variables
let browserSpeech = null;
let browserStarted = false;
let browserStartTime = 0;
let browserElapsed = 0;
let browserProgressTimer = null;

let estimatedDuration = 0;
let progressTimer = null;

// ==========================================
// WORD COUNT AND READING TIME
// ==========================================

function updatePassageInfo() {
  const text = passage.value.trim();

  const words = text ? text.split(/\s+/).length : 0;

  const minutes = words === 0 ? 0 : Math.ceil(words / 150);

  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;

  readingTime.textContent = `${minutes} ${minutes === 1 ? "min" : "mins"} read`;
}

passage.addEventListener("input", updatePassageInfo);

updatePassageInfo();

// ==========================================
// TIME FORMATTING
// ==========================================

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    seconds = 0;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

// ==========================================
// PROGRESS BAR
// ==========================================

function updateAudioProgress() {
  if (!audio) return;

  const duration = audio.duration || estimatedDuration;
  const elapsed = audio.currentTime || 0;

  if (duration > 0) {
    progress.style.width = `${Math.min((elapsed / duration) * 100, 100)}%`;
  }

  currentTime.textContent = formatTime(elapsed);
  totalTime.textContent = formatTime(duration);
}

function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function startProgressTimer() {
  stopProgressTimer();

  progressTimer = setInterval(() => {
    updateAudioProgress();

    if (!audio || audio.paused || audio.ended) {
      stopProgressTimer();
    }
  }, 250);
}

// ==========================================
// BROWSER VOICE PROGRESS
// ==========================================

function updateBrowserProgress() {
  const elapsed =
    browserElapsed +
    (browserStarted ? (Date.now() - browserStartTime) / 1000 : 0);

  const duration = estimatedDuration;

  currentTime.textContent = formatTime(elapsed);
  totalTime.textContent = formatTime(duration);

  if (duration > 0) {
    progress.style.width = `${Math.min((elapsed / duration) * 100, 100)}%`;
  }
}

function startBrowserProgress() {
  stopBrowserProgress();

  browserStartTime = Date.now();
  browserStarted = true;

  browserProgressTimer = setInterval(() => {
    updateBrowserProgress();
  }, 250);
}

function stopBrowserProgress() {
  if (browserProgressTimer) {
    clearInterval(browserProgressTimer);
    browserProgressTimer = null;
  }
}

// ==========================================
// STOP ALL SPEECH
// ==========================================

function stopAudio() {
  stopProgressTimer();
  stopBrowserProgress();

  // Stop ElevenLabs audio
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  // Stop browser speech
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  audio = null;
  browserSpeech = null;

  browserStarted = false;
  browserStartTime = 0;
  browserElapsed = 0;

  progress.style.width = "0%";
  currentTime.textContent = "0:00";
  totalTime.textContent = "0:00";

  pauseBtn.textContent = "⏸";
  readBtn.disabled = false;
}

// ==========================================
// CLEAR BUTTON
// ==========================================

clearBtn.addEventListener("click", () => {
  stopAudio();

  if (audioURL) {
    URL.revokeObjectURL(audioURL);
    audioURL = null;
  }

  passage.value = "";

  updatePassageInfo();

  status.textContent = "Passage cleared.";

  passage.focus();
});

// ==========================================
// MAIN READ BUTTON
// ==========================================

readBtn.addEventListener("click", async () => {
  const text = passage.value.trim();

  if (!text) {
    status.textContent = "Please enter a passage first.";
    return;
  }

  stopAudio();

  if (audioURL) {
    URL.revokeObjectURL(audioURL);
    audioURL = null;
  }

  const selectedSpeed = Number(speedSelect.value) || 1;
  const words = text.split(/\s+/).length;

  // Estimate speech duration at 150 words per minute.
  estimatedDuration = ((words / 150) * 60) / selectedSpeed;

  // ======================================
  // OPTION 1: FREE BROWSER VOICE
  // ======================================

  if (voiceSelect.value === "browser") {
    playBrowserVoice(text, selectedSpeed);
    return;
  }

  // ======================================
  // OPTION 2: ELEVENLABS AI VOICE
  // ======================================

  try {
    status.textContent = "Generating natural AI voice...";
    readBtn.disabled = true;

    const response = await fetch("/.netlify/functions/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        voiceId: ELEVENLABS_VOICE_ID,
      }),
    });

    if (!response.ok) {
      let message = "Failed to generate speech.";

      try {
        const errorData = await response.json();
        if (errorData.error) {
          message = errorData.error;
        }
      } catch (_) {
        // Keep the default error message.
      }

      throw new Error(message);
    }

    const audioBlob = await response.blob();

    audioURL = URL.createObjectURL(audioBlob);
    audio = new Audio(audioURL);

    audio.playbackRate = selectedSpeed;

    audio.addEventListener("loadedmetadata", () => {
      if (audio && Number.isFinite(audio.duration)) {
        totalTime.textContent = formatTime(audio.duration);
      }

      updateAudioProgress();
    });

    audio.addEventListener("play", () => {
      status.textContent = "Reading with ElevenLabs AI...";
      startProgressTimer();
    });

    audio.addEventListener("pause", () => {
      stopProgressTimer();
      updateAudioProgress();
    });

    audio.addEventListener("ended", () => {
      stopProgressTimer();

      status.textContent = "Finished reading.";
      progress.style.width = "100%";

      currentTime.textContent = formatTime(audio.duration || estimatedDuration);

      readBtn.disabled = false;
      pauseBtn.textContent = "⏸";
    });

    audio.addEventListener("error", () => {
      stopProgressTimer();

      status.textContent = "Audio playback error.";
      readBtn.disabled = false;
    });

    await audio.play();
  } catch (error) {
    console.error("ElevenLabs error:", error);

    status.textContent = "AI voice unavailable. Try Free Browser Voice.";

    readBtn.disabled = false;
  }
});

// ==========================================
// FREE BROWSER SPEECH
// ==========================================

function playBrowserVoice(text, selectedSpeed) {
  if (!("speechSynthesis" in window)) {
    status.textContent =
      "Browser speech is not supported. Try another browser.";

    readBtn.disabled = false;
    return;
  }

  window.speechSynthesis.cancel();

  browserSpeech = new SpeechSynthesisUtterance(text);

  // Set the browser's language and reading speed.
  browserSpeech.lang = "en-US";
  browserSpeech.rate = selectedSpeed;
  browserSpeech.pitch = 1;

  browserSpeech.onstart = () => {
    status.textContent = "Reading with Free Browser Voice...";
    readBtn.disabled = true;

    startBrowserProgress();
  };

  browserSpeech.onpause = () => {
    if (browserStarted) {
      browserElapsed += (Date.now() - browserStartTime) / 1000;

      browserStarted = false;
    }

    stopBrowserProgress();
    updateBrowserProgress();

    pauseBtn.textContent = "▶ Resume";
    status.textContent = "Paused.";
  };

  browserSpeech.onresume = () => {
    pauseBtn.textContent = "⏸";
    status.textContent = "Reading with Free Browser Voice...";

    startBrowserProgress();
  };

  browserSpeech.onend = () => {
    stopBrowserProgress();

    browserStarted = false;
    browserElapsed = estimatedDuration;

    progress.style.width = "100%";
    currentTime.textContent = formatTime(estimatedDuration);

    status.textContent = "Finished reading.";

    readBtn.disabled = false;
    pauseBtn.textContent = "⏸";

    browserSpeech = null;
  };

  browserSpeech.onerror = (event) => {
    stopBrowserProgress();

    browserStarted = false;
    readBtn.disabled = false;

    // Ignore cancellation caused by stopping or changing speech.
    if (event.error !== "canceled" && event.error !== "interrupted") {
      status.textContent = "Browser voice could not read this passage.";
    }
  };

  totalTime.textContent = formatTime(estimatedDuration);

  window.speechSynthesis.speak(browserSpeech);
}

// ==========================================
// CHANGE READING SPEED
// ==========================================

speedSelect.addEventListener("change", () => {
  const selectedSpeed = Number(speedSelect.value) || 1;

  if (audio) {
    audio.playbackRate = selectedSpeed;
  }

  if (browserSpeech) {
    browserSpeech.rate = selectedSpeed;

    // Some browsers apply changes during playback;
    // others apply them to the next utterance.
  }

  status.textContent = `Reading speed: ${selectedSpeed}x`;
});

// ==========================================
// PAUSE AND RESUME
// ==========================================

pauseBtn.addEventListener("click", async () => {
  // Browser voice controls
  if (
    "speechSynthesis" in window &&
    browserSpeech &&
    (window.speechSynthesis.speaking || window.speechSynthesis.paused)
  ) {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      window.speechSynthesis.pause();
    }

    return;
  }

  // ElevenLabs audio controls
  if (!audio) return;

  try {
    if (audio.paused) {
      await audio.play();

      pauseBtn.textContent = "⏸";
      status.textContent = "Reading with ElevenLabs AI...";
    } else {
      audio.pause();

      pauseBtn.textContent = "▶ Resume";
      status.textContent = "Paused.";
    }
  } catch (error) {
    console.error(error);
    status.textContent = "Unable to resume playback.";
  }
});

// ==========================================
// STOP BUTTON
// ==========================================

stopBtn.addEventListener("click", () => {
  stopAudio();
  status.textContent = "Stopped.";
});

// ==========================================
// PWA SERVICE WORKER
// ==========================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        console.log("Service Worker registered successfully");
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

// ==========================================
// PWA INSTALLATION
// ==========================================

let deferredPrompt = null;

const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();

  deferredPrompt = event;

  if (installBtn) {
    installBtn.style.display = "block";
  }
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    console.log("Install result:", outcome);

    deferredPrompt = null;
    installBtn.style.display = "none";
  });
}

window.addEventListener("appinstalled", () => {
  console.log("Vessel AI Passage Reader installed!");

  if (installBtn) {
    installBtn.style.display = "none";
  }
});
