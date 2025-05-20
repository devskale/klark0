import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditableTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  as?: 'input' | 'textarea';
  placeholder?: string;
  inputClassName?: string;
  spanClassName?: string;
  containerClassName?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  label,
  value,
  onChange,
  as = 'input',
  placeholder,
  inputClassName,
  spanClassName,
  containerClassName,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    if (isEditing) {
      if (as === 'textarea' && textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(inputValue.length, inputValue.length);
      } else if (as === 'input' && inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isEditing, as, inputValue]); // inputValue dependency to correctly set cursor on content change

  const handleSpanClick = () => {
    setInputValue(value); 
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (inputValue !== value) {
      onChange(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (as === 'input' || (as === 'textarea' && !e.shiftKey))) {
      e.preventDefault(); 
      if (as === 'input' && inputRef.current) inputRef.current.blur();
      if (as === 'textarea' && textAreaRef.current) textAreaRef.current.blur();
    } else if (e.key === 'Escape') {
      setInputValue(value); 
      setIsEditing(false);
    }
  };

  const commonInputProps = {
    value: inputValue,
    onChange: handleChange,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    placeholder: placeholder,
    className: `text-base h-9 ${inputClassName || ''}`, // Adjusted height for input
  };

  return (
    <div className={`flex items-start ${containerClassName || ''}`}> {/* Removed py-1 */}
      {label && <strong className="mr-2 py-1.5 whitespace-nowrap shrink-0">{label}</strong>} {/* Changed py-2 to py-1.5 */}
      {isEditing ? (
        as === 'textarea' ? (
          <Textarea
            ref={textAreaRef}
            {...commonInputProps}
            rows={3}
            className={`w-full ${commonInputProps.className}`} // Ensure textarea also respects height if possible or use min-h
          />
        ) : (
          <Input
            ref={inputRef}
            {...commonInputProps}
            className={`w-full ${commonInputProps.className}`}
          />
        )
      ) : (
        <span
          onClick={handleSpanClick}
          className={`py-1.5 px-3 min-h-[36px] w-full cursor-text hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-md flex items-center ${spanClassName || ''}`} // Changed py-2 to py-1.5, min-h-10 to min-h-[36px]
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSpanClick(); } }}
        >
          {value || <span className="italic text-muted-foreground">{placeholder || "Kein Wert"}</span>}
        </span>
      )}
    </div>
  );
};
