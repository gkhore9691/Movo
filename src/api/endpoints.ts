import { api } from './client';
import type {
  Customer,
  Vehicle,
  Job,
  Lead,
  Booking,
  Service,
  Staff,
  Invoice,
  Automation,
  Review,
  Conversation,
  Notification,
  RetentionCustomer,
  JobStatus,
  LeadStatus,
  BookingStatus,
  InvoiceStatus,
  ReviewStatus,
  RetentionStatus,
  Message,
  User,
  Tenant,
} from '../types';

// --- Normalizers ---

function normalizeJob(raw: any): Job {
  return {
    id: raw.id,
    customerId: raw.customerId,
    vehicleId: raw.vehicleId,
    serviceIds: (raw.services || []).map((s: any) => s.id),
    status: raw.status,
    assignedTo: raw.assignedTo || raw.assignedStaff?.id || '',
    estimatedPrice: Number(raw.estimatedPrice),
    actualPrice: raw.actualPrice != null ? Number(raw.actualPrice) : undefined,
    deposit: Number(raw.deposit),
    notes: raw.notes || '',
    photos: raw.photos || [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    timeline: (raw.timeline || []).map((t: any) => ({
      stage: t.stage,
      timestamp: t.timestamp,
      employeeId: t.employeeId || '',
      notes: t.notes || '',
      photos: t.photos || [],
    })),
  };
}

function normalizeLead(raw: any): Lead {
  return {
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email || '',
    vehicleMake: raw.vehicleMake || '',
    vehicleModel: raw.vehicleModel || '',
    vehicleYear: raw.vehicleYear || null,
    vehicleRegistration: raw.vehicleRegistration || '',
    customerId: raw.customerId || '',
    vehicleId: raw.vehicleId || '',
    serviceIds: (raw.services || []).map((s: any) => s.id),
    status: raw.status,
    quotedPrice: Number(raw.quotedPrice),
    source: raw.source || '',
    notes: raw.notes || '',
    createdAt: raw.createdAt,
    followUpDate: raw.followUpDate || '',
  };
}

function normalizeBooking(raw: any): Booking {
  return {
    id: raw.id,
    customerId: raw.customerId,
    vehicleId: raw.vehicleId || '',
    serviceIds: (raw.services || []).map((s: any) => s.id),
    date: raw.date,
    time: raw.time,
    estimatedPrice: Number(raw.estimatedPrice),
    deposit: Number(raw.deposit),
    notes: raw.notes || '',
    status: raw.status,
  };
}

function normalizeInvoice(raw: any): Invoice {
  return {
    id: raw.id,
    jobId: raw.jobId,
    customerId: raw.customerId,
    amount: Number(raw.amount),
    deposit: Number(raw.deposit),
    balance: Number(raw.balance),
    status: raw.status,
    paymentMethod: raw.paymentMethod || undefined,
    createdAt: raw.createdAt,
    paidAt: raw.paidAt || undefined,
  };
}

function normalizeCustomer(raw: any): Customer {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    email: raw.email || '',
    address: raw.address || '',
    customerSince: raw.customerSince || '',
    lifetimeSpend: Number(raw.lifetimeSpend),
    notes: raw.notes || '',
    tags: raw.tags || [],
  };
}

function normalizeVehicle(raw: any): Vehicle {
  return {
    id: raw.id,
    customerId: raw.customerId,
    make: raw.make,
    model: raw.model,
    year: raw.year,
    registrationNumber: raw.registrationNumber || '',
    color: raw.color || '',
    currentJobId: raw.currentJobId || undefined,
  };
}

function normalizeService(raw: any): Service {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || '',
    basePrice: Number(raw.basePrice),
    maxPrice: Number(raw.maxPrice),
    duration: raw.duration || '',
    category: raw.category || '',
  };
}

function normalizeStaff(raw: any): Staff {
  return {
    id: raw.id,
    name: raw.name,
    role: raw.role,
    phone: raw.phone || '',
    email: raw.email || '',
    avatar: raw.avatar || '',
    activeJobs: raw.activeJobs,
    completedJobs: raw.completedJobs,
  };
}

