// ==========================================
// AI PASSAGE READER
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

let audio = null;
let audioURL = null;
let estimatedDuration = 0;
let progressTimer = null;
let playbackStartedAt = 0;
let accumulatedPlaybackTime = 0;

// ==========================================
// WORD COUNT AND READING TIME
// ==========================================

function updatePassageInfo() {
  const text = passage.value.trim();

  const words = text ? text.split(/\s+/).length : 0;

  // Average natural reading speed: 150 words per minute
  const minutes = words === 0 ? 0 : Math.ceil(words / 150);

  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;

  readingTime.textContent = `${minutes} ${minutes === 1 ? "min" : "mins"} read`;
}

// Update whenever the user types or pastes text
passage.addEventListener("input", updatePassageInfo);

// Initialize the counts
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
// AUDIO PROGRESS
// ==========================================

function updateProgress() {
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
    updateProgress();

    if (!audio || audio.paused || audio.ended) {
      stopProgressTimer();
    }
  }, 250);
}

// ==========================================
// STOP AUDIO
// ==========================================

function stopAudio() {
  stopProgressTimer();

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  accumulatedPlaybackTime = 0;
  playbackStartedAt = 0;

  progress.style.width = "0%";
  currentTime.textContent = "0:00";

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

  audio = null;

  passage.value = "";

  updatePassageInfo();

  totalTime.textContent = "0:00";
  status.textContent = "Passage cleared.";

  passage.focus();
});

// ==========================================
// GENERATE AND PLAY AI SPEECH
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

  audio = null;

  try {
    status.textContent = "Generating AI voice...";
    readBtn.disabled = true;

    const response = await fetch("/.netlify/functions/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        voiceId: voiceSelect.value,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate speech");
    }

    const audioBlob = await response.blob();

    audioURL = URL.createObjectURL(audioBlob);

    audio = new Audio(audioURL);

    // Estimate duration using the reading-time estimate.
    // The real duration will replace this when the audio metadata loads.
    const words = text.split(/\s+/).length;
    estimatedDuration = (words / 150) * 60;

    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration)) {
        totalTime.textContent = formatTime(audio.duration);
      }

      updateProgress();
    });

    audio.addEventListener("play", () => {
      status.textContent = "Reading...";
      playbackStartedAt = performance.now();
      startProgressTimer();
    });

    audio.addEventListener("pause", () => {
      stopProgressTimer();
      updateProgress();
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

    // Apply the selected reading speed
    audio.playbackRate = Number(speedSelect.value) || 1;

    await audio.play();
  } catch (error) {
    console.error(error);

    status.textContent = "Could not generate the AI voice.";
    readBtn.disabled = false;
  }
});

// ==========================================
// CHANGE READING SPEED
// ==========================================

speedSelect.addEventListener("change", () => {
  const selectedSpeed = Number(speedSelect.value) || 1;

  if (audio) {
    audio.playbackRate = selectedSpeed;
  }

  status.textContent = `Reading speed: ${selectedSpeed}x`;
});

// ==========================================
// PAUSE AND RESUME
// ==========================================

pauseBtn.addEventListener("click", async () => {
  if (!audio) return;

  try {
    if (audio.paused) {
      await audio.play();

      pauseBtn.textContent = "⏸";
      status.textContent = "Reading...";
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
  console.log("AI Passage Reader installed!");

  if (installBtn) {
    installBtn.style.display = "none";
  }
});
