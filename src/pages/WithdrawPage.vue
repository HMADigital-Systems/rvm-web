<script setup>
import { ref, onMounted } from 'vue';
import { useWithdrawal } from '../composables/useWithdrawal';
import { ArrowLeft } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

// Assuming you store the logged-in phone in localStorage
const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
const userPhone = localUser.phone; 
const router = useRouter();

const { loading, maxWithdrawal, withdrawalHistory, fetchBalance, submitWithdrawal } = useWithdrawal(userPhone);

const form = ref({
  amount: '',
  bankName: 'Maybank',
  accountNumber: '',
  holderName: ''
});

onMounted(() => {
  if(userPhone) fetchBalance();
});

const handleSubmit = async () => {
  const amount = Number(form.value.amount);
  if (!amount || amount <= 0) return alert("Invalid amount");

  const success = await submitWithdrawal(amount, form.value);
  if (success) {
    alert("Request Submitted!");
    form.value.amount = ''; // Reset form
  }
};
</script>

<template>
  <div class="p-4 max-w-md mx-auto space-y-6">

    <div class="flex items-center space-x-3 mb-2">
      <button 
        @click="router.back()" 
        class="p-2 rounded-full bg-white text-gray-600 shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
      >
        <ArrowLeft :size="20" />
      </button>
      <h1 class="text-xl font-bold text-gray-800">Withdraw Points</h1>
    </div>
    
    <div class="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      
      <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>

      <div class="relative z-10">
        <div class="text-blue-100 text-sm font-medium">Available to Withdraw</div>
        <div class="text-4xl font-bold mt-1">{{ loading ? '...' : maxWithdrawal }} pts</div>
        
        <div class="mt-4 pt-3 border-t border-blue-400/30 flex items-center justify-between text-xs text-blue-100">
           <span>Total Lifetime: {{ (Number(maxWithdrawal) + Number(withdrawalHistory.filter(w => w.status === 'PENDING').reduce((s,x)=>s+Number(x.amount),0))).toFixed(0) }}</span>
           
           <span v-if="withdrawalHistory.some(w => w.status === 'PENDING')" class="bg-blue-800/40 px-2 py-1 rounded flex items-center">
             <span class="mr-1">🔒</span> {{ withdrawalHistory.filter(w => w.status === 'PENDING').reduce((s,x)=>s+Number(x.amount),0) }} Reserved
           </span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 class="font-bold text-gray-900 mb-4">Request Withdrawal</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Amount</label>
          <input v-model="form.amount" type="number" placeholder="Enter points to withdraw" 
                 class="w-full p-3 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-blue-500 transition-all">
        </div>

        <div class="grid grid-cols-2 gap-4">
           <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Bank Name</label>
              <select v-model="form.bankName" class="w-full p-3 bg-gray-50 rounded-lg border-none">
                <option>Maybank</option>
                <option>CIMB</option>
                <option>Public Bank</option>
                <option>Touch 'n Go</option>
              </select>
           </div>
           <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Account No.</label>
              <input v-model="form.accountNumber" type="text" placeholder="1234..." 
                 class="w-full p-3 bg-gray-50 rounded-lg border-none">
           </div>
        </div>
        
        <div>
           <label class="block text-xs font-medium text-gray-500 mb-1">Account Holder Name</label>
           <input v-model="form.holderName" type="text" placeholder="Full Name per IC" 
              class="w-full p-3 bg-gray-50 rounded-lg border-none">
        </div>

        <button @click="handleSubmit" :disabled="loading" 
                class="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">
           {{ loading ? 'Processing...' : 'Submit Request' }}
        </button>
      </div>
    </div>

    <div class="space-y-3">
      <h3 class="font-bold text-gray-900 px-1">History</h3>
      <div v-for="item in withdrawalHistory" :key="item.created_at" 
           class="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
         <div>
            <div class="font-bold text-gray-900">{{ item.amount }} pts</div>
            <div class="text-xs text-gray-400">{{ new Date(item.created_at).toLocaleDateString() }}</div>
         </div>
         <span :class="`px-2 py-1 rounded text-xs font-bold ${
            item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
            item.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
            'bg-amber-100 text-amber-700'
         }`">
           {{ item.status }}
         </span>
      </div>
    </div>

  </div>
</template>