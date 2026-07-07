import React from 'react';
import SeverityBadge from './SeverityBadge';

const ChatMessage = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex w-full my-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none'
            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-tl-none'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        
        {!isUser && message.severity && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700 flex justify-start">
            <SeverityBadge severity={message.severity} icon={message.icon} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
