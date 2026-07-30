import { InstallPrompt } from "@/components/InstallPrompt";

export function TopAppBar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant flex items-center justify-between px-4 h-11">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
        <h1 className="text-[16px] font-semibold text-primary tracking-tight">Trading Suggestions</h1>
      </div>
      <InstallPrompt />
    </header>
  );
}
