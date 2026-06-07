import { useState, useEffect, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Sparkles,
  Utensils,
  Film,
  Coffee,
  Music,
  MapPin,
  Moon,
  Gift,
  Ticket,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  Share2,
  Eye,
  BookOpen,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkle,
  Camera,
  Settings,
  X,
  Save,
  Plus,
  Palette,
  Pencil,
  Printer
} from "lucide-react";
import Countdown from "./components/Countdown";
import PolaroidGallery from "./components/PolaroidGallery";
import MusicPlayer from "./components/MusicPlayer";
import ConfettiHearts from "./components/ConfettiHearts";
import FallingHearts from "./components/FallingHearts";
import ThemeSelector from "./components/ThemeSelector";
import { LoveLetter, LoveCoupon, ThemeType } from "./types";
import { saveLoveLetter, fetchLoveLetter } from "./lib/firebase";

// Dynamic map of coupon icons safely using Lucide React
const iconMap: Record<string, any> = {
  Heart,
  Sparkles,
  Utensils,
  Film,
  Coffee,
  Music,
  MapPin,
  Moon,
  Gift,
  Ticket
};

export default function App() {
  // Simple custom hook routing based on window pathnames
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [letterId, setLetterId] = useState<string | null>(null);

  useEffect(() => {
    // Sync with router paths
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);

    // Extract letterId from deep links e.g. /letter/love_abc123 or query parameters fallback
    const pathParts = window.location.pathname.split("/");
    if (pathParts[1] === "letter" && pathParts[2]) {
      setLetterId(pathParts[2]);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const queryId = urlParams.get("letter");
      if (queryId) {
        setLetterId(queryId);
      }
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentPath]);

  // Navigate utility helper
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    // Parse parts for immediate updates
    const pathParts = path.split("/");
    if (pathParts[1] === "letter" && pathParts[2]) {
      setLetterId(pathParts[2]);
    } else {
      setLetterId(null);
    }
  };

  if (letterId) {
    return <PartnerLetterView id={letterId} onBackToCreate={() => navigate("/")} />;
  }

  return <CreateLetterView onNavigate={navigate} />;
}

// ----------------------------------------------------------------------
// SCREEN A: CREATOR VIEW (Form wizard + AI generator & QR Share)
// ----------------------------------------------------------------------
function CreateLetterView({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [activeStep, setActiveStep] = useState(1);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Form states
  const [senderName, setSenderName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [theme, setTheme] = useState<ThemeType>("pastel");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [relationshipHighlights, setRelationshipHighlights] = useState("");
  
  // Music states
  const [songName, setSongName] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songLink, setSongLink] = useState("");

  // Photo states (Compressed Base64 list)
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // Generated AI Results
  const [enhancedMessage, setEnhancedMessage] = useState("");
  const [cutePuns, setCutePuns] = useState<string[]>([]);
  const [loveCoupons, setLoveCoupons] = useState<LoveCoupon[]>([]);

  // Section toggle states for the design configurator step
  const [showCountdown, setShowCountdown] = useState(true);
  const [showMusicToggle, setShowMusicToggle] = useState(true);
  const [showPhotosToggle, setShowPhotosToggle] = useState(true);
  const [showPunsToggle, setShowPunsToggle] = useState(true);

  // Synchronize design configurator toggles automatically upon reaching Step 5
  useEffect(() => {
    if (activeStep === 5) {
      setShowCountdown(!!anniversaryDate);
      setShowMusicToggle(!!songName);
      setShowPhotosToggle(uploadedPhotos.length > 0);
      setShowPunsToggle(cutePuns.length > 0);
    }
  }, [activeStep, anniversaryDate, songName, uploadedPhotos.length, cutePuns.length]);



  // Canvas-based real-time compression for couples' memories (fitting 1MB DB document limit)
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files).slice(0, 3 - uploadedPhotos.length) as File[];
    fileArray.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200; // increased dimension for higher resolution & crisp quality

          if (width > height) {
            if (width > maxDimension) {
              height *= maxDimension / width;
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width *= maxDimension / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
          }
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to clean high-quality jpeg
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          setUploadedPhotos((prev) => [...prev, compressedBase64]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Enhance using server-side Gemini 3.5 API
  const handleEnhanceMessage = async () => {
    if (!senderName || !receiverName) {
      alert("Escreva o seu nome e o nome do seu amor primeiro para podermos focar a carta!");
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName,
          receiverName,
          anniversaryDate,
          draftMessage,
          coupleMusic: { name: songName, artist: songArtist, link: songLink },
          relationshipHighlights
        })
      });

      if (!response.ok) throw new Error("Falha ao aprimorar mensagem");
      const data = await response.json();

      if (draftMessage.trim()) {
        setEnhancedMessage(draftMessage);
      } else {
        setEnhancedMessage(data.enhancedMessage || "");
      }
      setCutePuns(data.cutePuns || []);
      setLoveCoupons(data.loveCoupons || []);
      
      // Move to editor step showing generated AI options
      setActiveStep(5);
    } catch (e) {
      console.error(e);
      alert("Oops! Tivemos uma pequena oscilção ao enfeitar a sua carta. Vamos tentar novamente de um jeito carinhoso!");
    } finally {
      setIsEnhancing(false);
    }
  };

  // Submit and save the Custom Valentine Letter
  const handleSaveLetter = async () => {
    setIsSaving(true);
    try {
      const uniqueId = "love_" + Math.random().toString(36).substring(2, 11);
      const letterPayload: LoveLetter = {
        id: uniqueId,
        senderName,
        receiverName,
        originalMessage: draftMessage,
        enhancedMessage,
        musicName: showMusicToggle ? songName : "",
        musicArtist: showMusicToggle ? songArtist : "",
        musicLink: showMusicToggle ? songLink : "DISABLED",
        theme,
        anniversaryDate: showCountdown ? anniversaryDate : "DISABLED",
        photos: showPhotosToggle && uploadedPhotos.length > 0 ? uploadedPhotos : ["DISABLED"],
        loveCoupons,
        cutePuns: ["DISABLED"]
      };

      const savedId = await saveLoveLetter(letterPayload);

      setSaveSuccessId(savedId);
      setActiveStep(6);
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar o QR Code. Vamos tentar gravar novamente!");
    } finally {
      setIsSaving(false);
    }
  };

  // Copy share URL to clipboard
  const getShareableUrl = () => {
    if (!saveSuccessId) return "";
    return `${window.location.origin}/letter/${saveSuccessId}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getShareableUrl());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-linear-to-tr from-pink-50 via-rose-50 to-red-50 py-8 px-4 flex flex-col justify-between">
      {/* Small top header */}
      <header className="max-w-3xl mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100/60 border border-rose-200 rounded-full text-rose-600 text-xs font-semibold uppercase tracking-widest mb-2 animate-pulse">
          <Heart className="w-3.5 h-3.5 fill-current" />
          Dia dos Namorados especial
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight font-serif" style={{ fontFamily: 'Georgia, serif' }}>
          Faça o melhor presente aqui
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Crie um site interativo exclusivo para presentear seu parceiro com memórias, músicas, cupons e uma linda carta!
        </p>
      </header>

      {/* Main Container Card */}
      <main className="max-w-2xl mx-auto w-full bg-white rounded-3xl shadow-xl border border-rose-100 overflow-hidden flex-1 flex flex-col">
        {/* Step Indicator Headers */}
        {activeStep <= 5 && (
          <div className="bg-rose-50/50 border-b border-rose-100 p-4 shrink-0 flex items-center justify-between overflow-x-auto gap-2">
            {[
              { num: 1, label: "Sobre Nós" },
              { num: 2, label: "Lembranças" },
              { num: 3, label: "Nossa Trilha" },
              { num: 4, label: "Draft Carta" },
              { num: 5, label: "Laço Final" }
            ].map((step) => (
              <button
                key={step.num}
                onClick={() => {
                  if (step.num < activeStep || (step.num === 5 && enhancedMessage)) {
                    setActiveStep(step.num);
                  }
                }}
                disabled={step.num > activeStep && !enhancedMessage}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeStep === step.num
                    ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                    : step.num < activeStep
                    ? "text-rose-600 hover:bg-rose-100/50"
                    : "text-slate-300 cursor-not-allowed"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
                  {step.num}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: INITIAL METADATA */}
            {activeStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20 }}
                className="space-y-4"
                key="step1"
              >
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-500" />
                  Qual o nome do casal
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os nomes do casal e a data inicial para calcularmos cada segundo que passaram juntos
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Seu Nome (Remetente)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      placeholder="Ex: Lucas"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Nome do seu parceiro(a)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      placeholder="Ex: Clara"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    Início de Tudo (Namoro / Encontro)
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    value={anniversaryDate}
                    onChange={(e) => setAnniversaryDate(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Use a data em que se conheceram ou começaram a namorar.
                  </span>
                </div>

                <div className="pt-2 border-t border-rose-50">
                  <ThemeSelector selectedTheme={theme} onChange={(t) => setTheme(t)} />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => {
                      if (!senderName || !receiverName) {
                        alert("Por favor, informe os nomes do casal para continuar!");
                        return;
                      }
                      setActiveStep(2);
                    }}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    Próximo Passo
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: COUPLE'S MOMENTS PHOTOS UPLOADED */}
            {activeStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20 }}
                className="space-y-4"
                key="step2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-rose-500" />
                    Registros Secretos (Fotos)
                  </h3>
                  <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100/40">
                    {uploadedPhotos.length} / 3 Fotos
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Adicione até 3 imagens especiais suas e do seu parceiro que queira exibir na Polaroid da sua carta! As fotos são comprimidas localmente no seu navegador de forma segura.
                </p>

                {/* Photo Blocks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
                  {uploadedPhotos.map((photo, i) => (
                    <div key={i} className="relative aspect-square rounded-xl bg-slate-50 border border-slate-200 overflow-hidden group shadow-sm">
                      <img src={photo} className="w-full h-full object-cover" alt="Momento do casal" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full transition-all shadow-md focus:outline-hidden"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {uploadedPhotos.length < 3 && (
                    <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-rose-400 bg-linear-to-tr from-slate-50 to-white hover:bg-rose-50/10 cursor-pointer transition-all p-4 text-center group">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-500 transition-colors mb-2">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 group-hover:text-rose-600">
                        Clique para Subir
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        JPEG ou PNG permitidos
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>

                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-700 leading-snug">
                  <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Ficando sem fotos oficiais?</span> Não se preocupe! Se você não anexar imagens, nós geraremos ilustrações fofas de coração e afeto desenhadas sob medida na visualização final do parceiro!
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="px-5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold font-sans transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setActiveStep(3)}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    Prosseguir
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: COUPLE'S PLAYLIST TRACK */}
            {activeStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20 }}
                className="space-y-4"
                key="step3"
              >
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Music className="w-5 h-5 text-rose-500" />
                  A Nossa Música 🎵
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha o nome da canção, o artista e cole o link do YouTube ou Spotify para que o reprodutor interativo toque na sua carta! ✨
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Nome da Canção
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      placeholder="Ex: Yellow"
                      value={songName}
                      onChange={(e) => setSongName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Nome do Artista / Banda
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      placeholder="Ex: Coldplay"
                      value={songArtist}
                      onChange={(e) => setSongArtist(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Link da Música (YouTube ou Spotify)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      placeholder="Ex: https://open.spotify.com/track/... ou https://www.youtube.com/watch?v=..."
                      value={songLink}
                      onChange={(e) => setSongLink(e.target.value)}
                    />
                  </div>

                  <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/30 text-xs text-rose-600 font-sans italic flex items-center gap-2 mt-3 leading-relaxed">
                    <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Cole o link direto do Spotify ou do YouTube. Ele será transformado em um reprodutor de música interativo na carta final! 😍</span>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="px-5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold font-sans transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setActiveStep(4)}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    Prosseguir
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: LOVE DRAFT MESSAGE INFO FOR GEMINI TRANSCRIPTION */}
            {activeStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20 }}
                className="space-y-4"
                key="step4"
              >
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-rose-500" />
                  Diga o que você sente (Deixe-nos melhorar) 💌
                </h3>
                <p className="text-xs text-slate-500">
                  Escreva um rascunho rápido ou palavras soltas sobre o que você sente por eles e nos fale momentos fofos compartilhados. Nosso especialista em romance (Gemini AI) unirá tudo e formará a carta perfeita!
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Rascunho de Amor ou Sentimentos
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100 font-sans"
                      placeholder="Ex: Te amo demais, eu amo quando você ri das minhas piadas bobas, e no primeiro encontro você derrubou sorvete e eu achei fofo demais..."
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Destaques ou Momentos Engraçados / Marcantes do Casal
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      placeholder="Ex: Nossa primeira viagem à praia, finais de semana jogando Overcooked, noites de pizza."
                      value={relationshipHighlights}
                      onChange={(e) => setRelationshipHighlights(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Usamos esses pedaços para focar a inteligência emocional da IA.
                    </span>
                  </div>
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-rose-50">
                  <button
                    onClick={() => setActiveStep(3)}
                    disabled={isEnhancing}
                    className="px-5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold font-sans transition-all disabled:opacity-40"
                  >
                    Voltar
                  </button>

                  <button
                    onClick={handleEnhanceMessage}
                    disabled={isEnhancing}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-75 disabled:cursor-wait"
                  >
                    {isEnhancing ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                        Deixando bem fofinho...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Gerar e Enfeitar com IA ✨
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: EDIT / MODERATION OF RESULTS (ROMANTIC DESIGN CONFIGURATOR) */}
            {activeStep === 5 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: -20 }}
                className="space-y-6"
                key="step5"
              >
                <div className="flex items-center justify-between font-sans">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                    <Palette className="w-5 h-5 text-rose-500 animate-pulse" />
                    Visual & Formatação da Carta 🎨
                  </h3>
                  <button 
                    onClick={handleEnhanceMessage}
                    disabled={isEnhancing}
                    className="text-xs text-rose-500 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
                    Regerar Elementos IA
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-sans">
                  Defina o estilo visual da sua página interativa. O amor mora nos pequenos detalhes! Revise tudo com carinho antes de selar o envelope. ✨
                </p>

                {/* MODULE 1: VISUAL THEME SELECTOR */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 font-sans">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Estilo & Tema Visual da Página
                  </span>
                  <ThemeSelector selectedTheme={theme} onChange={(t) => setTheme(t)} />
                </div>

                {/* MODULE 2: RECIPIENT & SENDER NAMES COORD */}
                <div className="grid grid-cols-2 gap-4 font-sans">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">De (Seu Nome):</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-rose-200 bg-white"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Para (Seu Amor):</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-rose-200 bg-white"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                    />
                  </div>
                </div>

                {/* MODULE 3: THE HEART MESSAGE */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Carta de Amor (Seus sentimentos intocados)
                  </label>
                  <textarea
                    rows={8}
                    className="w-full p-4 rounded-2xl border border-rose-200 bg-rose-50/10 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-100 focus:border-rose-400 font-serif leading-relaxed text-slate-700 shadow-inner"
                    value={enhancedMessage}
                    onChange={(e) => setEnhancedMessage(e.target.value)}
                    placeholder="Escreva seus sentimentos especiais..."
                  />
                  <span className="text-[10px] text-slate-400 font-sans italic block">
                    Seus sentimentos estão verbatim (exatamente como você escreveu), sem qualquer alteração de IA. 💖
                  </span>
                </div>

                {/* MODULE 4: DYNAMIC COMPONENT TOGGLES WITH INTEGRATED INPUTS */}
                <div className="space-y-4 font-sans">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-rose-100 pb-1.5 pt-2">
                    Customizar Recursos Interativos do Site
                  </h4>

                  {/* A: COUNTDOWN SECTION TOGGLE */}
                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none font-semibold">
                      <input
                        type="checkbox"
                        checked={showCountdown}
                        onChange={(e) => setShowCountdown(e.target.checked)}
                        className="rounded text-rose-500 focus:ring-rose-250 w-4 h-4"
                      />
                      <Clock className="w-4 h-4 text-rose-500" />
                      <span>Exibir Contador de Tempo Juntos</span>
                    </label>
                    {showCountdown && (
                      <div className="pt-1.5 pl-6">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data de Início de Tudo:</label>
                        <input
                          type="date"
                          value={anniversaryDate}
                          onChange={(e) => setAnniversaryDate(e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-600 focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>

                  {/* B: SONG PLAYLIST SECTION TOGGLE */}
                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none font-semibold">
                      <input
                        type="checkbox"
                        checked={showMusicToggle}
                        onChange={(e) => setShowMusicToggle(e.target.checked)}
                        className="rounded text-rose-500 focus:ring-rose-250 w-4 h-4"
                      />
                      <Music className="w-4 h-4 text-rose-500" />
                      <span>Exibir Trilha Sonora Oficial</span>
                    </label>
                    {showMusicToggle && (
                      <div className="pt-1.5 pl-6 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome da Canção</label>
                            <input
                              type="text"
                              value={songName}
                              onChange={(e) => setSongName(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
                              placeholder="Ex: Yellow"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cantor / Banda</label>
                            <input
                              type="text"
                              value={songArtist}
                              onChange={(e) => setSongArtist(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
                              placeholder="Ex: Coldplay"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Link da Música</label>
                          <input
                            type="text"
                            value={songLink}
                            onChange={(e) => setSongLink(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium"
                            placeholder="Link do Spotify ou YouTube"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* C: PHOTO GALLERY SECTION TOGGLE */}
                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none font-semibold">
                        <input
                          type="checkbox"
                          checked={showPhotosToggle}
                          onChange={(e) => setShowPhotosToggle(e.target.checked)}
                          className="rounded text-rose-500 focus:ring-rose-250 w-4 h-4"
                        />
                        <Camera className="w-4 h-4 text-rose-500" />
                        <span>Exibir Galeria Polaroid de Fotos</span>
                      </label>
                      {showPhotosToggle && uploadedPhotos.length < 3 && (
                        <label className="inline-flex items-center gap-0.5 text-[10px] text-rose-500 font-bold hover:underline cursor-pointer">
                          <Plus className="w-3.5 h-3.5" /> Adicionar Foto
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                        </label>
                      )}
                    </div>
                    {showPhotosToggle && (
                      <div className="pt-1.5 pl-6">
                        <div className="grid grid-cols-3 gap-3">
                          {uploadedPhotos.map((photo, index) => (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-105 shadow-xs">
                              <img src={photo} alt={`Destaque ${index + 1}`} className="w-full h-full object-cover" />
                              <button
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          {uploadedPhotos.length === 0 && (
                            <div className="col-span-3 py-5 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                              <p className="text-[11px] text-slate-400 italic">Nenhuma foto adicionada. Nós exibiremos ilustrações com corações fofos no site! 💖</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* E: EDIT / MANAGE COUPONS */}
                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none font-semibold">
                        <Gift className="w-4 h-4 text-rose-500" />
                        <span>Cupons de Amor para Brincar</span>
                      </label>
                      {loveCoupons.length < 10 && (
                        <button
                          onClick={() => setLoveCoupons([
                            ...loveCoupons,
                            { title: "Cupom Carinhoso 🎫", description: "Válido para um abraço quentinho", icon: "Gift", isRedeemed: false }
                          ])}
                          className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Cadastrar Cupom
                        </button>
                      )}
                    </div>
                    <div className="pt-1.5 pl-6 space-y-4">
                      {loveCoupons.map((coupon, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl relative space-y-2 group shadow-2xs">
                          {/* Trash action */}
                          <button
                            onClick={() => setLoveCoupons(loveCoupons.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 p-1.5 bg-red-50 hover:bg-red-200 text-red-500 rounded-full transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase">Ícone</label>
                              <select
                                value={coupon.icon}
                                onChange={(e) => {
                                  const next = [...loveCoupons];
                                  next[idx] = { ...next[idx], icon: e.target.value };
                                  setLoveCoupons(next);
                                }}
                                className="w-full p-1 border border-slate-200 rounded-lg text-[10.5px] bg-white h-7.5 outline-hidden"
                              >
                                <option value="Heart">❤️ Coração</option>
                                <option value="Sparkles">✨ Brilhos</option>
                                <option value="Utensils">🍽️ Jantar</option>
                                <option value="Film">🎬 Cinema</option>
                                <option value="Coffee">☕ Café</option>
                                <option value="Music">🎵 Música</option>
                                <option value="MapPin">📍 Destino</option>
                                <option value="Gift">🎁 Presente</option>
                                <option value="Ticket">🎫 Cupom</option>
                              </select>
                            </div>
                            
                            <div className="col-span-8 pr-6">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase">Título do Vale</label>
                              <input
                                type="text"
                                value={coupon.title}
                                onChange={(e) => {
                                  const next = [...loveCoupons];
                                  next[idx] = { ...next[idx], title: e.target.value };
                                  setLoveCoupons(next);
                                }}
                                className="w-full px-2 py-1 border border-slate-250 rounded-lg text-xs h-7.5 font-bold text-slate-800"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase">Descrição/Regra do Vale</label>
                            <input
                              type="text"
                              value={coupon.description}
                              onChange={(e) => {
                                const next = [...loveCoupons];
                                next[idx] = { ...next[idx], description: e.target.value };
                                setLoveCoupons(next);
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs h-7.5 text-slate-600"
                            />
                          </div>
                        </div>
                      ))}
                      {loveCoupons.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">Nenhum cupom de amor criado. Toque em "Cadastrar Cupom" para adicionar!</p>
                      )}
                    </div>
                  </div>

                </div>

                <div className="pt-6 flex justify-between items-center border-t border-rose-50 font-sans">
                  <button
                    onClick={() => setActiveStep(4)}
                    className="px-5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold font-sans transition-all"
                  >
                    Voltar
                  </button>

                  <button
                    onClick={handleSaveLetter}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                  >
                    {isSaving ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                        Selando envelope...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        Salvar e Criar Link Romântico! 💌
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: SHARE & QR CODE RESULTS */}
            {activeStep === 6 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-4"
                key="step6"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center">
                  <Check className="w-8 h-8 animate-bounce" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Sua carta foi selada com amor! 💌
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-normal">
                    Agora, envie o QR Code ou link exclusivo abaixo para o seu namorado(a) pelo WhatsApp, cartão impresso ou e-mail. Quando eles lerem, verão o site super fofo!
                  </p>
                </div>

                {/* QR Code Card Wrapper */}
                <div className="max-w-xs mx-auto p-6 bg-gradient-to-b from-rose-50/50 to-pink-50/20 border border-rose-100 rounded-3xl shadow-md space-y-4">
                  {/* Public Server QR Code API */}
                  <div className="w-48 h-48 mx-auto bg-white p-2.5 rounded-2xl border border-rose-100/50 flex items-center justify-center relative overflow-hidden group shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getShareableUrl())}`}
                      alt="QR Code Love Letter"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="text-center font-mono text-[10px] bg-white border border-slate-100 rounded-full py-1.5 px-3 block text-slate-500 select-all cursor-pointer truncate">
                    {getShareableUrl()}
                  </div>

                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={copyToClipboard}
                      className="inline-flex items-center gap-1.5 py-2 px-4 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-full text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar Link
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onNavigate(`/letter/${saveSuccessId}`)}
                      className="inline-flex items-center gap-1.5 py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-full text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Site
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      // Reset to start new letter
                      setSenderName("");
                      setReceiverName("");
                      setAnniversaryDate("");
                      setDraftMessage("");
                      setSongName("");
                      setSongArtist("");
                      setSongLink("");
                      setUploadedPhotos([]);
                      setEnhancedMessage("");
                      setCutePuns([]);
                      setLoveCoupons([]);
                      setSaveSuccessId(null);
                      setActiveStep(1);
                    }}
                    className="text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Criar Outra Carta
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Footer credit */}
      <footer className="mt-8 text-center text-[10px] text-slate-400 font-mono">
        Amor Eterno &copy; {new Date().getFullYear()} &bull; Feito com todo o carinho do universo
      </footer>
    </div>
  );
}

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// SCREEN B: THE PARTNER SITE RECIPIENT VIEW
// ----------------------------------------------------------------------
interface PartnerLetterViewProps {
  id: string;
  onBackToCreate: () => void;
}

