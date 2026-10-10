/** Shown only for content that wasn't prerendered (e.g. an event published since the last build). */
export function PageLoading() {
  return (
    <div role="status" className="container-page grid min-h-[70svh] place-items-center pt-20">
      <span className="sr-only">Loading</span>
      <span aria-hidden="true" className="size-3 animate-ping rounded-full bg-lantern" />
    </div>
  );
}
