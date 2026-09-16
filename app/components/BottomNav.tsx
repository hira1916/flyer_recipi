interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  shoppingListCount?: number;
}

export default function BottomNav({
  activeTab,
  setActiveTab,
  shoppingListCount = 0,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center z-50 max-w-md mx-auto">
      {/* チラシ要約タブ */}
      <button
        onClick={() => setActiveTab("scan")}
        className={`flex flex-col items-center gap-1 ${
          activeTab === "scan" ? "text-emerald-600 font-bold" : "text-slate-400"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
        </svg>
        <span className="text-[10px]">チラシ要約</span>
      </button>

      {/* 献立提案タブ */}
      <button
        onClick={() => setActiveTab("menu")}
        className={`flex flex-col items-center gap-1 ${
          activeTab === "menu" ? "text-emerald-600 font-bold" : "text-slate-400"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span className="text-[10px]">献立提案</span>
      </button>

      {/* 買い物リストタブ */}
      <button
        onClick={() => setActiveTab("shopping")}
        className={`flex flex-col items-center gap-1 relative ${
          activeTab === "shopping"
            ? "text-emerald-600 font-bold"
            : "text-slate-400"
        }`}
      >
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
            />
          </svg>
          {shoppingListCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
              {shoppingListCount}
            </span>
          )}
        </div>
        <span className="text-[10px]">買い物リスト</span>
      </button>
    </nav>
  );
}