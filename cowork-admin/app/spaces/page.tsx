"use client";

import { useEffect, useState } from "react";
import { getSpaces, createSpace, updateSpace, deleteSpace, Space } from "@/lib/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

const SPACE_TYPES = ["hot_desk", "dedicated_desk", "private_office", "meeting_room", "event_space"];

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Space | null>(null);

  const load = async () => {
    try {
      setSpaces(await getSpaces());
    } catch {
      toast.error("Failed to load spaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Deactivate this space?")) return;
    try {
      await deleteSpace(id);
      toast.success("Space deactivated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spaces</h1>
          <p className="text-sm text-gray-500 mt-1">Manage coworking spaces</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Space
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
          </div>
        ) : spaces.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No spaces configured yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Capacity</th>
                  <th className="px-6 py-3">Rate/hr</th>
                  <th className="px-6 py-3">Floor</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {spaces.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-6 py-3 text-gray-600">{s.space_type.replace(/_/g, " ")}</td>
                    <td className="px-6 py-3 text-gray-600">{s.capacity}</td>
                    <td className="px-6 py-3 text-gray-600">{s.hourly_rate_usd ? `$${s.hourly_rate_usd}` : "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{s.floor || "—"}</td>
                    <td className="px-6 py-3">
                      <span className={clsx("badge", s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                        {s.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(s)} className="p-1.5 text-gray-400 hover:text-indigo-600">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <SpaceModal
          onClose={() => setShowCreate(false)}
          onSave={async (body) => {
            await createSpace(body);
            toast.success("Space created");
            setShowCreate(false);
            load();
          }}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <SpaceModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            await updateSpace(editing.id, body);
            toast.success("Space updated");
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ─── Space Form Modal ─── */

function SpaceModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Space;
  onClose: () => void;
  onSave: (body: Partial<Space>) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.space_type || "hot_desk");
  const [capacity, setCapacity] = useState(initial?.capacity || 1);
  const [rate, setRate] = useState(initial?.hourly_rate_usd || 0);
  const [floor, setFloor] = useState(initial?.floor || "");
  const [amenities, setAmenities] = useState(initial?.amenities || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ name, space_type: type, capacity, hourly_rate_usd: rate, floor: floor || null, amenities: amenities || null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{initial ? "Edit Space" : "New Space"}</h3>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Type</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {SPACE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Capacity</label>
              <input type="number" className="input" min={1} value={capacity} onChange={(e) => setCapacity(+e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Hourly Rate ($)</label>
              <input type="number" step="0.01" className="input" value={rate} onChange={(e) => setRate(+e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Floor</label>
              <input className="input" value={floor} onChange={(e) => setFloor(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Amenities</label>
            <input className="input" placeholder="WiFi, Monitor, Whiteboard" value={amenities} onChange={(e) => setAmenities(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : initial ? "Save Changes" : "Create Space"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
