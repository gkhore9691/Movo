import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto.js';
import { ReviewStatus } from '../common/enums/index.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  findAll(tenantId: string, status?: ReviewStatus) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.reviewRepo.find({
      where,
      relations: ['customer', 'job'],
    });
  }

  async findOne(tenantId: string, id: string) {
    const review = await this.reviewRepo.findOne({
      where: { id, tenantId },
      relations: ['customer', 'job'],
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  create(tenantId: string, dto: CreateReviewDto) {
    const review = this.reviewRepo.create({ ...dto, tenantId });
    return this.reviewRepo.save(review);
  }

  async update(tenantId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.findOne(tenantId, id);
    Object.assign(review, dto);
    return this.reviewRepo.save(review);
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateReviewStatusDto) {
    const review = await this.findOne(tenantId, id);
    review.status = dto.status;
    return this.reviewRepo.save(review);
  }

  async remove(tenantId: string, id: string) {
    const review = await this.findOne(tenantId, id);
    await this.reviewRepo.remove(review);
  }
}
