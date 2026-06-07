import { motion } from "motion/react";
import { Camera, Heart, Sparkles, Star } from "lucide-react";

interface PolaroidGalleryProps {
  photos?: string[];
  senderName: string;
  receiverName: string;
}

export default function PolaroidGallery({ photos, senderName, receiverName }: PolaroidGalleryProps) {
  const hasPhotos = photos && photos.length > 0;

  // Romantic handwritten captions for default polaroids if user uploaded nothing
  const defaultCaptions = [
    "O abraço que acalma meu coração... ❤️",
    "Cada sorriso seu é minha poesia preferida ✨",
    "Nossa história escrita nas estrelas 💫"
  ];

  // Placeholder images: visual representations using warm romantic SVG doodles
  const renderPlaceholder = (index: number) => {
    const icons = [
      <Heart key="heart" className="w-16 h-16 text-rose-400 animate-pulse" />,
      <Sparkles key="spark" className="w-16 h-16 text-pink-400 animate-bounce" />,
      <Star key="star" className="w-16 h-16 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
    ];
    return (
      <div className="w-full h-full bg-linear-to-tr from-pink-50 to-rose-100 flex flex-col items-center justify-center border border-pink-100 relative overflow-hidden group-hover:from-rose-100 group-hover:to-pink-200 transition-colors duration-500">
        <div className="absolute inset-x-0 top-0 text-[10px] text-rose-300 tracking-widest font-mono uppercase text-center mt-3">
          Momento Especial #{index + 1}
        </div>
        {icons[index % icons.length]}
        <div className="absolute bottom-3 text-xs font-serif text-rose-500/80">
          {senderName} & {receiverName}
        </div>
      </div>
    );
  };

  const displayList = hasPhotos 
    ? photos!.slice(0, 3) 
    : [null, null, null]; // length of 3

  // Distinct rotation tilts for polaroids (gentler tilt for smoother sliding rows)
  const rotations = ["-rotate-2 hover:rotate-0", "rotate-1 hover:rotate-0", "-rotate-1 hover:rotate-2"];

  return (
    <div className="w-full my-8">
      <div className="flex flex-col items-center mb-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-rose-600 text-xs font-semibold uppercase tracking-widest mb-1">
          <Camera className="w-3.5 h-3.5" />
          Nossa Galeria de Amor 💖
        </div>
        <p className="text-xs text-slate-500 text-center font-serif italic no-print animate-pulse">
          Arraste para os lados para ver todas as fotos ➔
        </p>
      </div>

      {/* Styled draggable & horizontal scrolling gallery track */}
      <div 
        className="w-full overflow-x-auto flex flex-row gap-6 py-4 px-4 select-none scroll-smooth snap-x snap-mandatory scrollbar-none no-print" 
        style={{ webkitOverflowScrolling: "touch" }}
      >
        <div className="w-2 shrink-0 sm:hidden" />
        {displayList.map((photo, index) => {
          const rotationClass = rotations[index % rotations.length];
          const caption = defaultCaptions[index % defaultCaptions.length];

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ 
                scale: 1.03, 
                zIndex: 10,
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.12)"
              }}
              transition={{ type: "spring", stiffness: 120, delay: index * 0.1 }}
              className={`w-64 shrink-0 snap-center bg-white p-4 pb-8 shadow-md border border-slate-150 rounded-xs flex flex-col items-center transform transition-all duration-300 ${rotationClass} group`}
            >
              {/* Photo Area */}
              <div className="w-full aspect-square overflow-hidden bg-slate-50 mb-4 border border-slate-200 shadow-inner rounded-xs relative">
                {photo ? (
                  <img
                    src={photo}
                    alt={`Momento do casal ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  renderPlaceholder(index)
                )}
              </div>

              {/* Polaroid Caption */}
              <p className="text-center font-serif text-sm text-slate-700 font-semibold px-2 border-t border-slate-100 pt-3 leading-snug w-full whitespace-normal break-words" style={{ fontFamily: 'Georgia, serif' }}>
                {caption}
              </p>
            </motion.div>
          );
        })}
        <div className="w-2 shrink-0 sm:hidden" />
      </div>

      {/* Special print view list of photos (horizontal alignment, ink-friendly styling) */}
      <div className="hidden print:flex flex-row gap-6 justify-center items-center my-6">
        {displayList.map((photo, index) => {
          const caption = defaultCaptions[index % defaultCaptions.length];
          return (
            <div key={index} className="w-44 bg-white p-3 pb-6 border border-stone-300 rounded-xs flex flex-col items-center break-inside-avoid shadow-none">
              <div className="w-full aspect-square overflow-hidden bg-stone-100 border border-stone-200 rounded-xs mb-3">
                {photo ? (
                  <img src={photo} alt="" className="w-full h-[120px] object-cover" />
                ) : (
                  <div className="w-full h-[120px] bg-stone-50 flex items-center justify-center text-stone-300">❤️</div>
                )}
              </div>
              <p className="text-center text-[10pt] font-serif text-stone-700 font-semibold">{caption}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
