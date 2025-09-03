/**
 * Card Component - SuperDesign Implementation
 * Inspired by nature gallery organic shapes and layered compositions
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { motion, type HTMLMotionProps } from 'framer-motion';

// Card variants with nature-inspired design tokens
const cardVariants = cva(
  [
    'relative overflow-hidden transition-all duration-300 ease-organic',
    'focus-within:ring-2 focus-within:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        // Default - Clean with organic shadow
        default: [
          'bg-white border border-neutral-200 shadow-organic-md',
          'hover:shadow-organic-lg hover:border-neutral-300',
          'dark:bg-neutral-900 dark:border-neutral-800',
          'focus-within:ring-nature-forest-500',
        ].join(' '),
        
        // Elevated - Prominent with nature glow
        elevated: [
          'bg-white shadow-organic-lg border border-transparent',
          'hover:shadow-organic-xl hover:shadow-nature-glow',
          'dark:bg-neutral-900',
          'focus-within:ring-nature-emerald-500',
        ].join(' '),
        
        // Glass - Modern glassmorphism
        glass: [
          'bg-glass-medium backdrop-blur-md border border-white/20',
          'shadow-glass hover:bg-glass-heavy',
          'text-white',
          'focus-within:ring-white/50',
        ].join(' '),
        
        // Nature - Earth-toned background
        nature: [
          'bg-nature-sage-50 border border-nature-sage-200',
          'hover:bg-nature-sage-100 hover:shadow-organic-md',
          'dark:bg-nature-sage-900 dark:border-nature-sage-800',
          'focus-within:ring-nature-sage-500',
        ].join(' '),
        
        // Golden - Premium accent
        golden: [
          'bg-gradient-to-br from-nature-golden-50 to-nature-earth-50',
          'border border-nature-golden-200 shadow-organic-md',
          'hover:shadow-golden-glow',
          'focus-within:ring-nature-golden-500',
        ].join(' '),
        
        // Flat - Minimal without shadow
        flat: [
          'bg-white border border-neutral-200',
          'hover:border-neutral-300',
          'dark:bg-neutral-900 dark:border-neutral-800',
          'focus-within:ring-nature-forest-500',
        ].join(' '),
      },
      
      size: {
        sm: 'p-4 rounded-organic-sm',
        md: 'p-6 rounded-organic-md',
        lg: 'p-8 rounded-organic-lg',
        xl: 'p-10 rounded-organic-xl',
      },
      
      interactive: {
        true: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        false: '',
      },
      
      fullHeight: {
        true: 'h-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      interactive: false,
      fullHeight: false,
    },
  }
);

// Card component props
export interface CardProps
  extends Omit<HTMLMotionProps<'div'>, 'size'>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, size, interactive, fullHeight, children, ...props },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(cardVariants({ variant, size, interactive, fullHeight, className }))}
        // Motion animations for interactive cards
        {...(interactive && {
          whileHover: { y: -2 },
          whileTap: { y: 0 },
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17,
          },
        })}
        {...props}
      >
        {children}
        
        {/* Subtle overlay for interactive cards */}
        {interactive && (
          <motion.div
            className="absolute inset-0 rounded-inherit bg-white opacity-0"
            initial={false}
            whileHover={{ opacity: 0.05 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// Card Header component
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title component
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-none tracking-tight text-nature-forest-900 dark:text-nature-sage-100',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// Card Description component
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-600 dark:text-neutral-400', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content component
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex-1', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// Card Footer component
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-neutral-200 dark:border-neutral-800', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
export type { CardProps };