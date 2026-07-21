import { z } from 'zod';
import { companyBriefSchema, type CompanyBrief } from '@matchmind/shared';
import type { AIProviders } from '../ai/providers/types.js';
import type { Env } from '../config/env.js';
import { buildCompanyBriefPrompt } from '../ai/prompts/company-brief.prompt.js';
import { generateValidatedJson } from '../utils/generateValidatedJson.js';
import { fetchUrlText } from '../utils/safeFetch.js';
import { logger } from '../utils/logger.js';

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

const MAX_SOURCE_CHARS = 4000;

export class CompanyResearchService {
  constructor(private readonly env: Env) {}

  async researchCompany(
    companyName: string,
    companyUrl: string | undefined,
    ai: AIProviders,
  ): Promise<CompanyBrief> {
    const sources: Array<{ title: string; url: string; text: string }> = [];

    if (this.env.TAVILY_API_KEY) {
      try {
        const searchHits = await this.searchTavily(companyName);
        for (const hit of searchHits.slice(0, 3)) {
          if (!hit.url) continue;
          try {
            const text = await fetchUrlText(hit.url, { maxBytes: 800_000 });
            sources.push({
              title: hit.title || hit.url,
              url: hit.url,
              text: text.slice(0, MAX_SOURCE_CHARS),
            });
          } catch {
            if (hit.content) {
              sources.push({
                title: hit.title || hit.url,
                url: hit.url,
                text: hit.content.slice(0, MAX_SOURCE_CHARS),
              });
            }
          }
        }
      } catch (error) {
        logger.warn({ err: error, companyName }, 'Tavily search failed; degrading company research');
      }
    }

    if (sources.length === 0 && companyUrl) {
      try {
        const text = await fetchUrlText(companyUrl);
        sources.push({
          title: companyName,
          url: companyUrl,
          text: text.slice(0, MAX_SOURCE_CHARS),
        });
      } catch (error) {
        logger.warn({ err: error, companyUrl }, 'Company URL fetch failed');
      }
    }

    if (sources.length === 0) {
      return companyBriefSchema.parse({
        companyName,
        mission: '',
        productsOrServices: [],
        recentNews: [],
        cultureSignals: [],
        anglesForCoverLetter: [],
        sources: [],
        researchStatus: 'skipped',
      });
    }

    const researchStatus = this.env.TAVILY_API_KEY && sources.length > 0 ? 'complete' : 'partial';
    const prompt = buildCompanyBriefPrompt(companyName, sources);
    const { data } = await generateValidatedJson(ai, prompt, companyBriefSchema, {
      label: `company-brief:${companyName}`,
    });

    return {
      ...data,
      companyName,
      researchStatus: data.sources.length > 0 ? researchStatus : 'partial',
    };
  }

  private async searchTavily(companyName: string): Promise<TavilyResult[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.env.TAVILY_API_KEY,
        query: `${companyName} company about mission products`,
        search_depth: 'basic',
        include_answer: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily HTTP ${response.status}`);
    }

    const payload = (await response.json()) as TavilyResponse;
    return payload.results ?? [];
  }
}

export const companyResearchInputSchema = z.object({
  companyName: z.string().min(1),
  companyUrl: z.string().url().optional(),
});
