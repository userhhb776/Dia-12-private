import { Heart } from "lucide-react";
import { ThemeType } from "../types";

interface ThemeSelectorProps {
  selectedTheme: string;
  onChange: (theme: ThemeType) => void;
}

export default function ThemeSelector({ selectedTheme, onChange }: ThemeSelectorProps) {
  const options = [
    {
      id: "pastel" as ThemeType,
      name: "Pastel Romântico",
      desc: "Tons de rosa-bebê, flores, carinho floral e elegância leve.",
      colors: ["bg-rose-100", "bg-pink-200", "bg-rose-50"],
    },
    {
      id: "starry" as ThemeType,
      name: "Céu Estrelado",
      desc: "Celestial, mistério cósmico profundo com detalhes dourados.",
      colors: ["bg-slate-900", "bg-purple-900", "bg-amber-100"],
    },
    {
      id: "bubblegum" as ThemeType,
      name: "Doce Algodão",
      desc: "Divertido, cores vibrantes de chiclete, carinho animado.",
      colors: ["bg-pink-400", "bg-purple-300", "bg-yellow-100"],
    },
    {
      id: "polaroid" as ThemeType,
      name: "Polaroid Vintage",
      desc: "Papel artesanal, sépia suave, caligrafia calorosa e retrô.",
      colors: ["bg-amber-50", "bg-amber-100/50", "bg-warm-gray-200"],
    },
  ];

  return (
    <div className="w-full my-4">
      <label className="block text-sm font-bold text-slate-700 mb-3">
        Escolha o Estilo do Site da Carta ❤️
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((theme) => {
          const isSelected = selectedTheme === theme.id;
          return (
            <div
              key={theme.id}
              onClick={() => onChange(theme.id)}
              className={`flex flex-col p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-rose-500 bg-rose-50/40 shadow-md ring-2 ring-rose-100"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-xs"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1.5 p-1 rounded-lg bg-slate-50 border border-slate-100">
                  {theme.colors.map((c, i) => (
                    <span key={i} className={`w-3.5 h-3.5 rounded-full ${c} inline-block border border-slate-200`}></span>
                  ))}
                </div>
                <span className="font-bold text-sm text-slate-800">
                  {theme.name}
                </span>
                {isSelected && <Heart className="w-4 h-4 text-rose-500 fill-current ml-auto animate-pulse" />}
              </div>
              <p className="text-xs text-slate-500 leading-normal mb-1">
                {theme.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