function normalizeReview(raw: any): Review {
  return {
    id: raw.id,
    customerId: raw.customerId,
    jobId: raw.jobId,
    rating: raw.rating,
    comment: raw.comment || '',
    status: raw.status,
    googleReviewUrl: raw.googleReviewUrl || undefined,
    createdAt: raw.createdAt,
  };
}

function normalizeConversation(raw: any): Conversation {
  return {
    id: raw.id,
    customerId: raw.customerId,
    messages: (raw.messages || []).map((m: any) => ({
      id: m.id,
      content: m.content,
      sender: m.sender,
      timestamp: m.timestamp,
      read: m.read,
    })),
    aiHandling: raw.aiHandling,
    lastMessage: raw.lastMessage || '',
    unreadCount: raw.unreadCount,
  };
}

function normalizeNotification(raw: any): Notification {
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    description: raw.description || '',
    timestamp: raw.timestamp,
    read: raw.read,
    actionUrl: raw.actionUrl || undefined,
  };
}

function normalizeRetention(raw: any): RetentionCustomer {
  return {
    customerId: raw.customerId,
    lastVisit: raw.lastVisit,
    daysSinceVisit: raw.daysSinceVisit,
    recommendedService: raw.recommendedService || '',
    estimatedValue: Number(raw.estimatedValue),
    status: raw.status,
  };
}

function normalizeAutomation(raw: any): Automation {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || '',
    trigger: raw.trigger || '',
    conditions: raw.conditions || [],
    actions: raw.actions || [],
    enabled: raw.enabled,
    lastRun: raw.lastRun || undefined,
    runsCount: raw.runsCount,
  };
}

// --- Fetch all ---

export async function fetchCustomers(): Promise<Customer[]> {
  const data = await api.get<any[]>('/customers?limit=100');
  return data.map(normalizeCustomer);
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const data = await api.get<any[]>('/vehicles?limit=100');
  return data.map(normalizeVehicle);
}

export async function fetchJobs(): Promise<Job[]> {
  const data = await api.get<any[]>('/jobs?limit=100');
  return data.map(normalizeJob);
}

export async function fetchLeads(): Promise<Lead[]> {
  const data = await api.get<any[]>('/leads?limit=100');
  return data.map(normalizeLead);
}

export async function fetchBookings(): Promise<Booking[]> {
  const data = await api.get<any[]>('/bookings?limit=100');
  return data.map(normalizeBooking);
}

export async function fetchServices(): Promise<Service[]> {
  const data = await api.get<any[]>('/services');
  return data.map(normalizeService);
}

export async function fetchStaff(): Promise<Staff[]> {
  const data = await api.get<any[]>('/staff');
  return data.map(normalizeStaff);
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const data = await api.get<any[]>('/invoices?limit=100');
  return data.map(normalizeInvoice);
}

export async function fetchAutomations(): Promise<Automation[]> {
  const data = await api.get<any[]>('/automations');
  return data.map(normalizeAutomation);
}

export async function fetchReviews(): Promise<Review[]> {
  const data = await api.get<any[]>('/reviews?limit=100');
  return data.map(normalizeReview);
}

export async function fetchConversations(): Promise<Conversation[]> {
  const raw = await api.get<any[]>('/conversations');
  // Conversations list doesn't include messages, need to fetch each
  const convos: Conversation[] = [];
  for (const c of raw) {
    const full = await api.get<any>(`/conversations/${c.id}`);
    convos.push(normalizeConversation(full));
  }
  return convos;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const data = await api.get<any[]>('/notifications');
  return data.map(normalizeNotification);
}

export async function fetchRetention(): Promise<RetentionCustomer[]> {
  const data = await api.get<any[]>('/retention');
  return data.map(normalizeRetention);
}

// --- Mutations ---

