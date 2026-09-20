import { Skeleton } from "@/components/ui/primitives";

/** Route-transition skeleton: keeps the frame, streams the data. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-48" />
    </div>
  );
}
