export function AILoadingState({ stage = "Generating response..." }: { stage?: string }) {
  return (
    <div className="w-full bg-black/40 backdrop-blur-md border border-blue-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-500/5 pulse-bg"></div>
      <div className="flex flex-col items-center justify-center space-y-4 relative z-10">
        <div className="relative flex h-6 w-6">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50"></span>
          <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
        </div>
        <div className="text-center">
          <h4 className="text-sm font-semibold text-blue-400">AI Processing</h4>
          <p className="text-xs text-blue-300/80 mt-1">{stage}</p>
        </div>
      </div>
    </div>
  );
}
