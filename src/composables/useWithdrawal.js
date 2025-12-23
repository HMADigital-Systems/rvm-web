import { ref, onMounted } from 'vue';
import { supabase, getOrCreateUser } from '../services/supabase';
import { syncUser } from '../services/autogcm'; // Your existing API file

export function useWithdrawal(phone) {
  const loading = ref(false);
  const maxWithdrawal = ref(0);
  const withdrawalHistory = ref([]);
  const userUuid = ref(null);

  const fetchBalance = async () => {
    loading.value = true;
    try {
      // 1. Get Supabase UUID (and sync if needed)
      const dbUser = await getOrCreateUser(phone);
      if (!dbUser) throw new Error("Could not sync user");
      userUuid.value = dbUser.id;

      // 2. HYBRID FETCH:
      // A. Get Total Lifetime Points from Hardware API
      const apiRes = await syncUser(phone); 
      const lifetimePoints = Number(apiRes?.integral || 0);

      // B. Get Total Spent from Database
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('amount, status, created_at, bank_name, account_number')
        .eq('user_id', userUuid.value)
        .order('created_at', { ascending: false });

      const spentPoints = withdrawals
        .filter(w => w.status !== 'REJECTED') // We count Pending, Approved, Paid
        .reduce((sum, w) => sum + Number(w.amount), 0);

      // 3. Calculate Real Available Balance
      maxWithdrawal.value = lifetimePoints - spentPoints;
      withdrawalHistory.value = withdrawals;

      // 4. Update the cached lifetime points in DB (Keep it fresh)
      await supabase
        .from('users')
        .update({ lifetime_integral: lifetimePoints, last_synced_at: new Date() })
        .eq('id', userUuid.value);

    } catch (err) {
      console.error("Balance Check Failed", err);
    } finally {
      loading.value = false;
    }
  };

  const submitWithdrawal = async (amount, bankDetails) => {
    if (amount > maxWithdrawal.value) {
      alert("Insufficient balance!");
      return false;
    }

    try {
      const { error } = await supabase.from('withdrawals').insert({
        user_id: userUuid.value,
        amount: amount,
        status: 'PENDING',
        bank_name: bankDetails.bankName,
        account_number: bankDetails.accountNumber,
        account_holder_name: bankDetails.holderName
      });

      if (error) throw error;
      
      await fetchBalance(); // Refresh numbers
      return true;
    } catch (err) {
      alert("Submission failed: " + err.message);
      return false;
    }
  };

  return { loading, maxWithdrawal, withdrawalHistory, fetchBalance, submitWithdrawal };
}