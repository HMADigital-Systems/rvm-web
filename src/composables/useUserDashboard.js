import { ref, onMounted } from "vue";
import { getUserRecords } from "../services/autogcm.js";
import { supabase, getOrCreateUser } from "../services/supabase.js";

export function useUserDashboard() {
  const stats = ref({
    totalWeight: "0.00",
    totalCash: "0.00",
    totalItems: 0,
    recycleCount: 0
  });
  
  const history = ref([]);
  const isLoading = ref(true);
  const error = ref(null);

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-MY', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  /**
   * Check if a record is UCO (Used Cooking Oil)
   */
  const isUCO = (record) => {
    const name = (record.rubbishName || "").toLowerCase();
    return name.includes("oil") || name.includes("minyak") || 
           name.includes("uco") || name.includes("cooking");
  };

  const fetchDashboardData = async () => {
    isLoading.value = true;
    try {
      const user = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
      const phone = user.phone || user.phonenumber || "";
      if (!phone) throw new Error("User phone not found");

      // ---- SOURCE 1: Vendor API (Primary) ----
      const res = await getUserRecords(phone, 1, 50);
      
      if (res.code === 200 && res.data && res.data.list) {
        // Process ALL records - fix hidden rubbish names in nested details
        const allRecords = res.data.list.map(item => {
          let realName = item.rubbishName;
          if (!realName && item.rubbishLogDetailsVOList && item.rubbishLogDetailsVOList.length > 0) {
            realName = item.rubbishLogDetailsVOList[0].rubbishName;
          }
          return { ...item, rubbishName: realName };
        });

        // Try to filter by phone (some APIs return all users' records)
        const phoneClean = phone.replace(/[^0-9]/g, '');
        const phoneFiltered = allRecords.filter(item => {
          const recPhone = String(item.phonenumber || '').replace(/[^0-9]/g, '');
          return recPhone ? recPhone.includes(phoneClean.slice(-9)) || phoneClean.includes(recPhone.slice(-9)) : false;
        });

        // If phone filter returns data, use filtered. Otherwise use ALL (API scoped by phone)
        history.value = phoneFiltered.length > 0 ? phoneFiltered : allRecords;

        // Calculate stats from vendor API records
        const weight = history.value.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
        const cash = history.value.reduce((sum, item) => sum + (Number(item.integral) || 0), 0);

        stats.value = {
          totalWeight: weight.toFixed(2),
          totalCash: cash.toFixed(2),
          totalItems: history.value.length,
          recycleCount: history.value.length
        };
      }
      
      // ---- SOURCE 2: Supabase (Fallback if vendor API fails or returns empty) ----
      if (!stats.value.totalCash || stats.value.totalCash === "0.00" || history.value.length === 0) {
        try {
          const dbUser = await getOrCreateUser(phone, user.nickname || "User", user.avatarUrl || "");
          if (dbUser) {
            let totalCash = Number(dbUser.total_points || 0);
            
            // Subtract withdrawals
            try {
              const { data: withdrawals } = await supabase
                .from('withdrawals')
                .select('amount, status')
                .eq('user_id', dbUser.id);
              
              if (withdrawals) {
                const spent = withdrawals
                  .filter(w => w.status !== 'REJECTED' && w.status !== 'EXTERNAL_SYNC')
                  .reduce((sum, w) => sum + Number(w.amount), 0);
                totalCash = Math.max(0, totalCash - spent);
              }
            } catch (e) {
              console.warn("Withdrawal query failed:", e);
            }
            
            // Use Supabase for weight & cash if vendor API returned 0
            if (parseFloat(stats.value.totalWeight || "0") === 0) {
              stats.value.totalWeight = (dbUser.total_weight || 0).toFixed(2);
            }
            if (parseFloat(stats.value.totalCash || "0") === 0) {
              stats.value.totalCash = totalCash.toFixed(2);
            }

            // Fetch history from Supabase if vendor API returned nothing
            if (history.value.length === 0) {
              try {
                const { data: submissions } = await supabase
                  .from('submission_reviews')
                  .select('*')
                  .eq('user_id', dbUser.user_id)
                  .order('submitted_at', { ascending: false })
                  .limit(50);
                
                if (submissions && submissions.length > 0) {
                  history.value = submissions.map(s => ({
                    id: s.id,
                    rubbishName: s.waste_type || 'Recycling',
                    weight: s.api_weight || 0,
                    integral: s.calculated_value || 0,
                    createTime: s.submitted_at,
                    deviceName: s.device_no || 'RVM',
                    phonenumber: phone
                  }));
                }
              } catch (histErr) {
                console.warn('History fallback failed:', histErr);
              }
            }
          }
        } catch (dbErr) {
          console.warn("Supabase fallback failed:", dbErr);
        }
      }
    } catch (err) {
      console.error("Dashboard Error:", err);
      error.value = "Failed to load history.";
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(() => {
    fetchDashboardData();
  });

  return {
    stats,
    history,
    isLoading,
    error,
    formatDate,
    isUCO
  };
}
