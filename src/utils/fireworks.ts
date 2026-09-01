/**
 * EduSpace25 - High Performance Fireworks & Celebration Engine
 * Physics-based particle simulation with rockets, multi-colored bursts, sparks,
 * gravity, decay trails, and confetti flakes.
 */

export interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  flicker: boolean;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
}

type FireworksListener = (event: 'burst' | 'confetti' | 'grandFinale' | 'clear', data?: any) => void;

class FireworksService {
  private listeners: Set<FireworksListener> = new Set();

  public subscribe(fn: FireworksListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(event: 'burst' | 'confetti' | 'grandFinale' | 'clear', data?: any) {
    this.listeners.forEach((fn) => {
      try {
        fn(event, data);
      } catch (err) {
        console.error('Fireworks listener error:', err);
      }
    });
  }

  /**
   * Launch a fireworks burst at specific viewport coordinates (or center by default)
   */
  public burst(options?: {
    x?: number;
    y?: number;
    count?: number;
    colors?: string[];
    power?: number;
  }) {
    this.notify('burst', options);
  }

  /**
   * Launch celebratory confetti cascade
   */
  public confetti(options?: { count?: number; colors?: string[] }) {
    this.notify('confetti', options);
  }

  /**
   * Launch a multi-stage grand finale fireworks extravaganza
   */
  public grandFinale() {
    this.notify('grandFinale');
  }

  public clear() {
    this.notify('clear');
  }
}

export const fireworks = new FireworksService();
