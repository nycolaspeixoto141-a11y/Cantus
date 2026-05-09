import { useState, useEffect, useRef } from "react";

export default function StageModePro({ musica, onClose }) {
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fontSize, setFontSize] = useState(28);
  const [showChords, setShowChords] = useState(true);

  const containerRef = useRef(null);

  // 🎬 Auto Scroll
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (containerRef.current) {
        containerRef.current.scrollBy(0, scrollSpeed);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, scrollSpeed]);

  // 🔒 Tela cheia automática
  const entrarTelaCheia = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
  };

  useEffect(() => {
    entrarTelaCheia();
  }, []);

  // 🎵 Processar letra/cifra
  const renderConteudo = () => {
    if (!musica?.letra) return "Sem letra";

    const linhas = musica.letra.split("\n");

    return linhas.map((linha, i) => {
      const isAcorde = linha.match(/^[A-G][#bm\d\s/]*$/);

      if (!showChords && isAcorde) return null;

      return (
        <div
          key={i}
          style={{
            color: isAcorde ? "#00ffcc" : "#ffffff",
            fontWeight: isAcorde ? "bold" : "normal",
            marginBottom: "8px",
          }}
        >
          {linha}
        </div>
      );
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        color: "#fff",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 🔝 CONTROLES */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          right: 10,
          display: "flex",
          justifyContent: "space-between",
          zIndex: 10000,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? "⏸️" : "▶️"}
          </button>

          <button onClick={() => setScrollSpeed((s) => Math.max(0.5, s - 0.5))}>
            ➖ Vel
          </button>

          <button onClick={() => setScrollSpeed((s) => s + 0.5)}>
            ➕ Vel
          </button>

          <button onClick={() => setFontSize((f) => f - 2)}>
            A-
          </button>

          <button onClick={() => setFontSize((f) => f + 2)}>
            A+
          </button>

          <button onClick={() => setShowChords(!showChords)}>
            🎸 Cifra
          </button>
        </div>

       <button className="botao-voltar-palco" onClick={onClose}>
  ←
</button>
      </div>

      {/* 🎵 CONTEÚDO */}
      <div
        ref={containerRef}
        style={{
          marginTop: 60,
          padding: "20px",
          overflowY: "auto",
          fontSize: `${fontSize}px`,
          lineHeight: 1.6,
        }}
      >
        <h2 style={{ marginBottom: 20 }}>{musica?.titulo}</h2>
        {renderConteudo()}
      </div>
    </div>
  );
}