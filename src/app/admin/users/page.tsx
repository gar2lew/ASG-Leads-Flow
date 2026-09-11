"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { User as UserType } from "@/lib/types";
import { Plus, MoreHorizontal, Mail, Building2, Shield, UserCheck, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const { users, currentUser, addUser, updateUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [form, setForm] = useState<Partial<UserType>>({ role: "Rep", office: "Perth", status: "Active" });

  const handleSave = () => {
    if (!form.name || !form.email) return;
    if (editingUser) {
      updateUser({ ...editingUser, ...form } as UserType);
    } else {
      addUser({ ...(form as UserType), id: `u-${Date.now()}` });
    }
    setShowModal(false);
    setEditingUser(null);
    setForm({ role: "Rep", office: "Perth", status: "Active" });
  };

  const openEdit = (user: UserType) => {
    setEditingUser(user);
    setForm(user);
    setShowModal(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-asg-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-asg-text lg:text-3xl">Users</h1>
          <p className="mt-1 text-sm text-asg-text-secondary">Manage staff, roles and office assignments.</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setForm({ role: "Rep", office: "Perth", status: "Active" }); setShowModal(true); }}
          className="asg-button-primary"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-xl border border-asg-border bg-white shadow-sm lg:block">
        <table className="asg-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Office</th>
              <th>Status</th>
              <th>Last Login</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="font-medium text-asg-text">{user.name}</td>
                <td>{user.email}</td>
                <td><RoleBadge role={user.role} /></td>
                <td>{user.office}</td>
                <td><StatusIndicator status={user.status} /></td>
                <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Never"}</td>
                <td>
                  <button onClick={() => openEdit(user)} className="flex h-8 w-8 items-center justify-center rounded-md text-asg-text-muted hover:bg-asg-cream hover:text-asg-text">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 lg:hidden">
        {users.map((user) => (
          <div key={user.id} className="asg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-asg-text">{user.name}</p>
                <p className="flex items-center gap-1.5 text-sm text-asg-text-secondary">
                  <Mail className="h-3.5 w-3.5" /> {user.email}
                </p>
              </div>
              <RoleBadge role={user.role} />
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-asg-text-secondary">
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {user.office}</span>
              <StatusIndicator status={user.status} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-asg-border bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-asg-text">{editingUser ? "Edit User" : "Add User"}</h3>
              <button onClick={() => setShowModal(false)} className="text-asg-text-muted hover:text-asg-text"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <input type="text" placeholder="Full name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="asg-input" />
              <input type="email" placeholder="Email address" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="asg-input" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })} className="asg-select">
                <option value="Rep">Rep</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
              <select value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value as any })} className="asg-select">
                <option value="Perth">Perth</option>
                <option value="Brisbane">Brisbane</option>
                <option value="All">All Offices</option>
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="asg-select">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="asg-button-secondary">Cancel</button>
              <button onClick={handleSave} className="asg-button-primary">{editingUser ? "Save Changes" : "Add User"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles = {
    Admin: "bg-asg-navy/10 text-asg-navy",
    Manager: "bg-asg-gold-subtle text-asg-gold-dark",
    Rep: "bg-asg-info-subtle text-asg-info",
  };

  const icons = {
    Admin: Shield,
    Manager: UserCheck,
    Rep: User,
  };

  const Icon = icons[role as keyof typeof icons] || User;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", styles[role as keyof typeof styles] || "bg-asg-cream text-asg-text-secondary")}>
      <Icon className="h-3 w-3" />
      {role}
    </span>
  );
}

function StatusIndicator({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", status === "Active" ? "text-asg-success" : "text-asg-danger")}>
      <span className={cn("h-2 w-2 rounded-full", status === "Active" ? "bg-asg-success" : "bg-asg-danger")} />
      {status}
    </span>
  );
}
