<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-slate-800 to-gray-900 px-6 text-center">
    <div class="max-w-md w-full animate-fadeIn">
      <div class="text-6xl mb-4">🛍️</div>
      <div class="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6"
        style="background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.25);">
        Coming Soon
      </div>
      <h1 class="text-3xl font-extrabold text-white mb-4">MyGreenShop</h1>
      <p class="text-sm text-slate-400 leading-relaxed mb-8">
        We're building something exciting! <br />
        Soon you'll be able to redeem your recycling points for exclusive green products and rewards.
      </p>
      <button @click="$router.push('/home-page')"
        class="px-8 py-3 bg-green-600 text-white rounded-full text-sm font-semibold shadow-lg hover:bg-green-500 transition-all">
        Back to Home
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn { animation: fadeIn 0.8s ease-out; }
</style>
