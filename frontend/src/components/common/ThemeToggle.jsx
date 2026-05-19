import { IoSunny, IoMoon } from "react-icons/io5";
import useThemeStore from "../../store/useThemeStore";

/**
 * Theme toggle button — switches between dark and light mode.
 */
const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-4 transition-all duration-300 ${className}`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <IoMoon className="w-5 h-5 text-gray-600 transition-transform duration-300 hover:rotate-12" />
      ) : (
        <IoSunny className="w-5 h-5 text-yellow-400 transition-transform duration-300 hover:rotate-45" />
      )}
    </button>
  );
};

export default ThemeToggle;
