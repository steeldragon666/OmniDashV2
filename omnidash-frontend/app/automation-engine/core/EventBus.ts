import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface EventSubscription {
  id: string;
  eventName: string;
  workflowId: string;
  filters?: EventFilter[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  metadata: Record<string, any>;
}

export interface EventFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex' | 'exists';
  value?: any;
  caseSensitive?: boolean;
}

export interface EventPayload {
  id: string;
  eventName: string;
  source: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export interface EventTriggerResult {
  subscriptionId: string;
  workflowId: string;
  triggered: boolean;
  executionId?: string;
  error?: Error;
}

export class EventBus extends EventEmitter {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: EventPayload[] = [];
  private maxHistorySize: number = 1000;
  private workflowEngine: any;

  constructor(workflowEngine?: any) {
    super();
    this.workflowEngine = workflowEngine;
    this.setMaxListeners(100); // Increase listener limit
  }

  public subscribe(
    eventName: string,
    workflowId: string,
    options: {
      filters?: EventFilter[];
      priority?: number;
      metadata?: Record<string, any>;
    } = {}
  ): string {
    const subscriptionId = uuidv4();

    const subscription: EventSubscription = {
      id: subscriptionId,
      eventName,
      workflowId,
      filters: options.filters || [],
      isActive: true,
      priority: options.priority || 0,
      createdAt: new Date(),
      triggerCount: 0,
      metadata: options.metadata || {}
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Register the event listener
    this.on(eventName, async (payload: EventPayload) => {
      await this.handleEventTrigger(subscription, payload);
    });

    this.emit('subscription:created', subscription);
    console.log(`🔔 Event subscription created: ${eventName} -> ${workflowId}`);

    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    subscription.isActive = false;
    this.subscriptions.set(subscriptionId, subscription);

    this.emit('subscription:removed', subscription);
    console.log(`🔕 Event subscription removed: ${subscriptionId}`);

    return true;
  }

  public async publish(
    eventName: string,
    data: Record<string, any>,
    source: string = 'system',
    options: {
      correlationId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<EventTriggerResult[]> {
    const eventPayload: EventPayload = {
      id: uuidv4(),
      eventName,
      source,
      timestamp: new Date(),
      data,
      correlationId: options.correlationId,
      metadata: options.metadata
    };

    // Add to history
    this.addToHistory(eventPayload);

    console.log(`📢 Publishing event: ${eventName} from ${source}`);

    // Emit the event to trigger subscriptions
    this.emit(eventName, eventPayload);

    // Also emit a generic event for monitoring
    this.emit('event:published', eventPayload);

    // Get active subscriptions for this event
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive && sub.eventName === eventName)
      .sort((a, b) => b.priority - a.priority);

    const results: EventTriggerResult[] = [];

    for (const subscription of activeSubscriptions) {
      try {
        const triggered = await this.processSubscription(subscription, eventPayload);
        results.push({
          subscriptionId: subscription.id,
          workflowId: subscription.workflowId,
          triggered
        });
      } catch (error) {
        results.push({
          subscriptionId: subscription.id,
          workflowId: subscription.workflowId,
          triggered: false,
          error: error as Error
        });
      }
    }

    return results;
  }

  private async handleEventTrigger(
    subscription: EventSubscription,
    payload: EventPayload
  ): Promise<void> {
    if (!subscription.isActive) return;

    try {
      // Check filters
      if (!this.matchesFilters(payload, subscription.filters || [])) {
        return;
      }

      // Update subscription stats
      subscription.lastTriggered = new Date();
      subscription.triggerCount++;
      this.subscriptions.set(subscription.id, subscription);

      // Trigger workflow if engine is available
      if (this.workflowEngine) {
        const execution = await this.workflowEngine.executeWorkflow(
          subscription.workflowId,
          {
            eventPayload: payload,
            subscriptionId: subscription.id,
            triggerType: 'event'
          },
          'event'
        );

        this.emit('workflow:triggered', {
          subscription,
          payload,
          execution
        });

        console.log(`⚡ Triggered workflow: ${subscription.workflowId} from event: ${payload.eventName}`);
      }

    } catch (error) {
      this.emit('subscription:error', {
        subscription,
        payload,
        error
      });

      console.error(`❌ Error triggering workflow: ${subscription.workflowId}`, error);
    }
  }

  private async processSubscription(
    subscription: EventSubscription,
    payload: EventPayload
  ): Promise<boolean> {
    // This method is called synchronously during publish
    // The actual workflow triggering happens in handleEventTrigger
    return this.matchesFilters(payload, subscription.filters || []);
  }

  private matchesFilters(payload: EventPayload, filters: EventFilter[]): boolean {
    if (filters.length === 0) return true;

    for (const filter of filters) {
      if (!this.evaluateFilter(payload, filter)) {
        return false;
      }
    }

    return true;
  }

  private evaluateFilter(payload: EventPayload, filter: EventFilter): boolean {
    const fieldValue = this.getNestedValue(payload.data, filter.field);
    
    if (filter.operator === 'exists') {
      return fieldValue !== undefined;
    }

    if (fieldValue === undefined) return false;

    const filterValue = filter.value;
    const caseSensitive = filter.caseSensitive !== false;

    // Convert to strings for string operations if needed
    const valueStr = caseSensitive 
      ? String(fieldValue) 
      : String(fieldValue).toLowerCase();
    const filterStr = caseSensitive 
      ? String(filterValue) 
      : String(filterValue).toLowerCase();

    switch (filter.operator) {
      case 'eq':
        return fieldValue === filterValue;
      case 'neq':
        return fieldValue !== filterValue;
      case 'gt':
        return Number(fieldValue) > Number(filterValue);
      case 'lt':
        return Number(fieldValue) < Number(filterValue);
      case 'gte':
        return Number(fieldValue) >= Number(filterValue);
      case 'lte':
        return Number(fieldValue) <= Number(filterValue);
      case 'contains':
        return valueStr.includes(filterStr);
      case 'regex':
        try {
          const regex = new RegExp(filterValue, caseSensitive ? '' : 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private addToHistory(payload: EventPayload): void {
    this.eventHistory.unshift(payload);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
    }
  }

  // Event publishing shortcuts for common events
  public publishUserEvent(userId: string, action: string, data: Record<string, any> = {}): Promise<EventTriggerResult[]> {
    return this.publish('user.action', { userId, action, ...data }, 'user-service');
  }

  public publishSystemEvent(component: string, action: string, data: Record<string, any> = {}): Promise<EventTriggerResult[]> {
    return this.publish('system.event', { component, action, ...data }, 'system');
  }

  public publishWorkflowEvent(workflowId: string, status: string, data: Record<string, any> = {}): Promise<EventTriggerResult[]> {
    return this.publish('workflow.status', { workflowId, status, ...data }, 'workflow-engine');
  }

  public publishDataEvent(entity: string, action: 'created' | 'updated' | 'deleted', data: Record<string, any> = {}): Promise<EventTriggerResult[]> {
    return this.publish(`data.${action}`, { entity, action, ...data }, 'data-service');
  }

  public publishWebhookEvent(source: string, payload: any): Promise<EventTriggerResult[]> {
    return this.publish('webhook.received', { source, payload }, 'webhook-service');
  }

  public publishScheduleEvent(taskId: string, data: Record<string, any> = {}): Promise<EventTriggerResult[]> {
    return this.publish('schedule.triggered', { taskId, ...data }, 'scheduler');
  }

  // Query methods
  public getSubscription(subscriptionId: string): EventSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  public getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public getActiveSubscriptions(): EventSubscription[] {
    return this.getSubscriptions().filter(sub => sub.isActive);
  }

  public getSubscriptionsByEvent(eventName: string): EventSubscription[] {
    return this.getSubscriptions().filter(sub => sub.eventName === eventName);
  }

  public getSubscriptionsByWorkflow(workflowId: string): EventSubscription[] {
    return this.getSubscriptions().filter(sub => sub.workflowId === workflowId);
  }

  public getEventHistory(limit: number = 50): EventPayload[] {
    return this.eventHistory.slice(0, limit);
  }

  public getEventsByName(eventName: string, limit: number = 50): EventPayload[] {
    return this.eventHistory
      .filter(event => event.eventName === eventName)
      .slice(0, limit);
  }

  public getEventsBySource(source: string, limit: number = 50): EventPayload[] {
    return this.eventHistory
      .filter(event => event.source === source)
      .slice(0, limit);
  }

  public getEventsByCorrelationId(correlationId: string): EventPayload[] {
    return this.eventHistory
      .filter(event => event.correlationId === correlationId);
  }

  // Statistics
  public getSubscriptionStats(subscriptionId: string): {
    triggerCount: number;
    lastTriggered?: Date;
    createdAt: Date;
    isActive: boolean;
  } | null {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return null;

    return {
      triggerCount: subscription.triggerCount,
      lastTriggered: subscription.lastTriggered,
      createdAt: subscription.createdAt,
      isActive: subscription.isActive
    };
  }

  public getEventStats(): {
    totalEvents: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    recentEvents: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    return {
      totalEvents: this.eventHistory.length,
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: this.getActiveSubscriptions().length,
      recentEvents: this.eventHistory.filter(event => event.timestamp > oneHourAgo).length
    };
  }

  // Cleanup
  public clearHistory(): void {
    this.eventHistory = [];
    this.emit('history:cleared');
  }

  public removeInactiveSubscriptions(): number {
    const inactive = Array.from(this.subscriptions.entries())
      .filter(([_, sub]) => !sub.isActive);
    
    for (const [id] of inactive) {
      this.subscriptions.delete(id);
    }

    this.emit('subscriptions:cleaned', { removed: inactive.length });
    return inactive.length;
  }

  public shutdown(): void {
    this.removeAllListeners();
    this.subscriptions.clear();
    this.eventHistory = [];
    console.log('📴 EventBus shutdown complete');
  }
}

export const createEventBus = (workflowEngine?: any) => new EventBus(workflowEngine);