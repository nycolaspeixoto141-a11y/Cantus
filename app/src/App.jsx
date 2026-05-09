import { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import "./App.css";
import {
  Home,
  Music,
  CalendarDays,
  User,
  ListMusic,
  Plus,
Pencil,
Save,
Trash2,
Clock3
} from "lucide-react";
import logo from "./assets/logo-bg.png";
import "@fontsource/inter";
const tons = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const momentos = [
  { valor: "entrada", nome: "Entrada" },
  { valor: "atoPenitencial", nome: "Ato Penitencial" },
  { valor: "gloria", nome: "Glória" },
  { valor: "salmo", nome: "Salmo" },
  { valor: "aclamacao", nome: "Aclamação" },
  { valor: "ofertorio", nome: "Ofertório" },
  { valor: "santo", nome: "Santo" },
  { valor: "comunhao", nome: "Comunhão" },
  { valor: "final", nome: "Final" },
  { valor: "semMomento", nome: "Outros" },
];

const camposRepertorio = {
  entrada: "entrada",
  atoPenitencial: "atoPenitencial",
  gloria: "gloria",
  salmo: "salmo",
  aclamacao: "aclamacao",
  ofertorio: "ofertorio",
  santo: "santo",
  comunhao: "comunhao",
  final: "final",
};

function normalizarLista(valor) {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor;
  return [valor];
}

function transporAcorde(acorde, passos) {
  const match = acorde.match(/^([A-G]#?)(.*?)(\/([A-G]#?))?$/);
  if (!match) return acorde;

  const nota = match[1];
  const resto = match[2] || "";
  const baixo = match[4];

  const indexAtual = tons.indexOf(nota);
  if (indexAtual === -1) return acorde;

  const novoIndex = (indexAtual + passos + tons.length) % tons.length;
  let novoAcorde = tons[novoIndex] + resto;

  if (baixo) {
    const indexBaixo = tons.indexOf(baixo);
    if (indexBaixo !== -1) {
      const novoBaixo = tons[(indexBaixo + passos + tons.length) % tons.length];
      novoAcorde += "/" + novoBaixo;
    }
  }

  return novoAcorde;
}

function linhaPareceCifra(linha) {
  const palavras = linha.trim().split(/\s+/);
  if (palavras.length === 0) return false;

  const acordes = palavras.filter((p) =>
    /^[A-G]#?(m|maj|min|dim|aug|sus|add)?[0-9]?(\/[A-G]#?)?$/.test(p)
  );

  return acordes.length >= 1 && acordes.length === palavras.length;
}

function transporTexto(texto, passos) {
  return texto
    .split("\n")
    .map((linha) => {
      if (!linhaPareceCifra(linha)) return linha;

      return linha.replace(
        /\b([A-G]#?(?:m|maj|min|dim|aug|sus|add)?[0-9]?(?:\/[A-G]#?)?)\b/g,
        (acorde) => transporAcorde(acorde, passos)
      );
    })
    .join("\n");
}

function removerCifras(texto) {
  return texto
    .split("\n")
    .map((linha) => {
      let linhaLimpa = linha.replace(/\[[^\]]+\]/g, "");

      if (linhaPareceCifra(linhaLimpa)) return "";

      linhaLimpa = linhaLimpa.replace(
        /\b[A-G]#?(?:m|maj|min|dim|aug|sus|add)?[0-9]?(?:\/[A-G]#?)?\b/g,
        ""
      );

      return linhaLimpa.replace(/\s+/g, " ").trim();
    })
    .filter((linha) => linha !== "")
    .join("\n");
}

function App() {
  const TELAS = {
    HOME: "home",
    CIFRAS: "comCifras",
    SEM_CIFRAS: "semCifras",
    FAVORITOS: "favoritos",
    ADICIONAR: "adicionar",
    REPERTORIO: "repertorio",
    CALENDARIO: "calendario",
    IMPORTAR: "importar",
  };

  const [musicas, setMusicas] = useState([]);
  const [repertorios, setRepertorios] = useState([]);
  const [tela, setTela] = useState("home");

  const [eventos, setEventos] = useState(
    JSON.parse(localStorage.getItem("eventos")) || []
  );

  const [fotoPerfil, setFotoPerfil] = useState(
    localStorage.getItem("fotoPerfil") || ""
  );

const [nomePerfil, setNomePerfil] = useState(
  localStorage.getItem("nomePerfil") || ""
);

const [funcaoPerfil, setFuncaoPerfil] = useState(
  localStorage.getItem("funcaoPerfil") || ""
);

  const [funcaoPerfil, setFuncaoPerfil] = useState(
    localStorage.getItem("funcaoPerfil") || "Violonista"
  );

  const [preferenciaPerfil, setPreferenciaPerfil] = useState(
    localStorage.getItem("preferenciaPerfil") || "cifras"
  );

  const modoLetraPadrao =
    preferenciaPerfil === "letras" ? "semCifras" : "comCifras";

  const [filtroMomento, setFiltroMomento] = useState(null);
  const [editandoEventoIndex, setEditandoEventoIndex] = useState(null);
  const [menuAberto, setMenuAberto] = useState(true);
  const [submenuCifrasAberto, setSubmenuCifrasAberto] = useState(false);
  const [submenuSemCifrasAberto, setSubmenuSemCifrasAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [musicosEvento, setMusicosEvento] = useState([]);
  const [mostrarFavoritas, setMostrarFavoritas] = useState(false);

  const [nome, setNome] = useState("");
  const [tom, setTom] = useState("");
  const [momento, setMomento] = useState("");
  const [letraComCifra, setLetraComCifra] = useState("");
  const [linkYoutube, setLinkYoutube] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [fabAberto, setFabAberto] = useState(false);

  const [musicaSelecionada, setMusicaSelecionada] = useState(null);
  const [listaPalco, setListaPalco] = useState([]);
  const [indicePalco, setIndicePalco] = useState(0);
  const [inicioToque, setInicioToque] = useState(0);
  const [musicaDetalhe, setMusicaDetalhe] = useState(null);
  const [repertorioDetalhe, setRepertorioDetalhe] = useState(null);

  const [tipoPalco, setTipoPalco] = useState("comCifras");
  const [transposicao, setTransposicao] = useState(0);
  const [rolando, setRolando] = useState(false);
  const [velocidade, setVelocidade] = useState(1);
  const [mostrarControles, setMostrarControles] = useState(true);
  const [mostrarControlesAvancados, setMostrarControlesAvancados] = useState(false);

  const [tamanhoFontePalco, setTamanhoFontePalco] = useState(() => {
    return Number(localStorage.getItem("tamanhoFontePalco")) || 26;
  });

  const [nomeCelebracao, setNomeCelebracao] = useState("");
  const [dataCelebracao, setDataCelebracao] = useState("");
  const [horarioCelebracao, setHorarioCelebracao] = useState("");

  const [textoImportado, setTextoImportado] = useState("");

  const [entrada, setEntrada] = useState("");
  const [atoPenitencial, setAtoPenitencial] = useState("");
  const [gloria, setGloria] = useState("");
  const [salmo, setSalmo] = useState("");
  const [aclamacao, setAclamacao] = useState("");
  const [ofertorio, setOfertorio] = useState("");
  const [santo, setSanto] = useState("");
  const [comunhao, setComunhao] = useState("");
  const [final, setFinal] = useState("");

  const [nomeEvento, setNomeEvento] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [horaEvento, setHoraEvento] = useState("");
  const [escalaEvento, setEscalaEvento] = useState("");
  const [repertorioEvento, setRepertorioEvento] = useState("");

  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [repertorioAtivo, setRepertorioAtivo] = useState(null);

  const tomAtual = tons[(velocidade - 1) % 12];

  useEffect(() => {
    setTipoPalco(modoLetraPadrao);
  }, [modoLetraPadrao]);

  useEffect(() => {
    if (!rolando) return;

    let animacao;
    let acumulado = 0;

    function rolar() {
      const velocidadeReal = 0.25 + velocidade * 0.18;
      acumulado += velocidadeReal;

      if (acumulado >= 1) {
        window.scrollBy(0, Math.floor(acumulado));
        acumulado = acumulado % 1;
      }

      animacao = requestAnimationFrame(rolar);
    }

    animacao = requestAnimationFrame(rolar);

    return () => cancelAnimationFrame(animacao);
  }, [rolando, velocidade]);

  useEffect(() => {
    if (!musicaSelecionada) return;

    if (!rolando) {
      setMostrarControles(true);
      return;
    }

    const tempo = setTimeout(() => {
      setMostrarControles(false);
    }, 7000);

    return () => clearTimeout(tempo);
  }, [musicaSelecionada, rolando]);

  useEffect(() => {
    carregarMusicas();
    carregarRepertorios();
  }, []);

  useEffect(() => {
    localStorage.setItem("tamanhoFontePalco", tamanhoFontePalco);
  }, [tamanhoFontePalco]);

  async function carregarMusicas() {
    const res = await getDocs(collection(db, "musicas"));
    const lista = res.docs.map((documento) => ({
      id: documento.id,
      favorito: false,
      momento: "semMomento",
      ...documento.data(),
    }));

    setMusicas(lista);
  }

  async function carregarRepertorios() {
    const res = await getDocs(collection(db, "repertorios"));
    const lista = res.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    setRepertorios(lista);
  }

  const musicasFiltradas = musicas.filter((musica) => {
    const correspondeBusca = musica.nome
      ?.toLowerCase()
      .includes(busca.toLowerCase());

    const correspondeMomento =
      filtroMomento === null ||
      filtroMomento === "todos" ||
      (musica.momento || "semMomento") === filtroMomento;

    if (mostrarFavoritas) {
      return correspondeBusca && correspondeMomento && musica.favorito;
    }

    return correspondeBusca && correspondeMomento;
  });

  function salvarPerfil() {
    localStorage.setItem("nomePerfil", nomePerfil);
    localStorage.setItem("funcaoPerfil", funcaoPerfil);
    localStorage.setItem("preferenciaPerfil", preferenciaPerfil);
  }

  function trocarFoto(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setFotoPerfil(reader.result);
      localStorage.setItem("fotoPerfil", reader.result);
    };

    reader.readAsDataURL(arquivo);
  }

  function criarEvento() {
    if (!nomeEvento || !dataEvento) {
      alert("Preencha nome e data do evento.");
      return;
    }

    const novoEvento = {
      nome: nomeEvento,
      data: dataEvento,
      hora: horaEvento,
      repertorio: repertorioEvento,
      escala: musicosEvento,
    };

    const novaLista =
      editandoEventoIndex !== null
        ? eventos.map((evento, index) =>
            index === editandoEventoIndex ? novoEvento : evento
          )
        : [...eventos, novoEvento];

    setEventos(novaLista);
    localStorage.setItem("eventos", JSON.stringify(novaLista));

    setNomeEvento("");
    setDataEvento("");
    setHoraEvento("");
    setMusicosEvento([]);
    setEscalaEvento("");
    setRepertorioEvento("");
    setEditandoEventoIndex(null);
  }

  function buscarMusicaPorNome(nomeMusica) {
    return musicas.find((musica) => musica.nome === nomeMusica);
  }

  async function importarTexto() {
    const linhas = textoImportado
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean);

    const musicasParaSalvar = [];
    let momentoAtual = "semMomento";
    let musicaAtual = null;

    function detectarMomento(texto) {
      const t = texto.toLowerCase();

      if (t.includes("entrada")) return "entrada";
      if (t.includes("ato penitencial")) return "atoPenitencial";
      if (t.includes("glória") || t.includes("gloria")) return "gloria";
      if (t.includes("salmo")) return "salmo";
      if (t.includes("aclamação") || t.includes("aclamacao")) return "aclamacao";
      if (t.includes("ofertório") || t.includes("ofertorio")) return "ofertorio";
      if (t.includes("santo")) return "santo";
      if (t.includes("comunhão") || t.includes("comunhao")) return "comunhao";
      if (t.includes("final")) return "final";

      return null;
    }

    for (const linha of linhas) {
      const momentoDetectado = detectarMomento(linha);

      if (momentoDetectado) {
        momentoAtual = momentoDetectado;

        const partes = linha.split(":");
        const nome = partes[1]?.trim();

        if (nome) {
          musicaAtual = {
            nome,
            tom: "",
            momento: momentoAtual,
            letraComCifra: "",
            favorito: false,
            youtube: "",
          };

          musicasParaSalvar.push(musicaAtual);
        }

        continue;
      }

      if (linha.includes("http")) {
        if (musicaAtual) {
          musicaAtual.youtube = linha;
        } else {
          musicaAtual = {
            nome: "Sem nome",
            tom: "",
            momento: momentoAtual,
            letraComCifra: "",
            favorito: false,
            youtube: linha,
          };

          musicasParaSalvar.push(musicaAtual);
        }

        continue;
      }

      if (
        !linha.toLowerCase().startsWith("missa") &&
        !linha.toLowerCase().startsWith("paróquia") &&
        !linha.toLowerCase().startsWith("paroquia") &&
        !linha.toLowerCase().startsWith("sugestão") &&
        !linha.toLowerCase().startsWith("sugestao") &&
        linha.toLowerCase() !== "ou"
      ) {
        musicaAtual = {
          nome: linha,
          tom: "",
          momento: momentoAtual,
          letraComCifra: "",
          favorito: false,
          youtube: "",
        };

        musicasParaSalvar.push(musicaAtual);
      }
    }

    for (const musica of musicasParaSalvar) {
      await addDoc(collection(db, "musicas"), musica);
    }

    await carregarMusicas();
    setTextoImportado("");
  }

  function limparCamposMusica() {
    setNome("");
    setTom("");
    setMomento("");
    setLetraComCifra("");
    setLinkYoutube("");
    setEditandoId(null);
  }

  async function adicionarMusica() {
    if (!nome) return;

    await addDoc(collection(db, "musicas"), {
      nome,
      tom,
      momento: momento || "semMomento",
      letraComCifra,
      favorito: false,
      youtube: linkYoutube || "",
    });

    limparCamposMusica();
    carregarMusicas();
    setTela(TELAS.CIFRAS);
    setFiltroMomento("todos");
  }

  function iniciarEdicao(musica) {
    setNome(musica.nome || "");
    setTom(musica.tom || "");
    setMomento(musica.momento || "semMomento");
    setLetraComCifra(musica.letraComCifra || musica.letra || "");
    setLinkYoutube(musica.youtube || "");
    setEditandoId(musica.id);
    setMusicaDetalhe(null);
    setTela(TELAS.ADICIONAR);
  }

  async function salvarEdicao() {
    await updateDoc(doc(db, "musicas", editandoId), {
      nome,
      tom,
      momento: momento || "semMomento",
      letraComCifra,
      youtube: linkYoutube || "",
    });

    limparCamposMusica();
    carregarMusicas();
    setTela(TELAS.CIFRAS);
    setFiltroMomento("todos");
  }

  async function deletarMusica(id) {
    const confirmar = confirm("Tem certeza que deseja deletar esta música?");
    if (!confirmar) return;

    await deleteDoc(doc(db, "musicas", id));
    setMusicaDetalhe(null);
    carregarMusicas();
  }

  async function alternarFavorito(musica) {
    await updateDoc(doc(db, "musicas", musica.id), {
      favorito: !musica.favorito,
    });

    carregarMusicas();

    if (musicaDetalhe?.id === musica.id) {
      setMusicaDetalhe({ ...musicaDetalhe, favorito: !musica.favorito });
    }
  }

  async function salvarRepertorio() {
    await addDoc(collection(db, "repertorios"), {
      nomeCelebracao,
      dataCelebracao,
      horarioCelebracao,
      entrada: entrada ? [entrada] : [],
      atoPenitencial: atoPenitencial ? [atoPenitencial] : [],
      gloria: gloria ? [gloria] : [],
      salmo: salmo ? [salmo] : [],
      aclamacao: aclamacao ? [aclamacao] : [],
      ofertorio: ofertorio ? [ofertorio] : [],
      santo: santo ? [santo] : [],
      comunhao: comunhao ? [comunhao] : [],
      final: final ? [final] : [],
    });

    setNomeCelebracao("");
    setDataCelebracao("");
    setHorarioCelebracao("");
    setEntrada("");
    setAtoPenitencial("");
    setGloria("");
    setSalmo("");
    setAclamacao("");
    setOfertorio("");
    setSanto("");
    setComunhao("");
    setFinal("");

    carregarRepertorios();
  }

  async function deletarRepertorio(id) {
    const confirmar = confirm("Tem certeza que deseja deletar este repertório?");
    if (!confirmar) return;

    await deleteDoc(doc(db, "repertorios", id));
    carregarRepertorios();
  }

  function iniciarModoAdicionar(repertorio) {
    setModoAdicionar(true);
    setRepertorioAtivo(repertorio);
    setTela(TELAS.CIFRAS);
    setFiltroMomento("todos");
    setSubmenuCifrasAberto(true);
    setSubmenuSemCifrasAberto(false);
  }

  function sairModoAdicionar() {
    setModoAdicionar(false);
    setRepertorioAtivo(null);
  }

  async function adicionarAoRepertorio(musica) {
    if (!repertorioAtivo) return;

    const campoFinal = camposRepertorio[musica.momento];

    if (!campoFinal) {
      alert("Essa música não tem um momento válido definido.");
      return;
    }

    const listaAtual = normalizarLista(repertorioAtivo[campoFinal]);

    if (listaAtual.includes(musica.nome)) {
      alert("Essa música já está nesse momento do repertório.");
      return;
    }

    const novaLista = [...listaAtual, musica.nome];

    await updateDoc(doc(db, "repertorios", repertorioAtivo.id), {
      [campoFinal]: novaLista,
    });

    await carregarRepertorios();

    setRepertorioAtivo({
      ...repertorioAtivo,
      [campoFinal]: novaLista,
    });
  }

  async function removerMusicaDoRepertorio(repertorio, campo, nomeMusica) {
    const listaAtual = normalizarLista(repertorio[campo]);
    const novaLista = listaAtual.filter((nome) => nome !== nomeMusica);

    await updateDoc(doc(db, "repertorios", repertorio.id), {
      [campo]: novaLista,
    });

    const repertorioAtualizado = {
      ...repertorio,
      [campo]: novaLista,
    };

    setRepertorioDetalhe(repertorioAtualizado);

    setRepertorios((lista) =>
      lista.map((rep) =>
        rep.id === repertorio.id ? repertorioAtualizado : rep
      )
    );

    carregarRepertorios();
  }

  function abrirPalco(musica, tipo) {
    setMusicaSelecionada(musica);
    setTipoPalco(tipo);
    setTransposicao(0);
    setRolando(false);
    setVelocidade(1);
    setMostrarControlesAvancados(false);
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  function abrirRepertorioNoPalco(repertorio) {
    const ordemCampos = [
      "entrada",
      "atoPenitencial",
      "gloria",
      "salmo",
      "aclamacao",
      "ofertorio",
      "santo",
      "comunhao",
      "final",
    ];

    const lista = ordemCampos
      .flatMap((campo) => normalizarLista(repertorio[campo]))
      .map((nomeMusica) => buscarMusicaPorNome(nomeMusica))
      .filter(Boolean);

    if (lista.length === 0) {
      alert("Este repertório não tem músicas.");
      return;
    }

    setListaPalco(lista);
    setIndicePalco(0);
    abrirPalco(lista[0], modoLetraPadrao);
  }

  function abrirPasta(tipo, momentoValor) {
    setTela(tipo);
    setFiltroMomento(momentoValor);
    setMusicaDetalhe(null);
  }

  function ativarFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  function proximaMusica() {
    if (listaPalco.length === 0) return;

    const novoIndice = Math.min(indicePalco + 1, listaPalco.length - 1);

    setIndicePalco(novoIndice);
    setMusicaSelecionada(listaPalco[novoIndice]);
    setTransposicao(0);
    setRolando(false);
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  function musicaAnterior() {
    if (listaPalco.length === 0) return;

    const novoIndice = Math.max(indicePalco - 1, 0);

    setIndicePalco(novoIndice);
    setMusicaSelecionada(listaPalco[novoIndice]);
    setTransposicao(0);
    setRolando(false);
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  if (musicaSelecionada) {
    const textoOriginal =
      musicaSelecionada.letraComCifra || musicaSelecionada.letra || "";

    const textoFinal =
      tipoPalco === "comCifras"
        ? transporTexto(textoOriginal, transposicao)
        : removerCifras(textoOriginal);

    const tomFinal =
      tipoPalco === "comCifras"
        ? transporAcorde(musicaSelecionada.tom || "", transposicao)
        : "";

    return (
      <div
        style={{ width: "100vw", minHeight: "100vh" }}
        onClick={() => {
          setMostrarControles(true);

          if (rolando) {
            setTimeout(() => {
              setMostrarControles(false);
            }, 7000);
          }
        }}
        onDoubleClick={() => setMostrarControles((v) => !v)}
        onTouchStart={(e) => setInicioToque(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const fim = e.changedTouches[0].clientX;
          const diferenca = fim - inicioToque;

          if (diferenca > 30) {
            musicaAnterior();
          } else if (diferenca < -30) {
            proximaMusica();
          }
        }}
      >
        {mostrarControles && (
          <div className="controles-palco-fixos">
            <button
              onClick={() => {
                setRolando(false);
                setMusicaSelecionada(null);
              }}
              style={{
                position: "fixed",
                top: "15px",
                left: "20px",
                zIndex: 10000,
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: "22px",
                cursor: "pointer",
              }}
            >
   ←
            </button>

            <div className="topo-palco">
              <span className="titulo-palco">PALCO PRO</span>

              {listaPalco.length > 0 && (
                <span className="contador-palco">
                  {indicePalco + 1} / {listaPalco.length}
                </span>
              )}
            </div>

            <div className="header-palco compacto-palco">
              <h1>{musicaSelecionada.nome}</h1>

              {tipoPalco === "comCifras" && (
                <span className="tom-palco">
                  Tom: {tomFinal ? tomFinal : "Não definido"}
                </span>
              )}
            </div>

            <div className="controle-transposicao-pro">
              <button onClick={() => setRolando(!rolando)}>
                {rolando ? "⏸ Pausar" : "▶ Iniciar rolagem"}
              </button>

              <button
                onClick={() =>
                  setMostrarControlesAvancados(!mostrarControlesAvancados)
                }
              >
                ⚙ 
              </button>

              <div className="controle-tom">
                <label>Velocidade: {velocidade}</label>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={velocidade}
                  onChange={(e) => setVelocidade(Number(e.target.value))}
                />
              </div>
            </div>

            {mostrarControlesAvancados && (
              <>
                {tipoPalco === "comCifras" && (
                  <div className="controle-transposicao-pro">
                    <button onClick={() => setTransposicao(transposicao - 1)}>
                      -1 tom
                    </button>

                    <span>Transposição: {transposicao}</span>

                    <button onClick={() => setTransposicao(transposicao + 1)}>
                      +1 tom
                    </button>
                  </div>
                )}

                <div className="controle-transposicao-pro">
                  <button
                    onClick={() =>
                      setTamanhoFontePalco((t) => Math.max(18, t - 2))
                    }
                  >
                    A-
                  </button>

                  <button
                    onClick={() =>
                      setTamanhoFontePalco((t) => Math.min(42, t + 2))
                    }
                  >
                    A+
                  </button>

                  <button onClick={ativarFullscreen}>⛶ Tela cheia</button>
                </div>
              </>
            )}
          </div>
        )}

        <pre
          style={{
            fontSize: tamanhoFontePalco,
            lineHeight: 1.6,
            paddingTop: mostrarControles ? "340px" : "80px",
            textAlign: "left",
            maxWidth: "900px",
            margin: "0 auto",
            paddingLeft: "24px",
            paddingRight: "24px",
            whiteSpace: "pre-wrap",
          }}
        >
          {textoFinal}
        </pre>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <img src={logo} className="watermark" alt="" />

      <button className="botao-menu" onClick={() => setMenuAberto(!menuAberto)}>
        ☰
      </button>

      <aside className={menuAberto ? "sidebar aberta" : "sidebar fechada"}>
        <button
          onClick={() => {
            setSubmenuCifrasAberto(!submenuCifrasAberto);
            setTela(TELAS.CIFRAS);
            setFiltroMomento(null);
            setMusicaDetalhe(null);
          }}
        >
          Cifras {submenuCifrasAberto ? "▲" : "▼"}
        </button>

        {submenuCifrasAberto && (
          <div className="submenu">
            {momentos.map((m) => (
              <button
                key={"cifra-" + m.valor}
                className={
                  tela === TELAS.CIFRAS && filtroMomento === m.valor
                    ? "ativo-sub"
                    : ""
                }
                onClick={() => abrirPasta(TELAS.CIFRAS, m.valor)}
              >
                {m.nome}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            setSubmenuSemCifrasAberto(!submenuSemCifrasAberto);
            setTela(TELAS.SEM_CIFRAS);
            setFiltroMomento(null);
            setMusicaDetalhe(null);
          }}
        >
          Letras {submenuSemCifrasAberto ? "▲" : "▼"}
        </button>

        {submenuSemCifrasAberto && (
          <div className="submenu">
            {momentos.map((m) => (
              <button
                key={"sem-" + m.valor}
                onClick={() => abrirPasta(TELAS.SEM_CIFRAS, m.valor)}
              >
                {m.nome}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            setTela(TELAS.FAVORITOS);
            setFiltroMomento("todos");
            setMusicaDetalhe(null);
          }}
        >
          Favoritos
        </button>

        <button onClick={() => setTela(TELAS.ADICIONAR)}>Adicionar</button>
        <button onClick={() => setTela(TELAS.REPERTORIO)}>Repertório</button>
        <button onClick={() => setTela(TELAS.IMPORTAR)}>Importar WhatsApp</button>
      </aside>

      <main className="container">
        <img src={logo} alt="" className="logo-bg" />

        {tela === TELAS.HOME && (
          <>
            <div
              style={{
                textAlign: "center",
                marginTop: "40px",
                marginBottom: "20px",
              }}
            >
              <h1
                style={{
                  fontSize: "42px",
                  letterSpacing: "3px",
                  fontWeight: "600",
                }}
              >
                Cantus
              </h1>

              <p style={{ opacity: 0.7 }}>
                Servir com música, conduzir com fé.
              </p>
            </div>

            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "30px 20px",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              <h3
                style={{
                  marginBottom: "15px",
                  opacity: 0.8,
                  textAlign: "center",
                }}
              >
                🎵 Últimas músicas adicionadas
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                {musicas.slice(-5).reverse().map((musica) => (
                  <div
                    key={musica.id}
                    style={{
                      padding: "10px",
                      border: "1px solid #444",
                      borderRadius: "10px",
                      width: "100%",
                      maxWidth: "400px",
                      fontSize: "14px",
                      opacity: 0.9,
                    }}
                  >
                    {musica.nome}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tela === TELAS.ADICIONAR && (
          <div className="card">
            <h1>{editandoId ? "✏️ Editar música" : "➕ Adicionar música"}</h1>

            <input
              placeholder="Nome da música"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              placeholder="Tom"
              value={tom}
              onChange={(e) => setTom(e.target.value)}
            />

            <select value={momento} onChange={(e) => setMomento(e.target.value)}>
              <option value="semMomento">Selecionar momento</option>
              <option value="entrada">Entrada</option>
              <option value="atoPenitencial">Ato Penitencial</option>
              <option value="gloria">Glória</option>
              <option value="salmo">Salmo</option>
              <option value="aclamacao">Aclamação</option>
              <option value="ofertorio">Ofertório</option>
              <option value="santo">Santo</option>
              <option value="comunhao">Comunhão</option>
              <option value="final">Final</option>
            </select>

            <input
              placeholder="Link do YouTube"
              value={linkYoutube}
              onChange={(e) => setLinkYoutube(e.target.value)}
            />

            <textarea
              placeholder="Letra com cifras"
              value={letraComCifra}
              onChange={(e) => setLetraComCifra(e.target.value)}
              style={{ minHeight: "220px" }}
            />

            <button onClick={editandoId ? salvarEdicao : adicionarMusica}>
              💾 {editandoId ? "Salvar edição" : "Salvar música"}
            </button>
          </div>
        )}

        {tela === TELAS.CALENDARIO && (
          <div className="card">
            <h1>📅 Calendário</h1>

            <p style={{ opacity: 0.7, marginBottom: "20px" }}>
              Organize missas, ensaios, escalas e repertórios.
            </p>

            <input
              placeholder="Nome do evento"
              value={nomeEvento}
              onChange={(e) => setNomeEvento(e.target.value)}
            />


<div className="campo-data-mobile">
  {!dataEvento && <span>Data do evento</span>}

  <input
    type="date"
    value={dataEvento}
    onChange={(e) => setDataEvento(e.target.value)}
  />
</div>


<div className="campo-data-mobile">
 {!horaEvento && <span>Selecione o horário</span>}

  <input
    type="time"
    value={horaEvento}
    onChange={(e) => setHoraEvento(e.target.value)}
  />
</div>

            <select
              value={escalaEvento}
              onChange={(e) => {
                const valor = e.target.value;
                if (!valor) return;

                setMusicosEvento((lista) => [...lista, valor]);
                setEscalaEvento("");
              }}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "#1e293b",
                color: "white",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <option value="">Selecionar músico</option>
              <option value="🎸 Sidney — Baixo">🎸 Sidney — Baixo</option>
              <option value="🥁 Yuri — Cajón">🥁 Yuri — Cajón</option>
              <option value="🥁 Henrique — Bateria">🥁 Henrique — Bateria</option>
              <option value="🎤 Ana — Vocal">🎤 Ana — Vocal</option>
              <option value="🎤 Rita — Vocal">🎤 Rita — Vocal</option>
              <option value="🎤 Leticia — Vocal">🎤 Leticia — Vocal</option>
              <option value="🎤 Jéssica — Vocal">🎤 Jéssica — Vocal</option>
              <option value="🎤 Emanuel — Vocal">🎤 Emanuel — Vocal</option>
              <option value="🎤 Ademir — Vocal">🎤 Ademir — Vocal</option>
              <option value="🎸 Luan — Violão">🎸 Luan — Violão</option>
              <option value="🎸 Marcos — Violão">🎸 Marcos — Violão</option>
              <option value="🎤 Larrisa — Vocal">🎤 Larrisa — Vocal</option>
              <option value="🎤 Ana Julia — Vocal">🎤 Ana Julia — Vocal</option>
              <option value="🎤 Guilherme — Vocal">🎤 Guilherme — Vocal</option>
            </select>

            {musicosEvento.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "10px",
                  marginBottom: "10px",
                }}
              >
                {musicosEvento.map((musico, index) => (
                  <div
                    key={index}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "999px",
                      padding: "6px 12px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {musico}

                    <span
                      onClick={() => {
                        setMusicosEvento((lista) =>
                          lista.filter((_, i) => i !== index)
                        );
                      }}
                      style={{
                        cursor: "pointer",
                        opacity: 0.7,
                      }}
                    >
                      ✕
                    </span>
                  </div>
                ))}
              </div>
            )}

            <select
              value={repertorioEvento}
              onChange={(e) => setRepertorioEvento(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "#1e293b",
                color: "white",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <option value="">Selecionar repertório</option>

              {repertorios.map((rep) => (
                <option key={rep.id} value={rep.nomeCelebracao}>
                  {rep.nomeCelebracao}
                </option>
              ))}
            </select>

            <button onClick={criarEvento}>
              {editandoEventoIndex !== null
                ? "💾 Salvar edição"
                : "➕ Criar evento"}
            </button>

            <div style={{ marginTop: "20px" }}>
              <strong style={{ fontSize: "18px" }}>Próximos eventos</strong>

              {eventos.length === 0 ? (
                <p style={{ opacity: 0.7, marginTop: "8px" }}>
                  Nenhum evento cadastrado ainda.
                </p>
              ) : (
                eventos.map((evento, index) => (
                  <div
                    key={index}
                    style={{
                      marginTop: "10px",
                      textAlign: "left",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(250,204,21,0.3)",
                      borderRadius: "16px",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <span
                        onClick={() => {
                          setEditandoEventoIndex(index);
                          setNomeEvento(evento.nome);
                          setDataEvento(evento.data);
                          setHoraEvento(evento.hora || "");
                          setRepertorioEvento(evento.repertorio || "");
                          setMusicosEvento(
                            Array.isArray(evento.escala) ? evento.escala : []
                          );
                        }}
                        style={{
                          cursor: "pointer",
                          opacity: 0.7,
                          fontSize: "16px",
                          padding: "4px",
                        }}
                      >
                        ✏️
                      </span>

                      <span
                        onClick={() => {
                          const novaLista = eventos.filter((_, i) => i !== index);
                          setEventos(novaLista);
                          localStorage.setItem("eventos", JSON.stringify(novaLista));
                        }}
                        style={{
                          cursor: "pointer",
                          opacity: 0.6,
                          fontSize: "18px",
                          padding: "4px",
                        }}
                      >
                        🗑
                      </span>
                    </div>

                    <strong>{evento.nome}</strong>

                    <p style={{ opacity: 0.7, marginTop: "6px" }}>
                      📅 {evento.data} {evento.hora && `• 🕘 ${evento.hora}`}
                    </p>

                    {evento.repertorio && (
                      <p
                        onClick={() => {
                          const repEncontrado = repertorios.find(
                            (rep) => rep.nomeCelebracao === evento.repertorio
                          );

                          if (repEncontrado) {
                            setRepertorioDetalhe(repEncontrado);
                          }
                        }}
                        style={{
                          opacity: 0.8,
                          marginTop: "6px",
                          cursor: "pointer",
                          color: "#facc15",
                          fontWeight: "600",
                        }}
                      >
                        🎵 {evento.repertorio}
                      </p>
                    )}

                    {evento.escala && evento.escala.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginTop: "10px",
                        }}
                      >
                        {Array.isArray(evento.escala) &&
                          evento.escala.map((musico, i) => (
                            <div
                              key={i}
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "999px",
                                padding: "4px 10px",
                                fontSize: "12px",
                                opacity: 0.85,
                              }}
                            >
                              {musico}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tela === "perfil" && (
          <div
            className="card"
            style={{
              textAlign: "center",
              maxWidth: "520px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "86px",
                height: "86px",
                borderRadius: "50%",
                margin: "0 auto 16px",
                overflow: "hidden",
                background: "#111827",
                border: "2px solid #facc15",
              }}
            >
              {fotoPerfil ? (
                <img
                  src={fotoPerfil}
                  alt="Perfil"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "34px",
                    fontWeight: "bold",
                    background: "linear-gradient(135deg, #facc15, #92400e)",
                    color: "#071426",
                  }}
                >
                  C
                </div>
              )}
            </div>

            <label
              style={{
                display: "block",
                marginTop: "-4px",
                marginBottom: "20px",
                cursor: "pointer",
                color: "white",
                opacity: 0.8,
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              Alterar foto

              <input
                type="file"
                className="input-foto"
                accept="image/*"
                onChange={trocarFoto}
                style={{ display: "none" }}
              />
            </label>

            <div
              className="card"
              style={{
                padding: "2px 14px",
                margin: "0 auto 12px",
                cursor: "pointer",
                background: "rgba(255,255,255,0.03)",
                display: "block",
                width: "fit-content",
                maxWidth: "260px",
                textAlign: "center",
              }}
            >
              <input
                value={nomePerfil}
                onChange={(e) => setNomePerfil(e.target.value)}
                style={{
                  textAlign: "center",
                  fontSize: "28px",
                  fontWeight: "bold",
                  background: "transparent",
                  border: "none",
                  color: "white",
                  outline: "none",
                  width: "100%",
                  lineHeight: "1",
                  padding: "0",
                }}
              />
            </div>

            <p style={{ opacity: 0.7, marginBottom: "24px" }}>
              Ministério de Música • Cantus
            </p>

            <div style={{ display: "grid", gap: "12px", textAlign: "left" }}>
              <div className="card" style={{ width: "100%", boxSizing: "border-box" }}>
                <strong>Função</strong>
                <input
                  value={funcaoPerfil}
                  onChange={(e) => setFuncaoPerfil(e.target.value)}
                />
              </div>

              <div className="card" style={{ width: "100%", boxSizing: "border-box" }}>
                <strong>Preferência</strong>

                <select
                  value={preferenciaPerfil}
                  onChange={(e) => setPreferenciaPerfil(e.target.value)}
                >
                  <option value="cifras">🎼 Cifras</option>
                  <option value="letras">🎤 Letras</option>
                </select>
              </div>

              <div className="card" style={{ width: "100%", boxSizing: "border-box" }}>
                <strong>Estatísticas</strong>
                <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
                  {musicas.length} músicas cadastradas • {repertorios.length} repertórios
                </p>
              </div>
            </div>

        <button
  onClick={salvarPerfil}
  style={{
    background: "#facc15",
    color: "#081322",
    border: "none",
    borderRadius: "14px",
    padding: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
  }}
>
  💾 Salvar perfil
</button>
          </div>
        )}

        {tela === "palco" && (
          <div
            className="card"
            style={{
              maxWidth: "700px",
              margin: "40px auto",
              textAlign: "center",
              padding: "30px 20px",
            }}
          >
            <h1
              style={{
                fontSize: "34px",
                marginBottom: "10px",
                letterSpacing: "2px",
              }}
            >
              🎤 Palco Pro
            </h1>

            <p
              style={{
                opacity: 0.7,
                marginBottom: "30px",
              }}
            >
              Abra músicas e repertórios em modo apresentação.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <button
                onClick={() => {
                  setTela(TELAS.CIFRAS);
                  setFiltroMomento("todos");
                }}
              >
                🎵 Abrir músicas
              </button>

              <button onClick={() => setTela(TELAS.REPERTORIO)}>
                📋 Abrir repertórios
              </button>
            </div>

            {repertorios.length > 0 && (
              <div style={{ marginTop: "30px", textAlign: "left" }}>
                <h3 style={{ marginBottom: "15px" }}>📅 Repertórios</h3>

                {repertorios.map((repertorio) => (
                  <div
                    key={repertorio.id}
                    className="card"
                    onClick={() => abrirRepertorioNoPalco(repertorio)}
                    style={{
                      cursor: "pointer",
                      marginBottom: "12px",
                    }}
                  >
                    <strong>{repertorio.nomeCelebracao}</strong>

                    <p style={{ opacity: 0.7 }}>
                      📅 {repertorio.dataCelebracao}
                      {" • "}
                      🕘 {repertorio.horarioCelebracao}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(tela === TELAS.CIFRAS ||
          tela === TELAS.SEM_CIFRAS ||
          tela === TELAS.FAVORITOS) && (
          <>
            <div className="header">
              <div className="header-dot"></div>
              <h1 className="header-title">Músicas</h1>
            </div>

            {filtroMomento === null && tela !== TELAS.FAVORITOS && (
              <p style={{ opacity: 0.7, marginTop: "20px" }}>
                Selecione uma pasta no menu lateral.
              </p>
            )}

            {musicaDetalhe && (
              <div className="card detalhe-musica">
                <div className="topo-musica">
                  <button
                    className="btn-voltar"
                    onClick={() => setMusicaDetalhe(null)}
                  >
                    ← Voltar para lista
                  </button>

                  <div className="controles-detalhe">
                    <div className="controle-tom-musica">
                      <button onClick={() => setVelocidade(Math.max(1, velocidade - 1))}>
                        −
                      </button>

                      <span>{tomAtual}</span>

                      <button onClick={() => setVelocidade(Math.min(10, velocidade + 1))}>
                        +
                      </button>

                      <button onClick={() => setVelocidade(1)}>×</button>
                    </div>

                    <button
                      className="btn-ouvir"
                      onClick={() => {
                        let link = musicaDetalhe.youtube;
                        if (!link) return;

                        if (!link.startsWith("http")) {
                          link = "https://" + link;
                        }

                        window.open(link, "_blank");
                      }}
                    >
                      ▶ Ouvir referência
                    </button>
                  </div>
                </div>

                <h2>{musicaDetalhe.nome}</h2>

                <div className="letra-musica">
                  <pre
                    style={{
                      paddingTop: "40px",
                      fontFamily:
                        tipoPalco === "semCifras"
                          ? "Arial, sans-serif"
                          : "Courier New, monospace",
                      fontSize: tipoPalco === "semCifras" ? "18px" : "16px",
                      lineHeight: tipoPalco === "semCifras" ? "1.8" : "1.6",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {tipoPalco === "semCifras"
                      ? removerCifras(
                          musicaDetalhe.letraComCifra || musicaDetalhe.letra || ""
                        )
                      : transporTexto(
                          musicaDetalhe.letraComCifra || musicaDetalhe.letra || "",
                          velocidade - 1
                        )}
                  </pre>
                </div>
              </div>
            )}

            {!musicaDetalhe && filtroMomento !== null && (
              <>
                <input
                  placeholder="Buscar música..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  style={{
                    maxWidth: "640px",
                    margin: "0 auto 18px",
                    display: "block",
                    height: "42px",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}
                >
                  <button
                    onClick={() => {
                      setTipoPalco("comCifras");
                      setMostrarFavoritas(false);
                    }}
                    style={{
                      background:
                        tipoPalco === "comCifras"
                          ? "#f1c93b"
                          : "rgba(255,255,255,0.08)",
                      color: tipoPalco === "comCifras" ? "#000" : "white",
                    }}
                  >
                    🎼 Cifras
                  </button>

                  <button
                    onClick={() => {
                      setTipoPalco("semCifras");
                      setMostrarFavoritas(false);
                    }}
                    style={{
                      background:
                        tipoPalco === "semCifras"
                          ? "#f1c93b"
                          : "rgba(255,255,255,0.08)",
                      color: tipoPalco === "semCifras" ? "#000" : "white",
                    }}
                  >
                    🎤 Letras
                  </button>

                  <button
                    onClick={() => setMostrarFavoritas(!mostrarFavoritas)}
                    style={{ width: "50px" }}
                  >
                    ⭐
                  </button>
                </div>

                {musicasFiltradas.length === 0 && <p>Nenhuma música encontrada.</p>}

                {modoAdicionar &&
                  (tela === TELAS.CIFRAS || tela === TELAS.SEM_CIFRAS) && (
                    <button
                      onClick={() => {
                        sairModoAdicionar();
                        setTela(TELAS.REPERTORIO);
                      }}
                      style={{
                        background: "#ef4444",
                        border: "none",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        color: "white",
                        fontWeight: "bold",
                        cursor: "pointer",
                        marginBottom: "16px",
                      }}
                    >
                      ← Voltar ao repertório
                    </button>
                  )}

                {musicasFiltradas.map((musica) => {
                  const textoOriginal = musica.letraComCifra || musica.letra || "";
                  const textoLimpo =
                    tipoPalco === "semCifras"
                      ? removerCifras(textoOriginal)
                      : textoOriginal;

                  const preview = textoLimpo.replace(/\n/g, " ").slice(0, 120);

                  return (
                    <div
                      className="card"
                      key={musica.id}
                      style={{
                        cursor: "pointer",
                        position: "relative",
                      }}
                      onClick={() => {
                        if (modoAdicionar) {
                          adicionarAoRepertorio(musica);
                        } else {
                          setMusicaDetalhe(musica);
                        }
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                alternarFavorito(musica);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                fontSize: "18px",
                                cursor: "pointer",
                                color: musica.favorito ? "#facc15" : "#555",
                              }}
                            >
                              {musica.favorito ? "⭐" : "☆"}
                            </button>

                            <strong>{musica.nome}</strong>
                          </div>

                          {musica.tom && (
                            <p style={{ fontSize: "12px", opacity: 0.7 }}>
                              Tom: {musica.tom}
                            </p>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              iniciarEdicao(musica);
                            }}
                          >
                            ✏️
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletarMusica(musica.id);
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "10px" }}>
                        {preview}...
                      </p>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {tela === TELAS.IMPORTAR && (
          <div className="card">
            <h2>Importar repertório</h2>

            <p style={{ color: "white" }}>
              Cole aqui o texto do WhatsApp para importar músicas.
            </p>

            <textarea
              placeholder="Cole aqui o texto do WhatsApp"
              value={textoImportado}
              onChange={(e) => setTextoImportado(e.target.value)}
              style={{ width: "100%", height: "200px" }}
            />

            <button onClick={importarTexto}>Importar</button>
          </div>
        )}

       {tela === TELAS.REPERTORIO && (
  <div className="card">
            <h1>📅 Repertório</h1>

            <input
              placeholder="Nome da celebração"
              value={nomeCelebracao}
              onChange={(e) => setNomeCelebracao(e.target.value)}
            />

        
<div className="campo-data-mobile">
  {!dataCelebracao && <span>Data da celebração</span>}

  <input
    type="date"
    value={dataCelebracao}
    onChange={(e) => setDataCelebracao(e.target.value)}
  />
</div>

            <input
              placeholder="Horário"
              value={horarioCelebracao}
              onChange={(e) => setHorarioCelebracao(e.target.value)}
            />

            <button onClick={salvarRepertorio}>💾 Salvar repertório</button>

            <h2>Repertórios criados</h2>

            {[...repertorios]
              .sort(
                (a, b) =>
                  new Date(a.dataCelebracao) - new Date(b.dataCelebracao)
              )
              .map((repertorio) => (
                <div
                  className="card"
                  key={repertorio.id}
                  onClick={() => setRepertorioDetalhe(repertorio)}
                  style={{ cursor: "pointer" }}
                >
                  <h3>{repertorio.nomeCelebracao}</h3>

                  <p>
                     {repertorio.dataCelebracao} • 🕒 {repertorio.horarioCelebracao}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      iniciarModoAdicionar(repertorio);
                    }}
                  >
                    ➕ Adicionar músicas
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletarRepertorio(repertorio.id);
                    }}
                  >
                    🗑️ Deletar repertório
                  </button>
                </div>
              ))}
       </div>
)}
        {repertorioDetalhe && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(3, 10, 25, 0.94)",
              padding: "24px",
              overflowY: "auto",
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: "520px",
                margin: "40px auto",
                border: "1px solid #facc15",
              }}
            >
              <button
                onClick={() => setRepertorioDetalhe(null)}
                style={{ marginBottom: "16px" }}
              >
                ← Voltar
              </button>

              <h2>{repertorioDetalhe.nomeCelebracao}</h2>

              <p>
                📅 {repertorioDetalhe.dataCelebracao} • 🕘{" "}
                {repertorioDetalhe.horarioCelebracao}
              </p>

              <hr />

              {[
                ["entrada", "Entrada"],
                ["atoPenitencial", "Ato Penitencial"],
                ["gloria", "Glória"],
                ["salmo", "Salmo"],
                ["aclamacao", "Aclamação"],
                ["ofertorio", "Ofertório"],
                ["santo", "Santo"],
                ["comunhao", "Comunhão"],
                ["final", "Final"],
              ].map(([campo, titulo]) => (
                <div key={campo} style={{ marginBottom: "18px" }}>
                  <h3>{titulo}</h3>

                  {(repertorioDetalhe[campo] || []).length === 0 ? (
                    <p style={{ opacity: 0.6 }}>Nenhuma música</p>
                  ) : (
                    (repertorioDetalhe[campo] || []).map((m, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "8px",
                        }}
                      >
                        <p style={{ margin: 0 }}>🎵 {m}</p>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removerMusicaDoRepertorio(repertorioDetalhe, campo, m);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "16px",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
       <button onClick={() => setTela(TELAS.HOME)}>
  Início
</button>

        <button
          onClick={() => {
            setTela(TELAS.CIFRAS);
            setFiltroMomento("todos");
          }}
        >
          Músicas
        </button>

        <button onClick={() => setTela(TELAS.REPERTORIO)}>Repertório</button>
        <button onClick={() => setTela("palco")}>Palco</button>

        <button onClick={() => setTela(TELAS.CALENDARIO)}>Calendário</button>
        <button onClick={() => setTela("perfil")}>Perfil</button>
      </nav>

      {fabAberto && (
        <div className="fab-menu">
          <button
            onClick={() => {
              limparCamposMusica();
              setTela(TELAS.ADICIONAR);
              setFabAberto(false);
            }}
          >
            Adicionar música
          </button>

          <button onClick={() => setTela(TELAS.REPERTORIO)}>
            Criar repertório
          </button>

          <button onClick={() => setTela(TELAS.IMPORTAR)}>
            Importar WhatsApp
          </button>
        </div>
      )}

      <button className="fab" onClick={() => setFabAberto(!fabAberto)}>
        +
      </button>
    </div>
  );
}

export default App;