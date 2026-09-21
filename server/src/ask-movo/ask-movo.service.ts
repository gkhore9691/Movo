import { Injectable } from '@nestjs/common';

@Injectable()
export class AskMovoService {
  ask(tenantId: string, query: string): {
    response: string;
    suggestions: string[];
    actions: Array<{ label: string; route: string }>;
  } {
    const q = query.toLowerCase();

    if (q.includes('revenue') || q.includes('pending')) {
      return {
        response:
          'Your total revenue this month is AED 45,200. You have AED 12,500 in pending invoices and AED 3,200 overdue.',
        suggestions: [
          'Show overdue invoices',
          'Revenue by service',
          'Compare with last month',
        ],
        actions: [
          { label: 'View Invoices', route: '/invoices' },
          { label: 'View Analytics', route: '/analytics' },
        ],
      };
    }

    if (q.includes('today') || q.includes('cars')) {
      return {
        response:
          'You have 5 cars in the studio today. 2 are in progress, 1 is in quality check, and 2 are ready for collection.',
        suggestions: [
          "Show today's schedule",
          'Cars ready for collection',
          'New bookings',
        ],
        actions: [
          { label: 'View Jobs', route: '/jobs' },
          { label: 'View Bookings', route: '/bookings' },
        ],
      };
    }

    if (q.includes('follow') || q.includes('call')) {
      return {
        response:
          'You have 3 follow-ups due today: Ahmed (quoted PPF), Sarah (pending ceramic coating decision), and Khalid (overdue invoice).',
        suggestions: [
          'Show all follow-ups',
          'Overdue follow-ups',
          'Lead pipeline',
        ],
        actions: [
          { label: 'View Leads', route: '/leads' },
          { label: 'View Retention', route: '/retention' },
        ],
      };
    }

    return {
      response: "I'm still learning. This feature will be available soon.",
      suggestions: [
        'What is my revenue?',
        'How many cars today?',
        'Any follow-ups due?',
      ],
      actions: [],
    };
  }
}
