import { ChromaClient } from 'chromadb';
import type { Env } from '../../config/env.js';

export class ChromaClientWrapper {
  readonly client: ChromaClient;

  constructor(env: Env) {
    this.client = new ChromaClient({
      path: `http://${env.CHROMA_HOST}:${env.CHROMA_PORT}`,
    });
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch {
      return false;
    }
  }
}
