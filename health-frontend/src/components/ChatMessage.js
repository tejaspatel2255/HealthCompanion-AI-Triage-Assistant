import React from 'react';
import SeverityBadge from './SeverityBadge';

const ChatMessage = ({ message }) => {
  const isUser = message.sender === 'user';
  const showSeverity = 
    !isUser && 
    message.severity && 
    message.severity.toLowerCase() !== 'clarifying' && 
    message.severity.toLowerCase() !== 'error';
  
  return (
    <div className={`flex w-full my-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none'
            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-tl-none'
        }`}
      >
        {/* Main Reply Text */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        
        {/* Potential Causes (only for Assistant) */}
        {!isUser && message.possible_causes && message.possible_causes.length > 0 && (
          <div className="mt-3 text-xs bg-gray-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-gray-150 dark:border-slate-800/80">
            <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1">Potential Causes:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-gray-700 dark:text-gray-300">
              {message.possible_causes.map((cause, idx) => (
                <li key={idx}>{cause}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags to Monitor (only for Assistant) */}
        {!isUser && message.red_flags && message.red_flags.length > 0 && (
          <div className="mt-3 text-xs bg-red-50/50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
            <p className="font-semibold text-red-600 dark:text-red-400 mb-1">Red Flags to Watch For:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-red-700 dark:text-red-300">
              {message.red_flags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Action (only for Assistant) */}
        {!isUser && message.recommended_action && (
          <p className="mt-2.5 text-xs italic text-gray-500 dark:text-gray-400">
            Recommended Action: {message.recommended_action}
          </p>
        )}

        {/* Severity Badge */}
        {showSeverity && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700 flex justify-start">
            <SeverityBadge severity={message.severity} icon={message.icon} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
