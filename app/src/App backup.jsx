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

const tons = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const momentos = [
  { valor: "entrada", nome: " Entrada" },
  { valor: "atoPenitencial", nome: " Ato Penitencial" },
  { valor: "gloria", nome: " Glória" },
  { valor: "salmo", nome: " Salmo" },
  { valor: "aclamacao", nome: " Aclamação" },
  { valor: "ofertorio", nome: " Ofertório" },
  { valor: "santo", nome: " Santo" },
  { valor: "comunhao", nome: " Comunhão" },
  { valor: "final", nome: " Final" },
  { valor: "semMomento", nome: "Sem momento definido" },
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
  const [musicas, setMusicas] = useState([]);
  const [repertorios, setRepertorios] = useState([]);

  const [tela, setTela] = useState("comCifras");
  const [filtroMomento, setFiltroMomento] = useState(null);
  const [menuAberto, setMenuAberto] = useState(true);
  const [submenuCifrasAberto, setSubmenuCifrasAberto] = useState(false);
  const [submenuSemCifrasAberto, setSubmenuSemCifrasAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const [nome, setNome] = useState("");
  const [tom, setTom] = useState("");
  const [momento, setMomento] = useState("");
  const [letraComCifra, setLetraComCifra] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [musicaSelecionada, setMusicaSelecionada] = useState(null);
  const [musicaDetalhe, setMusicaDetalhe] = useState(null);

  const [tipoPalco, setTipoPalco] = useState("comCifras");
  const [transposicao, setTransposicao] = useState(0);
  const [rolando, setRolando] = useState(false);
  const [velocidade, setVelocidade] = useState(1);

  const [nomeCelebracao, setNomeCelebracao] = useState("");
  const [dataCelebracao, setDataCelebracao] = useState("");
  const [horarioCelebracao, setHorarioCelebracao] = useState("");

  const [entrada, setEntrada] = useState("");
  const [atoPenitencial, setAtoPenitencial] = useState("");
  const [gloria, setGloria] = useState("");
  const [salmo, setSalmo] = useState("");
  const [aclamacao, setAclamacao] = useState("");
  const [ofertorio, setOfertorio] = useState("");
  const [santo, setSanto] = useState("");
  const [comunhao, setComunhao] = useState("");
  const [final, setFinal] = useState("");

  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [repertorioAtivo, setRepertorioAtivo] = useState(null);

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

  useEffect(() => {
    carregarMusicas();
    carregarRepertorios();
  }, []);

  const musicasFiltradas = musicas.filter((musica) => {
    const correspondeBusca = musica.nome
      ?.toLowerCase()
      .includes(busca.toLowerCase());

    const correspondeMomento =
      filtroMomento === null ||
      filtroMomento === "todos" ||
      (musica.momento || "semMomento") === filtroMomento;

    if (tela === "favoritos") {
      return correspondeBusca && musica.favorito;
    }

    return correspondeBusca && correspondeMomento;
  });

  function buscarMusicaPorNome(nomeMusica) {
    return musicas.find((musica) => musica.nome === nomeMusica);
  }

  function nomeDoMomento(valor) {
    return momentos.find((m) => m.valor === valor)?.nome || "";
  }

  function limparCamposMusica() {
    setNome("");
    setTom("");
    setMomento("");
    setLetraComCifra("");
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
    });

    limparCamposMusica();
    carregarMusicas();
    setTela("comCifras");
    setFiltroMomento(null);
  }

  function iniciarEdicao(musica) {
    setNome(musica.nome || "");
    setTom(musica.tom || "");
    setMomento(musica.momento || "semMomento");
    setLetraComCifra(musica.letraComCifra || musica.letra || "");
    setEditandoId(musica.id);
    setMusicaDetalhe(null);
    setTela("adicionar");
  }

  async function salvarEdicao() {
    await updateDoc(doc(db, "musicas", editandoId), {
      nome,
      tom,
      momento: momento || "semMomento",
      letraComCifra,
    });

    limparCamposMusica();
    carregarMusicas();
    setTela("comCifras");
    setFiltroMomento(null);
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
    setTela("comCifras");
    setFiltroMomento(null);
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

    alert(`✅ "${musica.nome}" adicionada em ${nomeDoMomento(musica.momento)}!`);
  }

  async function removerMusicaDoRepertorio(repertorio, campo, nomeMusica) {
    const listaAtual = normalizarLista(repertorio[campo]);
    const novaLista = listaAtual.filter((nome) => nome !== nomeMusica);

    await updateDoc(doc(db, "repertorios", repertorio.id), {
      [campo]: novaLista,
    });

    carregarRepertorios();
  }

  function abrirPalco(musica, tipo) {
    setMusicaSelecionada(musica);
    setTipoPalco(tipo);
    setTransposicao(0);
    setRolando(false);
    setVelocidade(1);
    setTimeout(() => window.scrollTo(0, 0), 50);
  }

  function abrirPasta(tipo, momentoValor) {
    setTela(tipo);
    setFiltroMomento(momentoValor);
    setMusicaDetalhe(null);
  }

  function abrirDetalhe(musica) {
    setMusicaDetalhe(musica);
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
      <div className="modo-palco">
       <button
  onClick={() => setMusicaSelecionada(null)}
  style={{
    position: "fixed",
    top: 10,
    left: 10,
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: "22px",
    cursor: "pointer",
  }}
>
  ←
</button>
<p style={{ color: "#22c55e", fontSize: "13px", fontWeight: "bold" }}>
  ● PALCO PRO
</p>
        <h1>{musicaSelecionada.nome}</h1>

        {tipoPalco === "comCifras" && <h2>Tom: {tomFinal}</h2>}

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
          <button onClick={() => setRolando(!rolando)}>
            {rolando ? "⏸ Pausar" : "▶ Iniciar rolagem"}
          </button>

          <div style={{ width: "100%" }}>
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

        <pre>{textoFinal}</pre>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <button className="botao-menu" onClick={() => setMenuAberto(!menuAberto)}>
        ☰
      </button>

      <aside className={menuAberto ? "sidebar aberta" : "sidebar fechada"}>
       <h2>Ministério</h2>
        <button
          onClick={() => {
            setSubmenuCifrasAberto(!submenuCifrasAberto);
            setTela("comCifras");
            setFiltroMomento(null);
            setMusicaDetalhe(null);
          }}
        >
         Com cifras{submenuCifrasAberto ? "▲" : "▼"}
        </button>

        {submenuCifrasAberto && (
          <div className="submenu">
            {momentos.map((m) => (
          <button
  key={"cifra-" + m.valor}
  className={
    tela === "comCifras" && filtroMomento === m.valor ? "ativo-sub" : ""
  }
  onClick={() => abrirPasta("comCifras", m.valor)}
>
  {m.nome}
</button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            setSubmenuSemCifrasAberto(!submenuSemCifrasAberto);
            setTela("semCifras");
            setFiltroMomento(null);
            setMusicaDetalhe(null);
          }}
        >
        Sem cifras {submenuSemCifrasAberto ? "▲" : "▼"}
        </button>

        {submenuSemCifrasAberto && (
          <div className="submenu">
            {momentos.map((m) => (
              <button
                key={"sem-" + m.valor}
                onClick={() => abrirPasta("semCifras", m.valor)}
              >
                {m.nome}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            setTela("favoritos");
            setFiltroMomento("todos");
            setMusicaDetalhe(null);
          }}
        >
        Favoritos
        </button>

        <button onClick={() => setTela("adicionar")}> Adicionar</button>
        <button onClick={() => setTela("repertorio")}> Repertório</button>
      </aside>

      <main className="container">
        {modoAdicionar && repertorioAtivo && (
          <div className="card" style={{ border: "1px solid #22c55e" }}>
            <h3> Modo adicionar ao repertório</h3>
            <p>
              Repertório ativo: <strong>{repertorioAtivo.nomeCelebracao}</strong>
            </p>
            <p>Escolha uma pasta no menu lateral e adicione as músicas desejadas.</p>

            <button onClick={sairModoAdicionar} style={{ background: "#ef4444" }}>
              ❌ Sair do modo repertório
            </button>
          </div>
        )}

        {tela === "adicionar" && (
          <>
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
              <option value="">Momento da missa</option>
              {momentos
                .filter((m) => m.valor !== "semMomento")
                .map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.nome}
                  </option>
                ))}
            </select>

            <textarea
              placeholder="Letra com cifras"
              value={letraComCifra}
              onChange={(e) => setLetraComCifra(e.target.value)}
            />

            {editandoId ? (
              <button onClick={salvarEdicao}>💾 Salvar edição</button>
            ) : (
              <button onClick={adicionarMusica}>💾 Salvar música</button>
            )}
          </>
        )}

        {(tela === "comCifras" || tela === "semCifras" || tela === "favoritos") && (
          <>
           <div className="header">
  <div className="header-dot"></div>

  <h1 className="header-title">
    {tela === "comCifras" && "Com cifras"}
    {tela === "semCifras" && "Sem cifras"}
    {tela === "favoritos" && "Favoritos"}
  </h1>
</div>

            {filtroMomento && filtroMomento !== "todos" && (
              <h2>{nomeDoMomento(filtroMomento)}</h2>
            )}

            {filtroMomento === null && tela !== "favoritos" && (
              <p style={{ opacity: 0.7, marginTop: "20px" }}>
                Selecione uma pasta no menu lateral.
              </p>
            )}

            {musicaDetalhe && (
              <div className="card">
                <button onClick={() => setMusicaDetalhe(null)}>⬅ Voltar para lista</button>

                <h2>
                  {musicaDetalhe.favorito ? "⭐ " : ""}
                  {musicaDetalhe.nome}
                </h2>

                {(tela === "comCifras" || tela === "favoritos") && (
                  <p>Tom: {musicaDetalhe.tom}</p>
                )}

                <pre>
                  {tela === "semCifras"
                    ? removerCifras(
                        musicaDetalhe.letraComCifra || musicaDetalhe.letra || ""
                      )
                    : musicaDetalhe.letraComCifra || musicaDetalhe.letra || ""}
                </pre>

                {modoAdicionar && repertorioAtivo && (
                  <button
                    onClick={() => adicionarAoRepertorio(musicaDetalhe)}
                    style={{ background: "#22c55e" }}
                  >
                    ➕ Adicionar ao repertório
                  </button>
                )}

                <button onClick={() => alternarFavorito(musicaDetalhe)}>
                  {musicaDetalhe.favorito
                    ? "⭐ Remover dos favoritos"
                    : "☆ Adicionar aos favoritos"}
                </button>

                <button
                  onClick={() =>
                    abrirPalco(
                      musicaDetalhe,
                      tela === "semCifras" ? "semCifras" : "comCifras"
                    )
                  }
                >
                    Palco Pro
                </button>

                <button onClick={() => iniciarEdicao(musicaDetalhe)}>
                  ✏️ Editar
                </button>

                <button onClick={() => deletarMusica(musicaDetalhe.id)}>
                  🗑️ Deletar
                </button>
              </div>
            )}

            {!musicaDetalhe && filtroMomento !== null && (
              <>
                <input
                  placeholder="🔍 Buscar"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />

                {musicasFiltradas.length === 0 && (
                  <p>Nenhuma música encontrada.</p>
                )}

                {musicasFiltradas.map((musica) => {
                  const textoOriginal = musica.letraComCifra || musica.letra || "";
                  const textoLimpo =
                    tela === "semCifras"
                      ? removerCifras(textoOriginal)
                      : textoOriginal;

                  const preview = textoLimpo.replace(/\n/g, " ").slice(0, 120);

                  return (
<div className="card" key={musica.id}>
  <div className="card-header">
    <span className="card-title">
      {musica.favorito ? "★ " : ""}
      {musica.nome}
    </span>

    {(tela === "comCifras" || tela === "favoritos") && (
      <span className="card-tom">Tom: {musica.tom}</span>
    )}
  </div>

  <p className="card-preview">
    {preview}
    {preview.length >= 120 ? "..." : ""}
  </p>

  <div className="card-actions">
    <button onClick={() => abrirDetalhe(musica)}>
      Ver música
    </button>

    {modoAdicionar && repertorioAtivo && (
      <button
        onClick={() => adicionarAoRepertorio(musica)}
        style={{ background: "#22c55e" }}
      >
        Adicionar
      </button>
    )}
  </div>
</div>
                  );
                })}
              </>
            )}
          </>
        )}

        {tela === "repertorio" && (
          <>
            <h1>📅 Repertório</h1>

            <input
              placeholder="Nome da celebração"
              value={nomeCelebracao}
              onChange={(e) => setNomeCelebracao(e.target.value)}
            />

            <input
              type="date"
              value={dataCelebracao}
              onChange={(e) => setDataCelebracao(e.target.value)}
            />

            <input
              placeholder="Horário"
              value={horarioCelebracao}
              onChange={(e) => setHorarioCelebracao(e.target.value)}
            />

            <h2>Momentos da Missa</h2>

            {[
              ["Entrada", entrada, setEntrada, "entrada"],
              ["Ato Penitencial", atoPenitencial, setAtoPenitencial, "atoPenitencial"],
              ["Glória", gloria, setGloria, "gloria"],
              ["Salmo", salmo, setSalmo, "salmo"],
              ["Aclamação", aclamacao, setAclamacao, "aclamacao"],
              ["Ofertório", ofertorio, setOfertorio, "ofertorio"],
              ["Santo", santo, setSanto, "santo"],
              ["Comunhão", comunhao, setComunhao, "comunhao"],
              ["Final", final, setFinal, "final"],
            ].map(([label, value, setValue, momentoValor]) => (
              <select
                key={label}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              >
                <option value="">{label}</option>
                {musicas
                  .filter((musica) => musica.momento === momentoValor)
                  .map((musica) => (
                    <option key={musica.id} value={musica.nome}>
                      {musica.favorito ? "⭐ " : ""}
                      {musica.nome}
                    </option>
                  ))}
              </select>
            ))}

            <button onClick={salvarRepertorio}>💾 Salvar repertório</button>

            <h2>Repertórios criados</h2>

            {repertorios.map((repertorio) => (
              <div className="card" key={repertorio.id}>
                <h3>{repertorio.nomeCelebracao}</h3>
                <p>
                  {repertorio.dataCelebracao} - {repertorio.horarioCelebracao}
                </p>

                <button onClick={() => iniciarModoAdicionar(repertorio)}>
                  ➕ Adicionar músicas
                </button>

                <button onClick={() => deletarRepertorio(repertorio.id)}>
                  🗑️ Deletar repertório
                </button>

                {[
                  ["Entrada", "entrada"],
                  ["Ato Penitencial", "atoPenitencial"],
                  ["Glória", "gloria"],
                  ["Salmo", "salmo"],
                  ["Aclamação", "aclamacao"],
                  ["Ofertório", "ofertorio"],
                  ["Santo", "santo"],
                  ["Comunhão", "comunhao"],
                  ["Final", "final"],
                ].map(([momentoNome, campo]) => {
                  const listaMusicas = normalizarLista(repertorio[campo]);

                  if (listaMusicas.length === 0) return null;

                  return (
                    <div className="card" key={campo}>
                      <strong>{momentoNome}</strong>

                      {listaMusicas.map((nomeMusica) => {
                        const musica = buscarMusicaPorNome(nomeMusica);

                        return (
                          <div key={nomeMusica} style={{ marginTop: "10px" }}>
                            <p>{nomeMusica}</p>

                            {musica && (
                              <>
                                <button onClick={() => abrirPalco(musica, "comCifras")}>
                                  🎸 Músico
                                </button>

                                <button onClick={() => abrirPalco(musica, "semCifras")}>
                                  🎤 Vocal
                                </button>
                              </>
                            )}

                            <button
                              onClick={() =>
                                removerMusicaDoRepertorio(
                                  repertorio,
                                  campo,
                                  nomeMusica
                                )
                              }
                              style={{ background: "#ef4444" }}
                            >
                              ❌ Remover do momento
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

export default App;