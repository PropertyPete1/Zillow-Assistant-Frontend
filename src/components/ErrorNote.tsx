export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-3 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
      {message}
    </div>
  );
}


