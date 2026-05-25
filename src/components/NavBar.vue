<template>
  <nav class="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around py-2 shadow-md">
    <button @click="goTo('/home-page')" class="flex flex-col items-center text-gray-600 hover:text-green-600">
      <HomeIcon class="w-8 h-8 text-green-600" />
      <span class="text-xs">{{ t('nav.home') }}</span>
    </button>

    <button @click="openQRScanner" class="flex items-center justify-center bg-green-600 text-white rounded-full w-14 h-14 -mt-8 shadow-lg">
      <CameraIcon class="w-8 h-8 text-white-600" />
    </button>

    <button @click="goTo('/profile')" class="flex flex-col items-center text-gray-600 hover:text-green-600">
      <UserIcon class="w-8 h-8 text-green-600" />
      <span class="text-xs">{{ t('nav.profile') }}</span>
    </button>
  </nav>

  <!-- QR Scanner Modal -->
  <div v-if="showQRScanner" class="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
      <div class="flex justify-between items-center p-4 border-b">
        <h3 class="font-semibold text-lg">{{ t('qr_scanner.title') || 'Scan QR Code' }}</h3>
        <button @click="closeQRScanner" class="text-gray-500 hover:text-gray-700">
          <XIcon class="w-6 h-6" />
        </button>
      </div>
      
      <div class="p-4">
        <div id="qr-reader" class="qr-scanner-container"></div>
        <p v-if="cameraLoading" class="text-gray-500 text-sm mt-2 text-center flex items-center justify-center gap-2">
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Starting camera...
        </p>
        <p v-if="scanError" class="text-red-500 text-sm mt-2 text-center">{{ scanError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { CameraIcon, HomeIcon, UserIcon, XIcon } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { Html5Qrcode } from "html5-qrcode";

const { t } = useI18n();
const router = useRouter();
const goTo = (path) => router.push(path);

const showQRScanner = ref(false);
const scanError = ref("");
const cameraLoading = ref(false);
let html5QrCode = null;
let scannerStarted = false;

const openQRScanner = async () => {
  showQRScanner.value = true;
  scanError.value = "";
  cameraLoading.value = true;
  scannerStarted = false;
  
  // Wait for DOM to update
  setTimeout(async () => {
    // Ensure any previous scanner instance is cleaned up
    if (html5QrCode) {
      try { await html5QrCode.stop(); } catch {}
      html5QrCode = null;
    }

    try {
      html5QrCode = new Html5Qrcode("qr-reader");
      
      // Better config for mobile: no qrbox restriction initially
      // This ensures the full camera preview renders
      const config = { 
        fps: 15,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 0.75 // 4:3 ratio works better for mobile cameras
      };
      
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          scannerStarted = true;
          onQRCodeScanned(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors - normal when no QR in view
        }
      );
      
      scannerStarted = true;
      cameraLoading.value = false;
      
    } catch (err) {
      console.error("Error starting QR scanner:", err);
      cameraLoading.value = false;
      
      // Handle specific errors
      const msg = err.message || "";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        scanError.value = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (msg.includes("NotFoundError")) {
        scanError.value = "No camera found on this device.";
      } else {
        scanError.value = t('qr_scanner.camera_error') || "Could not start camera. Please try again.";
      }
    }
  }, 300); // Slightly longer delay to ensure DOM is ready
};

const onQRCodeScanned = (decodedText) => {
  // Stop the scanner
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode = null;
    }).catch(err => {
      console.error("Error stopping scanner:", err);
    });
  }
  
  showQRScanner.value = false;
  
  // Extract device number from QR code
  // QR code may contain: device number directly, or a URL like "https://.../device/071582000001"
  let deviceNo = decodedText.trim();
  
  // Try to extract device number from URL if it's a URL
  const urlMatch = decodedText.match(/device[\/=]([0-9]+)/);
  if (urlMatch && urlMatch[1]) {
    deviceNo = urlMatch[1];
  }
  
  // Navigate to machine details
  if (deviceNo) {
    router.push(`/machine/${deviceNo}`);
  }
};

const closeQRScanner = async () => {
  if (html5QrCode) {
    try {
      await html5QrCode.stop();
      html5QrCode = null;
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
  }
  showQRScanner.value = false;
};

onUnmounted(() => {
  if (html5QrCode) {
    html5QrCode.stop().catch(() => {});
  }
});
</script>

<style scoped>
/* QR Scanner Container - Fix camera preview rendering */
.qr-scanner-container {
  width: 100%;
  min-height: 280px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  position: relative;
}

/* Force the video element to fill the container */
.qr-scanner-container :deep(video) {
  width: 100% !important;
  height: auto !important;
  max-height: 350px;
  object-fit: cover;
}

/* Ensure the camera feed fills the space */
.qr-scanner-container :deep(#qr-reader__camera_permission) {
  display: none;
}

/* Camera loading placeholder */
.qr-scanner-container:empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  color: #999;
  font-size: 14px;
}
</style>
