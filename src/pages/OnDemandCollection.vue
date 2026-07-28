<template>
  <div class="min-h-screen bg-gradient-to-b from-green-50 to-white pb-24">
    
    <!-- Header -->
    <div class="bg-green-600 text-white pt-6 pb-12 px-6 rounded-b-3xl shadow-lg relative">
      <button @click="$router.back()" class="absolute top-6 left-4 p-2 bg-green-700 rounded-full hover:bg-green-800 transition z-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="text-center pt-2">
        <h1 class="text-2xl font-bold">{{ t('odc.title') }}</h1>
        <p class="text-green-100 text-sm mt-1">{{ t('odc.subtitle') }}</p>
      </div>
    </div>

    <!-- Warning: Selangor/KL Only -->
    <div class="mx-6 -mt-6 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm relative z-10">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p class="text-sm font-semibold text-amber-800">{{ t('odc.area_note_title') }}</p>
        <p class="text-xs text-amber-700 mt-0.5">{{ t('odc.area_note_body') }}</p>
      </div>
    </div>

    <!-- Form -->
    <div v-if="!submitted" class="mx-6 space-y-4">
      
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('odc.name') }}</label>
        <input 
          v-model="form.name"
          type="text"
          :placeholder="t('odc.name_ph')"
          class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition"
          maxlength="100"
        />
      </div>

      <!-- Phone -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('odc.phone') }}</label>
        <input 
          v-model="form.phone"
          type="tel"
          :placeholder="t('odc.phone_ph')"
          class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition"
          maxlength="15"
        />
      </div>

      <!-- Address -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('odc.address') }}</label>
        <textarea
          v-model="form.address"
          :placeholder="t('odc.address_ph')"
          rows="3"
          class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition resize-none"
          maxlength="500"
        ></textarea>
      </div>

      <!-- State -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('odc.state') }}</label>
        <select
          v-model="form.state"
          class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white transition appearance-none"
          :class="{ 'border-amber-400 ring-2 ring-amber-200': form.state && form.state !== 'Selangor' && form.state !== 'KL' }"
        >
          <option value="" disabled>{{ t('odc.state_ph') }}</option>
          <option v-for="s in allowedStates" :key="s" :value="s">{{ s }}</option>
        </select>
        <p v-if="form.state && form.state !== 'Selangor' && form.state !== 'KL'" class="text-amber-600 text-xs mt-1 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ t('odc.state_warning') }}
        </p>
      </div>

      <!-- Waste Type -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('odc.waste_type') }}</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="wt in wasteTypes"
            :key="wt.value"
            @click="toggleWasteType(wt.value)"
            class="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-sm"
            :class="selectedWasteTypes.includes(wt.value) 
              ? 'border-green-500 bg-green-50 text-green-700' 
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'"
          >
            <span class="text-2xl">{{ wt.icon }}</span>
            <span class="font-medium">{{ wt.label }}</span>
          </button>
        </div>
      </div>

      <!-- Submit Button -->
      <button
        @click="submitRequest"
        :disabled="isSubmitting || !canSubmit"
        class="w-full py-3.5 rounded-xl font-semibold text-white shadow-lg transition mt-2"
        :class="canSubmit ? 'bg-green-600 hover:bg-green-700 active:scale-[0.98]' : 'bg-gray-400 cursor-not-allowed'"
      >
        <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ t('odc.submitting') }}
        </span>
        <span v-else>{{ t('odc.submit') }}</span>
      </button>

      <p class="text-center text-xs text-gray-400 mt-2">{{ t('odc.footer_note') }}</p>
    </div>

    <!-- Success State -->
    <div v-else class="mx-6 mt-4">
      <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">{{ t('odc.success_title') }}</h2>
        <p class="text-gray-500 text-sm mb-2">{{ t('odc.success_msg') }}</p>
        <p class="text-xs text-gray-400">{{ t('odc.success_ref') }} <span class="font-mono font-bold text-green-700">#{{ requestRef }}</span></p>
        <div class="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
          <p class="text-xs text-amber-700 font-medium mb-1">{{ t('odc.keep_ready') }}</p>
          <ul class="text-xs text-amber-600 space-y-1 ml-4 list-disc">
            <li>{{ t('odc.keep_tip1') }}</li>
            <li>{{ t('odc.keep_tip2') }}</li>
          </ul>
        </div>
        <button
          @click="$router.push('/home-page')"
          class="mt-6 w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition shadow-md"
        >
          {{ t('odc.back_home') }}
        </button>
      </div>
    </div>

    <Navbar />
  </div>

  <!-- Feedback Modal -->
  <div v-if="feedback.show" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
    <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
      <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3"
        :class="feedback.isError ? 'bg-red-100' : 'bg-green-100'">
        <span v-if="feedback.isError" class="text-red-500 text-2xl font-bold">!</span>
        <span v-else class="text-green-500 text-2xl font-bold">✓</span>
      </div>
      <h3 class="text-lg font-bold text-gray-800 mb-1">{{ feedback.title }}</h3>
      <p class="text-sm text-gray-500 mb-6">{{ feedback.message }}</p>
      <button @click="feedback.show = false"
        class="w-full py-2.5 rounded-xl font-medium text-white transition"
        :class="feedback.isError ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'">
        {{ t('odc.ok') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Navbar from '../components/NavBar.vue'
import { supabase } from '../services/supabase.js'

const { t } = useI18n()

const allowedStates = ['Selangor', 'KL']

const wasteTypes = [
  { value: 'plastic', label: t('odc.waste_plastic'), icon: '🧴' },
  { value: 'aluminium', label: t('odc.waste_aluminium'), icon: '🥫' },
  { value: 'uco', label: t('odc.waste_uco'), icon: '🫒' },
  { value: 'ewaste', label: t('odc.waste_ewaste'), icon: '🔌' },
  { value: 'paper', label: t('odc.waste_paper'), icon: '📦' },
  { value: 'clothes', label: t('odc.waste_clothes'), icon: '👕' },
]

const form = ref({
  name: '',
  phone: '',
  address: '',
  state: '',
})

const selectedWasteTypes = ref([])
const submitted = ref(false)
const isSubmitting = ref(false)
const requestRef = ref('')
const feedback = ref({ show: false, title: '', message: '', isError: false })

function toggleWasteType(val) {
  const idx = selectedWasteTypes.value.indexOf(val)
  if (idx > -1) {
    selectedWasteTypes.value.splice(idx, 1)
  } else {
    selectedWasteTypes.value.push(val)
  }
}

const canSubmit = computed(() => {
  return (
    form.value.name.trim() &&
    form.value.phone.trim() &&
    form.value.address.trim() &&
    (form.value.state === 'Selangor' || form.value.state === 'KL') &&
    selectedWasteTypes.value.length > 0
  )
})

async function submitRequest() {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    const payload = {
      name: form.value.name.trim(),
      phone: form.value.phone.trim(),
      address: form.value.address.trim(),
      state: form.value.state,
      waste_types: selectedWasteTypes.value,
      requested_at: new Date().toISOString(),
    }

    // Submit via Supabase
    const { data, error } = await supabase
      .from('collection_requests')
      .insert([{
        name: payload.name,
        phone: payload.phone,
        address: payload.address,
        state: payload.state,
        waste_types: payload.waste_types,
        status: 'pending'
      }])
      .select('id')
      .single()

    if (error) {
      feedback.value = {
        show: true,
        title: t('odc.error_title'),
        message: error.message || t('odc.error_generic'),
        isError: true,
      }
    } else {
      requestRef.value = data.id?.toString(36).toUpperCase() || Date.now().toString(36).toUpperCase()
      submitted.value = true
    }
  } catch (err) {
    feedback.value = {
      show: true,
      title: t('odc.error_title'),
      message: t('odc.error_network'),
      isError: true,
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
