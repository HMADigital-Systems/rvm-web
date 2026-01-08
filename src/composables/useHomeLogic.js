import { ref, onMounted } from "vue";
import { getNearbyRVMs, getMachineConfig } from "../services/autogcm.js";
import { supabase, getOrCreateUser } from "../services/supabase.js";

const globalRvmList = ref([]); 
const isFirstLoad = ref(true);

export function useHomeLogic() {
  const user = ref({ 
    name: "User", 
    avatar: "/images/profile.png", 
    totalWeight: null,
    balance: "0.00", 
    phone: "",
    pendingEarnings: "0.00"
  });
  
  const sliderImages = ref(["/images/banner1.jpg", "/images/banner2.jpg"]);
  const isLoading = ref(isFirstLoad.value);

  const HIDDEN_MACHINES = ["071582000008"];
  const FALLBACK_MACHINES = [
    { deviceNo: "071582000002", address: "Taman Wawasan Recreational Park, Puchong", isonline: 0, status: 0, distance: 1200 },
    { deviceNo: "071582000009", address: "Taman Wawasan Recreational Park, Puchong", isonline: 0, status: 0, distance: 1200 }
  ];

  const mapTypeToLabel = (apiName) => {
    if (!apiName) return { label: "General", color: "green" };
    const lower = apiName.toLowerCase();
    if (lower.includes("oil") || lower.includes("minyak")) return { label: "Used Cooking Oil", color: "orange" };
    if (lower.includes("paper") || lower.includes("kertas")) return { label: "Paper", color: "blue" };
    if (lower.includes("plastic") || lower.includes("botol") || lower.includes("can")) return { label: "Plastic / Aluminium", color: "green" };
    return { label: apiName, color: "gray" };
  };

  const getCompStatus = (isMachineOnline, isFull, percent) => {
    if (!isMachineOnline) return { text: "Offline", color: "red" };
    if (isFull) return { text: "Bin Full", color: "red" }; // 🔴 Specific label for the bin
    if (percent >= 95) return { text: "Almost Full", color: "orange" };
    // Removed "In Use" check here to keep compartment status simple
    return { text: "Available", color: "green" };
  };

  const fetchRVMs = async () => {
    try {
      const nearby = await getNearbyRVMs(3.0454, 101.6172); 
      let allMachines = nearby?.data && Array.isArray(nearby.data) ? [...nearby.data] : [];

      FALLBACK_MACHINES.forEach(fallback => {
        if (!allMachines.find(m => m.deviceNo === fallback.deviceNo)) allMachines.push(fallback);
      });
      allMachines = allMachines.filter(m => !HIDDEN_MACHINES.includes(m.deviceNo));

      const detailedMachines = await Promise.all(allMachines.map(async (rvm) => {
        const configRes = await getMachineConfig(rvm.deviceNo);
        const configs = configRes?.data || [];
        const hasValidConfig = (configRes && configRes.code === 200 && configs.length > 0);
        
        let computedOnline = false;
        if (rvm.isonline == 1) computedOnline = true;
        if (rvm.status == 0 || rvm.status == 1) computedOnline = true;
        if (hasValidConfig) computedOnline = true;
        if (FALLBACK_MACHINES.find(f => f.deviceNo === rvm.deviceNo)) computedOnline = true;

        let computedStatus = rvm.status;
        if (hasValidConfig) {
             const hasFault = configs.some(c => c.status === 2 || c.status === 3);
             if (hasFault) computedStatus = 3; 
             // We ignore "In Use" (status 1) for the status calculation, treating it as working.
        }

        return { ...rvm, configs, isRealOnline: computedOnline, computedStatus };
      }));

      const mappedList = detailedMachines.map(rvm => {
        const isOnline = rvm.isRealOnline;
        
        // 1. Process Compartments First
        const compartments = rvm.configs.map(conf => {
          const { label, color } = mapTypeToLabel(conf.rubbishTypeName);
          let percent = conf.rate ? Math.round(conf.rate) : 0;
          if (label === "Used Cooking Oil") percent = Math.round((Number(conf.weight || 0) / 400) * 100);
          
          // Determine if this specific bin is full
          const isBinFull = (percent >= 100 || conf.isFull);
          if (isBinFull) percent = 100;
          
          const statusObj = getCompStatus(isOnline, isBinFull, percent);
          return { 
              label, 
              color, 
              statusText: statusObj.text, 
              statusColor: statusObj.color, 
              percent,
              isFull: isBinFull // Flag for parent check
          };
        });

        if (compartments.length === 0) compartments.push({ label: "Loading...", color: "gray", percent: 0, isFull: false });

        // 2. Determine Main Card Status
        let machineStatusText = "Offline";

        if (isOnline) {
            // Priority 1: Maintenance
            if (rvm.computedStatus == 3 || rvm.computedStatus == 2) {
                machineStatusText = "Maintenance";
            } 
            // Priority 2: Are ALL bins full?
            // We only show "Bin Full" on the card if EVERYTHING is full.
            else if (compartments.length > 0 && compartments.every(c => c.isFull)) {
                machineStatusText = "Bin Full";
            } 
            // Priority 3: Default
            else {
                machineStatusText = "Online"; // Shows "Online" even if In Use or Partially Full
            }
        }

        return {
          deviceNo: rvm.deviceNo,
          status: machineStatusText,
          distance: (rvm.distance / 1000).toFixed(2),
          address: rvm.address,
          compartments: compartments.sort((a, b) => a.label.localeCompare(b.label))
        };
      });

      globalRvmList.value = mappedList;
      isFirstLoad.value = false;

    } catch (e) {
      console.error("RVM Load Failed", e);
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(async () => {
    // ... (User Data Loading Logic remains same) ...
    const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
    user.value.phone = localUser.phone || "";

    if (user.value.phone) {
        try {
            const dbUser = await getOrCreateUser(user.value.phone, localUser.nikeName, localUser.avatarUrl);
            if (dbUser) {
                user.value.name = dbUser.nickname || "User";
                user.value.avatar = dbUser.avatar_url || "/images/profile.png";
                user.value.totalWeight = Number(dbUser.total_weight || 0).toFixed(2);
                
                const lifetime = Number(dbUser.lifetime_integral || 0);
                const { data: withdrawals } = await supabase.from('withdrawals').select('amount').eq('user_id', dbUser.id).neq('status', 'REJECTED');
                const spent = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
                user.value.balance = (lifetime - spent).toFixed(2);

                const { data: submissions } = await supabase.from('submission_reviews').select('machine_given_points').eq('user_id', dbUser.id).eq('status', 'PENDING');
                const incoming = submissions?.reduce((sum, s) => sum + Number(s.machine_given_points), 0) || 0;
                user.value.pendingEarnings = incoming.toFixed(2);
            }
        } catch (err) {
            console.error("User Load Error:", err);
            if (user.value.totalWeight === null) user.value.totalWeight = "0.00";
        }
    } else {
        user.value.totalWeight = "0.00";
    }

    await fetchRVMs();
  });

  return { user, rvmList: globalRvmList, sliderImages, isLoading };
}