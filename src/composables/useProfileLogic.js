import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { updateUserProfile } from "../services/autogcm.js"; 
import { supabase, getOrCreateUser } from "../services/supabase.js";

export function useProfileLogic() {
  const router = useRouter();

  // --- State ---
  const user = ref({
    name: "User",
    phone: "",
    totalWeight: null,
    points: "0.00",
    avatar: "/images/profile.png",
  });

  const showLogoutModal = ref(false);
  const showEditModal = ref(false);
  const isSaving = ref(false);

  // 🟢 NEW: Feedback Modal State (Replaces alert)
  const feedbackModal = reactive({
    isOpen: false,
    title: "",
    message: "",
    isError: false
  });

  const editForm = reactive({ name: "", avatar: "" });

  const presetAvatars = [
    "/images/profile.png",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Rocky",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  ];

  // --- Helpers ---
  const showFeedback = (title, message, isError = false) => {
    feedbackModal.title = title;
    feedbackModal.message = message;
    feedbackModal.isError = isError;
    feedbackModal.isOpen = true;
  };

  const closeFeedback = () => {
    feedbackModal.isOpen = false;
  };

  const handleImageError = (e) => e.target.src = "/images/profile.png";

  const confirmLogout = () => showLogoutModal.value = true;

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
    if (!editForm.name.trim()) return showFeedback("Error", "Nickname cannot be empty", true);

    isSaving.value = true;
    try {
      const phone = user.value.phone;

      // 1. Update Supabase
      const { error } = await supabase
        .from('users')
        .update({ nickname: editForm.name, avatar_url: editForm.avatar })
        .eq('phone', phone);

      if (error) throw error;

      // 2. Update AutoGCM (Silent Best Effort)
      try { await updateUserProfile(phone, editForm.name, editForm.avatar); } catch (e) { console.warn(e); }

      // 3. Update Local State & Cache
      user.value.name = editForm.name;
      user.value.avatar = editForm.avatar;

      const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
      localUser.nikeName = editForm.name;
      localUser.avatarUrl = editForm.avatar;
      localStorage.setItem("autogcmUser", JSON.stringify(localUser));
      
      showEditModal.value = false;
      
      // ✅ SUCCESS: Show Native Modal instead of alert()
      showFeedback("Success!", "Profile updated successfully.");

    } catch (e) {
      console.error(e);
      showFeedback("Error", "Failed to update profile. Please try again.", true);
    } finally {
      isSaving.value = false;
    }
  };

  // --- Lifecycle (Same as before) ---
  onMounted(async () => {
    const localUser = JSON.parse(localStorage.getItem("autogcmUser") || "{}");
    const phone = localUser.phone;

    user.value.phone = phone || "";
    user.value.name = localUser.nikeName || "User";
    user.value.avatar = localUser.avatarUrl || "/images/profile.png";
    if (localUser.cachedWeight) user.value.totalWeight = localUser.cachedWeight;

    if (phone) {
        try {
            const dbUser = await getOrCreateUser(phone, user.value.name, user.value.avatar);
            if (dbUser) {
                user.value.name = dbUser.nickname || user.value.name;
                user.value.avatar = dbUser.avatar_url || user.value.avatar;
                user.value.totalWeight = Number(dbUser.total_weight || 0).toFixed(2);

                const lifetime = Number(dbUser.lifetime_integral || 0);
                const { data: withdrawals } = await supabase.from('withdrawals').select('amount').eq('user_id', dbUser.id).neq('status', 'REJECTED');
                const spent = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
                user.value.points = (lifetime - spent).toFixed(2);
            }
        } catch (e) { console.error(e); }
    }
    if (user.value.totalWeight === null) user.value.totalWeight = "0.00";
  });

  return {
    user,
    showLogoutModal,
    showEditModal,
    isSaving,
    editForm,
    presetAvatars,
    feedbackModal, 
    showFeedback,
    closeFeedback, 
    handleImageError,
    confirmLogout,
    performLogout,
    openEditModal,
    saveProfile
  };
}