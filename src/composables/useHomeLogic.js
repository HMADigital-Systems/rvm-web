import { ref, onMounted } from "vue";
import { getUserRecords, getNearbyRVMs, getMachineConfig } from "../services/autogcm.js";

export function useHomeLogic() {
  const user = ref({ name: "", avatar: "/images/profile.png", totalWeight: "0.00", balance: 0, phone: "" });
  const rvmList = ref([]);
  const sliderImages = ref(["/images/banner1.jpg", "/images/banner2.jpg"]);

  // ⭐ CONFIG: Machines to Hide
  const HIDDEN_MACHINES = ["071582000008"];

  // ⭐ CONFIG: Manual Fallback
  const FALLBACK_MACHINES = [
    {
      deviceNo: "071582000002",
      address: "Taman Wawasan Recreational Park, Puchong",
      isonline: 0, 
      status: 0,   
      distance: 1200
    },
    {
      deviceNo: "071582000009",
      address: "Taman Wawasan Recreational Park, Puchong",
      isonline: 0, 
      status: 0,
      distance: 1200
    }
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
    
    // Check Flags
    if (comp.isFull === true || comp.isFull === "true") return { text: "Bin Full", color: "red" };
    if (comp.status === 2 || comp.status === 3) return { text: "Maintenance", color: "red" };
    
    // ⭐ SAFETY CHECK: If calculated percent > 95%, warn user even if 'isFull' is false
    if (calculatedPercent >= 95) return { text: "Almost Full", color: "orange" };

    if (comp.status === 1) return { text: "In Use", color: "orange" };
    return { text: "Available", color: "green" };
  };

  onMounted(async () => {
    const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
    user.value = {
      name: localUser.nikeName || "User",
      avatar: localUser.avatarUrl || "/images/profile.png",
      balance: localUser.integral || 0,
      phone: localUser.phone || "",
      totalWeight: "0.00"
    };

    if (user.value.phone) {
      getUserRecords(user.value.phone).then(res => {
        if (res?.data?.list) {
          user.value.totalWeight = res.data.list.reduce((sum, item) => sum + (Number(item.weight) || 0), 0).toFixed(2);
        }
      });
    }

    try {
      const nearby = await getNearbyRVMs(3.0454, 101.6172);
      let allMachines = [];

      if (nearby?.data && Array.isArray(nearby.data)) {
        allMachines = [...nearby.data];
      }

      FALLBACK_MACHINES.forEach(fallback => {
        if (!allMachines.find(m => m.deviceNo === fallback.deviceNo)) {
          allMachines.push(fallback);
        }
      });

      allMachines = allMachines.filter(m => !HIDDEN_MACHINES.includes(m.deviceNo));

      // 3. Get Configs
      const detailedMachines = await Promise.all(allMachines.map(async (rvm) => {
        const configRes = await getMachineConfig(rvm.deviceNo);
        const configs = configRes?.data || [];
        
        let computedOnline = rvm.isonline; 
        let computedStatus = rvm.status;

        if (configRes && configRes.code === 200) {
            if (rvm.isonline === 0 && FALLBACK_MACHINES.find(f => f.deviceNo === rvm.deviceNo)) {
                computedOnline = 1; 
            }
            const hasFault = configs.some(c => c.status === 2 || c.status === 3);
            const hasActivity = configs.some(c => c.status === 1);
            
            if (hasFault) computedStatus = 3; 
            else if (hasActivity) computedStatus = 1; 
            else computedStatus = 0; 
        }
        return { ...rvm, configs, isonline: computedOnline, status: computedStatus };
      }));

      // 4. Build UI
      rvmList.value = detailedMachines.map(rvm => {
        const isMachineOnline = (rvm.isonline || rvm.isOnline) == 1;
        
        let machineStatusText = "Offline";
        if (isMachineOnline) {
            if (rvm.status == 1) machineStatusText = "In Use";
            else if (rvm.status == 3 || rvm.status == 2) machineStatusText = "Maintenance";
            else machineStatusText = "Online";
        }

        const compartments = rvm.configs.map(conf => {
          const { label, color } = mapTypeToLabel(conf.rubbishTypeName);
          
          // ⭐ NEW CALCULATION LOGIC HERE ⭐
          let percent = 0;
          
          if (label === "Used Cooking Oil") {
             // FORCE 400kg Limit for Oil
             // Example: 123.12 / 400 = 0.3078 -> 31%
             const currentWeight = Number(conf.weight || 0);
             const REAL_MAX_WEIGHT = 400; 
             percent = Math.round((currentWeight / REAL_MAX_WEIGHT) * 100);
          } else {
             // For standard bins, trust the API rate
             percent = conf.rate ? Math.round(conf.rate) : 0;
          }

          // Safety Caps
          if (percent > 100) percent = 100;
          if (conf.isFull) percent = 100; // Hard override if sensor triggered

          const statusObj = getCompStatus(isMachineOnline, conf, percent);

          return {
            label, color,
            statusText: statusObj.text,
            statusColor: statusObj.color,
            percent
          };
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

    } catch (e) {
      console.error("RVM Load Failed", e);
    }
  });

  return { user, rvmList, sliderImages };
}