function PartnerLetterView({ id, onBackToCreate }: PartnerLetterViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [letter, setLetter] = useState<LoveLetter | null>(null);
  
  // Interactive Envelope opening state
  const [isOpened, setIsOpened] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [cups, setCups] = useState<LoveCoupon[]>([]);
  const [activeConfetti, setActiveConfetti] = useState(false);

  // Fetch the Unique Letter Information
  useEffect(() => {
    const fetchLetter = async () => {
      try {
        setLoading(true);
        const data = await fetchLoveLetter(id);
        setLetter(data);
        // Initialize Coupons with local states
        setCups(data.loveCoupons || []);
      } catch (err: any) {
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };
    fetchLetter();
  }, [id]);

  // Handle virtual coupon redeem
  const redeemCoupon = (index: number) => {
    if (cups[index].isRedeemed) return;
    
    const newCups = [...cups];
    newCups[index] = { ...newCups[index], isRedeemed: true };
    setCups(newCups);

    // Fire confetti boom
    setActiveConfetti(true);
    setTimeout(() => setActiveConfetti(false), 2000);
  };

  // Spectacular 1.8 second animated envelope sequence fofo
  const handleOpenEnvelope = () => {
    if (isOpening) return;
    setIsOpening(true);
    setTimeout(() => {
      setIsOpened(true);
    }, 1800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-tr from-pink-50 via-rose-100 to-amber-50 flex flex-col items-center justify-center text-center p-4">
        <Heart className="w-12 h-12 text-rose-500 animate-bounce fill-current" />
        <p className="text-sm font-serif italic text-rose-600 mt-4 animate-pulse">
          Desembrulhando segredo de amor... ❤️
        </p>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="min-h-screen bg-linear-to-tr from-pink-50 to-rose-100 flex flex-col items-center justify-center text-center p-4">
        <div className="max-w-md p-6 bg-white rounded-3xl shadow-lg border border-red-100 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-lg">Envelope Danificado : (</h3>
          <p className="text-xs text-slate-500">{error || "Não conseguimos localizar essa mensagem."}</p>
          <button
            onClick={onBackToCreate}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-full text-xs font-bold shadow-xs transition-all animate-bounce"
          >
            Criar Uma Nova Carta
          </button>
        </div>
      </div>
    );
  }

  // Set Theme config specs dynamically
  const getThemeClass = (t: string) => {
    switch (t) {
      case "starry":
        return {
          wrapper: "bg-linear-to-b from-slate-950 via-[#12002A] to-[#1E0140] min-h-screen text-slate-100 selection:bg-rose-500/30 selection:text-white pb-16 font-sans relative",
          introCard: "bg-linear-to-b from-purple-950/80 to-slate-900/90 hover:shadow-xl hover:shadow-indigo-500/10 border border-purple-800/40 text-amber-50 rounded-3xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-md",
          letterText: "font-serif text-amber-50/90 leading-relaxed text-sm sm:text-base border-amber-900/20 whitespace-pre-line select-text",
          punsCard: "bg-purple-950/40 border border-purple-800/30 rounded-2xl p-4",
          badge: "bg-amber-400/10 border border-amber-400/30 text-amber-300",
          footerCredits: "text-amber-200/50",
          accentText: "text-amber-300 font-serif font-bold"
        };
      case "bubblegum":
        return {
          wrapper: "bg-linear-to-tr from-pink-300 via-purple-300 to-yellow-100 min-h-screen text-slate-800 selection:bg-pink-500/30 pb-16 font-sans relative",
          introCard: "bg-white/90 hover:shadow-xl border-2 border-pink-200 text-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-md",
          letterText: "font-sans leading-relaxed text-sm sm:text-base text-slate-700 whitespace-pre-line select-text font-medium select-text",
          punsCard: "bg-yellow-50/60 border border-yellow-200 rounded-2xl p-4",
          badge: "bg-pink-100 border border-pink-200 text-pink-600",
          footerCredits: "text-pink-600/60",
          accentText: "text-pink-500 font-bold"
        };
      case "polaroid":
        return {
          wrapper: "bg-linear-to-tr from-[#FAF8F5] via-[#F4F1EA] to-[#EAE4D5] min-h-screen text-stone-900 selection:bg-slate-300/30 pb-16 font-serif relative",
          introCard: "bg-[#FFFFFF]/95 hover:shadow-lg border border-[#E0D8C5] shadow-xs text-stone-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden",
          letterText: "font-mono leading-relaxed text-xs sm:text-sm text-stone-700 whitespace-pre-line select-text",
          punsCard: "bg-[#F3EFE3] border border-[#DDD3BC] rounded-xl p-4",
          badge: "bg-stone-100 border border-stone-300 text-stone-700",
          footerCredits: "text-stone-500/60",
          accentText: "text-[#8E7958] font-bold"
        };
      case "pastel":
      default:
        return {
          wrapper: "bg-linear-to-tr from-pink-50 via-rose-100 to-amber-50 min-h-screen text-slate-800 selection:bg-rose-500/20 pb-16 font-sans relative",
          introCard: "bg-white/80 hover:shadow-xl border border-rose-100/50 shadow-xs text-slate-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden backdrop-blur-xs",
          letterText: "font-serif leading-relaxed text-sm sm:text-base text-slate-700 whitespace-pre-line select-text italic",
          punsCard: "bg-rose-50/50 border border-rose-100/50 rounded-2xl p-4",
          badge: "bg-rose-50 border border-rose-100 text-rose-600",
          footerCredits: "text-rose-500/60",
          accentText: "text-rose-500 font-serif font-bold"
        };
    }
  };

  const themeConfig = getThemeClass(letter.theme);

  return (
    <div className={`${themeConfig.wrapper} print-wrapper`}>
      {/* Confetti element activated on coupon redemption */}
      <ConfettiHearts active={activeConfetti} />
      {isOpened && <FallingHearts />}

      <AnimatePresence>
        {!isOpened ? (
          /* SECTION 1: INTERACTIVE ENVELOPE OPENER WITH 3D ANIMATION */
          <motion.div
            key="envelope"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 1.1,
              y: -30,
              filter: "blur(8px)",
              transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
            }}
            className="min-h-screen flex items-center justify-center p-4 font-sans overflow-hidden"
          >
            <motion.div 
              className="w-full max-w-md cursor-pointer envelope-container" 
              onClick={handleOpenEnvelope}
              animate={isOpening ? {
                scale: [1, 0.98, 1.02],
                y: 0,
                rotate: 0,
                filter: "drop-shadow(0 0 30px rgba(244,63,94,0.3))"
              } : {
                scale: [1, 1.03, 1],
                y: [0, -10, 0],
                rotate: [0, -2, 2, 0],
                filter: [
                  "drop-shadow(0 10px 25px rgba(244,63,94,0.15)) drop-shadow(0 0 10px rgba(244,63,94,0.1))",
                  "drop-shadow(0 15px 35px rgba(244,63,94,0.35)) drop-shadow(0 0 25px rgba(244,63,94,0.25))",
                  "drop-shadow(0 10px 25px rgba(244,63,94,0.15)) drop-shadow(0 0 10px rgba(244,63,94,0.1))"
                ]
              }}
              transition={isOpening ? {
                duration: 0.3
              } : {
                duration: 4.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              whileHover={{ 
                scale: 1.04,
                filter: "drop-shadow(0 20px 45px rgba(244,63,94,0.5)) drop-shadow(0 0 35px rgba(244,63,94,0.35))",
                transition: { duration: 0.3 }
              }}
            >
              <div className="relative w-full h-80 group select-none transition-all duration-300 rounded-2xl ring-2 ring-rose-500/10 hover:ring-rose-500/30">
                
                {/* 1. Envelope Base Shadow & Back Card */}
                <div className="absolute inset-0 bg-amber-50 bg-linear-to-br from-[#FCF8EE] to-[#E8DFCA] rounded-2xl border-2 border-[#D9CEB4] shadow-2xl overflow-hidden">
                  {/* Internal Retro dashed stamp border */}
                  <div className="absolute inset-2 border border-dashed border-[#B8985B]/30 rounded-xl pointer-events-none"></div>
                  
                  {/* Faded Background Stamp design inside envelope */}
                  <div className="absolute right-4 bottom-4 text-rose-500/5 select-none pointer-events-none">
                    <Heart className="w-24 h-24 stroke-current" />
                  </div>
                </div>

                {/* 2. Interactive sliding letter card inside fold */}
                <motion.div
                  initial={{ y: 15, scale: 0.98 }}
                  animate={isOpening ? { y: -160, scale: 1.05, zIndex: 30 } : { y: 15, scale: 0.98, zIndex: 10 }}
                  transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.5 }}
                  className="absolute inset-x-4 top-4 bg-white rounded-xl shadow-md p-6 border border-slate-100 flex flex-col justify-between"
                  style={{ height: "calc(100% - 2.5rem)" }}
                >
                  <div className="space-y-1.5 text-center pt-2">
                    <span className="text-[9px] uppercase tracking-widest text-[#9E8B62] font-semibold block">Carta de Amor</span>
                    <Heart className="w-9 h-9 text-rose-500 fill-current mx-auto animate-bounce" />
                    <p className="font-serif italic text-sm text-[#3E341F] font-bold">
                      Segredo Revelado Ao Seu Coração...
                    </p>
                  </div>
                  <div className="text-right border-t border-slate-50 pt-2 text-[10px] text-slate-400 font-mono">
                    Para: {letter.receiverName} 💖
                  </div>
                </motion.div>

                {/* 3. Left & Right paper covers (makes the pocket) */}
                <div className="absolute inset-0 pointer-events-none z-15">
                  <div 
                    className="absolute left-0 bottom-0 top-0 w-1/2 bg-[#E1D7BF] border-r border-[#D2C6A9]"
                    style={{ clipPath: "polygon(0% 0%, 100% 50%, 0% 100%)" }}
                  />
                  <div 
                    className="absolute right-0 bottom-0 top-0 w-1/2 bg-[#E1D7BF] border-l border-[#D2C6A9]"
                    style={{ clipPath: "polygon(100% 0%, 0% 50%, 100% 100%)" }}
                  />
                </div>

                {/* 4. Bottom front cover triangular pocket fold */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[60%] bg-[#EFEADA] border-t border-[#E5DBBF] rounded-b-2xl pointer-events-none z-16"
                  style={{ clipPath: "polygon(0% 100%, 50% 0%, 100% 100%)" }}
                />

                {/* 5. Top Front triangle fold with perspective rotation */}
                <motion.div
                  initial={{ rotateX: 0 }}
                  animate={isOpening ? { rotateX: 180, y: -2, zIndex: 5 } : { rotateX: 0, zIndex: 25 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  style={{
                    transformOrigin: "top",
                    transformStyle: "preserve-3d",
                    clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)"
                  }}
                  className="absolute top-0 left-0 right-0 h-[52%] bg-[#FCF8EE] border-b border-[#D9CEB4] rounded-t-2xl pointer-events-none shadow-md"
                />

                {/* 6. Wax Seal center element holding the folds */}
                <motion.div
                  animate={isOpening ? { scale: 0.3, opacity: 0, y: 70, rotate: 140 } : { scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "backIn" }}
                  className="absolute top-[48%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#C92A2A] rounded-full filter border-4 border-[#8A1D1D] flex items-center justify-center shadow-lg z-30 pointer-events-none"
                >
                  <div className="w-8 h-8 rounded-full border border-dashed border-white/40 flex items-center justify-center text-white">
                    <Heart className="w-4 h-4 fill-current animate-pulse" />
                  </div>
                </motion.div>

                {/* Outer decorative texts/trigger */}
                <div className="absolute -bottom-16 left-0 right-0 text-center font-sans">
                  <span className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-full text-xs font-bold shadow-lg shadow-rose-200 transition-all transform group-hover:scale-105 active:scale-95">
                    {isOpening ? "Abrindo fofo... ✨" : "Tocar para Abrir 💌"}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-2.5 font-mono">
                    De: {letter.senderName} &bull; Para: {letter.receiverName}
                  </p>
                </div>

              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* SECTION 2: SECRET REVEALED LETTER PAGE VIEW */
          <motion.div
            key="contents"
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto px-4 pt-10 pb-20"
          >
            {/* Top romantic greetings block */}
            <div className="text-center mb-8 font-sans relative">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-3 ${themeConfig.badge}`}>
                <Heart className="w-3.5 h-3.5 fill-current animate-beat" />
                Fiz essa carta especialmente para você
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold font-serif mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                Feliz Dia dos Namorados!
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75 font-sans">
                De {letter.senderName} para {letter.receiverName} 💖
              </p>
            </div>

            <div className="space-y-6">
              
              {/* Interactive Countdown */}
              {letter.anniversaryDate && letter.anniversaryDate !== "DISABLED" && (
                <Countdown startDateStr={letter.anniversaryDate} theme={letter.theme} />
              )}

              {/* Polaroid Photo Frame Array placed between countdown and letter card */}
              {(!letter.photos || letter.photos[0] !== "DISABLED") && (
                <PolaroidGallery 
                  photos={letter.photos} 
                  senderName={letter.senderName} 
                  receiverName={letter.receiverName} 
                />
              )}

              {/* Polished Letter text main container with elegant fade-in slide-up 0.5s animation */}
              <motion.div 
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                className={`${themeConfig.introCard} print-intro-card print-avoid-break`}
              >
                {/* Visual decorative watermark inside card */}
                <div className="absolute right-3 top-3 text-rose-500/10 pointer-events-none select-none">
                  <Heart className="w-32 h-32 fill-current" />
                </div>

                <div className="space-y-4 relative z-10 leading-relaxed font-serif text-slate-700 select-text">
                  <p className={themeConfig.letterText}>
                    {letter.enhancedMessage}
                  </p>
                </div>
                
                {/* Romantic sign-off */}
                <div className="mt-8 border-t border-rose-100/50 pt-5 text-right relative z-10">
                  <p className="text-xs text-slate-400 font-mono uppercase font-bold">
                    Com todo o amor do mundo,
                  </p>
                  <p className={`text-xl font-bold font-serif italic mt-1 ${themeConfig.accentText}`}>
                    {letter.senderName}
                  </p>
                </div>
              </motion.div>

              {/* Embedded Player details */}
              {letter.musicLink !== "DISABLED" && (letter.musicName || letter.musicLink) && (
                <div className="no-print">
                  <MusicPlayer
                    songName={letter.musicName}
                    songArtist={letter.musicArtist}
                    songLink={letter.musicLink}
                  />
                </div>
              )}

              {/* Sweet custom coupons layout */}
              {cups.length > 0 && (
                <div className="w-full space-y-4 mt-8 font-sans">
                  <div className="text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-1 ${themeConfig.badge}`}>
                      <Ticket className="w-3.5 h-3.5 text-rose-500" />
                      Seus Cupons
                    </span>
                    <p className="text-xs text-slate-500 font-serif italic no-print">
                      Clique no cupom para resgatá-lo instantaneamente!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cups.map((cup, index) => {
                      const IconComp = iconMap[cup.icon] || Ticket;
                      return (
                        <div
                          key={index}
                          onClick={() => redeemCoupon(index)}
                          className={`relative select-none p-5 rounded-3xl border-2 overflow-hidden cursor-pointer transition-all print-avoid-break print-coupon-card ${
                            cup.isRedeemed
                              ? "border-emerald-300 bg-emerald-50/50 opacity-90 shadow-sm"
                              : "border-rose-100 bg-white hover:border-rose-300 hover:shadow-md animate-hover animate-pulse"
                          }`}
                        >
                          <div className="flex gap-4 items-start relative z-10">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                              cup.isRedeemed ? "bg-emerald-100 text-emerald-600" : "bg-rose-50 text-rose-500 animate-pulse"
                            }`}>
                              <IconComp className="w-5 h-5" />
                            </div>

                            <div className="space-y-1 pr-6 flex-1 min-w-0">
                              <h4 className={`text-sm font-bold truncate leading-snug ${cup.isRedeemed ? "line-through text-slate-400" : "text-slate-800"}`}>
                                {cup.title}
                              </h4>
                              <p className={`text-xs ${cup.isRedeemed ? "text-slate-400" : "text-slate-500"}`}>
                                {cup.description}
                              </p>
                            </div>
                          </div>

                          {/* Stamp sticker display if redeemed */}
                          {cup.isRedeemed && (
                            <div className="absolute right-2 bottom-2 transform -rotate-12 border-2 border-dashed border-emerald-500 bg-emerald-100/40 text-emerald-600 text-[10px] font-bold font-mono tracking-widest uppercase px-2.5 py-1 rounded-xs flex items-center gap-1 shadow-sm">
                              <Heart className="w-3 h-3 fill-current" />
                              Resgatado
                            </div>
                          )}

                          {/* Stylized Coupon Edge Notches */}
                          <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 border border-rose-100/10 pointer-events-none"></div>
                          <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 border border-rose-100/10 pointer-events-none"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}



              {/* Screen back to actions or brand signature */}
              <div className="mt-12 text-center space-y-5 font-sans">
                {/* Print PDF Button centered only at the bottom of the page */}
                <div className="pt-2 no-print select-none">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={`inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer border ${
                      letter.theme === "starry"
                        ? "bg-purple-900 border-purple-700/80 text-purple-200 hover:bg-purple-800"
                        : letter.theme === "bubblegum"
                        ? "bg-white border-pink-200 text-pink-600 hover:bg-pink-50 shadow-pink-100"
                        : letter.theme === "polaroid"
                        ? "bg-white border-stone-300 text-stone-700 hover:bg-stone-50 shadow-stone-100"
                        : "bg-white border-rose-100 text-rose-600 hover:bg-rose-50 shadow-rose-100"
                    }`}
                    id="btn_print_pdf"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Salvar como PDF 📄
                  </button>
                </div>

                <p className={`text-xs font-mono uppercase tracking-widest ${themeConfig.footerCredits}`}>
                  Fiz com todo carinho &bull; {new Date().getFullYear()}
                </p>


              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
