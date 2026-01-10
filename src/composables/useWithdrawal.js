import { ref } from 'vue';
import { supabase, getOrCreateUser, getMerchantId } from '../services/supabase'; 

export function useWithdrawal(phone) {
  const loading = ref(false);
  
  const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
  const maxWithdrawal = ref(localUser.cachedBalance || 0);
  
  // 🟢 NEW: Add a ref for Lifetime Earnings
  const lifetimeEarnings = ref(0);

  const withdrawalHistory = ref([]);
  const userUuid = ref(null);
  const merchantBalances = ref({}); 

  const fetchBalance = async () => {
    loading.value = true;
    try {
      const dbUser = await getOrCreateUser(phone);
      if (!dbUser) throw new Error("User not found");
      userUuid.value = dbUser.id;

      // ... (Existing Promise.all fetching logic remains the same) ...
      const [earningsRes, withdrawalsRes, legacyTransRes, platformId] = await Promise.all([
        supabase.from('submission_reviews').select('merchant_id, calculated_value').eq('user_id', userUuid.value).neq('status', 'REJECTED'),
        supabase.from('withdrawals').select('merchant_id, amount, status, created_at, bank_name, account_number').eq('user_id', userUuid.value).neq('status', 'REJECTED').order('created_at', { ascending: false }),
        supabase.from('wallet_transactions').select('merchant_id, amount').eq('user_id', userUuid.value).lt('amount', 0),
        getMerchantId()
      ]);

      const balances = {};
      let totalLifetimeCalc = 0; // Temp variable

      // 1. Add Earnings
      (earningsRes.data || []).forEach(item => {
        const mId = item.merchant_id;
        const pts = Number(item.calculated_value || 0);
        if (!balances[mId]) balances[mId] = 0;
        balances[mId] += pts;
        
        // Sum up total lifetime here
        totalLifetimeCalc += pts;
      });

      // ... (Rest of calculation logic remains the same) ...
      (withdrawalsRes.data || []).forEach(item => {
        const mId = item.merchant_id;
        const amt = Number(item.amount || 0);
        if (balances[mId]) balances[mId] -= amt;
        else if (platformId && balances[platformId]) balances[platformId] -= amt;
      });

      (legacyTransRes.data || []).forEach(item => {
        const mId = item.merchant_id;
        const amt = Math.abs(Number(item.amount || 0));
        if (balances[mId]) balances[mId] -= amt;
        else if (platformId) {
             if (!balances[platformId]) balances[platformId] = 0;
             balances[platformId] -= amt;
        }
      });

      let totalAvailable = 0;
      for (const mId in balances) {
        balances[mId] = Number(balances[mId].toFixed(2));
        if (balances[mId] > 0) totalAvailable += balances[mId];
        else balances[mId] = 0;
      }

      merchantBalances.value = balances;
      maxWithdrawal.value = totalAvailable.toFixed(2);
      withdrawalHistory.value = withdrawalsRes.data || [];
      
      // 🟢 NEW: Set the exposed value
      lifetimeEarnings.value = totalLifetimeCalc.toFixed(2);

      // Cache Updates...
      const cache = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
      cache.cachedBalance = maxWithdrawal.value;
      localStorage.setItem("autogcmUser", JSON.stringify(cache));

      // Update User DB
      await supabase.from('users')
        .update({ lifetime_integral: totalLifetimeCalc, last_synced_at: new Date() })
        .eq('id', userUuid.value);

    } catch (err) {
      console.error("Balance Check Failed", err);
    } finally {
      loading.value = false;
    }
  };

  // ... (submitWithdrawal logic remains the same) ...
  const submitWithdrawal = async (amount, bankDetails) => {
    // ... same code as before ...
    const reqAmount = Number(amount);
    if (reqAmount <= 0) return alert("Invalid amount");
    if (reqAmount > Number(maxWithdrawal.value)) return alert("Insufficient balance!");

    loading.value = true;
    try {
      let remainingToWithdraw = reqAmount;
      const transactions = [];

      for (const [mId, balance] of Object.entries(merchantBalances.value)) {
        if (remainingToWithdraw <= 0) break;
        if (balance <= 0) continue;

        const takeAmount = Math.min(balance, remainingToWithdraw);
        transactions.push({
          user_id: userUuid.value,
          merchant_id: mId,
          amount: takeAmount,
          status: 'PENDING',
          bank_name: bankDetails.bankName,
          account_number: bankDetails.accountNumber,
          account_holder_name: bankDetails.holderName
        });
        remainingToWithdraw -= takeAmount;
      }

      if (transactions.length > 0) {
        const { error } = await supabase.from('withdrawals').insert(transactions);
        if (error) throw error;
      }
      
      await fetchBalance();
      return true;
    } catch (err) {
      alert("Submission failed: " + err.message);
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 🟢 NEW: Return lifetimeEarnings
  return { loading, maxWithdrawal, withdrawalHistory, lifetimeEarnings, fetchBalance, submitWithdrawal };
}