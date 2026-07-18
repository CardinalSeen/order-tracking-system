export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-[3px] border-slate-200" />
        <div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-t-blue-600 animate-spin" />
      </div>
      <p className="text-[12px] text-slate-400 font-medium">Loading data...</p>
    </div>
  );
}
