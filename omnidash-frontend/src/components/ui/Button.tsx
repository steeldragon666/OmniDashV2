/**
 * Button Component - SuperDesign Implementation
 * Inspired by nature gallery organic shapes and premium interactions
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';

// Button variants using nature-inspired design tokens
const buttonVariants = cva(
  // Base styles with organic feel
  [
    'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium',
    'transition-all duration-300 ease-organic',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'relative overflow-hidden',
    'group', // For hover effects
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary - Nature gradient with golden accents
        primary: [
          'bg-nature-gradient text-white shadow-organic-md',
          'hover:shadow-organic-lg hover:shadow-nature-glow',
          'focus-visible:ring-nature-forest-500',
          'active:scale-98 active:shadow-organic-sm',
        ].join(' '),
        
        // Secondary - Earthy tones
        secondary: [
          'bg-nature-earth-100 text-nature-earth-800 border border-nature-earth-200',
          'hover:bg-nature-earth-200 hover:shadow-organic-md',
          'focus-visible:ring-nature-earth-500',
          'dark:bg-nature-earth-800 dark:text-nature-earth-100',
          'dark:border-nature-earth-700 dark:hover:bg-nature-earth-700',
        ].join(' '),
        
        // Outline - Sage green outline
        outline: [
          'border border-nature-sage-300 bg-transparent text-nature-sage-700',
          'hover:bg-nature-sage-50 hover:text-nature-sage-800',
          'hover:border-nature-sage-400 hover:shadow-organic-sm',
          'focus-visible:ring-nature-sage-500',
          'dark:border-nature-sage-600 dark:text-nature-sage-400',
          'dark:hover:bg-nature-sage-900 dark:hover:text-nature-sage-300',
        ].join(' '),
        
        // Ghost - Minimal with subtle hover
        ghost: [
          'text-nature-forest-700 hover:bg-nature-forest-50',
          'hover:text-nature-forest-800 hover:shadow-organic-sm',
          'focus-visible:ring-nature-forest-500',
          'dark:text-nature-forest-300 dark:hover:bg-nature-forest-900',
          'dark:hover:text-nature-forest-200',
        ].join(' '),
        
        // Destructive - Warm coral tones
        destructive: [
          'bg-red-500 text-white shadow-organic-md',
          'hover:bg-red-600 hover:shadow-organic-lg',
          'focus-visible:ring-red-500',
          'active:scale-98',
        ].join(' '),
        
        // Golden - Premium accent
        golden: [
          'bg-golden-gradient text-nature-earth-900 shadow-organic-md font-semibold',
          'hover:shadow-golden-glow hover:shadow-organic-lg',
          'focus-visible:ring-nature-golden-500',
          'active:scale-98',
        ].join(' '),
        
        // Glass - Modern glassmorphism
        glass: [
          'bg-glass-medium backdrop-blur-md border border-white/20',
          'text-white hover:bg-glass-heavy',
          'shadow-glass hover:shadow-organic-lg',
          'focus-visible:ring-white/50',
        ].join(' '),
      },
      
      size: {
        sm: 'h-8 px-3 text-xs rounded-organic-sm',
        md: 'h-10 px-4 py-2 text-sm rounded-organic-md',
        lg: 'h-12 px-6 text-base rounded-organic-lg',
        xl: 'h-14 px-8 text-lg rounded-organic-xl',
        icon: 'h-10 w-10 p-2 rounded-organic-md',
      },
      
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

// Enhanced button props with motion support
export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'size'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : motion.button;
    
    const isDisabled = disabled || loading;
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        // Motion animations
        whileHover={{ scale: isDisabled ? 1 : 1.02 }}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 17,
        }}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <motion.div
            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        
        {/* Left icon */}
        {leftIcon && !loading && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* Button content */}
        <span className="flex items-center justify-center">
          {children}
        </span>
        
        {/* Right icon */}
        {rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
        
        {/* Hover effect overlay */}
        <motion.div
          className="absolute inset-0 rounded-inherit bg-white opacity-0 mix-blend-overlay"
          initial={false}
          whileHover={{ opacity: 0.1 }}
          transition={{ duration: 0.2 }}
        />
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };