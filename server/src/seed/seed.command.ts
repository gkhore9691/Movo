import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { SeedModule } from './seed.module.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
      username: process.env['DB_USERNAME'] ?? 'postgres',
      password: process.env['DB_PASSWORD'] ?? '',
      database: process.env['DB_NAME'] ?? 'movo',
      autoLoadEntities: true,
      synchronize: true,
      namingStrategy: new SnakeNamingStrategy(),
    }),
    SeedModule,
  ],
})
class SeedAppModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedAppModule);
  try {
    const seeder = app.get(SeedService);
    await seeder.run();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
