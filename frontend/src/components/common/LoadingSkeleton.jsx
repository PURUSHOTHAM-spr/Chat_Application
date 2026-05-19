import { useMemo } from "react";

/**
 * Loading skeleton components for chat list and messages.
 */

export const ChatListSkeleton = () => (
  <div className="space-y-1 p-2">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
        <div className="w-12 h-12 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 skeleton rounded" />
          <div className="h-3 w-48 skeleton rounded" />
        </div>
        <div className="h-3 w-10 skeleton rounded" />
      </div>
    ))}
  </div>
);

export const MessageSkeleton = () => {
  const skeletons = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      width: `${20 + (i % 4) * 10}%`,
      height: `${40 + (i % 3) * 10}px`,
    }));
  }, []);

  return (
    <div className="space-y-4 p-4">
      {skeletons.map((sk, i) => (
        <div
          key={sk.id}
          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`skeleton rounded-2xl ${
              i % 2 === 0 ? "rounded-tl-none" : "rounded-tr-none"
            }`}
            style={{
              width: sk.width,
              height: sk.height,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export const ProfileSkeleton = () => (
  <div className="flex flex-col items-center gap-4 p-6 animate-pulse">
    <div className="w-32 h-32 rounded-full skeleton" />
    <div className="h-6 w-40 skeleton rounded" />
    <div className="h-4 w-56 skeleton rounded" />
  </div>
);
