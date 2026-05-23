import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  options,
  onChange,
  style,
  buttonStyle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionClick = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div 
      className="custom-dropdown-container" 
      ref={containerRef}
      style={style}
    >
      <button
        type="button"
        className="custom-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyle}
      >
        <span>{selectedOption ? selectedOption.label : ''}</span>
        <span className={`custom-dropdown-arrow ${isOpen ? 'open' : ''}`}>
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-dropdown-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => handleOptionClick(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
