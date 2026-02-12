"use client";

interface AdaptationSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function AdaptationSlider({ value, onChange }: AdaptationSliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const percentage = ((value - 1) / 9) * 100;

  return (
    <div className="w-full px-4">
      <div className="relative w-full">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={handleChange}
          className="slider-input w-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #7DD3FC 0%, #BAE6FD ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`,
            borderRadius: "9999px",
            outline: "none",
            height: "10px",
          }}
        />
        <style jsx global>{`
          .slider-input::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            background: #FFF8E1;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
            margin-top: -5px;
            position: relative;
          }
          .slider-input::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: #FFF8E1;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
          }
          .slider-input::-webkit-slider-runnable-track {
            height: 6px;
            border-radius: 9999px;
          }
          .slider-input::-moz-range-track {
            height: 6px;
            border-radius: 9999px;
            background: transparent;
          }
        `}</style>
      </div>
      <div className="flex justify-between mt-2 px-1">
        <span className="text-xs text-black font-normal">1</span>
        <span className="text-xs text-black font-normal">10</span>
      </div>
    </div>
  );
}
