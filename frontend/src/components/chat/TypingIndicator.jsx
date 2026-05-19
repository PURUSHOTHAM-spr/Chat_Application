/**
 * Typing indicator — shows animated dots when someone is typing.
 */
const TypingIndicator = () => {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-white dark:bg-dark-3 rounded-xl rounded-tl-none px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