export async function apiUpdateJobStatus(jobId: string, status: JobStatus): Promise<Job> {
  const raw = await api.patch<any>(`/jobs/${jobId}/status`, { status });
  return normalizeJob(raw);
}

export async function apiAddJob(
  job: Partial<Job> & { serviceIds: string[] },
): Promise<Job> {
  const raw = await api.post<any>('/jobs', {
    customerId: job.customerId,
    vehicleId: job.vehicleId,
    serviceIds: job.serviceIds,
    assignedTo: job.assignedTo || undefined,
    estimatedPrice: job.estimatedPrice,
    deposit: job.deposit,
    notes: job.notes,
  });
  return normalizeJob(raw);
}

export async function apiUpdateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<void> {
  await api.patch(`/leads/${leadId}/status`, { status });
}

export async function apiAddLead(
  lead: Partial<Lead> & { serviceIds: string[] },
): Promise<Lead> {
  const raw = await api.post<any>('/leads', {
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
  return normalizeLead(raw);
}

export async function apiAddBooking(
  booking: Partial<Booking> & { serviceIds: string[] },
): Promise<Booking> {
  const raw = await api.post<any>('/bookings', {
    customerId: booking.customerId,
    vehicleId: booking.vehicleId,
    serviceIds: booking.serviceIds,
    date: booking.date,
    time: booking.time,
    estimatedPrice: booking.estimatedPrice,
    deposit: booking.deposit,
    notes: booking.notes,
  });
  return normalizeBooking(raw);
}

export async function apiUpdateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<void> {
  await api.patch(`/bookings/${bookingId}/status`, { status });
}

export async function apiToggleAiHandling(
  conversationId: string,
): Promise<void> {
  await api.patch(`/conversations/${conversationId}/toggle-ai`, {});
}

export async function apiAddMessage(
  conversationId: string,
  message: { content: string; sender: string },
): Promise<Message> {
  return api.post<Message>(
    `/conversations/${conversationId}/messages`,
    message,
  );
}

export async function apiAddConversation(
  customerId: string,
): Promise<Conversation> {
  const raw = await api.post<any>('/conversations', { customerId });
  return normalizeConversation(raw);
}

export async function apiArchiveConversation(
  conversationId: string,
): Promise<void> {
  await api.delete(`/conversations/${conversationId}`);
}

export async function apiMarkNotificationRead(
  notificationId: string,
): Promise<void> {
  await api.patch(`/notifications/${notificationId}/read`, {});
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all', {});
}

export async function apiUpdateAutomationEnabled(
  automationId: string,
  enabled: boolean,
): Promise<void> {
  await api.patch(`/automations/${automationId}/toggle`, { enabled });
}

export async function apiAddAutomation(
  automation: Partial<Automation>,
): Promise<Automation> {
  const raw = await api.post<any>('/automations', automation);
  return normalizeAutomation(raw);
}

export async function apiDeleteAutomation(
  automationId: string,
): Promise<void> {
  await api.delete(`/automations/${automationId}`);
}

export async function apiUpdateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  paymentMethod?: string,
): Promise<Invoice> {
  if (status === 'paid' && paymentMethod) {
    const raw = await api.patch<any>(`/invoices/${invoiceId}/pay`, {
      paymentMethod,
    });
    return normalizeInvoice(raw);
  }
  const raw = await api.patch<any>(`/invoices/${invoiceId}/status`, {
    status,
    paymentMethod,
  });
  return normalizeInvoice(raw);
}

export async function apiAddInvoice(
  invoice: Partial<Invoice>,
): Promise<Invoice> {
  const raw = await api.post<any>('/invoices', invoice);
  return normalizeInvoice(raw);
}

export async function apiUpdateReviewStatus(
  reviewId: string,
  status: ReviewStatus,
): Promise<void> {
  await api.patch(`/reviews/${reviewId}/status`, { status });
}

export async function apiUpdateRetentionStatus(
  customerId: string,
  status: RetentionStatus,
): Promise<void> {
  await api.patch(`/retention/${customerId}/status`, { status });
}

export async function apiAddCustomer(
  customer: Partial<Customer>,
): Promise<Customer> {
  const raw = await api.post<any>('/customers', customer);
  return normalizeCustomer(raw);
}

export async function apiUpdateCustomerNotes(
  customerId: string,
  notes: string,
): Promise<void> {
  await api.patch(`/customers/${customerId}/notes`, { notes });
}

export async function apiAddVehicle(
  vehicle: Partial<Vehicle>,
): Promise<Vehicle> {
  const raw = await api.post<any>('/vehicles', vehicle);
  return normalizeVehicle(raw);
}

export async function apiAddStaff(staff: Partial<Staff>): Promise<Staff> {
  const raw = await api.post<any>('/staff', staff);
  return normalizeStaff(raw);
}

export async function apiStartJobFromBooking(bookingId: string): Promise<any> {
  return api.post(`/bookings/${bookingId}/start-job`, {});
}

export async function apiUpdateLead(leadId: string, data: Partial<Lead>): Promise<Lead> {
  const raw = await api.patch<any>(`/leads/${leadId}`, data);
  return normalizeLead(raw);
}

export async function apiUpdateCustomer(customerId: string, data: Partial<Customer>): Promise<Customer> {
  const raw = await api.patch<any>(`/customers/${customerId}`, data);
  return normalizeCustomer(raw);
}

export async function apiUpdateVehicle(vehicleId: string, data: Partial<Vehicle>): Promise<Vehicle> {
  const raw = await api.patch<any>(`/vehicles/${vehicleId}`, data);
  return normalizeVehicle(raw);
}

export async function apiUpdateJob(jobId: string, data: any): Promise<Job> {
  const raw = await api.patch<any>(`/jobs/${jobId}`, data);
  return normalizeJob(raw);
}

export async function apiUpdateStaff(staffId: string, data: Partial<Staff>): Promise<Staff> {
  const raw = await api.patch<any>(`/staff/${staffId}`, data);
  return normalizeStaff(raw);
}

export async function apiUpdateBooking(bookingId: string, data: any): Promise<Booking> {
  const raw = await api.patch<any>(`/bookings/${bookingId}`, data);
  return normalizeBooking(raw);
}

export async function apiCreateInvoice(data: any): Promise<Invoice> {
  const raw = await api.post<any>('/invoices', data);
  return normalizeInvoice(raw);
}

export async function apiCreateReview(data: any): Promise<Review> {
  const raw = await api.post<any>('/reviews', data);
  return normalizeReview(raw);
}

export async function apiUpdateTenantSettings(tenantId: string, data: any): Promise<any> {
  return api.patch(`/tenants/${tenantId}`, data);
}

// --- Auth ---

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ access_token: string; user: any }> {
  return api.post('/auth/login', { email, password });
}

export async function apiRegister(
  email: string,
  password: string,
  name: string,
): Promise<{ access_token: string; user: any }> {
  return api.post('/auth/register', { email, password, name });
}

export async function apiSignup(data: {
  email: string; password: string; name: string;
  businessName: string; phone?: string; city?: string;
}): Promise<{ access_token: string; user: any; tenant: any }> {
  return api.post('/auth/signup', data);
}

export async function apiGetMe(): Promise<{ user: User; tenant: Tenant | null }> {
  return api.get('/auth/me');
}

// Admin endpoints
export async function apiAdminGetStats(): Promise<any> {
  return api.get('/admin/stats');
}

export async function apiAdminGetTenants(): Promise<any[]> {
  const result = await api.get<any>('/admin/tenants');
  return result.data ?? result;
}

export async function apiAdminGetTenant(id: string): Promise<any> {
  return api.get(`/admin/tenants/${id}`);
}

export async function apiAdminUpdateTenant(id: string, data: any): Promise<any> {
  return api.patch(`/admin/tenants/${id}`, data);
}

export async function apiAdminGetUsers(): Promise<any[]> {
  const result = await api.get<any>('/admin/users');
  return result.data ?? result;
}
