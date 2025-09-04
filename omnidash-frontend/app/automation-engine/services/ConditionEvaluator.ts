import { EventEmitter } from 'events';

export interface Condition {
  id: string;
  name?: string;
  field: string;
  operator: ConditionOperator;
  value: unknown;
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  caseSensitive?: boolean;
  logicalOperator?: 'AND' | 'OR';
  negate?: boolean;
  metadata?: Record<string, unknown>;
}

export type ConditionOperator = 
  | 'eq'          // equals
  | 'neq'         // not equals
  | 'gt'          // greater than
  | 'gte'         // greater than or equal
  | 'lt'          // less than
  | 'lte'         // less than or equal
  | 'contains'    // contains substring
  | 'startsWith'  // starts with
  | 'endsWith'    // ends with
  | 'regex'       // matches regex
  | 'exists'      // field exists (not null/undefined)
  | 'empty'       // field is empty (null, undefined, '', [], {})
  | 'in'          // value is in array
  | 'notIn'       // value is not in array
  | 'between'     // value is between two numbers
  | 'isNull'      // value is null
  | 'isTrue'      // value is true
  | 'isFalse'     // value is false
  | 'hasLength'   // array/string has specific length
  | 'hasKey'      // object has specific key
  | 'match'       // deep object matching
  | 'custom';     // custom evaluation function

export interface ConditionGroup {
  id: string;
  name?: string;
  conditions: (Condition | ConditionGroup)[];
  logicalOperator: 'AND' | 'OR';
  negate?: boolean;
}

export interface EvaluationContext {
  data: Record<string, unknown>;
  variables?: Record<string, unknown>;
  functions?: Record<string, (...args: unknown[]) => unknown>;
  metadata?: Record<string, unknown>;
}

export interface EvaluationResult {
  success: boolean;
  result: boolean;
  details: EvaluationDetail[];
  executionTime: number;
  error?: string;
}

export interface EvaluationDetail {
  conditionId: string;
  conditionName?: string;
  field: string;
  operator: ConditionOperator;
  expectedValue: unknown;
  actualValue: unknown;
  result: boolean;
  error?: string;
  path?: string;
}

