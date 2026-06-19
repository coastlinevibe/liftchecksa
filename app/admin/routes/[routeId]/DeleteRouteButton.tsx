"use client";

type DeleteRouteButtonProps = {
  action: () => Promise<void>;
};

export default function DeleteRouteButton({ action }: DeleteRouteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          'Delete this route? This will remove the route, its stops, assignments, requests, and related ledger entries.'
        );
        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
      >
        Delete Route
      </button>
    </form>
  );
}

