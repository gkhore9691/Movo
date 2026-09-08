import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  Customer, Vehicle, Job, Lead, Booking, Service, Staff,
  Invoice, Automation, Review, Conversation, Message, Notification,
  RetentionCustomer, JobStatus, LeadStatus, BookingStatus,
  InvoiceStatus, ReviewStatus, RetentionStatus,
} from '../types';
import { customers as initialCustomers } from '../data/customers';
import { vehicles as initialVehicles } from '../data/vehicles';
import { jobs as initialJobs } from '../data/jobs';
import { leads as initialLeads } from '../data/leads';
import { bookings as initialBookings } from '../data/bookings';
import { services as initialServices } from '../data/services';
import { staff as initialStaff } from '../data/staff';
import { invoices as initialInvoices } from '../data/invoices';
import { automations as initialAutomations } from '../data/automations';
import { reviews as initialReviews } from '../data/reviews';
import { conversations as initialConversations } from '../data/conversations';
import { notifications as initialNotifications } from '../data/notifications';
import { retentionCustomers as initialRetention } from '../data/retention';

interface AppContextType {
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
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [services] = useState<Service[]>(initialServices);
  const [staffMembers, setStaffMembers] = useState<Staff[]>(initialStaff);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [retentionCustomers, setRetentionCustomers] = useState<RetentionCustomer[]>(initialRetention);
  const [askMovoOpen, setAskMovoOpen] = useState(false);

  const openAskMovo = useCallback(() => setAskMovoOpen(true), []);
  const closeAskMovo = useCallback(() => setAskMovoOpen(false), []);

  // --- Job mutations ---
  const updateJobStatus = useCallback((jobId: string, newStatus: JobStatus) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      const entry = {
        stage: newStatus,
        timestamp: new Date().toISOString(),
        employeeId: 'staff-2',
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
  }, []);

  const addJob = useCallback((job: Job) => {
    setJobs(prev => [job, ...prev]);
  }, []);

  // --- Lead mutations ---
  const updateLeadStatus = useCallback((leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
  }, []);

  const addLead = useCallback((lead: Lead) => {
    setLeads(prev => [lead, ...prev]);
  }, []);

  // --- Booking mutations ---
  const addBooking = useCallback((booking: Booking) => {
    setBookings(prev => [booking, ...prev]);
  }, []);

  const updateBookingStatus = useCallback((bookingId: string, status: BookingStatus) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
  }, []);

  // --- Conversation mutations ---
  const toggleAiHandling = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, aiHandling: !c.aiHandling } : c
    ));
  }, []);

  const addMessage = useCallback((conversationId: string, message: Message) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        messages: [...c.messages, message],
        lastMessage: message.content,
        unreadCount: message.sender === 'customer' ? c.unreadCount + 1 : c.unreadCount,
      };
    }));
  }, []);

  // --- Notification mutations ---
  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // --- Automation mutations ---
  const updateAutomationEnabled = useCallback((automationId: string, enabled: boolean) => {
    setAutomations(prev => prev.map(a =>
      a.id === automationId ? { ...a, enabled } : a
    ));
  }, []);

  const addAutomation = useCallback((automation: Automation) => {
    setAutomations(prev => [automation, ...prev]);
  }, []);

  const deleteAutomation = useCallback((automationId: string) => {
    setAutomations(prev => prev.filter(a => a.id !== automationId));
  }, []);

  // --- Invoice mutations ---
  const updateInvoiceStatus = useCallback((invoiceId: string, status: InvoiceStatus, paymentMethod?: string) => {
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
  }, []);

  const addInvoice = useCallback((invoice: Invoice) => {
    setInvoices(prev => [invoice, ...prev]);
  }, []);

  // --- Review mutations ---
  const updateReviewStatus = useCallback((reviewId: string, status: ReviewStatus) => {
    setReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, status } : r
    ));
  }, []);

  // --- Retention mutations ---
  const updateRetentionStatus = useCallback((customerId: string, status: RetentionStatus) => {
    setRetentionCustomers(prev => prev.map(r =>
      r.customerId === customerId ? { ...r, status } : r
    ));
  }, []);

  // --- Customer mutations ---
  const addCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  }, []);

  const updateCustomerNotes = useCallback((customerId: string, notes: string) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, notes } : c
    ));
  }, []);

  // --- Vehicle mutations ---
  const addVehicle = useCallback((vehicle: Vehicle) => {
    setVehicles(prev => [vehicle, ...prev]);
  }, []);

  // --- Staff mutations ---
  const addStaffMember = useCallback((staff: Staff) => {
    setStaffMembers(prev => [staff, ...prev]);
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
    updateJobStatus,
    addJob,
    updateLeadStatus,
    addLead,
    addBooking,
    updateBookingStatus,
    toggleAiHandling,
    addMessage,
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
    getCustomer,
    getVehicle,
    getStaffMember,
    getService,
    getVehiclesForCustomer,
    getJobsForCustomer,
    getLeadsForCustomer,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
