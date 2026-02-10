import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { trackEvent } from "../utils/analytics";

interface InviteModalProps {
  teamId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({
  teamId,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "scout" | "strategist" | "viewer">(
    "scout"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: inviteError } = await supabase
        .from("team_invitations")
        .insert({
          team_id: teamId,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
        });

      if (inviteError) {
        if (inviteError.code === "23505") {
          throw new Error("An invitation for this email already exists.");
        }
        throw inviteError;
      }

      onSuccess();
      trackEvent("member_invited", {
        teamId,
        invitedEmail: email,
        role,
      });
      onClose();
    } catch (err: any) {
      console.error("Error inviting member:", err);
      setError(err.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-bold text-white">Invite Team Member</h3>
          <p className="text-sm text-text-muted mt-1">
            Send an invitation to join your team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="scout@team.com"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-white outline-none focus:border-accent/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-white outline-none focus:border-accent/50 transition-all"
            >
              <option value="scout">Scout (Primary)</option>
              <option value="strategist">Strategist</option>
              <option value="viewer">Viewer Only</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-border text-text-muted rounded-xl font-bold hover:bg-border/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-accent text-background rounded-xl font-black hover:shadow-[0_0_20px_rgba(0,238,228,0.3)] transition-all disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;
