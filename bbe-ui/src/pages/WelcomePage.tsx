import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import InviteModal from "../components/InviteModal";
import { trackEvent } from "../utils/analytics";

interface Invitation {
  id: string;
  team_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  team?: {
    name: string;
    team_number: number;
  };
}

interface Team {
  id: string;
  name: string;
  team_number: number;
  location?: string;
  rookie_year?: number;
  website?: string;
  logo_url?: string;
  banner_url?: string;
  accent_color?: string;
}

interface TeamMember {
  role: string;
  team: Team;
}

interface UserProfile {
  user_id: string;
  years_in_first?: number;
  grade?: number;
  graduation_year?: number;
  subteam?: string;
  phone_number?: string;
  avatar_url?: string;
}

const WelcomePage = () => {
  const { user, signOut } = useAuth();
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Edit mode states
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Invitation states
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(
    []
  );
  const [teamInvitations, setTeamInvitations] = useState<Invitation[]>([]);
  const [teamMembersList, setTeamMembersList] = useState<any[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Form states
  const [personalForm, setPersonalForm] = useState({
    first_name: "",
    last_name: "",
    years_in_first: "",
    grade: "",
    graduation_year: "",
    subteam: "",
  });

  const [teamForm, setTeamForm] = useState({
    name: "",
    location: "",
    rookie_year: "",
    website: "",
    accent_color: "#00eee4",
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch team membership
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select(
          `
                    role,
                    team:teams (
                        id,
                        name,
                        team_number,
                        location,
                        rookie_year,
                        website,
                        logo_url,
                        banner_url,
                        accent_color
                    )
                `
        )
        .eq("user_id", user.id)
        .single();

      if (memberError && memberError.code !== "PGRST116") {
        console.error("Error fetching team:", memberError);
      }

      if (memberData && memberData.team) {
        // Determine if team is an object or an array (sometimes PostgREST returns array)
        const team = Array.isArray(memberData.team)
          ? memberData.team[0]
          : memberData.team;

        if (team) {
          setTeamMember({
            role: memberData.role,
            team: team as Team,
          });

          // Fetch team member count
          const { count } = await supabase
            .from("team_members")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);

          setMemberCount(count || 0);

          // Initialize team form
          setTeamForm({
            name: team.name || "",
            location: team.location || "",
            rookie_year: team.rookie_year?.toString() || "",
            website: team.website || "",
            accent_color: team.accent_color || "#00eee4",
          });
        } else {
          setTeamMember(null);
        }
      } else {
        setTeamMember(null);
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      }

      if (profileData) {
        setUserProfile(profileData);
        setPersonalForm({
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
          years_in_first: profileData.years_in_first?.toString() || "",
          grade: profileData.grade?.toString() || "",
          graduation_year: profileData.graduation_year?.toString() || "",
          subteam: profileData.subteam || "",
        });
      } else {
        // Initialize with user metadata
        setPersonalForm({
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
          years_in_first: "",
          grade: "",
          graduation_year: "",
          subteam: "",
        });
      }
      // Fetch pending invitations for the user
      if (user.email) {
        const { data: invData } = await supabase
          .from("team_invitations")
          .select(
            `
                        *,
                        team:teams (name, team_number)
                    `
          )
          .eq("email", user.email)
          .eq("status", "pending");

        setPendingInvitations(invData || []);
      }

      // Fetch team invitations if admin
      if (memberData && memberData.role === "admin" && memberData.team) {
        const team = (
          Array.isArray(memberData.team) ? memberData.team[0] : memberData.team
        ) as any;
        const teamId = team.id;
        const { data: teamInvData } = await supabase
          .from("team_invitations")
          .select("*")
          .eq("team_id", teamId);

        setTeamInvitations(teamInvData || []);

        // Fetch active team members
        const { data: membersData, error: membersError } = await supabase
          .from("team_members")
          .select("user_id, role")
          .eq("team_id", teamId);

        if (membersError) throw membersError;

        if (membersData && membersData.length > 0) {
          const userIds = membersData.map(m => m.user_id);
          const { data: profilesData } = await supabase
            .from("user_profiles")
            .select("*")
            .in("user_id", userIds);

          const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
          const memberWithProfiles = membersData.map(m => ({
            ...m,
            profile: profileMap.get(m.user_id) || null
          }));
          setTeamMembersList(memberWithProfiles);
        } else {
          setTeamMembersList([]);
        }
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (token: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("accept_team_invitation", {
        invitation_token: token,
      });

      if (error) throw error;

      if (data.success) {
        alert("Successfully joined the team!");
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      alert("Failed to accept invitation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("team_invitations")
        .update({ status: "declined" })
        .eq("id", id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      console.error("Error declining invitation:", err);
    }
  };

  const handleCancelInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Failed to cancel invitation");
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!teamMember?.team?.id) return;
    if (memberUserId === user?.id) {
      alert("You cannot remove yourself...");
      return;
    }
    if (!confirm("Are you sure...?")) return;

    try {
      const { data, error } = await supabase
        .rpc("remove_team_member_and_invitations", {
          p_team_id: teamMember.team.id,
          p_user_id: memberUserId,
        });

      if (error) throw error;
      console.log("RPC OK", data);
      fetchData();
    } catch (err: any) {
      console.error("Error removing member via RPC:", err);
      alert("Failed to remove member");
    }
  };

  const handleChangeRole = async (memberUserId: string, newRole: string) => {
    if (!teamMember?.team?.id) return;
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("team_id", teamMember.team.id)
        .eq("user_id", memberUserId);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      console.error("Error changing role:", err);
      alert("Failed to change role");
    }
  };

  const handlePersonalSave = async () => {
    if (!user) return;

    try {
      // Update user metadata (first_name, last_name)
      await supabase.auth.updateUser({
        data: {
          first_name: personalForm.first_name,
          last_name: personalForm.last_name,
        },
      });

      // Upsert user profile
      const { error } = await supabase.from("user_profiles").upsert({
        user_id: user.id,
        years_in_first: personalForm.years_in_first
          ? parseInt(personalForm.years_in_first)
          : null,
        grade: personalForm.grade ? parseInt(personalForm.grade) : null,
        graduation_year: personalForm.graduation_year
          ? parseInt(personalForm.graduation_year)
          : null,
        subteam: personalForm.subteam || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setEditingPersonal(false);
      trackEvent("profile_updated", {
        userId: user.id
      });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile: " + error.message);
    }
  };

  const handleTeamSave = async () => {
    if (!teamMember?.team?.id) return;

    try {
      const { error } = await supabase
        .from("teams")
        .update({
          name: teamForm.name,
          location: teamForm.location || null,
          rookie_year: teamForm.rookie_year
            ? parseInt(teamForm.rookie_year)
            : null,
          website: teamForm.website || null,
          accent_color: teamForm.accent_color || "#00eee4",
        })
        .eq("id", teamMember.team.id);

      if (error) throw error;

      setEditingTeam(false);
      trackEvent("team_updated", {
        teamId: teamMember.team.id
      });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error("Error saving team:", error);
      alert("Failed to save team: " + error.message);
    }
  };

  const handleImageUpload = async (file: File, type: "logo" | "banner") => {
    if (!teamMember?.team?.id) return;

    // Validate file
    const MAX_SIZE = type === "logo" ? 500 * 1024 : 2 * 1024 * 1024; // 500KB for logo, 2MB for banner
    const ALLOWED_TYPES = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/jpg",
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Please upload a PNG, JPG, or WebP image");
      return;
    }

    if (file.size > MAX_SIZE) {
      alert(`File too large. Max size: ${type === "logo" ? "500KB" : "2MB"}`);
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}.${fileExt}`;
      const filePath = `${teamMember.team.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("team-images")
        .upload(filePath, file, {
          upsert: true, // Replace if exists
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("team-images")
        .getPublicUrl(filePath);

      // Update team record with new URL
      const updateData =
        type === "logo"
          ? { logo_url: urlData.publicUrl }
          : { banner_url: urlData.publicUrl };

      const { error: updateError } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", teamMember.team.id);

      if (updateError) throw updateError;

      fetchData(); // Refresh data
      alert(`${type === "logo" ? "Logo" : "Banner"} uploaded successfully!`);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image: " + error.message);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, "logo");
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, "banner");
  };

  const firstName =
    user?.user_metadata?.first_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background text-text font-['Poppins'] animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {pendingInvitations.length > 0 && !teamMember && (
          <div className="mb-8 space-y-4">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-accent/10 border border-accent/30 rounded-2xl p-4 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 shadow-xl shadow-accent/5"
              >
                <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.998 5.998 0 00-5.48-1.518M6 18.719a7.488 7.488 0 00-2.399-5.54m5.654-2.84a3.75 3.75 0 117.332 0m-7.332 0c.13.59.27 1.18.43 1.77L5.5 20.35m9.907-10.46l-4.113 8.318"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      Join Team {inv.team?.team_number}
                    </h3>
                    <p className="text-sm sm:text-base text-text-muted">
                      You've been invited to join{" "}
                      <span className="text-accent font-bold">
                        {inv.team?.name}
                      </span>{" "}
                      as a <span className="capitalize">{inv.role}</span>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => handleAcceptInvitation(inv.token)}
                    className="flex-1 lg:flex-none px-6 sm:px-8 py-3 bg-accent text-background font-black rounded-xl hover:shadow-[0_0_20px_rgba(0,238,228,0.4)] transition-all active:scale-95"
                  >
                    ACCEPT
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(inv.id)}
                    className="flex-1 lg:flex-none px-6 sm:px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="relative mb-8 sm:mb-10 rounded-2xl overflow-hidden border border-border">
          {teamMember?.team?.banner_url ? (
            <img
              src={teamMember.team.banner_url}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-purple-500/20" />
          )}

          <div className="relative bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {teamMember?.team?.logo_url && (
                <img
                  src={teamMember.team.logo_url}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-background p-2 border border-border"
                />
              )}

              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  Welcome back, <span className="text-accent">{firstName}</span>
                </h1>
                {teamMember && (
                  <p className="text-text-muted mt-1 text-sm sm:text-base">
                    {teamMember.team.name} · Team {teamMember.team.team_number}{" "}
                    · <span className="capitalize">{teamMember.role}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => signOut()}
                className="self-start sm:self-auto bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg border border-red-500/30 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            ["Role", teamMember?.role ?? "—"],
            ["Team Members", memberCount],
            ["Years in FIRST", userProfile?.years_in_first ?? "—"],
            ["Subteam", userProfile?.subteam ?? "—"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-card border border-border rounded-xl p-4"
            >
              <p className="text-xs text-text-muted uppercase">{label}</p>
              <p className="text-xl sm:text-2xl font-bold text-white capitalize">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">
                Personal Information
              </h2>
              {!editingPersonal && (
                <button
                  onClick={() => setEditingPersonal(true)}
                  className="text-sm text-accent hover:text-accent/80 flex items-center gap-1.5 font-medium"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-text-muted">Loading...</p>
            ) : editingPersonal ? (
              <div className="space-y-3">
                {[
                  ["First Name", "first_name"],
                  ["Last Name", "last_name"],
                  ["Years in FIRST", "years_in_first"],
                  ["Grade", "grade"],
                  ["Graduation Year", "graduation_year"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="text-xs text-text-muted">{label}</label>
                    <input
                      type="text"
                      value={(personalForm as any)[key]}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          [key]: e.target.value,
                        })
                      }
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:border-accent/50 outline-none transition-all"
                    />
                  </div>
                ))}

                <div>
                  <label className="text-xs text-text-muted">Subteam</label>
                  <select
                    value={personalForm.subteam}
                    onChange={(e) =>
                      setPersonalForm({
                        ...personalForm,
                        subteam: e.target.value,
                      })
                    }
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:border-accent/50 outline-none transition-all"
                  >
                    <option value="">Select subteam</option>
                    {[
                      "Mechanical",
                      "Electrical",
                      "Programming",
                      "Business",
                      "Strategy",
                      "Media",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handlePersonalSave}
                    className="flex-1 bg-accent text-background py-2 rounded-lg font-semibold text-sm hover:shadow-[0_0_15px_rgba(0,238,228,0.3)] transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingPersonal(false);
                      fetchData();
                    }}
                    className="flex-1 bg-border text-text-muted py-2 rounded-lg text-sm hover:bg-border/80 transition-all font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-text-muted text-xs uppercase font-bold tracking-wider mb-1">
                    Full Name
                  </p>
                  <p className="text-white text-base">
                    {personalForm.first_name || "—"}{" "}
                    {personalForm.last_name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted text-xs uppercase font-bold tracking-wider mb-1">
                    Email Address
                  </p>
                  <p className="text-white text-base">{user?.email}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs uppercase font-bold tracking-wider mb-1">
                    Subteam
                  </p>
                  <p
                    className={`text-base ${userProfile?.subteam
                      ? "text-accent font-semibold"
                      : "text-white"
                      }`}
                  >
                    {userProfile?.subteam || "Not assigned"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-card p-4 sm:p-6 rounded-xl border border-border shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">
                Team Overview
              </h2>
              {teamMember?.role === "admin" && !editingTeam && (
                <button
                  onClick={() => setEditingTeam(true)}
                  className="text-sm text-accent hover:text-accent/80 flex items-center gap-1.5 font-medium"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {!teamMember ? (
              <p className="text-yellow-500 italic">No team assigned.</p>
            ) : editingTeam ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-text-muted block mb-1.5 uppercase font-bold">
                        Team Logo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="w-full text-xs text-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1.5 uppercase font-bold">
                        Team Banner
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerChange}
                        className="w-full text-xs text-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-text-muted uppercase font-bold">
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={teamForm.name}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, name: e.target.value })
                        }
                        className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:border-accent/50 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted uppercase font-bold">
                        Location
                      </label>
                      <input
                        type="text"
                        value={teamForm.location}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, location: e.target.value })
                        }
                        className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:border-accent/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-text-muted uppercase font-bold">
                      Rookie Year
                    </label>
                    <input
                      type="number"
                      value={teamForm.rookie_year}
                      onChange={(e) =>
                        setTeamForm({
                          ...teamForm,
                          rookie_year: e.target.value,
                        })
                      }
                      className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:border-accent/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase font-bold">
                      Website
                    </label>
                    <input
                      type="url"
                      value={teamForm.website}
                      onChange={(e) =>
                        setTeamForm({ ...teamForm, website: e.target.value })
                      }
                      className="w-full mt-1.5 px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:border-accent/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase font-bold">
                      Accent Color
                    </label>
                    <div className="flex gap-2 mt-1.5">
                      <input
                        type="color"
                        value={teamForm.accent_color}
                        onChange={(e) =>
                          setTeamForm({
                            ...teamForm,
                            accent_color: e.target.value,
                          })
                        }
                        className="w-10 h-10 rounded bg-transparent border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={teamForm.accent_color}
                        onChange={(e) =>
                          setTeamForm({
                            ...teamForm,
                            accent_color: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-white focus:border-accent/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleTeamSave}
                    className="flex-1 bg-accent text-background py-2 rounded-lg font-bold text-sm hover:shadow-[0_0_15px_rgba(0,238,228,0.3)] transition-all"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingTeam(false);
                      fetchData();
                    }}
                    className="flex-1 bg-border text-text-muted py-2 rounded-lg text-sm font-bold hover:bg-border/80 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-text-muted text-xs uppercase font-bold tracking-wider mb-1">
                      Location
                    </p>
                    <p className="text-white text-base">
                      {teamMember.team.location || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs uppercase font-bold tracking-wider mb-1">
                      Rookie Year
                    </p>
                    <p className="text-white text-base">
                      {teamMember.team.rookie_year || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs uppercase font-bold tracking-wider mb-1">
                      Website
                    </p>
                    {teamMember.team.website ? (
                      <a
                        href={teamMember.team.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline text-base block truncate"
                      >
                        {teamMember.team.website}
                      </a>
                    ) : (
                      <p className="text-white text-base">—</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-text-muted text-xs uppercase font-bold tracking-wider mb-1">
                      Member Count
                    </p>
                    <p className="text-white text-base">
                      {memberCount} Active Members
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs uppercase font-bold tracking-wider mb-1">
                      Team Color
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{
                          backgroundColor:
                            teamMember.team.accent_color || "#00eee4",
                        }}
                      />
                      <p className="text-white text-sm font-mono">
                        {teamMember.team.accent_color || "#00eee4"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {teamMember?.role === "admin" && (
          <div className="mt-8 bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  User Management
                </h2>
                <p className="text-xs text-text-muted">
                  View and manage your team's invitations and active members.
                </p>
              </div>

              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="bg-accent/10 hover:bg-accent/20 text-accent px-4 py-2 rounded-lg border border-accent/20 text-sm font-bold flex items-center gap-2 self-start sm:self-auto"
              >
                Invite Member
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border">
                    <th className="pb-3 px-4">User</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    ...teamMembersList.map(m => ({
                      id: m.user_id,
                      name: m.profile?.full_name || m.user_id.substring(0, 8),
                      email: "",
                      role: m.role,
                      status: "active",
                      type: "member"
                    })),
                    ...teamInvitations.filter(i => i.status === "pending").map(i => ({
                      id: i.id,
                      name: i.email,
                      email: i.email,
                      role: i.role,
                      status: "pending",
                      type: "invite"
                    }))
                  ].slice(0, showAllUsers ? undefined : 5).map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border/50 hover:bg-white/[0.02]"
                    >
                      <td className="py-4 px-4 text-white font-medium">
                        {u.name}
                      </td>
                      <td className="py-4 px-4 text-text-muted">
                        {u.type === "member" ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-xs text-white capitalize focus:border-accent outline-none"
                          >
                            <option value="scouter">Scouter</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="capitalize">{u.role}</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.status === "active"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                            }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {u.type === "invite" ? (
                            <button
                              onClick={() => handleCancelInvitation(u.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Cancel Invitation"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ) : (
                            u.id !== user?.id && (
                              <button
                                onClick={() => handleRemoveMember(u.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Remove Member"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(teamMembersList.length + teamInvitations.filter(i => i.status === "pending").length) > 5 && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowAllUsers(!showAllUsers)}
                    className="text-sm text-accent hover:text-accent/80 font-bold transition-colors"
                  >
                    {showAllUsers ? "SHOW LESS" : `SHOW ALL (${teamMembersList.length + teamInvitations.filter(i => i.status === "pending").length})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <Link
            to="/scout/dashboard"
            className="rounded-xl border border-border p-4 sm:p-5 bg-accent/10 hover:bg-accent/20 transition-all group group-hover:border-accent/50"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Scout Dashboard</h3>
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m.75-12H6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h12a2.25 2.25 0 002.25-2.25V7.5L14.25 3z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-text-muted">View pending tasks & assignments</p>
          </Link>

          <Link
            to="/scout/pit"
            className="rounded-xl border border-border p-4 sm:p-5 bg-blue-500/10 hover:bg-blue-500/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Pit Scouting</h3>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-text-muted">Robot hardware & specs</p>
          </Link>

          <Link
            to="/scout/match"
            className="rounded-xl border border-border p-4 sm:p-5 bg-purple-500/10 hover:bg-purple-500/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Match Scouting</h3>
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-text-muted">Live match performance</p>
          </Link>

          {teamMember?.role === "admin" && (
            <Link
              to="/admin/assignments"
              className="rounded-xl border border-border p-4 sm:p-5 bg-orange-500/10 hover:bg-orange-500/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Scout Assignments</h3>
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.998 5.998 0 00-5.48-1.518M6 18.719a7.488 7.488 0 00-2.399-5.54m5.654-2.84a3.75 3.75 0 117.332 0m-7.332 0c.13.59.27 1.18.43 1.77L5.5 20.35m9.907-10.46l-4.113 8.318" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-text-muted">Manage scout tasks & team control</p>
            </Link>
          )}

          {teamMember?.role === "admin" && (
            <Link
              to="/forms"
              className="rounded-xl border border-border p-4 sm:p-5 bg-white/5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Forms Manager</h3>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H3.75" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-text-muted">Customize scouting schema</p>
            </Link>
          )}
        </div>
      </div>

      {isInviteModalOpen && teamMember?.team?.id && (
        <InviteModal
          teamId={teamMember.team.id}
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={() => {
            fetchData();
            alert("Invitation sent successfully!");
          }}
        />
      )}
    </div>
  );
};

export default WelcomePage;
