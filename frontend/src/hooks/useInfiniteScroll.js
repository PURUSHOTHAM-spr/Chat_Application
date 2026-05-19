import { useCallback, useRef } from "react";

/**
 * Custom hook for infinite scroll — triggers loading more messages
 * when the user scrolls to the top of the message list.
 */
const useInfiniteScroll = (onLoadMore, hasMore, isLoading) => {
  const observer = useRef(null);

  const topRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            onLoadMore();
          }
        },
        { threshold: 0.1 }
      );

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore, onLoadMore]
  );

  return topRef;
};

export default useInfiniteScroll;
