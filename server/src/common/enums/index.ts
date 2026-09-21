export enum JobStatus {
  ENQUIRY = 'enquiry',
  BOOKED = 'booked',
  CAR_RECEIVED = 'car_received',
  INSPECTION = 'inspection',
  WORK_IN_PROGRESS = 'work_in_progress',
  QUALITY_CHECK = 'quality_check',
  READY = 'ready',
  DELIVERED = 'delivered',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUOTED = 'quoted',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum StaffRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  SALES = 'sales',
  TECHNICIAN = 'technician',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export enum PaymentMethod {
  UPI = 'upi',
  CASH = 'cash',
  CARD = 'card',
}

export enum ReviewStatus {
  REQUESTED = 'requested',
  RECEIVED = 'received',
  PUBLISHED = 'published',
}

export enum MessageSender {
  CUSTOMER = 'customer',
  AI = 'ai',
  HUMAN = 'human',
}

export enum RetentionStatus {
  DUE = 'due',
  CONTACTED = 'contacted',
  BOOKED = 'booked',
  DECLINED = 'declined',
}

export enum NotificationType {
  BOOKING = 'booking',
  JOB_UPDATE = 'job_update',
  PAYMENT = 'payment',
  REVIEW = 'review',
  AI_HANDLED = 'ai_handled',
  LEAD = 'lead',
  RETENTION = 'retention',
}

export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  STAFF = 'staff',
}
