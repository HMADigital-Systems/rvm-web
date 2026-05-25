<template>
  <nav class="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around py-2 shadow-md z-50">
    <!-- Home -->
    <button @click="goTo('/home-page')" class="flex flex-col items-center text-gray-600 hover:text-green-600">
      <HomeIcon class="w-8 h-8 text-green-600" />
      <span class="text-xs">{{ t('nav.home') }}</span>
    </button>

    <!-- Activity (Dashboard) -->
    <button @click="goTo('/dashboard')" class="flex flex-col items-center text-gray-600 hover:text-green-600">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
      <span class="text-xs">{{ t('nav.activity') }}</span>
    </button>

    <!-- QR Scanner (Center) -->
    <button @click="openQRScanner" class="flex items-center justify-center bg-green-600 text-white rounded-full w-14 h-14 -mt-8 shadow-lg">
      <CameraIcon class="w-8 h-8 text-white" />
    </button>

    <!-- MyGreenShop (Market) -->
    <button @click="goTo('/market')" class="flex flex-col items-center text-gray-600 hover:text-green-600">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
      <span class="text-xs">{{ t('nav.market') }}</span>
    </button>

    <!-- Profile -->
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
import { ref, onUnmounted, onMounted } from "vue";
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

const openQRScanner = async () => {
  showQRScanner.value = true;
  scanError.value = "";
  cameraLoading.value = true;
  
  setTimeout(async () => {
    if (html5QrCode) {
      try { await html5QrCode.stop(); } catch {}
      html5QrCode = null;
    }

    try {
      html5QrCode = new Html5Qrcode("qr-reader");
      const config = { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 0.75 };
      
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          onQRCodeScanned(decodedText);
        },
        () => {}
      );
      
      cameraLoading.value = false;
    } catch (err) {
      cameraLoading.value = false;
      const msg = err.message || "";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        scanError.value = "Camera permission denied.";
      } else if (msg.includes("NotFoundError")) {
        scanError.value = "No camera found.";
      } else {
        scanError.value = "Could not start camera.";
      }
    }
  }, 300);
};

const onQRCodeScanned = (decodedText) => {
  if (html5QrCode) {
    html5QrCode.stop().then(() => { html5QrCode = null; }).catch(() => {});
  }
  showQRScanner.value = false;
  
  let deviceNo = decodedText.trim();
  const urlMatch = decodedText.match(/device[\/=]([0-9]+)/);
  if (urlMatch && urlMatch[1]) {
    deviceNo = urlMatch[1];
  }
  if (deviceNo) {
    router.push(`/machine/${deviceNo}`);
  }
};

const closeQRScanner = async () => {
  if (html5QrCode) {
    try { await html5QrCode.stop(); html5QrCode = null; } catch {}
  }
  showQRScanner.value = false;
};

onUnmounted(() => {
  if (html5QrCode) { html5QrCode.stop().catch(() => {}); }
});
</script>

<style scoped>
.qr-scanner-container { width: 100%; min-height: 280px; border-radius: 12px; overflow: hidden; background: #000; }
.qr-scanner-container :deep(video) { width: 100% !important; height: auto !important; max-height: 350px; object-fit: cover; }
</style>