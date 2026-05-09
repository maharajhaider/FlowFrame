import React from 'react';
import { FolderOpen, X } from 'lucide-react';

const ContextDrawerToggle = ({ isOpen, onToggle }) => {
  return (
        <div className="absolute right-6 top-22 z-30">
      <button
        onClick={onToggle}
        className={`
          px-6 py-3 rounded-lg shadow-xl transition-all duration-300
          ${isOpen 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
          hover:scale-105 transform font-medium
        `}
        title={isOpen ? 'Close Knowledge Base' : 'Open Knowledge Base'}
      >
        {isOpen ? (
          <div className="flex items-center space-x-2">
            <X className="w-5 h-5" />
            <span>Close</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5" />
            <span>Knowledge Base</span>
          </div>
        )}
      </button>
    </div>
  );
};

export default ContextDrawerToggle; 