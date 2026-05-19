import { getAvatarUrl } from "../../lib/utils";

/**
 * Reusable Avatar component with online indicator.
 */
const Avatar = ({ src, name, size = "md", isOnline = false, className = "" }) => {
  const sizes = {
    xs: "w-8 h-8",
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
    "2xl": "w-32 h-32",
  };

  const dotSizes = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
    xl: "w-4 h-4",
    "2xl": "w-5 h-5",
  };

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <img
        src={getAvatarUrl(src, name)}
        alt={name || "Avatar"}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white dark:ring-dark-3`}
        onError={(e) => {
          e.target.src = getAvatarUrl("", name);
        }}
      />
      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-500 rounded-full ring-2 ring-white dark:ring-dark-2`}
        />
      )}
    </div>
  );
};

export default Avatar;
