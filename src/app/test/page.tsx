"use client";

export default function TestPage() {
  const items = [
    "Dashboard", "Bot Builder", "DTrader", "Smart Trading", "Auto", 
    "Analysis Tool", "Signals", "Portfolio", "Free Bots", "Enhanced Trading", "Settings"
  ];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Mobile Navigation Test</h1>
      
      {/* Test mobile navigation */}
      <div className="w-full overflow-hidden relative border border-gray-300 rounded-lg p-2">
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
        <div 
          className="flex gap-2 overflow-x-scroll pb-2 pr-4"
          style={{ 
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            touchAction: "pan-x",
            overscrollBehaviorX: "contain"
          }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              className="px-3 py-2 bg-blue-500 text-white rounded-md text-xs whitespace-nowrap flex-shrink-0 min-w-max"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      
      <p className="mt-4 text-sm text-gray-600">
        Try scrolling horizontally on the navigation above. On mobile, swipe left/right.
      </p>
    </div>
  );
}
