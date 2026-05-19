/**
 * Badge component for unread counts and notification indicators.
 */
const Badge = ({ count, className = "" }) => {
  if (!count || count <= 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-whatsapp-500 rounded-full ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};

export default Badge;
