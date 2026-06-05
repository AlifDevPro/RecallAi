import type { QueryClient } from "@tanstack/react-query";

export function invalidateTopicMutations(queryClient: QueryClient, slug?: string) {
  void queryClient.invalidateQueries({ queryKey: ["topics"] });
  if (slug) {
    void queryClient.invalidateQueries({ queryKey: ["topic", slug] });
  }
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["review-stats"] });
  void queryClient.invalidateQueries({ queryKey: ["schedule-summary"] });
}

export function invalidateReview(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  void queryClient.invalidateQueries({ queryKey: ["review-stats"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function invalidateMock(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["mock-attempts"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}
