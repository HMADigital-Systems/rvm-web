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
        <div id="qr-reader" class="w-full rounded-lg overflow-hidden"></div>
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
let html5QrCode = null;

const openQRScanner = async () => {
  showQRScanner.value = true;
  scanError.value = "";
  
  // Wait for DOM to update
  setTimeout(async () => {
    try {
      html5QrCode = new Html5Qrcode("qr-reader");
      
      const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        onQRCodeScanned,
        (errorMessage) => {
          // Ignore scan errors (no QR code found in frame)
        }
      );
    } catch (err) {
      console.error("Error starting QR scanner:", err);
      scanError.value = t('qr_scanner.camera_error') || "Camera access denied. Please allow camera permissions.";
    }
  }, 100);
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
