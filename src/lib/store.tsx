"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { User, Lead, Activity, FollowUp, SurveySession, ImportJob, Office, Role } from "./types";
import * as data from "./mock-data";

interface AppState {
  currentUser: User;
  users: User[];
  leads: Lead[];
  activities: Activity[];
  followUps: FollowUp[];
  surveySessions: SurveySession[];
  importJobs: ImportJob[];
  selectedOffice: Office | "All";
  isAuthenticated: boolean;
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => boolean;
  logout: () => void;
  setSelectedOffice: (office: Office | "All") => void;
  updateLead: (lead: Lead) => void;
  addLead: (lead: Lead) => void;
  addActivity: (activity: Activity) => void;
  addFollowUp: (followUp: FollowUp) => void;
  completeFollowUp: (id: string) => void;
  addSurveySession: (session: SurveySession) => void;
  updateSurveySession: (session: SurveySession) => void;
  addImportJob: (job: ImportJob) => void;
  updateUser: (user: User) => void;
  addUser: (user: User) => void;
  getOfficeLeads: (office?: Office | "All") => Lead[];
  getRepLeads: (repName: string) => Lead[];
  getLeadActivities: (leadId: string) => Activity[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: data.currentUser,
    users: data.users,
    leads: data.leads,
    activities: data.activities,
    followUps: data.followUps,
    surveySessions: data.surveySessions,
    importJobs: data.importJobs,
    selectedOffice: data.currentUser.office as Office | "All",
    isAuthenticated: true,
  });

  const login = useCallback((email: string, password: string) => {
    const user = data.users.find((u) => u.email === email);
    if (user && password.length > 0) {
      setState((s) => ({
        ...s,
        currentUser: user,
        selectedOffice: user.office as Office | "All",
        isAuthenticated: true,
      }));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setState((s) => ({ ...s, isAuthenticated: false }));
  }, []);

  const setSelectedOffice = useCallback((office: Office | "All") => {
    setState((s) => ({ ...s, selectedOffice: office }));
  }, []);

  const updateLead = useCallback((lead: Lead) => {
    setState((s) => ({
      ...s,
      leads: s.leads.map((l) => (l.id === lead.id ? lead : l)),
    }));
  }, []);

  const addLead = useCallback((lead: Lead) => {
    setState((s) => ({ ...s, leads: [lead, ...s.leads] }));
  }, []);

  const addActivity = useCallback((activity: Activity) => {
    setState((s) => ({ ...s, activities: [activity, ...s.activities] }));
  }, []);

  const addFollowUp = useCallback((followUp: FollowUp) => {
    setState((s) => ({ ...s, followUps: [followUp, ...s.followUps] }));
  }, []);

  const completeFollowUp = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      followUps: s.followUps.map((f) => (f.id === id ? { ...f, status: "Completed" as const } : f)),
    }));
  }, []);

  const addSurveySession = useCallback((session: SurveySession) => {
    setState((s) => ({ ...s, surveySessions: [session, ...s.surveySessions] }));
  }, []);

  const updateSurveySession = useCallback((session: SurveySession) => {
    setState((s) => ({
      ...s,
      surveySessions: s.surveySessions.map((ss) => (ss.id === session.id ? session : ss)),
    }));
  }, []);

  const addImportJob = useCallback((job: ImportJob) => {
    setState((s) => ({ ...s, importJobs: [job, ...s.importJobs] }));
  }, []);

  const updateUser = useCallback((user: User) => {
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === user.id ? user : u)),
      currentUser: s.currentUser.id === user.id ? user : s.currentUser,
    }));
  }, []);

  const addUser = useCallback((user: User) => {
    setState((s) => ({ ...s, users: [...s.users, user] }));
  }, []);

  const getOfficeLeads = useCallback(
    (office?: Office | "All") => {
      const target = office ?? state.selectedOffice;
      if (target === "All") return state.leads;
      return state.leads.filter((l) => l.office === target);
    },
    [state.leads, state.selectedOffice]
  );

  const getRepLeads = useCallback(
    (repName: string) => state.leads.filter((l) => l.assignedRep === repName),
    [state.leads]
  );

  const getLeadActivities = useCallback(
    (leadId: string) =>
      state.activities
        .filter((a) => a.leadId === leadId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.activities]
  );

  const value: AppContextType = {
    ...state,
    login,
    logout,
    setSelectedOffice,
    updateLead,
    addLead,
    addActivity,
    addFollowUp,
    completeFollowUp,
    addSurveySession,
    updateSurveySession,
    addImportJob,
    updateUser,
    addUser,
    getOfficeLeads,
    getRepLeads,
    getLeadActivities,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
