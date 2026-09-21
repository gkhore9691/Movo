import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { Tenant } from '../tenants/entities/tenant.entity.js';
import { Staff } from '../staff/entities/staff.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { UserRole } from '../common/enums/index.js';
import { StaffRole } from '../common/enums/index.js';

function generateSlug(name: string, city?: string): string {
  const raw = city ? `${name} ${city}` : name;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const savedUser = await this.userRepository.save(user);

    const accessToken = this.generateToken(savedUser);

    return {
      access_token: accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        tenantId: savedUser.tenantId,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateToken(user);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async signup(dto: SignupDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Create tenant
    const slug = generateSlug(dto.businessName, dto.city);
    const tenant = this.tenantRepository.create({
      name: dto.businessName,
      slug,
      industry: 'automotive_detailing',
      phone: dto.phone ?? null,
      email: dto.email,
      city: dto.city ?? null,
    });
    const savedTenant = await this.tenantRepository.save(tenant);

    // Create user with OWNER role
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: UserRole.OWNER,
      tenantId: savedTenant.id,
    });
    const savedUser = await this.userRepository.save(user);

    // Create default staff record for the owner
    const ownerStaff = this.staffRepository.create({
      name: dto.name,
      role: StaffRole.OWNER,
      phone: dto.phone ?? '',
      email: dto.email,
      activeJobs: 0,
      completedJobs: 0,
      tenantId: savedTenant.id,
    } as any);
    await this.staffRepository.save(ownerStaff);

    // Create 6 default services for the tenant
    const defaultServices: Array<{ name: string; category: string; basePrice: number; maxPrice: number; duration: string }> = [
      { name: 'Ceramic Coating', category: 'Protection', basePrice: 15000, maxPrice: 35000, duration: '2-3 days' },
      { name: 'PPF — Paint Protection Film', category: 'Protection', basePrice: 40000, maxPrice: 120000, duration: '3-5 days' },
      { name: 'Paint Correction', category: 'Correction', basePrice: 8000, maxPrice: 18000, duration: '1-2 days' },
      { name: 'Interior Detailing', category: 'Detailing', basePrice: 5000, maxPrice: 12000, duration: '4-6 hours' },
      { name: 'Full Detailing', category: 'Detailing', basePrice: 10000, maxPrice: 25000, duration: '1-2 days' },
      { name: 'Maintenance Wash', category: 'Maintenance', basePrice: 1500, maxPrice: 3500, duration: '1-2 hours' },
    ];

    for (const svc of defaultServices) {
      const service = this.serviceRepository.create({
        ...svc,
        description: '',
        tenantId: savedTenant.id,
      } as any);
      await this.serviceRepository.save(service);
    }

    const accessToken = this.generateToken(savedUser);

    return {
      access_token: accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        tenantId: savedUser.tenantId,
      },
      tenant: {
        id: savedTenant.id,
        name: savedTenant.name,
        slug: savedTenant.slug,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    let tenant = null;
    if (user.tenantId) {
      tenant = await this.tenantRepository.findOne({ where: { id: user.tenantId } });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant,
    };
  }

  async validateUser(payload: { sub: string }) {
    return this.userRepository.findOne({ where: { id: payload.sub } });
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
    return this.jwtService.sign(payload);
  }
}
