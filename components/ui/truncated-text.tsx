import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * TruncatedText component that displays text with truncation and tooltip on hover
 * @param text - The full text to display
 * @param maxLines - Maximum number of lines before truncation (default: 2)
 * @param className - Additional CSS classes
 */
interface TruncatedTextProps {
  text: string;
  maxLines?: number;
  className?: string;
}

export function TruncatedText({ text, maxLines = 2, className = "" }: TruncatedTextProps) {
  // Check if text is longer than a reasonable threshold to show tooltip
  const shouldTruncate = text.length > 50;
  
  // For table cells, use simple ellipsis truncation
  const isTableCell = className.includes('table-cell') || maxLines === 1;
  
  if (isTableCell) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span 
              className={`cursor-help block overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
              title={text}
            >
              {text}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-md p-3">
            <div className="whitespace-pre-wrap text-sm">{text}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  const truncatedStyle = {
    display: '-webkit-box',
    WebkitLineClamp: maxLines,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.4em',
    maxHeight: `${maxLines * 1.4}em`,
  };

  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={`cursor-help ${className}`}
            style={truncatedStyle}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-md p-3">
          <div className="whitespace-pre-wrap text-sm">{text}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Utility function to generate hierarchical numbering
 * @param indices - Array of indices for nested numbering (e.g., [1, 2, 3] -> "1.2.3.")
 */
export function generateNumbering(indices: number[]): string {
  return indices.map(i => i + 1).join('.') + '.';
}