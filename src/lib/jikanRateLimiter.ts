/**
 * Sistema de Rate Limiting para API Jikan
 * Implementa uma fila de requisições respeitando o limite da API
 * A API Jikan permite no máximo 3 requisições por segundo
 */

type QueueItem = {
  url: string;
  resolve: (value: Response) => void;
  reject: (reason: Error) => void;
  retries: number;
};

class JikanRateLimiter {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private consecutiveErrors = 0;
  
  // Configurações mais conservadoras para evitar 429
  private readonly MIN_DELAY_MS = 400; // Delay mínimo entre requisições
  private readonly MAX_RETRIES = 3;
  private readonly BASE_BACKOFF_MS = 2000;

  /**
   * Adiciona uma requisição à fila e retorna uma Promise
   */
  async enqueue(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject, retries: 0 });
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
      
      // Calcula delay baseado em erros consecutivos
      const dynamicDelay = this.MIN_DELAY_MS + (this.consecutiveErrors * 500);
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < dynamicDelay) {
        await this.delay(dynamicDelay - timeSinceLastRequest);
      }

      const item = this.queue.shift();
      if (!item) continue;

      try {
        this.lastRequestTime = Date.now();
        
        const response = await fetch(item.url);
        
        if (response.status === 429) {
          // Rate limited - reagenda com backoff exponencial
          this.consecutiveErrors++;
          const backoff = this.BASE_BACKOFF_MS * Math.pow(2, Math.min(item.retries, 3));
          
          console.warn(`[Jikan] Rate limited. Retry ${item.retries + 1}/${this.MAX_RETRIES} em ${backoff}ms`);
          
          if (item.retries < this.MAX_RETRIES) {
            await this.delay(backoff);
            this.queue.unshift({ ...item, retries: item.retries + 1 });
          } else {
            item.reject(new Error('Rate limit excedido após várias tentativas'));
          }
        } else if (!response.ok) {
          item.reject(new Error(`Erro HTTP: ${response.status}`));
        } else {
          // Sucesso - reseta contador de erros
          this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
          item.resolve(response);
        }
      } catch (error) {
        this.consecutiveErrors++;
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
      item.reject(new Error('Fila limpa'));
    });
    this.queue = [];
    this.consecutiveErrors = 0;
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
