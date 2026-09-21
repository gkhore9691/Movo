import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto.js';
import { ReviewStatus } from '../common/enums/index.js';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'List all reviews' })
  @ApiQuery({ name: 'status', enum: ReviewStatus, required: false })
  findAll(@CurrentUser() user: any, @Query('status') status?: ReviewStatus) {
    return this.reviewsService.findAll(user.tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.findOne(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new review' })
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a review' })
  update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update review status' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    return this.reviewsService.updateStatus(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.remove(user.tenantId, id);
  }
}
