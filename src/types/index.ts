export type JobStatus =
  | 'enquiry'
  | 'booked'
  | 'car_received'
  | 'inspection'
  | 'work_in_progress'
  | 'quality_check'
  | 'ready'
  | 'delivered';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'quoted'
  | 'negotiation'
  | 'won'
  | 'lost';

export type BookingStatus =
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type StaffRole = 'owner' | 'manager' | 'sales' | 'technician';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export type PaymentMethod = 'upi' | 'cash' | 'card';

export type ReviewStatus = 'requested' | 'received' | 'published';

export type MessageSender = 'customer' | 'ai' | 'human';

export type RetentionStatus = 'due' | 'contacted' | 'booked' | 'declined';

export type NotificationType =
  | 'booking'
  | 'job_update'
  | 'payment'
  | 'review'
  | 'ai_handled'
  | 'lead'
  | 'retention';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  customerSince: string;
  lifetimeSpend: number;
  notes: string;
  tags: string[];
}

export interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  color: string;
  currentJobId?: string;
}

export interface JobTimelineEntry {
  stage: JobStatus;
  timestamp: string;
  employeeId: string;
  notes: string;
  photos: string[];
}

export interface Job {
  id: string;
  customerId: string;
  vehicleId: string;
  serviceIds: string[];
  status: JobStatus;
  assignedTo: string;
  estimatedPrice: number;
  actualPrice?: number;
  deposit: number;
  notes: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
  timeline: JobTimelineEntry[];
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number | null;
  vehicleRegistration: string;
  customerId: string;
  vehicleId: string;
  serviceIds: string[];
  status: LeadStatus;
  quotedPrice: number;
  source: string;
  notes: string;
  createdAt: string;
  followUpDate: string;
}

export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  serviceIds: string[];
  date: string;
  time: string;
  estimatedPrice: number;
  deposit: number;
  notes: string;
  status: BookingStatus;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  maxPrice: number;
  duration: string;
  category: string;
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  email: string;
  avatar: string;
  activeJobs: number;
  completedJobs: number;
}

export interface Invoice {
  id: string;
  jobId: string;
  customerId: string;
  amount: number;
  deposit: number;
  balance: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  paidAt?: string;
}

export interface AutomationAction {
  type: string;
  label: string;
  delay?: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: string[];
  actions: AutomationAction[];
  enabled: boolean;
  lastRun?: string;
  runsCount: number;
}

export interface Review {
  id: string;
  customerId: string;
  jobId: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  googleReviewUrl?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  customerId: string;
  messages: Message[];
  aiHandling: boolean;
  lastMessage: string;
  unreadCount: number;
  waJid?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface RetentionCustomer {
  customerId: string;
  lastVisit: string;
  daysSinceVisit: number;
  recommendedService: string;
  estimatedValue: number;
  status: RetentionStatus;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'owner' | 'manager' | 'staff';
  tenantId: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gstNumber: string;
  logo: string | null;
  isActive: boolean;
}
