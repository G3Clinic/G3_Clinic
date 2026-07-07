import React, { type InputHTMLAttributes, forwardRef, useState } from 'react';
import { type LucideIcon, Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon: Icon, error, className, type, ...props }, ref) => {
    
    const [showPassword, setShowPassword] = useState(false);
    
    const isPasswordType = type === 'password';
    
    const currentType = isPasswordType && showPassword ? 'text' : type;

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-semibold text-ui-text ml-1">
            {label}
          </label>
        )}
        
        <div className="relative group">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ui-muted group-focus-within:text-brand-red transition-colors">
              <Icon size={20} />
            </div>
          )}
          
          <input
            ref={ref}
            type={currentType}
            className={`
              w-full py-3.5 bg-gray-50 border border-gray-200 rounded-xl 
              text-ui-text placeholder:text-gray-400
              focus:bg-white focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red 
              outline-none transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
              ${Icon ? 'pl-11' : 'pl-4'} 
              ${isPasswordType ? 'pr-12' : 'pr-4'} 
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
              ${className}
            `}
            {...props}
          />

          {isPasswordType && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-ui-muted hover:text-brand-red transition-colors cursor-pointer outline-none"
              tabIndex={-1} 
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>
        
        {error && (
          <span className="text-xs text-red-500 ml-1 font-medium">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";