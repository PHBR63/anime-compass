/**
 * Sistema de Rate Limiting para API Jikan
 * Implementa uma fila de requisições respeitando o limite de 3 req/s
 */

// Fila de requisições pendentes
type QueueItem = {
  url: string;
  resolve: (value: Response) => void;
  reject: (reason: Error) => void;
};

class JikanRateLimiter {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private requestsInWindow = 0;
  private windowStart = 0;
  
  // Jikan permite 3 requisições por segundo
  private readonly MAX_REQUESTS_PER_SECOND = 3;
  private readonly MIN_DELAY_MS = 350; // Delay mínimo entre requisições
  private readonly WINDOW_MS = 1000;

  /**
   * Adiciona uma requisição à fila e retorna uma Promise
   */
  async enqueue(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Processa a fila de requisições respeitando o rate limit
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      
      // Reseta contador se passou 1 segundo
      if (now - this.windowStart >= this.WINDOW_MS) {
        this.requestsInWindow = 0;
        this.windowStart = now;
      }

      // Verifica se atingiu o limite de requisições na janela
      if (this.requestsInWindow >= this.MAX_REQUESTS_PER_SECOND) {
        const waitTime = this.WINDOW_MS - (now - this.windowStart);
        await this.delay(waitTime);
        continue;
      }

      // Aplica delay mínimo entre requisições
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_DELAY_MS) {
        await this.delay(this.MIN_DELAY_MS - timeSinceLastRequest);
      }

      const item = this.queue.shift();
      if (!item) continue;

      try {
        this.lastRequestTime = Date.now();
        this.requestsInWindow++;
        
        const response = await fetch(item.url);
        item.resolve(response);
      } catch (error) {
        item.reject(error as Error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Utilitário para criar delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpa a fila de requisições pendentes
   */
  clearQueue(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Retorna o tamanho atual da fila
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Instância singleton do rate limiter
export const jikanRateLimiter = new JikanRateLimiter();

/**
 * Função helper para fazer fetch com rate limiting
 */
export async function fetchWithRateLimit(url: string): Promise<Response> {
  return jikanRateLimiter.enqueue(url);
}
