export const ANALYTICS = Symbol('ANALYTICS');
export interface AnalyticsEvent {
  name: 'foundation.readiness';
  outcome: 'available' | 'unavailable';
}
export interface Analytics {
  track(event: AnalyticsEvent): void;
}
export class LocalAnalytics implements Analytics {
  constructor(private readonly write: (event: AnalyticsEvent) => void) {}
  track(event: AnalyticsEvent) {
    this.write({ name: event.name, outcome: event.outcome });
  }
}
