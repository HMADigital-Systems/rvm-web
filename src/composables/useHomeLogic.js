import { ref, onMounted } from "vue";
import { getUserRecords, getNearbyRVMs, getMachineConfig, syncUser } from "../services/autogcm.js";
import { supabase, getOrCreateUser } from "../services/supabase.js";

// --- GLOBAL CACHE (Defined outside the function) ---
const globalRvmList = ref([]); 
const isFirstLoad = ref(true); // Tracks if we have fetched data at least once

export function useHomeLogic() {
  // 1. Init totalWeight as NULL to trigger skeleton if no cache exists
  const user = ref({ 
    name: "", 
    avatar: "/images/profile.png", 
    totalWeight: null, // <--- Changed from "0.00"
    balance: 0, 
    phone: "",
    pendingEarnings: 0
  });
  
  const sliderImages = ref(["/images/banner1.jpg", "/images/banner2.jpg"]);
  
  // Local loading state (For UI spinner/skeleton)
  // If we already have data in globalRvmList, we don't need to show loading skeleton
  const isLoading = ref(isFirstLoad.value);

  // CONFIGS
  const HIDDEN_MACHINES = ["071582000008"];
  const FALLBACK_MACHINES = [
    { deviceNo: "071582000002", address: "Taman Wawasan Recreational Park, Puchong", isonline: 0, status: 0, distance: 1200 },
    { deviceNo: "071582000009", address: "Taman Wawasan Recreational Park, Puchong", isonline: 0, status: 0, distance: 1200 }
  ];

  const mapTypeToLabel = (apiName) => {
    if (!apiName) return { label: "General", color: "green" };
    const lower = apiName.toLowerCase();
    if (lower.includes("oil") || lower.includes("food") || lower.includes("minyak") || lower.includes("uco")) return { label: "Used Cooking Oil", color: "orange" };
    if (lower.includes("paper") || lower.includes("kertas") || lower.includes("纸")) return { label: "Paper", color: "blue" };
    if (lower.includes("plastic") || lower.includes("can") || lower.includes("aluminium") || lower.includes("botol")) return { label: "Plastic / Aluminium", color: "green" };
    return { label: apiName, color: "gray" };
  };

  const getCompStatus = (isMachineOnline, comp, calculatedPercent) => {
    if (!isMachineOnline) return { text: "Offline", color: "red" };
    if (comp.isFull === true || comp.isFull === "true") return { text: "Bin Full", color: "red" };
    if (comp.status === 2 || comp.status === 3) return { text: "Maintenance", color: "red" };
    if (calculatedPercent >= 95) return { text: "Almost Full", color: "orange" };
    if (comp.status === 1) return { text: "In Use", color: "orange" };
    return { text: "Available", color: "green" };
  };

  const fetchRVMs = async () => {
    try {
      // 1. Get Nearby
      const nearby = await getNearbyRVMs(3.0454, 101.6172);
      let allMachines = nearby?.data && Array.isArray(nearby.data) ? [...nearby.data] : [];

      // 2. Merge Fallbacks & Filter
      FALLBACK_MACHINES.forEach(fallback => {
        if (!allMachines.find(m => m.deviceNo === fallback.deviceNo)) allMachines.push(fallback);
      });
      allMachines = allMachines.filter(m => !HIDDEN_MACHINES.includes(m.deviceNo));

      // 3. Get Configs (Detailed Data)
      const detailedMachines = await Promise.all(allMachines.map(async (rvm) => {
        const configRes = await getMachineConfig(rvm.deviceNo);
        const configs = configRes?.data || [];
        
        let computedOnline = rvm.isonline; 
        let computedStatus = rvm.status;

        // Logic to fix offline/status flags based on config
        if (configRes && configRes.code === 200) {
            if (rvm.isonline === 0 && FALLBACK_MACHINES.find(f => f.deviceNo === rvm.deviceNo)) computedOnline = 1; 
            const hasFault = configs.some(c => c.status === 2 || c.status === 3);
            const hasActivity = configs.some(c => c.status === 1);
            if (hasFault) computedStatus = 3; 
            else if (hasActivity) computedStatus = 1; 
            else computedStatus = 0; 
        }
        return { ...rvm, configs, isonline: computedOnline, status: computedStatus };
      }));

      // 4. Map to UI
      const mappedList = detailedMachines.map(rvm => {
        const isMachineOnline = (rvm.isonline || rvm.isOnline) == 1;
        let machineStatusText = "Offline";
        
        if (isMachineOnline) {
            if (rvm.status == 1) machineStatusText = "In Use";
            else if (rvm.status == 3 || rvm.status == 2) machineStatusText = "Maintenance";
            else machineStatusText = "Online";
        }

        const compartments = rvm.configs.map(conf => {
          const { label, color } = mapTypeToLabel(conf.rubbishTypeName);
          let percent = 0;
          
          if (label === "Used Cooking Oil") {
             const currentWeight = Number(conf.weight || 0);
             percent = Math.round((currentWeight / 400) * 100);
          } else {
             percent = conf.rate ? Math.round(conf.rate) : 0;
          }
          if (percent > 100) percent = 100;
          if (conf.isFull) percent = 100;

          const statusObj = getCompStatus(isMachineOnline, conf, percent);

          return { label, color, statusText: statusObj.text, statusColor: statusObj.color, percent };
        });

        if (compartments.length === 0) {
           compartments.push({ label: "Loading...", color: "gray", statusText: isMachineOnline ? "Connected" : "Offline", statusColor: "gray", percent: 0 });
        }

        return {
          deviceNo: rvm.deviceNo,
          status: machineStatusText,
          distance: (rvm.distance / 1000).toFixed(2),
          address: rvm.address,
          compartments: compartments.sort((a, b) => a.label.localeCompare(b.label))
        };
      });

      // Update Global Cache
      globalRvmList.value = mappedList;
      isFirstLoad.value = false; // Mark as loaded so next time we don't show skeleton

    } catch (e) {
      console.error("RVM Load Failed", e);
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(async () => {
    // 1. Load User from LocalStorage (Cache)
    const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
    
    user.value = {
      name: localUser.nikeName || "User",
      avatar: localUser.avatarUrl || "/images/profile.png",
      balance: localUser.integral || 0, 
      phone: localUser.phone || "",
      // Keep your existing cache logic
      totalWeight: localUser.cachedWeight !== undefined ? localUser.cachedWeight : null 
    };

    // 2. HYBRID SYNC: Calculate Real Balance & Weight
    if (user.value.phone) {
      try {
        // --- A. SYNC USER & BALANCE ---
        // 1. Ensure user is in Supabase
        const dbUser = await getOrCreateUser(user.value.phone, user.value.name, user.value.avatar);
        
        // 2. Get Lifetime Points from API
        const apiRes = await syncUser(user.value.phone);
        const lifetimePoints = Number(apiRes?.data?.integral || apiRes?.integral || 0);

        // 3. Get Spent Points from Supabase
        let spentPoints = 0;
        if (dbUser) {
           const { data: withdrawals } = await supabase
             .from('withdrawals')
             .select('amount, status')
             .eq('user_id', dbUser.id)
             .neq('status', 'REJECTED'); // Count Pending, Approved, Paid
           
           spentPoints = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
        }

        // 4. Calculate Real Balance
        const realBalance = (lifetimePoints - spentPoints).toFixed(2);
        user.value.balance = realBalance;
        localUser.integral = realBalance; // Update cache object

        if (dbUser && lifetimePoints > 0) {
           await supabase
             .from('users')
             .update({ 
                lifetime_integral: lifetimePoints, 
                last_synced_at: new Date() 
             })
             .eq('id', dbUser.id);
        }

        // Query the submission_reviews table for 'PENDING' items
        if (dbUser) {
           const { data: submissions } = await supabase
             .from('submission_reviews')
             .select('machine_given_points')
             .eq('user_id', dbUser.id)
             .eq('status', 'PENDING'); // Only look for unapproved items
           
           // Sum them up
           const incoming = submissions?.reduce((sum, s) => sum + Number(s.s.machine_given_points), 0) || 0;
           user.value.pendingEarnings = incoming.toFixed(2);
        }

        // --- B. SYNC WEIGHT HISTORY (Your Old Logic) ---
        const weightRes = await getUserRecords(user.value.phone, 1, 100);
        if (weightRes?.data?.list) {
            const total = weightRes.data.list.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
            const finalWeight = total.toFixed(2);
            
            user.value.totalWeight = finalWeight;
            localUser.cachedWeight = finalWeight; // Update cache object
        }

        // Save everything to LocalStorage
        localStorage.setItem("autogcmUser", JSON.stringify(localUser));

      } catch (err) {
        console.error("User Data Sync Failed:", err);
        // Fallback: If weight is still null (and API failed), show 0.00
        if (user.value.totalWeight === null) user.value.totalWeight = "0.00";
      }
    } else {
       // Guest User
       if (user.value.totalWeight === null) user.value.totalWeight = "0.00";
    }

    // 3. FETCH MACHINES (Your Old Logic - Preserved!)
    await fetchRVMs();
  });

  // Return the GLOBAL variable, not a local one
  return { user, rvmList: globalRvmList, sliderImages, isLoading };
}