export class ConditionEvaluator extends EventEmitter {
  private customFunctions: Map<string, (...args: unknown[]) => unknown> = new Map();
  private evaluationCache: Map<string, { result: EvaluationResult; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  constructor() {
    super();
    this.setupDefaultFunctions();
  }

  private setupDefaultFunctions(): void {
    // Date functions
    this.customFunctions.set('now', () => new Date());
    this.customFunctions.set('today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    });
    this.customFunctions.set('tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    });
    this.customFunctions.set('daysAgo', (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date;
    });
    this.customFunctions.set('daysFromNow', (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    });

    // String functions
    this.customFunctions.set('toLowerCase', (str: string) => String(str).toLowerCase());
    this.customFunctions.set('toUpperCase', (str: string) => String(str).toUpperCase());
    this.customFunctions.set('trim', (str: string) => String(str).trim());
    this.customFunctions.set('length', (value: string | unknown[]) => {
      if (typeof value === 'string' || Array.isArray(value)) {
        return value.length;
      }
      return 0;
    });

    // Math functions
    this.customFunctions.set('abs', Math.abs);
    this.customFunctions.set('ceil', Math.ceil);
    this.customFunctions.set('floor', Math.floor);
    this.customFunctions.set('round', Math.round);
    this.customFunctions.set('min', Math.min);
    this.customFunctions.set('max', Math.max);

    // Array functions
    this.customFunctions.set('count', (arr: unknown[]) => Array.isArray(arr) ? arr.length : 0);
    this.customFunctions.set('sum', (arr: number[]) => {
      return Array.isArray(arr) ? arr.reduce((sum, val) => sum + (Number(val) || 0), 0) : 0;
    });
    this.customFunctions.set('average', (arr: number[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return 0;
      const sum = arr.reduce((sum, val) => sum + (Number(val) || 0), 0);
      return sum / arr.length;
    });

    console.log('📊 ConditionEvaluator initialized with default functions');
  }

  public evaluateCondition(
    condition: Condition,
    context: EvaluationContext
  ): EvaluationResult {
    const startTime = Date.now();
    
    try {
      const result = this.evaluateSingleCondition(condition, context);
      const detail: EvaluationDetail = {
        conditionId: condition.id,
        conditionName: condition.name,
        field: condition.field,
        operator: condition.operator,
        expectedValue: condition.value,
        actualValue: this.getFieldValue(condition.field, context),
        result: condition.negate ? !result : result
      };

      return {
        success: true,
        result: condition.negate ? !result : result,
        details: [detail],
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        result: false,
        details: [{
          conditionId: condition.id,
          conditionName: condition.name,
          field: condition.field,
          operator: condition.operator,
          expectedValue: condition.value,
          actualValue: undefined,
          result: false,
          error: (error as Error).message
        }],
        executionTime: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  public evaluateConditionGroup(
    group: ConditionGroup,
    context: EvaluationContext
  ): EvaluationResult {
    const startTime = Date.now();
    const details: EvaluationDetail[] = [];
    let groupResult: boolean;

    try {
      if (group.logicalOperator === 'AND') {
        groupResult = true;
        for (const item of group.conditions) {
          const itemResult = this.evaluateConditionItem(item, context);
          details.push(...itemResult.details);
          
          if (!itemResult.result) {
            groupResult = false;
            if (!itemResult.success) {
              throw new Error(itemResult.error);
            }
          }
        }
      } else { // OR
        groupResult = false;
        for (const item of group.conditions) {
          const itemResult = this.evaluateConditionItem(item, context);
          details.push(...itemResult.details);
          
          if (itemResult.result) {
            groupResult = true;
            break;
          }
          
          if (!itemResult.success) {
            throw new Error(itemResult.error);
          }
        }
      }

      const finalResult = group.negate ? !groupResult : groupResult;

      return {
        success: true,
        result: finalResult,
        details,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        result: false,
        details,
        executionTime: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  private evaluateConditionItem(
    item: Condition | ConditionGroup,
    context: EvaluationContext
  ): EvaluationResult {
    if ('conditions' in item) {
      return this.evaluateConditionGroup(item, context);
    } else {
      return this.evaluateCondition(item, context);
    }
  }

  private evaluateSingleCondition(
    condition: Condition,
    context: EvaluationContext
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    const expectedValue = this.resolveValue(condition.value, context);

    switch (condition.operator) {
      case 'eq':
        return this.compareValues(fieldValue, expectedValue, 'eq', condition.caseSensitive);
      
      case 'neq':
        return !this.compareValues(fieldValue, expectedValue, 'eq', condition.caseSensitive);
      
      case 'gt':
        return Number(fieldValue) > Number(expectedValue);
      
      case 'gte':
        return Number(fieldValue) >= Number(expectedValue);
      
      case 'lt':
        return Number(fieldValue) < Number(expectedValue);
      
      case 'lte':
        return Number(fieldValue) <= Number(expectedValue);
      
      case 'contains':
        return this.stringContains(fieldValue, expectedValue, condition.caseSensitive);
      
      case 'startsWith':
        return this.stringStartsWith(fieldValue, expectedValue, condition.caseSensitive);
      
      case 'endsWith':
        return this.stringEndsWith(fieldValue, expectedValue, condition.caseSensitive);
      
      case 'regex':
        return this.matchesRegex(fieldValue, expectedValue, condition.caseSensitive);
      
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      
      case 'empty':
        return this.isEmpty(fieldValue);
      
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      
      case 'notIn':
        return !Array.isArray(expectedValue) || !expectedValue.includes(fieldValue);
      
      case 'between':
        return this.isBetween(fieldValue, expectedValue);
      
      case 'isNull':
        return fieldValue === null;
      
      case 'isTrue':
        return fieldValue === true;
      
      case 'isFalse':
        return fieldValue === false;
      
      case 'hasLength':
        return this.hasLength(fieldValue, expectedValue);
      
      case 'hasKey':
        return this.hasKey(fieldValue, expectedValue);
      
      case 'match':
        return this.deepMatch(fieldValue, expectedValue);
      
      case 'custom':
        return this.evaluateCustomCondition(condition, fieldValue, expectedValue, context);
      
      default:
        throw new Error(`Unknown operator: ${condition.operator}`);
    }
  }

  private getFieldValue(field: string, context: EvaluationContext): unknown {
    // Support dot notation for nested fields
    const path = field.split('.');
    let value: unknown = context.data;

    for (const key of path) {
      if (value === null || value === undefined) {
        return undefined;
      }
      
      if (typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private resolveValue(value: unknown, context: EvaluationContext): unknown {
    // If value is a string starting with $, treat as variable reference
    if (typeof value === 'string' && value.startsWith('$')) {
      const varName = value.substring(1);
      return context.variables?.[varName];
    }

    // If value is a string starting with @, treat as function call
    if (typeof value === 'string' && value.startsWith('@')) {
      const functionCall = value.substring(1);
      return this.evaluateFunction(functionCall, context);
    }

    return value;
  }

  private evaluateFunction(functionCall: string, context: EvaluationContext): unknown {
    const match = functionCall.match(/^(\w+)\((.*)\)$/);
    if (!match) {
      throw new Error(`Invalid function call: ${functionCall}`);
    }

    const [, functionName, argsString] = match;
    const func = this.customFunctions.get(functionName) || context.functions?.[functionName];
    
    if (!func) {
      throw new Error(`Unknown function: ${functionName}`);
    }

    // Parse arguments (simplified - in production, use a proper parser)
    const args = argsString ? argsString.split(',').map(arg => {
      const trimmed = arg.trim();
      
      // Try to parse as number
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return parseFloat(trimmed);
      }
      
      // Try to parse as string (remove quotes)
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
      }
      
      // Try to parse as boolean
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      
      // Return as string
      return trimmed;
    }) : [];

    return func(...args);
  }

  private compareValues(value1: unknown, value2: unknown, operator: 'eq', caseSensitive?: boolean): boolean {
    if (value1 === value2) return true;
    
    // String comparison with case sensitivity
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      if (caseSensitive === false) {
        return value1.toLowerCase() === value2.toLowerCase();
      }
    }
    
    return false;
  }

  private stringContains(haystack: unknown, needle: unknown, caseSensitive?: boolean): boolean {
    const haystackStr = String(haystack);
    const needleStr = String(needle);
    
    if (caseSensitive === false) {
      return haystackStr.toLowerCase().includes(needleStr.toLowerCase());
    }
    
    return haystackStr.includes(needleStr);
  }

  private stringStartsWith(value: unknown, prefix: unknown, caseSensitive?: boolean): boolean {
    const valueStr = String(value);
    const prefixStr = String(prefix);
    
    if (caseSensitive === false) {
      return valueStr.toLowerCase().startsWith(prefixStr.toLowerCase());
    }
    
    return valueStr.startsWith(prefixStr);
  }

  private stringEndsWith(value: unknown, suffix: unknown, caseSensitive?: boolean): boolean {
    const valueStr = String(value);
    const suffixStr = String(suffix);
    
    if (caseSensitive === false) {
      return valueStr.toLowerCase().endsWith(suffixStr.toLowerCase());
    }
    
    return valueStr.endsWith(suffixStr);
  }

  private matchesRegex(value: unknown, pattern: unknown, caseSensitive?: boolean): boolean {
    try {
      const flags = caseSensitive === false ? 'i' : '';
      const regex = new RegExp(String(pattern), flags);
      return regex.test(String(value));
    } catch {
      return false;
    }
  }

  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  private isBetween(value: unknown, range: unknown): boolean {
    if (!Array.isArray(range) || range.length !== 2) return false;
    const numValue = Number(value);
    const [min, max] = range.map(Number);
    return numValue >= min && numValue <= max;
  }

  private hasLength(value: unknown, expectedLength: unknown): boolean {
    const length = typeof value === 'string' || Array.isArray(value) ? value.length : 0;
    return length === Number(expectedLength);
  }

  private hasKey(value: unknown, key: unknown): boolean {
    return typeof value === 'object' && value !== null && String(key) in value;
  }

  private deepMatch(value: unknown, pattern: unknown): boolean {
    if (typeof pattern !== 'object' || pattern === null) {
      return value === pattern;
    }

    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const patternObj = pattern as Record<string, unknown>;
    const valueObj = value as Record<string, unknown>;

    for (const [key, expectedValue] of Object.entries(patternObj)) {
      if (!this.deepMatch(valueObj[key], expectedValue)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCustomCondition(
    condition: Condition,
    fieldValue: unknown,
    expectedValue: unknown,
    context: EvaluationContext
  ): boolean {
    // Custom conditions could be implemented by extending this method
    // or by providing custom functions in the context
    const customEvaluator = context.functions?.[`custom_${condition.field}`];
    if (typeof customEvaluator === 'function') {
      return Boolean(customEvaluator(fieldValue, expectedValue, context));
    }

    throw new Error(`No custom evaluator found for condition: ${condition.id}`);
  }

  // Public API methods
  public addCustomFunction(name: string, func: (...args: unknown[]) => unknown): void {
    this.customFunctions.set(name, func);
    console.log(`🔧 Custom function added: ${name}`);
  }

  public removeCustomFunction(name: string): boolean {
    return this.customFunctions.delete(name);
  }

  public getCustomFunctions(): string[] {
    return Array.from(this.customFunctions.keys());
  }

  public validateCondition(condition: Condition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!condition.field) {
      errors.push('Field is required');
    }

    if (!condition.operator) {
      errors.push('Operator is required');
    }

    if (condition.value === undefined && !['exists', 'empty', 'isNull', 'isTrue', 'isFalse'].includes(condition.operator)) {
      errors.push('Value is required for this operator');
    }

    // Validate operator-specific requirements
    if (['between'].includes(condition.operator) && !Array.isArray(condition.value)) {
      errors.push('Between operator requires an array value with two elements');
    }

    if (['in', 'notIn'].includes(condition.operator) && !Array.isArray(condition.value)) {
      errors.push('In/NotIn operators require an array value');
    }

    return { valid: errors.length === 0, errors };
  }

  public clearCache(): void {
    this.evaluationCache.clear();
    console.log('🧹 Condition evaluation cache cleared');
  }

  public getCacheStats(): { size: number; hitRate: number } {
    // Simplified cache stats - in production, track hits/misses
    return {
      size: this.evaluationCache.size,
      hitRate: 0 // Would need to implement hit tracking
    };
  }
}

export const conditionEvaluator = new ConditionEvaluator();