const passage = document.getElementById("passage");

const readBtn = document.getElementById("readBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");

const status = document.getElementById("status");

let audio = null;

readBtn.addEventListener("click", async () => {
  const text = passage.value.trim();

  if (!text) {
    status.textContent = "Please enter a passage first.";
    return;
  }

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
        voiceId: document.getElementById("voice").value,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate speech");
    }

    const audioBlob = await response.blob();

    const audioURL = URL.createObjectURL(audioBlob);

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    audio = new Audio(audioURL);

    audio.onplay = () => {
      status.textContent = "Reading...";
    };

    audio.onended = () => {
      status.textContent = "Finished reading.";
      readBtn.disabled = false;
    };

    audio.onerror = () => {
      status.textContent = "Audio playback error.";
      readBtn.disabled = false;
    };

    await audio.play();
  } catch (error) {
    console.error(error);

    status.textContent = "Could not generate the AI voice.";
    readBtn.disabled = false;
  }
});

pauseBtn.addEventListener("click", () => {
  if (!audio) return;

  if (audio.paused) {
    audio.play();
    pauseBtn.textContent = "⏸ Pause";
    status.textContent = "Reading...";
  } else {
    audio.pause();
    pauseBtn.textContent = "▶ Resume";
    status.textContent = "Paused.";
  }
});

stopBtn.addEventListener("click", () => {
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;

  pauseBtn.textContent = "⏸ Pause";
  status.textContent = "Stopped.";
});
// Register Service Worker for PWA
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
  // PWA Install
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
      if (!deferredPrompt) {
        return;
      }

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
}
