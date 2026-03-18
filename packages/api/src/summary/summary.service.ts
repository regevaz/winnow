import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import type { DealContextSummary } from '@winnow/core';
import { PrismaService } from '../prisma/prisma.service';
import { HubspotApiClient } from '../hubspot/hubspot-api.client';
import type { HubSpotActivityContent } from '../hubspot/types/hubspot-api.types';
import { buildSystemPrompt, buildUserPrompt } from './summary.prompt';
import { buildFallbackSummary, type SummaryOutput } from './summary.fallback';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private readonly anthropic: Anthropic | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hubspotApiClient: HubspotApiClient,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.anthropic = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.anthropic) {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI summaries will use fallback mode');
    }
  }

  async getSummary(dealId: string): Promise<DealContextSummary> {
    const dbDeal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        contacts: true,
        activities: true,
        stageHistory: true,
        validationResults: true,
        summary: true,
        pipeline: { include: { stages: true } },
      },
    });

    if (!dbDeal) throw new NotFoundException(`Deal ${dealId} not found`);
    if (dbDeal.validationResults.length === 0) {
      throw new NotFoundException('No validation findings for this deal — summary is only available for flagged deals');
    }

    // Fetch activity content from HubSpot
    let activities: HubSpotActivityContent[] = [];
    try {
      activities = await this.hubspotApiClient.fetchActivityEngagementsForDeal(dbDeal.externalId);
    } catch (err) {
      this.logger.warn(`Failed to fetch HubSpot activities for deal ${dealId}: ${String(err)}`);
    }

    const activityHash = createHash('sha256')
      .update(activities.map((a) => a.id).join(','))
      .digest('hex');

    // Return cache if valid
    if (dbDeal.summary) {
      const cached = dbDeal.summary;
      if (cached.expiresAt > new Date() && cached.activityHash === activityHash) {
        return this.mapToSummary(cached, dealId);
      }
    }

    // Generate new summary
    const stage = dbDeal.pipeline.stages.find((s) => s.id === dbDeal.stageId);
    const stageEnteredAt = dbDeal.stageHistory
      .slice()
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0]?.changedAt ?? dbDeal.createdAt;

    const daysInStage = Math.floor((Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilClose = Math.floor(
      (dbDeal.closeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const dealSnapshot = {
      name: dbDeal.name,
      ownerName: dbDeal.ownerName,
      stageName: stage?.name ?? 'Unknown',
      daysInStage,
      amountDollars: Math.round(dbDeal.amount / 100),
      closeDateStr: dbDeal.closeDate.toISOString().slice(0, 10),
      daysUntilClose,
      contacts: dbDeal.contacts.map((c) => ({
        name: `${c.firstName} ${c.lastName}`.trim(),
        title: c.title,
      })),
    };

    const findingSnapshots = dbDeal.validationResults.map((r) => ({
      severity: r.severity,
      title: r.title,
      description: r.description,
    }));

    let output: SummaryOutput;
    if (this.anthropic && activities.length > 0) {
      try {
        output = await this.callClaude(dealSnapshot, findingSnapshots, activities);
      } catch (err) {
        this.logger.warn(`Claude API failed for deal ${dealId}, using fallback: ${String(err)}`);
        output = buildFallbackSummary(dbDeal.name, findingSnapshots);
      }
    } else {
      output = buildFallbackSummary(dbDeal.name, findingSnapshots);
    }

    const confidence: 'high' | 'low' = activities.length >= 3 ? 'high' : 'low';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const stored = await this.prisma.dealSummary.upsert({
      where: { dealId },
      create: {
        dealId,
        summary: output.summary,
        lastActivityContext: output.lastActivityContext,
        recommendedAction: output.recommendedAction,
        riskSignals: output.riskSignals,
        activityCount: activities.length,
        confidence,
        source: output.source,
        expiresAt,
        activityHash,
      },
      update: {
        summary: output.summary,
        lastActivityContext: output.lastActivityContext,
        recommendedAction: output.recommendedAction,
        riskSignals: output.riskSignals,
        activityCount: activities.length,
        confidence,
        source: output.source,
        expiresAt,
        activityHash,
        generatedAt: new Date(),
      },
    });

    return this.mapToSummary(stored, dealId);
  }

  private async callClaude(
    deal: Parameters<typeof buildUserPrompt>[0],
    findings: Parameters<typeof buildUserPrompt>[1],
    activities: HubSpotActivityContent[],
  ): Promise<SummaryOutput> {
    const message = await this.anthropic!.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(deal, findings, activities) }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude did not return valid JSON');

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      lastActivityContext?: string;
      recommendedAction?: string;
      riskSignals?: string[];
    };

    return {
      summary: parsed.summary ?? '',
      lastActivityContext: parsed.lastActivityContext ?? '',
      recommendedAction: parsed.recommendedAction ?? '',
      riskSignals: Array.isArray(parsed.riskSignals) ? parsed.riskSignals : [],
      source: 'ai',
    };
  }

  private mapToSummary(
    record: {
      summary: string;
      lastActivityContext: string;
      recommendedAction: string;
      riskSignals: unknown;
      activityCount: number;
      confidence: string;
      source: string;
      generatedAt: Date;
    },
    dealId: string,
  ): DealContextSummary {
    return {
      dealId,
      summary: record.summary,
      lastActivityContext: record.lastActivityContext,
      recommendedAction: record.recommendedAction,
      riskSignals: Array.isArray(record.riskSignals) ? (record.riskSignals as string[]) : [],
      activityCount: record.activityCount,
      confidence: record.confidence === 'high' ? 'high' : 'low',
      source: record.source === 'ai' ? 'ai' : 'fallback',
      generatedAt: record.generatedAt,
    };
  }
}
