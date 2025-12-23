import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getUserRecords, updateUserProfile } from "../services/autogcm.js";

export function useProfileLogic() {
  const router = useRouter();

  // --- State ---
  const user = ref({
    name: "",
    phone: "",
    totalWeight: null, // Change default from "0.00" to null to trigger Skeleton
    points: 0,
    avatar: "/images/profile.png",
  });

  const showLogoutModal = ref(false);
  const showEditModal = ref(false);
  const isSaving = ref(false);

  // Temporary state for the edit form
  const editForm = reactive({
    name: "",
    avatar: ""
  });

  const presetAvatars = [
    "/images/profile.png",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Rocky",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  ];

  // --- Actions ---

  const handleImageError = (e) => {
    e.target.src = "/images/profile.png";
  };

  const confirmLogout = () => {
    showLogoutModal.value = true;
  };

  const performLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const openEditModal = () => {
    editForm.name = user.value.name;
    editForm.avatar = user.value.avatar;
    showEditModal.value = true;
  };

  const saveProfile = async () => {
    if (!editForm.name.trim()) return alert("Nickname cannot be empty");

    isSaving.value = true;
    try {
      const res = await updateUserProfile(user.value.phone, editForm.name, editForm.avatar);
      
      if (res.code === 200) {
        user.value.name = editForm.name;
        user.value.avatar = editForm.avatar;

        const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
        localUser.nikeName = editForm.name;
        localUser.name = editForm.name;
        localUser.avatarUrl = editForm.avatar;
        localUser.imgUrl = editForm.avatar;
        
        localStorage.setItem("autogcmUser", JSON.stringify(localUser));
        
        showEditModal.value = false;
        alert("Profile Updated Successfully!");
      } else {
        alert("Update failed: " + (res.msg || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Network error. Please try again.");
    } finally {
      isSaving.value = false;
    }
  };

  // --- Lifecycle ---
  onMounted(async () => {
    const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");

    // 1. Load from Cache (Immediate UI update)
    user.value.name = localUser.name || localUser.nikeName || "User";
    user.value.phone = localUser.phone || "";
    user.value.avatar = localUser.avatarUrl || localUser.imgUrl || "/images/profile.png";
    user.value.points = localUser.integral || 0;
    
    // Check if we have cached weight
    if (localUser.cachedWeight !== undefined) {
        user.value.totalWeight = localUser.cachedWeight;
    }

    // 2. Fetch Fresh Data (Background)
    if (localUser.phone) {
      try {
        const recordRes = await getUserRecords(localUser.phone);
        if (recordRes?.data?.list) {
          const total = recordRes.data.list.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
          const formattedWeight = total.toFixed(2);
          
          // Update State
          user.value.totalWeight = formattedWeight;

          // Update Cache
          localUser.cachedWeight = formattedWeight;
          localStorage.setItem("autogcmUser", JSON.stringify(localUser));
        }
      } catch (e) {
        console.error("Failed to load recycling records", e);
      }
    } else {
        // If no phone (guest?), set weight to 0 if null
        if (user.value.totalWeight === null) user.value.totalWeight = "0.00";
    }
  });

  return {
    user,
    showLogoutModal,
    showEditModal,
    isSaving,
    editForm,
    presetAvatars,
    handleImageError,
    confirmLogout,
    performLogout,
    openEditModal,
    saveProfile
  };
}