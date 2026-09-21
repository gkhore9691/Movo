import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { databaseConfig } from './config/database.config.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { ServicesModule } from './services/services.module.js';
import { StaffModule } from './staff/staff.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AutomationsModule } from './automations/automations.module.js';
import { RetentionModule } from './retention/retention.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { PulseModule } from './pulse/pulse.module.js';
import { AskMovoModule } from './ask-movo/ask-movo.module.js';
import { SeedModule } from './seed/seed.module.js';
import { TenantsModule } from './tenants/tenants.module.js';
import { AdminModule } from './admin/admin.module.js';
import { DsBridgeModule } from './ds-bridge/ds-bridge.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    AuthModule,
    ServicesModule,
    StaffModule,
    CustomersModule,
    VehiclesModule,
    JobsModule,
    LeadsModule,
    BookingsModule,
    InvoicesModule,
    ReviewsModule,
    ConversationsModule,
    NotificationsModule,
    AutomationsModule,
    RetentionModule,
    AnalyticsModule,
    PulseModule,
    AskMovoModule,
    SeedModule,
    TenantsModule,
    AdminModule,
    DsBridgeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
