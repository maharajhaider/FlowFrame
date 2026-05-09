import React from 'react';

const PasswordStrength = ({ password }) => {
  const calculateStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    const feedback = [];

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include lowercase letters');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include uppercase letters');
    }

    // Numbers check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include numbers');
    }

    // Special characters check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include special characters');
    }

    // Determine strength level
    let label, color;
    if (score <= 1) {
      label = 'Very Weak';
      color = 'bg-red-500';
    } else if (score === 2) {
      label = 'Weak';
      color = 'bg-orange-500';
    } else if (score === 3) {
      label = 'Fair';
      color = 'bg-yellow-500';
    } else if (score === 4) {
      label = 'Good';
      color = 'bg-blue-500';
    } else {
      label = 'Strong';
      color = 'bg-green-500';
    }

    return { score, label, color, feedback };
  };

  const strength = calculateStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          strength.score <= 1 ? 'text-red-600' :
          strength.score === 2 ? 'text-orange-600' :
          strength.score === 3 ? 'text-yellow-600' :
          strength.score === 4 ? 'text-blue-600' :
          'text-green-600'
        }`}>
          {strength.label}
        </span>
      </div>
      
      {strength.feedback.length > 0 && (
        <div className="text-xs text-gray-600">
          <p className="font-medium mb-1">To improve your password:</p>
          <ul className="space-y-0.5">
            {strength.feedback.slice(0, 3).map((item, index) => (
              <li key={index} className="flex items-center gap-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PasswordStrength; 