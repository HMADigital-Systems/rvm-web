<template>
  <header
    class="fixed top-0 left-0 w-full bg-white shadow-md flex items-center gap-4 px-6 py-3 z-50"
  >
    <!-- 🧑 Profile Picture -->
    <img
      :src="user.avatar"
      alt="Profile"
      class="w-12 h-12 rounded-full border border-green-300 object-cover"
    />

    <!-- 👋 Greeting Text -->
    <div class="flex flex-col">
      <div class="flex items-center gap-1">
        <h2 class="text-lg font-bold text-green-700">Hello, {{ user.name }}</h2>
      </div>
      <p class="text-gray-500 text-sm">Ready to recycle?</p>
    </div>
  </header>
</template>

<script setup>

defineProps({
  user: {
    type: Object,
    default: () => ({
      name: "Ariff",
      avatar: "/images/profile.png", 
    }),
  },
});
</script>
