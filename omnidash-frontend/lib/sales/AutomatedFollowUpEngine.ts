/**
 * Automated Follow-Up Sequences Engine
 * Creates intelligent, personalized follow-up campaigns based on lead behavior and characteristics
 */

export interface FollowUpSequence {
  id: string;
  name: string;
  description: string;
  trigger: SequenceTrigger;
  steps: SequenceStep[];
  isActive: boolean;
  targetAudience: AudienceFilter;
  performance: SequencePerformance;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceTrigger {
  type: 'lead_score' | 'stage_change' | 'inactivity' | 'behavior' | 'date' | 'manual';
  conditions: TriggerCondition[];
  operator: 'AND' | 'OR';
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in_list';
  value: string | number | string[];
}

export interface SequenceStep {
  id: string;
  stepNumber: number;
  type: 'email' | 'call' | 'linkedin' | 'sms' | 'task' | 'wait';
  delay: number; // Hours to wait before executing
  content: StepContent;
  conditions?: TriggerCondition[]; // Optional conditions to execute this step
  alternatives?: AlternativeStep[]; // A/B testing alternatives
}

export interface StepContent {
  subject?: string; // For emails
  body: string;
  templateId?: string;
  personalizationTokens: string[];
  attachments?: string[];
  callScript?: string; // For calls
  taskInstructions?: string; // For tasks
}

export interface AlternativeStep {
  id: string;
  weight: number; // Percentage of audience to receive this version
  content: StepContent;
  performance: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    converted: number;
  };
}

export interface AudienceFilter {
  leadScore?: { min?: number; max?: number };
  industry?: string[];
  companySize?: { min?: number; max?: number };
  jobTitle?: string[];
  location?: string[];
  leadSource?: string[];
  stage?: string[];
  tags?: string[];
}

export interface SequencePerformance {
  totalEnrolled: number;
  totalCompleted: number;
  totalOptedOut: number;
  averageEngagementScore: number;
  conversionRate: number;
  replyRate: number;
  openRate: number;
  clickRate: number;
  revenueGenerated: number;
  costPerLead: number;
  roi: number;
}

export interface SequenceEnrollment {
  id: string;
  leadId: string;
  sequenceId: string;
  currentStep: number;
  status: 'active' | 'completed' | 'paused' | 'opted_out' | 'failed';
  enrolledAt: string;
  lastActionAt?: string;
  nextActionAt?: string;
  completedSteps: CompletedStep[];
  metadata: Record<string, any>;
}

export interface CompletedStep {
  stepId: string;
  executedAt: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'failed';
  response?: string;
  metadata: Record<string, any>;
}

export interface PersonalizationEngine {
  generatePersonalizedContent(
    template: string,
    leadData: any,
    companyData?: any
  ): Promise<string>;
  
  getAvailableTokens(): string[];
  
  analyzeContentPerformance(
    contentVariants: string[],
    performance: any[]
  ): ContentInsights;
}

export interface ContentInsights {
  bestPerformingVariant: number;
  significanceLevel: number;
  recommendations: string[];
  sentimentAnalysis: {
    tone: 'professional' | 'casual' | 'friendly' | 'urgent';
    readabilityScore: number;
    wordCount: number;
    callToActionStrength: number;
  };
}

class AutomatedFollowUpEngine {
  private sequences: Map<string, FollowUpSequence> = new Map();
  private enrollments: Map<string, SequenceEnrollment> = new Map();
  private personalizationEngine: PersonalizationEngine;
  private isProcessing = false;

  constructor(personalizationEngine?: PersonalizationEngine) {
    this.personalizationEngine = personalizationEngine || new DefaultPersonalizationEngine();
  }

