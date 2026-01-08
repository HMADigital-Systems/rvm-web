import { ref } from 'vue';
import { supabase, getOrCreateUser, getMerchantId } from '../services/supabase'; 

export function useWithdrawal(phone) {
  const loading = ref(false);
  const maxWithdrawal = ref(0);
  const withdrawalHistory = ref([]);
  const userUuid = ref(null);
  
  // Breakdown: { "merchant_id": amount }
  const merchantBalances = ref({}); 

  const fetchBalance = async () => {
    loading.value = true;
    try {
      // 1. Get User
      const dbUser = await getOrCreateUser(phone);
      if (!dbUser) throw new Error("User not found");
      userUuid.value = dbUser.id;

      // 2. Fetch ALL Data needed for calculation
      const [earningsRes, withdrawalsRes, legacyTransRes, platformId] = await Promise.all([
        // A. EARNINGS (Use calculated_value!)
        supabase
          .from('submission_reviews')
          .select('merchant_id, calculated_value') // 🟢 FIXED: Was machine_given_points
          .eq('user_id', userUuid.value)
          .neq('status', 'REJECTED'),

        // B. NEW WITHDRAWALS (Requests)
        supabase
          .from('withdrawals')
          .select('merchant_id, amount, status, created_at, bank_name, account_number')
          .eq('user_id', userUuid.value)
          .neq('status', 'REJECTED')
          .order('created_at', { ascending: false }),

        // C. LEGACY SPENDING (From wallet_transactions)
        // We need to catch 'WITHDRAWAL_SYNC' or 'MIGRATION_ADJUSTMENT' that lowered the balance
        supabase
          .from('wallet_transactions')
          .select('merchant_id, amount')
          .eq('user_id', userUuid.value)
          .lt('amount', 0), // Only negative amounts (spending)

        getMerchantId()
      ]);

      // 3. Logic: Calculate Balance Per Merchant
      const balances = {};
      let totalLifetime = 0;

      // --- ADD EARNINGS ---
      (earningsRes.data || []).forEach(item => {
        const mId = item.merchant_id;
        // 🟢 FIX: Use calculated_value
        const pts = Number(item.calculated_value || 0);
        
        if (!balances[mId]) balances[mId] = 0;
        balances[mId] += pts;
        totalLifetime += pts;
      });

      // --- SUBTRACT NEW WITHDRAWALS ---
      (withdrawalsRes.data || []).forEach(item => {
        const mId = item.merchant_id;
        const amt = Number(item.amount || 0);
        
        if (balances[mId]) {
            balances[mId] -= amt;
        } else if (platformId && balances[platformId]) {
            balances[platformId] -= amt; // Fallback to platform
        }
      });

      // --- SUBTRACT LEGACY SPENDING (Critical for Ermaisya) ---
      (legacyTransRes.data || []).forEach(item => {
        const mId = item.merchant_id;
        const amt = Math.abs(Number(item.amount || 0)); // Make positive to subtract
        
        if (balances[mId]) {
            balances[mId] -= amt;
        } else if (platformId) {
             if (!balances[platformId]) balances[platformId] = 0;
             balances[platformId] -= amt;
        }
      });

      // 4. Final Totals
      let totalAvailable = 0;
      for (const mId in balances) {
        // Fix floating point issues (e.g. 0.3000004)
        balances[mId] = Number(balances[mId].toFixed(2));
        if (balances[mId] > 0) {
            totalAvailable += balances[mId];
        } else {
            balances[mId] = 0; // No negative balances visible
        }
      }

      merchantBalances.value = balances;
      maxWithdrawal.value = totalAvailable.toFixed(2);
      withdrawalHistory.value = withdrawalsRes.data || [];

      // 5. Update User Lifetime Cache (Optional but good)
      await supabase
        .from('users')
        .update({ lifetime_integral: totalLifetime, last_synced_at: new Date() })
        .eq('id', userUuid.value);

    } catch (err) {
      console.error("Balance Check Failed", err);
    } finally {
      loading.value = false;
    }
  };

  const submitWithdrawal = async (amount, bankDetails) => {
    const reqAmount = Number(amount);
    
    if (reqAmount <= 0) return alert("Invalid amount");
    if (reqAmount > Number(maxWithdrawal.value)) return alert("Insufficient balance!");

    loading.value = true;
    try {
      let remainingToWithdraw = reqAmount;
      const transactions = [];

      // 🔄 SPLIT LOGIC
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
      console.error(err);
      alert("Submission failed: " + err.message);
      return false;
    } finally {
      loading.value = false;
    }
  };

  return { loading, maxWithdrawal, withdrawalHistory, fetchBalance, submitWithdrawal };
}