import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  Customer, Vehicle, Job, Lead, Booking, Service, Staff,
  Invoice, Automation, Review, Conversation, Message, Notification,
  RetentionCustomer, JobStatus, LeadStatus, BookingStatus,
  InvoiceStatus, ReviewStatus, RetentionStatus, User, Tenant,
} from '../types';
import { setAuthToken, getAuthToken } from '../api/client';
import * as endpoints from '../api/endpoints';

interface AppContextType {
  currentUser: User | null;
  currentTenant: Tenant | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; name: string; businessName: string; phone?: string; city?: string }) => Promise<void>;
  logout: () => void;

  customers: Customer[];
  vehicles: Vehicle[];
  jobs: Job[];
  leads: Lead[];
  bookings: Booking[];
  services: Service[];
  staff: Staff[];
  invoices: Invoice[];
  automations: Automation[];
  reviews: Review[];
  conversations: Conversation[];
  notifications: Notification[];
  retentionCustomers: RetentionCustomer[];
  askMovoOpen: boolean;
  openAskMovo: () => void;
  closeAskMovo: () => void;
  loading: boolean;
  error: string | null;

  // Job mutations
  updateJobStatus: (jobId: string, newStatus: JobStatus) => void;
  addJob: (job: Job) => void;

  // Lead mutations
  updateLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  addLead: (lead: Lead) => void;

  // Booking mutations
  addBooking: (booking: Booking) => void;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;

  // Conversation mutations
  toggleAiHandling: (conversationId: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  addConversation: (customerId: string) => Promise<Conversation>;
  archiveConversation: (conversationId: string) => Promise<void>;

  // Notification mutations
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;

  // Automation mutations
  updateAutomationEnabled: (automationId: string, enabled: boolean) => void;
  addAutomation: (automation: Automation) => void;
  deleteAutomation: (automationId: string) => void;

  // Invoice mutations
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus, paymentMethod?: string) => void;
  addInvoice: (invoice: Invoice) => void;

  // Review mutations
  updateReviewStatus: (reviewId: string, status: ReviewStatus) => void;

  // Retention mutations
  updateRetentionStatus: (customerId: string, status: RetentionStatus) => void;

  // Customer mutations
  addCustomer: (customer: Customer) => void;
  updateCustomerNotes: (customerId: string, notes: string) => void;

  // Vehicle mutations
  addVehicle: (vehicle: Vehicle) => void;

  // Staff mutations
  addStaffMember: (staff: Staff) => void;

  // Update mutations
  startJobFromBooking: (bookingId: string) => Promise<void>;
  updateLead: (leadId: string, data: Partial<Lead>) => Promise<void>;
  updateCustomer: (customerId: string, data: Partial<Customer>) => Promise<void>;
  updateVehicle: (vehicleId: string, data: Partial<Vehicle>) => Promise<void>;
  updateJob: (jobId: string, data: any) => Promise<void>;
  updateStaff: (staffId: string, data: Partial<Staff>) => Promise<void>;
  updateBooking: (bookingId: string, data: any) => Promise<void>;
  refreshData: () => Promise<void>;

  // Lookups
  getCustomer: (id: string) => Customer | undefined;
  getVehicle: (id: string) => Vehicle | undefined;
  getStaffMember: (id: string) => Staff | undefined;
  getService: (id: string) => Service | undefined;
  getVehiclesForCustomer: (customerId: string) => Vehicle[];
  getJobsForCustomer: (customerId: string) => Job[];
  getLeadsForCustomer: (customerId: string) => Lead[];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [retentionCustomers, setRetentionCustomers] = useState<RetentionCustomer[]>([]);
  const [askMovoOpen, setAskMovoOpen] = useState(false);

  const openAskMovo = useCallback(() => setAskMovoOpen(true), []);
  const closeAskMovo = useCallback(() => setAskMovoOpen(false), []);

  // Fetch all tenant data in parallel
  const fetchAllData = useCallback(async () => {
    const [
      customersData, vehiclesData, jobsData, leadsData, bookingsData,
      servicesData, staffData, invoicesData, automationsData, reviewsData,
      conversationsData, notificationsData, retentionData,
    ] = await Promise.all([
      endpoints.fetchCustomers(),
      endpoints.fetchVehicles(),
      endpoints.fetchJobs(),
      endpoints.fetchLeads(),
      endpoints.fetchBookings(),
      endpoints.fetchServices(),
      endpoints.fetchStaff(),
      endpoints.fetchInvoices(),
      endpoints.fetchAutomations(),
      endpoints.fetchReviews(),
      endpoints.fetchConversations(),
      endpoints.fetchNotifications(),
      endpoints.fetchRetention(),
    ]);

    setCustomers(customersData);
    setVehicles(vehiclesData);
    setJobs(jobsData);
    setLeads(leadsData);
    setBookings(bookingsData);
    setServices(servicesData);
    setStaffMembers(staffData);
    setInvoices(invoicesData);
    setAutomations(automationsData);
    setReviews(reviewsData);
    setConversations(conversationsData);
    setNotifications(notificationsData);
    setRetentionCustomers(retentionData);
  }, []);

  // Clear all state
  const clearAllData = useCallback(() => {
    setCustomers([]);
    setVehicles([]);
    setJobs([]);
    setLeads([]);
    setBookings([]);
    setServices([]);
    setStaffMembers([]);
    setInvoices([]);
    setAutomations([]);
    setReviews([]);
    setConversations([]);
    setNotifications([]);
    setRetentionCustomers([]);
  }, []);

  // Initialize: check token, fetch user, then fetch data
  const initAuth = useCallback(async () => {
    if (getAuthToken()) {
      try {
        const { user, tenant } = await endpoints.apiGetMe();
        setCurrentUser(user);
        setCurrentTenant(tenant);
        setIsAuthenticated(true);
        if (user.tenantId) {
          await fetchAllData();
        }
      } catch {
        setAuthToken(null);
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCurrentTenant(null);
      }
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, [fetchAllData]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    const result = await endpoints.apiLogin(email, password);
    setAuthToken(result.access_token);
    const { user, tenant } = await endpoints.apiGetMe();
    setCurrentUser(user);
    setCurrentTenant(tenant);
    setIsAuthenticated(true);
    if (user.tenantId) {
      await fetchAllData();
    }
  }, [fetchAllData]);

  // Signup
  const signup = useCallback(async (data: { email: string; password: string; name: string; businessName: string; phone?: string; city?: string }) => {
    const result = await endpoints.apiSignup(data);
    setAuthToken(result.access_token);
    const { user, tenant } = await endpoints.apiGetMe();
    setCurrentUser(user);
    setCurrentTenant(tenant);
    setIsAuthenticated(true);
    if (user.tenantId) {
      await fetchAllData();
    }
  }, [fetchAllData]);

  // Logout
  const logout = useCallback(() => {
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentTenant(null);
    setIsAuthenticated(false);
    clearAllData();
    window.location.href = '/login';
  }, [clearAllData]);

  // --- Job mutations ---
  const updateJobStatus = useCallback(async (jobId: string, newStatus: JobStatus) => {
    try {
      const updated = await endpoints.apiUpdateJobStatus(jobId, newStatus);
      setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
      if (newStatus === 'delivered') {
        const [updatedInvoices, updatedReviews] = await Promise.all([
          endpoints.fetchInvoices(),
          endpoints.fetchReviews(),
        ]);
        setInvoices(updatedInvoices);
        setReviews(updatedReviews);
      }
    } catch (err) {
      console.error('Failed to update job status:', err);
      setJobs(prev => prev.map(job => {
        if (job.id !== jobId) return job;
        const entry = {
          stage: newStatus,
          timestamp: new Date().toISOString(),
          employeeId: '',
          notes: '',
          photos: [] as string[],
        };
        return {
          ...job,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          timeline: [...job.timeline, entry],
        };
      }));
    }
  }, []);

  const addJob = useCallback(async (job: Job) => {
    try {
      const created = await endpoints.apiAddJob({
        customerId: job.customerId,
        vehicleId: job.vehicleId,
        serviceIds: job.serviceIds,
        assignedTo: job.assignedTo,
        estimatedPrice: job.estimatedPrice,
        deposit: job.deposit,
        notes: job.notes,
      });
      setJobs(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add job:', err);
      setJobs(prev => [job, ...prev]);
    }
  }, []);

  // --- Lead mutations ---
  const updateLeadStatus = useCallback(async (leadId: string, newStatus: LeadStatus) => {
    try {
      await endpoints.apiUpdateLeadStatus(leadId, newStatus);
      const updatedLeads = await endpoints.fetchLeads();
      setLeads(updatedLeads);
      if (newStatus === 'won') {
        const updatedCustomers = await endpoints.fetchCustomers();
        setCustomers(updatedCustomers);
        const updatedVehicles = await endpoints.fetchVehicles();
        setVehicles(updatedVehicles);
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    }
  }, []);

  const addLead = useCallback(async (lead: Lead) => {
    try {
      const created = await endpoints.apiAddLead({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        vehicleMake: lead.vehicleMake,
        vehicleModel: lead.vehicleModel,
        vehicleYear: lead.vehicleYear,
        vehicleRegistration: lead.vehicleRegistration,
        serviceIds: lead.serviceIds,
        status: lead.status,
        quotedPrice: lead.quotedPrice,
        source: lead.source,
        notes: lead.notes,
        followUpDate: lead.followUpDate,
      });
      setLeads(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add lead:', err);
      setLeads(prev => [lead, ...prev]);
    }
  }, []);

  // --- Booking mutations ---
  const addBooking = useCallback(async (booking: Booking) => {
    try {
      const created = await endpoints.apiAddBooking({
        customerId: booking.customerId,
        vehicleId: booking.vehicleId,
        serviceIds: booking.serviceIds,
        date: booking.date,
        time: booking.time,
        estimatedPrice: booking.estimatedPrice,
        deposit: booking.deposit,
        notes: booking.notes,
      });
      setBookings(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add booking:', err);
      setBookings(prev => [booking, ...prev]);
    }
  }, []);

  const updateBookingStatus = useCallback(async (bookingId: string, status: BookingStatus) => {
    try {
      await endpoints.apiUpdateBookingStatus(bookingId, status);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
    } catch (err) {
      console.error('Failed to update booking status:', err);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
    }
  }, []);

  // --- Conversation mutations ---
  const toggleAiHandling = useCallback(async (conversationId: string) => {
    try {
      await endpoints.apiToggleAiHandling(conversationId);
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, aiHandling: !c.aiHandling } : c
      ));
    } catch (err) {
      console.error('Failed to toggle AI handling:', err);
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, aiHandling: !c.aiHandling } : c
      ));
    }
  }, []);

  const addMessage = useCallback(async (conversationId: string, message: Message) => {
    try {
      await endpoints.apiAddMessage(conversationId, {
        content: message.content,
        sender: message.sender,
      });
      const convos = await endpoints.fetchConversations();
      setConversations(convos);
    } catch (err) {
      console.error('Failed to add message:', err);
      setConversations(prev => prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: [...c.messages, message],
          lastMessage: message.content,
          unreadCount: message.sender === 'customer' ? c.unreadCount + 1 : c.unreadCount,
        };
      }));
    }
  }, []);

  const addConversation = useCallback(async (customerId: string): Promise<Conversation> => {
    try {
      const created = await endpoints.apiAddConversation(customerId);
      setConversations(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Failed to add conversation:', err);
      const fallback: Conversation = {
        id: `conv-local-${Date.now()}`,
        customerId,
        messages: [],
        aiHandling: true,
        lastMessage: '',
        unreadCount: 0,
      };
      setConversations(prev => [fallback, ...prev]);
      return fallback;
    }
  }, []);

  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      await endpoints.apiArchiveConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (err) {
      console.error('Failed to archive conversation:', err);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    }
  }, []);

  // --- Notification mutations ---
  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await endpoints.apiMarkNotificationRead(notificationId);
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await endpoints.apiMarkAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }, []);

  // --- Automation mutations ---
  const updateAutomationEnabled = useCallback(async (automationId: string, enabled: boolean) => {
    try {
      await endpoints.apiUpdateAutomationEnabled(automationId, enabled);
      setAutomations(prev => prev.map(a =>
        a.id === automationId ? { ...a, enabled } : a
      ));
    } catch (err) {
      console.error('Failed to update automation:', err);
      setAutomations(prev => prev.map(a =>
        a.id === automationId ? { ...a, enabled } : a
      ));
    }
  }, []);

  const addAutomation = useCallback(async (automation: Automation) => {
    try {
      const created = await endpoints.apiAddAutomation({
        name: automation.name,
        description: automation.description,
        trigger: automation.trigger,
        conditions: automation.conditions,
        actions: automation.actions,
        enabled: automation.enabled,
      });
      setAutomations(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add automation:', err);
      setAutomations(prev => [automation, ...prev]);
    }
  }, []);

  const deleteAutomation = useCallback(async (automationId: string) => {
    try {
      await endpoints.apiDeleteAutomation(automationId);
      setAutomations(prev => prev.filter(a => a.id !== automationId));
    } catch (err) {
      console.error('Failed to delete automation:', err);
      setAutomations(prev => prev.filter(a => a.id !== automationId));
    }
  }, []);

  // --- Invoice mutations ---
  const updateInvoiceStatus = useCallback(async (invoiceId: string, status: InvoiceStatus, paymentMethod?: string) => {
    try {
      const updated = await endpoints.apiUpdateInvoiceStatus(invoiceId, status, paymentMethod);
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updated : inv));
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      setInvoices(prev => prev.map(inv => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          status,
          balance: status === 'paid' ? 0 : inv.balance,
          paidAt: status === 'paid' ? new Date().toISOString() : inv.paidAt,
          ...(paymentMethod ? { paymentMethod: paymentMethod as Invoice['paymentMethod'] } : {}),
        };
      }));
    }
  }, []);

  const addInvoice = useCallback(async (invoice: Invoice) => {
    try {
      const created = await endpoints.apiAddInvoice({
        jobId: invoice.jobId,
        customerId: invoice.customerId,
        amount: invoice.amount,
        deposit: invoice.deposit,
        balance: invoice.balance,
        status: invoice.status,
      });
      setInvoices(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add invoice:', err);
      setInvoices(prev => [invoice, ...prev]);
    }
  }, []);

  // --- Review mutations ---
  const updateReviewStatus = useCallback(async (reviewId: string, status: ReviewStatus) => {
    try {
      await endpoints.apiUpdateReviewStatus(reviewId, status);
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, status } : r
      ));
    } catch (err) {
      console.error('Failed to update review status:', err);
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, status } : r
      ));
    }
  }, []);

  // --- Retention mutations ---
  const updateRetentionStatus = useCallback(async (customerId: string, status: RetentionStatus) => {
    try {
      await endpoints.apiUpdateRetentionStatus(customerId, status);
      setRetentionCustomers(prev => prev.map(r =>
        r.customerId === customerId ? { ...r, status } : r
      ));
    } catch (err) {
      console.error('Failed to update retention status:', err);
      setRetentionCustomers(prev => prev.map(r =>
        r.customerId === customerId ? { ...r, status } : r
      ));
    }
  }, []);

  // --- Customer mutations ---
  const addCustomer = useCallback(async (customer: Customer) => {
    try {
      const created = await endpoints.apiAddCustomer({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        tags: customer.tags,
      });
      setCustomers(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add customer:', err);
      setCustomers(prev => [customer, ...prev]);
    }
  }, []);

  const updateCustomerNotes = useCallback(async (customerId: string, notes: string) => {
    try {
      await endpoints.apiUpdateCustomerNotes(customerId, notes);
      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, notes } : c
      ));
    } catch (err) {
      console.error('Failed to update customer notes:', err);
      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, notes } : c
      ));
    }
  }, []);

  // --- Vehicle mutations ---
  const addVehicle = useCallback(async (vehicle: Vehicle) => {
    try {
      const created = await endpoints.apiAddVehicle({
        customerId: vehicle.customerId,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        registrationNumber: vehicle.registrationNumber,
        color: vehicle.color,
      });
      setVehicles(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add vehicle:', err);
      setVehicles(prev => [vehicle, ...prev]);
    }
  }, []);

  // --- Staff mutations ---
  const addStaffMember = useCallback(async (staff: Staff) => {
    try {
      const created = await endpoints.apiAddStaff({
        name: staff.name,
        role: staff.role,
        phone: staff.phone,
        email: staff.email,
        avatar: staff.avatar,
      });
      setStaffMembers(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add staff member:', err);
      setStaffMembers(prev => [staff, ...prev]);
    }
  }, []);

  // --- Update mutations ---
  const startJobFromBooking = useCallback(async (bookingId: string) => {
    try {
      await endpoints.apiStartJobFromBooking(bookingId);
      const [updatedBookings, updatedJobs] = await Promise.all([
        endpoints.fetchBookings(),
        endpoints.fetchJobs(),
      ]);
      setBookings(updatedBookings);
      setJobs(updatedJobs);
    } catch (err) {
      console.error('Failed to start job from booking:', err);
    }
  }, []);

  const updateLead = useCallback(async (leadId: string, data: Partial<Lead>) => {
    try {
      const updated = await endpoints.apiUpdateLead(leadId, data);
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  }, []);

  const updateCustomer = useCallback(async (customerId: string, data: Partial<Customer>) => {
    try {
      const updated = await endpoints.apiUpdateCustomer(customerId, data);
      setCustomers(prev => prev.map(c => c.id === customerId ? updated : c));
    } catch (err) {
      console.error('Failed to update customer:', err);
    }
  }, []);

  const updateVehicle = useCallback(async (vehicleId: string, data: Partial<Vehicle>) => {
    try {
      const updated = await endpoints.apiUpdateVehicle(vehicleId, data);
      setVehicles(prev => prev.map(v => v.id === vehicleId ? updated : v));
    } catch (err) {
      console.error('Failed to update vehicle:', err);
    }
  }, []);

  const updateJob = useCallback(async (jobId: string, data: any) => {
    try {
      const updated = await endpoints.apiUpdateJob(jobId, data);
      setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
    } catch (err) {
      console.error('Failed to update job:', err);
    }
  }, []);

  const updateStaff = useCallback(async (staffId: string, data: Partial<Staff>) => {
    try {
      const updated = await endpoints.apiUpdateStaff(staffId, data);
      setStaffMembers(prev => prev.map(s => s.id === staffId ? updated : s));
    } catch (err) {
      console.error('Failed to update staff:', err);
    }
  }, []);

  const updateBooking = useCallback(async (bookingId: string, data: any) => {
    try {
      const updated = await endpoints.apiUpdateBooking(bookingId, data);
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    } catch (err) {
      console.error('Failed to update booking:', err);
    }
  }, []);

  // --- Lookups ---
  const getCustomer = useCallback((id: string) => customers.find(c => c.id === id), [customers]);
  const getVehicle = useCallback((id: string) => vehicles.find(v => v.id === id), [vehicles]);
  const getStaffMember = useCallback((id: string) => staffMembers.find(s => s.id === id), [staffMembers]);
  const getService = useCallback((id: string) => services.find(s => s.id === id), [services]);
  const getVehiclesForCustomer = useCallback((cId: string) => vehicles.filter(v => v.customerId === cId), [vehicles]);
  const getJobsForCustomer = useCallback((cId: string) => jobs.filter(j => j.customerId === cId), [jobs]);
  const getLeadsForCustomer = useCallback((cId: string) => leads.filter(l => l.customerId === cId), [leads]);

  const value: AppContextType = {
    currentUser,
    currentTenant,
    isAuthenticated,
    login,
    signup,
    logout,
    customers,
    vehicles,
    jobs,
    leads,
    bookings,
    services,
    staff: staffMembers,
    invoices,
    automations,
    reviews,
    conversations,
    notifications,
    retentionCustomers,
    askMovoOpen,
    openAskMovo,
    closeAskMovo,
    loading,
    error,
    updateJobStatus,
    addJob,
    updateLeadStatus,
    addLead,
    addBooking,
    updateBookingStatus,
    toggleAiHandling,
    addMessage,
    addConversation,
    archiveConversation,
    markNotificationRead,
    markAllNotificationsRead,
    updateAutomationEnabled,
    addAutomation,
    deleteAutomation,
    updateInvoiceStatus,
    addInvoice,
    updateReviewStatus,
    updateRetentionStatus,
    addCustomer,
    updateCustomerNotes,
    addVehicle,
    addStaffMember,
    startJobFromBooking,
    updateLead,
    updateCustomer,
    updateVehicle,
    updateJob,
    updateStaff,
    updateBooking,
    refreshData: fetchAllData,
    getCustomer,
    getVehicle,
    getStaffMember,
    getService,
    getVehiclesForCustomer,
    getJobsForCustomer,
    getLeadsForCustomer,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <div className="text-neutral-400 text-lg">Loading Movo...</div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