  /**
   * Create a new follow-up sequence
   */
  async createSequence(sequenceData: Omit<FollowUpSequence, 'id' | 'performance' | 'createdAt' | 'updatedAt'>): Promise<FollowUpSequence> {
    const sequence: FollowUpSequence = {
      id: this.generateId(),
      ...sequenceData,
      performance: {
        totalEnrolled: 0,
        totalCompleted: 0,
        totalOptedOut: 0,
        averageEngagementScore: 0,
        conversionRate: 0,
        replyRate: 0,
        openRate: 0,
        clickRate: 0,
        revenueGenerated: 0,
        costPerLead: 0,
        roi: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sequences.set(sequence.id, sequence);
    return sequence;
  }

  /**
   * Enroll a lead in a sequence
   */
  async enrollLead(leadId: string, sequenceId: string, metadata: Record<string, any> = {}): Promise<SequenceEnrollment> {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    if (!sequence.isActive) {
      throw new Error(`Sequence ${sequenceId} is not active`);
    }

    const enrollment: SequenceEnrollment = {
      id: this.generateId(),
      leadId,
      sequenceId,
      currentStep: 0,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      nextActionAt: this.calculateNextActionTime(sequence.steps[0]),
      completedSteps: [],
      metadata,
    };

    this.enrollments.set(enrollment.id, enrollment);

    // Update sequence performance
    sequence.performance.totalEnrolled++;
    this.sequences.set(sequenceId, sequence);

    return enrollment;
  }

  /**
   * Process all pending actions
   */
  async processSequences(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    if (this.isProcessing) {
      return { processed: 0, successful: 0, failed: 0, errors: ['Already processing'] };
    }

    this.isProcessing = true;
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const now = new Date();
      const pendingEnrollments = Array.from(this.enrollments.values()).filter(
        enrollment =>
          enrollment.status === 'active' &&
          enrollment.nextActionAt &&
          new Date(enrollment.nextActionAt) <= now
      );

      for (const enrollment of pendingEnrollments) {
        processed++;
        try {
          await this.processEnrollmentStep(enrollment);
          successful++;
        } catch (error) {
          failed++;
          errors.push(`Error processing enrollment ${enrollment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { processed, successful, failed, errors };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single enrollment step
   */
  private async processEnrollmentStep(enrollment: SequenceEnrollment): Promise<void> {
    const sequence = this.sequences.get(enrollment.sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${enrollment.sequenceId} not found`);
    }

    const step = sequence.steps[enrollment.currentStep];
    if (!step) {
      // Sequence completed
      enrollment.status = 'completed';
      enrollment.lastActionAt = new Date().toISOString();
      delete enrollment.nextActionAt;
      
      sequence.performance.totalCompleted++;
      this.sequences.set(enrollment.sequenceId, sequence);
      this.enrollments.set(enrollment.id, enrollment);
      return;
    }

    // Check step conditions
    if (step.conditions && !(await this.evaluateConditions(step.conditions, enrollment.leadId))) {
      // Skip this step and move to next
      enrollment.currentStep++;
      enrollment.nextActionAt = this.calculateNextActionTime(sequence.steps[enrollment.currentStep]);
      this.enrollments.set(enrollment.id, enrollment);
      return;
    }

    // Execute the step
    const executionResult = await this.executeStep(step, enrollment);
    
    // Record the completed step
    const completedStep: CompletedStep = {
      stepId: step.id,
      executedAt: new Date().toISOString(),
      status: executionResult.status,
      response: executionResult.response,
      metadata: executionResult.metadata,
    };

    enrollment.completedSteps.push(completedStep);
    enrollment.lastActionAt = new Date().toISOString();
    enrollment.currentStep++;

    // Calculate next action time
    const nextStep = sequence.steps[enrollment.currentStep];
    if (nextStep) {
      enrollment.nextActionAt = this.calculateNextActionTime(nextStep);
    } else {
      // Sequence completed
      enrollment.status = 'completed';
      delete enrollment.nextActionAt;
      sequence.performance.totalCompleted++;
    }

    this.enrollments.set(enrollment.id, enrollment);
    this.sequences.set(enrollment.sequenceId, sequence);
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: SequenceStep,
    enrollment: SequenceEnrollment
  ): Promise<{
    status: 'sent' | 'delivered' | 'failed';
    response?: string;
    metadata: Record<string, any>;
  }> {
    // Get lead data for personalization
    const leadData = await this.getLeadData(enrollment.leadId);
    
    // Choose content variant (A/B testing)
    const content = await this.selectStepContent(step, enrollment);
    
    // Personalize content
    const personalizedContent = await this.personalizationEngine.generatePersonalizedContent(
      content.body,
      leadData
    );

    switch (step.type) {
      case 'email':
        return this.sendEmail({
          to: leadData.email,
          subject: await this.personalizationEngine.generatePersonalizedContent(content.subject || '', leadData),
          body: personalizedContent,
          attachments: content.attachments,
        });

      case 'call':
        return this.scheduleCall({
          leadId: enrollment.leadId,
          script: content.callScript || personalizedContent,
          metadata: { enrollmentId: enrollment.id, stepId: step.id },
        });

      case 'linkedin':
        return this.sendLinkedInMessage({
          leadId: enrollment.leadId,
          message: personalizedContent,
        });

      case 'sms':
        return this.sendSMS({
          to: leadData.phone,
          message: personalizedContent,
        });

      case 'task':
        return this.createTask({
          assigneeId: leadData.ownerId,
          title: `Follow up with ${leadData.firstName} ${leadData.lastName}`,
          description: content.taskInstructions || personalizedContent,
          leadId: enrollment.leadId,
        });

      case 'wait':
        return {
          status: 'delivered',
          metadata: { waitTime: step.delay },
        };

      default:
        throw new Error(`Unsupported step type: ${step.type}`);
    }
  }

  /**
   * Select content variant for A/B testing
   */
  private async selectStepContent(step: SequenceStep, enrollment: SequenceEnrollment): Promise<StepContent> {
    if (!step.alternatives || step.alternatives.length === 0) {
      return step.content;
    }

    // Simple random selection based on weights
    // In production, this would be more sophisticated with proper A/B testing logic
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const alternative of step.alternatives) {
      cumulativeWeight += alternative.weight / 100;
      if (random <= cumulativeWeight) {
        return alternative.content;
      }
    }

    return step.content; // Fallback
  }

  /**
   * Check if a lead matches sequence triggers
   */
  async checkSequenceTriggers(leadId: string): Promise<string[]> {
    const triggeredSequences: string[] = [];
    
    for (const [sequenceId, sequence] of this.sequences.entries()) {
      if (!sequence.isActive) continue;
      
      // Check if lead is already enrolled
      const existingEnrollment = Array.from(this.enrollments.values()).find(
        e => e.leadId === leadId && e.sequenceId === sequenceId && e.status === 'active'
      );
      
      if (existingEnrollment) continue;
      
      // Check trigger conditions
      if (await this.evaluateTrigger(sequence.trigger, leadId)) {
        // Check audience filters
        if (await this.matchesAudienceFilter(sequence.targetAudience, leadId)) {
          triggeredSequences.push(sequenceId);
        }
      }
    }
    
    return triggeredSequences;
  }

  /**
   * Get sequence performance analytics
   */
  getSequenceAnalytics(sequenceId: string): {
    sequence: FollowUpSequence;
    stepPerformance: Array<{
      stepNumber: number;
      sent: number;
      opened?: number;
      clicked?: number;
      replied?: number;
      conversionRate: number;
    }>;
    timeline: Array<{
      date: string;
      enrolled: number;
      completed: number;
      optedOut: number;
    }>;
  } {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    const enrollments = Array.from(this.enrollments.values()).filter(
      e => e.sequenceId === sequenceId
    );

    // Calculate step performance
    const stepPerformance = sequence.steps.map((step, index) => {
      const stepExecutions = enrollments.flatMap(e => 
        e.completedSteps.filter(cs => cs.stepId === step.id)
      );
      
      const sent = stepExecutions.length;
      const opened = stepExecutions.filter(se => se.status === 'opened').length;
      const clicked = stepExecutions.filter(se => se.status === 'clicked').length;
      const replied = stepExecutions.filter(se => se.status === 'replied').length;
      
      return {
        stepNumber: index + 1,
        sent,
        opened,
        clicked,
        replied,
        conversionRate: sent > 0 ? (replied / sent) * 100 : 0,
      };
    });

    // Generate timeline (simplified)
    const timeline = this.generateTimelineData(enrollments);

    return {
      sequence,
      stepPerformance,
      timeline,
    };
  }

  /**
   * Pause or resume an enrollment
   */
  async updateEnrollmentStatus(
    enrollmentId: string, 
    status: SequenceEnrollment['status']
  ): Promise<SequenceEnrollment> {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) {
      throw new Error(`Enrollment ${enrollmentId} not found`);
    }

    enrollment.status = status;
    enrollment.lastActionAt = new Date().toISOString();

    if (status === 'paused') {
      delete enrollment.nextActionAt;
    } else if (status === 'active' && enrollment.currentStep < this.getSequenceSteps(enrollment.sequenceId).length) {
      const nextStep = this.getSequenceSteps(enrollment.sequenceId)[enrollment.currentStep];
      enrollment.nextActionAt = this.calculateNextActionTime(nextStep);
    }

    this.enrollments.set(enrollmentId, enrollment);
    return enrollment;
  }

  // Helper methods
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private calculateNextActionTime(step: SequenceStep): string {
    const now = new Date();
    const nextTime = new Date(now.getTime() + (step.delay * 60 * 60 * 1000)); // Convert hours to milliseconds
    return nextTime.toISOString();
  }

  private async evaluateConditions(conditions: TriggerCondition[], leadId: string): Promise<boolean> {
    // Simplified condition evaluation - would need real lead data
    return true; // Placeholder
  }

  private async evaluateTrigger(trigger: SequenceTrigger, leadId: string): Promise<boolean> {
    // Simplified trigger evaluation
    const conditionResults = await Promise.all(
      trigger.conditions.map(condition => this.evaluateConditions([condition], leadId))
    );

    return trigger.operator === 'AND' 
      ? conditionResults.every(result => result)
      : conditionResults.some(result => result);
  }

  private async matchesAudienceFilter(filter: AudienceFilter, leadId: string): Promise<boolean> {
    // Simplified audience matching - would need real lead data
    return true; // Placeholder
  }

  private async getLeadData(leadId: string): Promise<any> {
    // Would fetch real lead data from database
    return {
      id: leadId,
      email: 'lead@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Corp',
      phone: '+1234567890',
      ownerId: 'owner1',
    };
  }

  private async sendEmail(emailData: any): Promise<any> {
    // Would integrate with email service
    console.log('Sending email:', emailData);
    return { status: 'sent', metadata: {} };
  }

  private async scheduleCall(callData: any): Promise<any> {
    // Would integrate with calendar/CRM
    console.log('Scheduling call:', callData);
    return { status: 'sent', metadata: {} };
  }

  private async sendLinkedInMessage(messageData: any): Promise<any> {
    // Would integrate with LinkedIn API
    console.log('Sending LinkedIn message:', messageData);
    return { status: 'sent', metadata: {} };
  }

  private async sendSMS(smsData: any): Promise<any> {
    // Would integrate with SMS service
    console.log('Sending SMS:', smsData);
    return { status: 'sent', metadata: {} };
  }

  private async createTask(taskData: any): Promise<any> {
    // Would create task in CRM/task management system
    console.log('Creating task:', taskData);
    return { status: 'sent', metadata: {} };
  }

  private getSequenceSteps(sequenceId: string): SequenceStep[] {
    const sequence = this.sequences.get(sequenceId);
    return sequence ? sequence.steps : [];
  }

  private generateTimelineData(enrollments: SequenceEnrollment[]): any[] {
    // Generate timeline data for analytics
    return []; // Placeholder
  }
}

/**
 * Default implementation of PersonalizationEngine
 */
class DefaultPersonalizationEngine implements PersonalizationEngine {
  async generatePersonalizedContent(template: string, leadData: any, companyData?: any): Promise<string> {
    let content = template;
    
    // Simple token replacement
    const tokens = {
      'first_name': leadData.firstName || '',
      'last_name': leadData.lastName || '',
      'company': leadData.company || companyData?.name || '',
      'email': leadData.email || '',
      'full_name': `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim(),
    };

    Object.entries(tokens).forEach(([token, value]) => {
      const regex = new RegExp(`{{${token}}}`, 'g');
      content = content.replace(regex, value);
    });

    return content;
  }

  getAvailableTokens(): string[] {
    return ['first_name', 'last_name', 'company', 'email', 'full_name'];
  }

  analyzeContentPerformance(contentVariants: string[], performance: any[]): ContentInsights {
    return {
      bestPerformingVariant: 0,
      significanceLevel: 0.95,
      recommendations: ['Use more personalized subject lines', 'Include clear call-to-action'],
      sentimentAnalysis: {
        tone: 'professional',
        readabilityScore: 75,
        wordCount: 150,
        callToActionStrength: 80,
      },
    };
  }
}

export default AutomatedFollowUpEngine;