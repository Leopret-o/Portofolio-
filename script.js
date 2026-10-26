/* =====================================================
   SCRIPT.JS — a lógica do site
   Dados vêm do Supabase. O login é feito com email e palavra-passe.

   ÍNDICE
   1. Ajudantes (funções pequenas usadas em vários sítios)
   2. Dados de exemplo
   3. Ligação ao Supabase
   4. Carregar e guardar os dados
   5. Desenhar a página
   6. Login e sessão
   7. Editor (gaveta lateral)
   8. Botões e arranque
   ===================================================== */

// "use strict" faz o JavaScript avisar-te de erros que de outra forma passavam em silêncio
"use strict";

/* ---------- 0. PROTEÇÃO CONTRA PÁGINA EM BRANCO ----------
   Se algo correr mal (por exemplo, um erro no config.js), a página NÃO pode ficar invisível.
   Qualquer erro não tratado aparece escrito no ecrã e a página mostra-se na mesma.
   No telemóvel não há consola, por isso é assim que vês o problema. */
window.addEventListener("error", (evento) => {
  mostrarErroNoEcra("Erro: " + (evento.message || "motivo desconhecido"));
});
window.addEventListener("unhandledrejection", (evento) => {
  mostrarErroNoEcra("Erro: " + textoDoErro(evento.reason));
});

// Escondemos a página até os dados chegarem (senão via-se o exemplo por instantes)
document.documentElement.classList.add("a-carregar");


/* ---------- 1. AJUDANTES ---------- */

// Atalho: $("#frase") é o mesmo que document.querySelector("#frase")
const $ = (seletor) => document.querySelector(seletor);

// Código curto e aleatório (ex.: "k3j9x0a") para identificar cada item da lista
const uid = () => Math.random().toString(36).slice(2, 9);

// PROTEÇÃO contra XSS: troca os caracteres perigosos do HTML por versões "seguras".
// Usamos isto sempre que metemos dados do utilizador dentro de innerHTML.
const esc = (valor) =>
  String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Só aceita links que começam por http:// ou https:// (bloqueia "javascript:...")
const linkSeguro = (valor) => {
  const s = String(valor ?? "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
};

// Só aceita imagens: ficheiro do repositório (foto.jpg), link https:// ou imagem carregada (data:image/...)
const imagemSegura = (valor) => {
  const s = String(valor ?? "").trim();
  const valida = /^([\w./-]+\.(jpe?g|png|webp|gif)|https:\/\/\S+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/i;
  return valida.test(s) ? s : "";
};

// Só aceita emails com aspeto válido (alguem@dominio.com)
const emailSeguro = (valor) => {
  const s = String(valor ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
};

// Mantém um número entre 0 e 100
const limitar = (n) => Math.min(100, Math.max(0, Number(n) || 0));

// Mensagem curta no fundo do ecrã.
// "duracao" em milissegundos: 0 = fica no ecrã até lhe tocares.
let temporizadorAviso = null;
function mostrarAviso(texto, duracao = 4500) {
  const aviso = $("#aviso");
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  if (duracao > 0) temporizadorAviso = setTimeout(() => (aviso.hidden = true), duracao);
}

// Mostra um erro no ecrã sem depender do resto do script (funciona mesmo que algo tenha falhado).
function mostrarErroNoEcra(texto) {
  const aviso = document.getElementById("aviso");
  if (aviso) {
    aviso.textContent = texto;
    aviso.hidden = false;   // fica visível até lhe tocares
  }
  document.documentElement.classList.remove("a-carregar"); // a página mostra-se mesmo assim
}

// Qualquer erro (texto, objeto ou erro do Supabase) passa a ser uma frase legível
const textoDoErro = (erro) => (erro && erro.message ? erro.message : String(erro));


/* ---------- 2. DADOS DE EXEMPLO ----------
   Só são usados enquanto ainda não houver nada guardado no Supabase.
   Depois de guardares no editor, estes valores deixam de aparecer. */
function dadosDeExemplo() {
  return {
    nome: "José Da Luz",
    titulo: "Estudante de Engenharia Informática",
    frase: "Construo interfaces claras e rápidas enquanto estudo engenharia informática.",
    disponibilidade: "Disponível para estágios",
    bio: "Apaixonado por tecnologia e desenvolvimento web. Estou a construir projectos reais enquanto estudo.",
    foto: "foto.jpg",                 // ficheiro que está na raiz do repositório
    email: "jose@email.com",
    telefone: "+244 900 000 000",
    local: "Luanda, Angola",
    github: "https://github.com/",
    linkedin: "https://linkedin.com/in/",
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    skills: [
      { id: uid(), nome: "HTML & CSS", nivel: 85 },
      { id: uid(), nome: "JavaScript", nivel: 70 },
      { id: uid(), nome: "React", nivel: 55 },
      { id: uid(), nome: "Git & GitHub", nivel: 65 },
    ],
    projetos: [
      { id: uid(), titulo: "Landing page da turma", descricao: "Página responsiva com HTML, CSS e JavaScript.", link: "", tags: "HTML, CSS, JS", imagem: "" },
      { id: uid(), titulo: "Calculadora de notas", descricao: "Calcula a média final e mostra o resultado em tempo real.", link: "", tags: "JavaScript", imagem: "" },
    ],
    formacoes: [
      { id: uid(), curso: "Engenharia Informática", instituicao: "Universidade", periodo: "2024 — presente" },
      { id: uid(), curso: "Ensino Médio — Informática", instituicao: "Instituto", periodo: "2020 — 2023" },
    ],
  };
}


/* ---------- 3. LIGAÇÃO AO SUPABASE ---------- */

// A tabela "portfolio" tem só UMA linha, com id = 1 (ver o supabase.sql)
const ID_DO_PORTFOLIO = 1;

// Lê as variáveis do config.js com cuidado. "typeof" não dá erro, mesmo que o config.js
// esteja estragado e a variável nem exista. Assim, em vez de a página parar, damos uma mensagem.
const configSupabase = {
  url: typeof SUPABASE_URL === "string" ? SUPABASE_URL.trim() : "",
  chave: typeof SUPABASE_CHAVE === "string" ? SUPABASE_CHAVE.trim() : "",
  email: typeof EMAIL_DO_DONO === "string" ? EMAIL_DO_DONO.trim().toLowerCase() : "",
};

// Um valor está preenchido se não estiver vazio e não for o texto de modelo "COLA-AQUI"
const preenchido = (valor) => valor !== "" && !valor.includes("COLA-AQUI");

// O URL do projeto tem de ser só "https://xxxx.supabase.co".
// Está errado se tiver "/rest/v1/", barras a mais, espaços ou outro domínio.
function urlDoProjetoValido(url) {
  try {
    const u = new URL(url);                       // o browser tenta perceber o endereço
    return u.protocol === "https:" && (u.pathname === "/" || u.pathname === "") && !u.search && !u.hash;
  } catch (erro) {
    return false;                                 // endereço impossível de ler, ex.: "//https://..."
  }
}

// Qual é o problema da configuração? Texto vazio = está tudo bem.
let problemaDeConfiguracao = "";
if (!preenchido(configSupabase.url) || !preenchido(configSupabase.chave) || !preenchido(configSupabase.email)) {
  problemaDeConfiguracao = "Falta preencher o config.js (ver o guia, passo 6).";
} else if (!urlDoProjetoValido(configSupabase.url)) {
  problemaDeConfiguracao = "O SUPABASE_URL do config.js está errado. Tem de ser só https://xxxx.supabase.co (sem /rest/v1/ e sem barras a mais).";
}

// A ligação ao Supabase. Começa vazia e só é criada no "iniciar()", dentro de um try/catch.
let clienteSupabase = null;
// Guarda o motivo de não haver ligação, para o mostrar quando tocas em "Área do autor"
let motivoSemLigacao = "";


/* ---------- 4. CARREGAR E GUARDAR ---------- */

let dados = dadosDeExemplo();   // o estado do site: tudo o que se vê vem daqui
let ehDono = false;             // fica true só quando tens sessão iniciada com o TEU email
let dadosCarregados = false;    // true depois de ler o Supabase com sucesso
let temporizadorGuardar = null;

// Vai buscar os dados à base de dados. Não precisa de login:
// a regra "Todos podem ler" (no supabase.sql) deixa qualquer visitante ler.
async function carregarDoSupabase() {
  const { data, error } = await clienteSupabase
    .from("portfolio")            // a tabela
    .select("dados")              // só a coluna "dados" (o JSON com todo o conteúdo)
    .eq("id", ID_DO_PORTFOLIO)    // a linha com id = 1
    .maybeSingle();               // se a linha não existir, devolve null em vez de erro

  if (error) throw error;         // se algo correu mal, o "catch" do arranque trata disso
  if (data && data.dados) {
    // Junta os dados guardados aos de exemplo. Os guardados ganham.
    dados = { ...dadosDeExemplo(), ...data.dados };
  }
  dadosCarregados = true;         // agora já é seguro guardar (não apagamos nada sem querer)
}

// Espera 0,9 segundos depois da ÚLTIMA alteração e só então guarda.
// Assim não gravamos a cada letra que escreves.
function agendarGuardar() {
  mostrarEstadoGuardar("A guardar…");
  clearTimeout(temporizadorGuardar);
  temporizadorGuardar = setTimeout(guardarAgora, 900);
}

async function guardarAgora() {
  if (!ehDono) return;                       // só tu podes guardar
  if (!dadosCarregados) {                    // se a leitura falhou, não guardamos o exemplo por cima
    mostrarEstadoGuardar("Recarrega a página antes de guardar.");
    return;
  }
  const { error } = await clienteSupabase
    .from("portfolio")
    .upsert({                                // "upsert" = cria a linha se não existir, senão atualiza
      id: ID_DO_PORTFOLIO,
      dados: dados,                          // o objeto inteiro é enviado em JSON
      atualizado_em: new Date().toISOString(),
    });
  // Se as regras (RLS) recusarem, o erro aparece aqui para perceberes o que se passou
  mostrarEstadoGuardar(error ? "Erro ao guardar: " + error.message : "Guardado ✓");
}


/* ---------- 5. DESENHAR A PÁGINA ----------
   Lê "dados" e escreve no HTML. Chamamos esta função sempre que algo muda.
   animar = true → as barras de competências começam vazias e enchem-se (só no arranque). */
function desenhar(animar = false) {

  // --- Textos simples: textContent é seguro (nunca interpreta HTML) ---
  document.title = `${dados.nome} — Portfólio`;
  $("#marca").textContent = dados.nome;
  $("#disponibilidade").textContent = dados.disponibilidade;
  $("#frase").textContent = dados.frase;
  $("#titulo").textContent = dados.titulo;
  $("#bio").textContent = dados.bio;
  $("#contacto-detalhes").textContent = [dados.local, dados.telefone].filter(Boolean).join(" · ");
  $("#rodape-texto").textContent = `© ${new Date().getFullYear()} ${dados.nome}`;

  // --- Foto: se o caminho não for válido, escondemos a imagem ---
  const foto = $("#foto");
  const srcFoto = imagemSegura(dados.foto);
  foto.hidden = !srcFoto;
  if (srcFoto) {
    foto.src = srcFoto;
    foto.alt = `Foto de ${dados.nome}`;
  }

  // --- Email: botão do topo e email grande da secção de contacto ---
  const email = emailSeguro(dados.email);
  $("#botao-email").href = email ? `mailto:${email}` : "#contacto";
  $("#email-grande").href = email ? `mailto:${email}` : "#contacto";
  $("#email-grande").textContent = dados.email;

  // --- Redes sociais: se o link estiver vazio ou for inválido, escondemos o botão ---
  for (const rede of ["github", "linkedin", "instagram", "facebook"]) {
    const link = $("#rede-" + rede);
    const url = linkSeguro(dados[rede]);
    link.hidden = !url;
    link.href = url || "#";
  }

  // --- Botão "Editar": só aparece com sessão iniciada ---
  $("#btn-editar").hidden = !ehDono;

  // --- Competências: uma linha com nome, percentagem e barra ---
  $("#lista-skills").innerHTML = dados.skills
    .map((s) => {
      const nivel = limitar(s.nivel);
      // Se "animar" for true, a barra começa em 0% e, logo a seguir, passa ao valor real
      return `
        <li>
          <div class="skill-topo"><span>${esc(s.nome)}</span><span>${nivel}%</span></div>
          <div class="barra-skill">
            <div class="barra-skill-cheia" data-nivel="${nivel}" style="width:${animar ? 0 : nivel}%"></div>
          </div>
        </li>`;
    })
    .join("");

  if (animar) {
    // Duas "frames" depois, o browser já pintou a barra em 0%. Agora mudamos para o valor real.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.querySelectorAll(".barra-skill-cheia").forEach((b) => {
          b.style.width = b.dataset.nivel + "%";
        });
      })
    );
  }

  // --- Projectos: cartão com imagem (ou a inicial) e uma etiqueta com nome e tecnologias ---
  $("#lista-projetos").innerHTML = dados.projetos
    .map((p) => {
      const imagem = imagemSegura(p.imagem);
      const link = linkSeguro(p.link);
      // "HTML, CSS" -> ["HTML", "CSS"] (sem espaços a mais e sem vazios)
      const tags = String(p.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
      const conteudo = `
        ${imagem
          ? `<img src="${esc(imagem)}" alt="${esc(p.titulo)}" loading="lazy">`
          : `<span class="projeto-vazio" aria-hidden="true">${esc(String(p.titulo ?? "").charAt(0))}</span>`}
        <span class="legenda">
          <strong>${esc(p.titulo)}</strong>
          ${tags.length ? `<span>${esc(tags.join(", "))}</span>` : ""}
        </span>`;
      // Se o projecto tiver link, o cartão inteiro passa a ser um link clicável
      return link
        ? `<a class="projeto" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${conteudo}</a>`
        : `<div class="projeto">${conteudo}</div>`;
    })
    .join("");

  // --- Formação: período à esquerda, curso e instituição à direita ---
  $("#lista-formacoes").innerHTML = dados.formacoes
    .map(
      (f) => `
        <div class="formacao">
          <span class="periodo">${esc(f.periodo)}</span>
          <div>
            <p class="curso">${esc(f.curso)}</p>
            <p class="instituicao">${esc(f.instituicao)}</p>
          </div>
        </div>`
    )
    .join("");
}


/* ---------- 6. LOGIN E SESSÃO ---------- */

// Compara o email da sessão com o TEU email (sem diferenciar maiúsculas)
const emailEhDono = (email) => String(email ?? "").toLowerCase() === configSupabase.email;

// O Supabase avisa-nos sempre que alguém entra, sai ou a sessão é renovada.
// Também avisa logo ao abrir a página, para sabermos se já estás com sessão iniciada neste dispositivo.
function ligarSessao() {
  clienteSupabase.auth.onAuthStateChange((_evento, sessao) => {
    ehDono = Boolean(sessao) && emailEhDono(sessao.user.email);
    $("#btn-editar").hidden = !ehDono;   // mostra ou esconde o botão "Editar"
  });
}

function abrirLogin() {
  if (!clienteSupabase) return mostrarAviso(motivoSemLigacao || "Sem ligação ao Supabase.", 0);
  $("#erro-login").hidden = true;
  $("#janela-login").hidden = false;
  $("#campo-email").focus();
}

function fecharLogin() {
  $("#janela-login").hidden = true;
}

// Corre quando carregas em "Entrar"
async function entrar(evento) {
  evento.preventDefault();                   // impede a página de recarregar ao enviar o formulário
  const erro = $("#erro-login");
  const botao = $("#btn-entrar");
  erro.hidden = true;
  botao.disabled = true;                     // evita carregar duas vezes seguidas

  const email = $("#campo-email").value.trim();
  const palavra = $("#campo-palavra").value;

  // Pede ao Supabase para confirmar o email e a palavra-passe
  const { data, error } = await clienteSupabase.auth.signInWithPassword({ email, password: palavra });
  botao.disabled = false;
  $("#campo-palavra").value = "";            // por segurança, apagamos a palavra-passe do campo

  if (error) {
    // Mostramos a mensagem do Supabase (em inglês) para perceberes o motivo, ex.: "Invalid login credentials"
    erro.textContent = "Não entrou: " + error.message;
    erro.hidden = false;
    return;
  }

  // Se entrou uma conta que não é a tua, terminamos a sessão logo
  if (!emailEhDono(data.user.email)) {
    await clienteSupabase.auth.signOut();
    erro.textContent = "Esta conta não pode editar este site.";
    erro.hidden = false;
    return;
  }

  fecharLogin();
  abrirEditor();
}

// Termina a sessão SÓ neste dispositivo (nos outros continuas com sessão iniciada)
async function sair() {
  await clienteSupabase.auth.signOut();
  fecharEditor();
  mostrarAviso("Sessão terminada neste dispositivo.");
}


/* ---------- 7. EDITOR (gaveta lateral) ----------
   O formulário é construído UMA vez ao abrir. Quando escreves, só atualizamos "dados"
   e a página (sem reconstruir o formulário, senão o teclado do telemóvel fechava a cada letra). */

// Como é um item novo, quando carregas em "+ Adicionar"
const NOVOS_ITENS = {
  skills: () => ({ id: uid(), nome: "Nova competência", nivel: 50 }),
  projetos: () => ({ id: uid(), titulo: "Novo projecto", descricao: "", link: "", tags: "", imagem: "" }),
  formacoes: () => ({ id: uid(), curso: "Novo curso", instituicao: "", periodo: "" }),
};

function abrirEditor() {
  construirEditor();
  mostrarEstadoGuardar("As alterações são guardadas no Supabase automaticamente.");
  $("#janela-editor").hidden = false;
  document.body.classList.add("sem-scroll");   // a página de trás deixa de rolar
}

function fecharEditor() {
  $("#janela-editor").hidden = true;
  document.body.classList.remove("sem-scroll");
}

function fecharTudo() {
  fecharLogin();
  fecharEditor();
}

function mostrarEstadoGuardar(texto) {
  $("#estado-guardar").textContent = texto;
}

// Gera os atributos que dizem ao JavaScript QUAL campo (e de que item) estamos a editar.
// Ex.: data-campo="nome" data-lista="skills" data-id="k3j9x0a"
function atributos(campo, lista, id) {
  return `data-campo="${campo}"` + (lista ? ` data-lista="${lista}" data-id="${id}"` : "");
}

// Campo de uma linha (ex.: nome, email)
function campoTexto(campo, rotulo, valor, tipo = "text") {
  return `
    <label class="campo-rotulo" for="c-${campo}">${rotulo}</label>
    <input id="c-${campo}" type="${tipo}" value="${esc(valor)}" ${atributos(campo)}>`;
}

// Caixa de texto de várias linhas (ex.: biografia)
function campoLongo(campo, rotulo, valor) {
  return `
    <label class="campo-rotulo" for="c-${campo}">${rotulo}</label>
    <textarea id="c-${campo}" rows="4" ${atributos(campo)}>${esc(valor)}</textarea>`;
}

// Bloco para escolher, trocar ou remover uma imagem
function blocoImagem(campo, lista, id, valor, redonda = false) {
  const src = imagemSegura(valor);
  const atr = atributos(campo, lista, id);
  return `
    <div class="imagem-linha">
      <div class="miniatura ${redonda ? "redonda" : ""}">
        ${src ? `<img src="${esc(src)}" alt="">` : ""}
      </div>
      <div class="imagem-botoes">
        <button type="button" class="btn btn-contorno btn-pequeno" data-acao="escolher-imagem">
          ${src ? "Trocar imagem" : "Escolher imagem"}
        </button>
        ${src ? `<button type="button" class="btn-remover" data-acao="remover-imagem" ${atr}>Remover</button>` : ""}
        <!-- Input de ficheiro escondido: quem o abre é o botão de cima -->
        <input type="file" accept="image/*" class="ficheiro-escondido" ${atr}>
      </div>
    </div>`;
}

// Desenha o formulário inteiro com os valores atuais de "dados"
function construirEditor() {
  $("#editor").innerHTML = `
    <div class="bloco">
      <h3>Foto</h3>
      ${blocoImagem("foto", "", "", dados.foto, true)}
    </div>

    <div class="bloco">
      <h3>Início</h3>
      ${campoTexto("nome", "Nome", dados.nome)}
      ${campoTexto("titulo", "Título ou curso", dados.titulo)}
      ${campoTexto("frase", "Frase principal (a grande, no topo)", dados.frase)}
      ${campoTexto("disponibilidade", "Estado (ex.: Disponível para estágios)", dados.disponibilidade)}
      ${campoLongo("bio", "Pequena biografia", dados.bio)}
    </div>

    <div class="bloco">
      <h3>Contacto e redes</h3>
      ${campoTexto("email", "Email", dados.email, "email")}
      ${campoTexto("telefone", "Telefone", dados.telefone)}
      ${campoTexto("local", "Localização", dados.local)}
      ${campoTexto("github", "Link do GitHub", dados.github, "url")}
      ${campoTexto("linkedin", "Link do LinkedIn", dados.linkedin, "url")}
      ${campoTexto("instagram", "Link do Instagram", dados.instagram, "url")}
      ${campoTexto("facebook", "Link do Facebook", dados.facebook, "url")}
    </div>

    <div class="bloco">
      <div class="bloco-topo">
        <h3>Competências</h3>
        <button type="button" class="btn btn-contorno btn-pequeno" data-acao="adicionar" data-lista="skills">+ Adicionar</button>
      </div>
      ${dados.skills
        .map(
          (s) => `
        <div class="linha">
          <input type="text" value="${esc(s.nome)}" ${atributos("nome", "skills", s.id)} aria-label="Nome da competência">
          <input type="number" class="nivel" min="0" max="100" inputmode="numeric" value="${limitar(s.nivel)}" ${atributos("nivel", "skills", s.id)} aria-label="Nível em percentagem">
          <button type="button" class="btn-remover" data-acao="remover" data-lista="skills" data-id="${s.id}">Remover</button>
        </div>`
        )
        .join("")}
    </div>

    <div class="bloco">
      <div class="bloco-topo">
        <h3>Projectos</h3>
        <button type="button" class="btn btn-contorno btn-pequeno" data-acao="adicionar" data-lista="projetos">+ Adicionar</button>
      </div>
      ${dados.projetos
        .map(
          (p) => `
        <div class="item">
          <div class="linha">
            <input type="text" value="${esc(p.titulo)}" placeholder="Título" ${atributos("titulo", "projetos", p.id)}>
            <button type="button" class="btn-remover" data-acao="remover" data-lista="projetos" data-id="${p.id}">Remover</button>
          </div>
          ${blocoImagem("imagem", "projetos", p.id, p.imagem)}
          <textarea rows="2" placeholder="Descrição" ${atributos("descricao", "projetos", p.id)}>${esc(p.descricao)}</textarea>
          <input type="text" value="${esc(p.tags)}" placeholder="Tecnologias, separadas por vírgula" ${atributos("tags", "projetos", p.id)}>
          <input type="url" value="${esc(p.link)}" placeholder="Link do projecto (https://...)" ${atributos("link", "projetos", p.id)}>
        </div>`
        )
        .join("")}
    </div>

    <div class="bloco">
      <div class="bloco-topo">
        <h3>Formação</h3>
        <button type="button" class="btn btn-contorno btn-pequeno" data-acao="adicionar" data-lista="formacoes">+ Adicionar</button>
      </div>
      ${dados.formacoes
        .map(
          (f) => `
        <div class="item">
          <div class="linha">
            <input type="text" value="${esc(f.curso)}" placeholder="Curso" ${atributos("curso", "formacoes", f.id)}>
            <button type="button" class="btn-remover" data-acao="remover" data-lista="formacoes" data-id="${f.id}">Remover</button>
          </div>
          <input type="text" value="${esc(f.instituicao)}" placeholder="Instituição" ${atributos("instituicao", "formacoes", f.id)}>
          <input type="text" value="${esc(f.periodo)}" placeholder="Período (ex.: 2024 — presente)" ${atributos("periodo", "formacoes", f.id)}>
        </div>`
        )
        .join("")}
    </div>`;
}

// Guarda um valor no sítio certo dentro de "dados":
// - com "lista" e "id": mexe num item da lista (ex.: uma competência)
// - sem lista: mexe num campo de topo (ex.: o nome)
function definirValor({ campo, lista, id }, valor) {
  if (lista) {
    const item = dados[lista].find((x) => x.id === id);
    if (item) item[campo] = valor;
  } else {
    dados[campo] = valor;
  }
}

// Reduz a imagem ANTES de guardar. Uma foto do telemóvel pode ter vários megabytes;
// redimensionamos para no máximo 1000 px e comprimimos em JPEG (mais leve para a base de dados).
function reduzirImagem(ficheiro) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();                   // lê o ficheiro escolhido no telemóvel
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onload = () => {
        const escala = Math.min(1, 1000 / Math.max(imagem.width, imagem.height));
        const tela = document.createElement("canvas"); // uma "tela" invisível onde desenhamos a versão pequena
        tela.width = Math.round(imagem.width * escala);
        tela.height = Math.round(imagem.height * escala);
        const desenho = tela.getContext("2d");
        desenho.fillStyle = "#ffffff";                 // fundo branco (senão um PNG transparente ficaria preto)
        desenho.fillRect(0, 0, tela.width, tela.height);
        desenho.drawImage(imagem, 0, 0, tela.width, tela.height);

        let url = tela.toDataURL("image/jpeg", 0.85);  // texto "data:image/jpeg;base64,..." com qualidade 85%
        if (url.length > 600000) url = tela.toDataURL("image/jpeg", 0.6); // se ainda for grande, comprime mais
        resolver(url);
      };
      imagem.onerror = () => rejeitar(new Error("imagem inválida"));
      imagem.src = leitor.result;
    };
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsDataURL(ficheiro);                    // começa a ler o ficheiro
  });
}

// Quando escreves num campo do editor (texto, número, link...)
function aoEscrever(evento) {
  const alvo = evento.target;
  if (!alvo.dataset.campo || alvo.type === "file") return;   // ignora o que não é campo de texto
  let valor = alvo.value;
  if (alvo.dataset.campo === "nivel") valor = limitar(valor); // o nível fica sempre entre 0 e 100
  definirValor(alvo.dataset, valor);
  desenhar(false);                                            // atualiza a página ao lado (sem animar)
  agendarGuardar();                                           // e guarda daqui a um bocadinho
}

// Quando escolhes um ficheiro de imagem
async function aoEscolherImagem(evento) {
  const alvo = evento.target;
  if (alvo.type !== "file" || !alvo.files[0]) return;
  mostrarEstadoGuardar("A preparar a imagem…");
  try {
    const url = await reduzirImagem(alvo.files[0]);
    definirValor(alvo.dataset, url);
  } catch (erro) {
    mostrarAviso("Não consegui ler essa imagem. Experimenta outra.");
    return;
  }
  construirEditor();   // redesenha o formulário para mostrar a miniatura nova
  desenhar(false);
  agendarGuardar();
}

// Cliques dentro do editor: escolher/remover imagem, adicionar e remover itens
function aoClicarNoEditor(evento) {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;
  const { acao, lista, id } = botao.dataset;

  if (acao === "escolher-imagem") {
    // Abre a escolha de ficheiros do iPhone, clicando no <input type="file"> escondido
    botao.parentElement.querySelector('input[type="file"]').click();
    return;
  }
  if (acao === "remover-imagem") {
    definirValor(botao.dataset, "");
  } else if (acao === "adicionar") {
    dados[lista].push(NOVOS_ITENS[lista]());           // cria um item novo no fim da lista
  } else if (acao === "remover") {
    dados[lista] = dados[lista].filter((item) => item.id !== id);
  } else {
    return;
  }

  construirEditor();   // a lista mudou, por isso reconstruímos o formulário
  desenhar(false);
  agendarGuardar();
}

// Botão "Repor exemplo" (fica no rodapé da gaveta)
function repor() {
  if (!confirm("Repor os dados de exemplo? O que estiver guardado será substituído.")) return;
  dados = dadosDeExemplo();
  construirEditor();
  desenhar(false);
  agendarGuardar();
}


/* ---------- 8. BOTÕES E ARRANQUE ---------- */

// Liga todos os botões e campos aos seus "ouvintes" (funções que correm ao clicar, escrever, etc.)
function ligarBotoes() {
  // Tocar na mensagem do fundo do ecrã fecha-a
  $("#aviso").addEventListener("click", () => ($("#aviso").hidden = true));

  // Login e editor
  $("#form-login").addEventListener("submit", entrar);
  $("#btn-autor").addEventListener("click", () => (ehDono ? abrirEditor() : abrirLogin()));
  $("#btn-editar").addEventListener("click", abrirEditor);

  // Dentro da gaveta do editor. Usamos "delegação": um ouvinte no contentor trata de todos os campos.
  $("#editor").addEventListener("input", aoEscrever);
  $("#editor").addEventListener("change", aoEscolherImagem);
  $("#editor").addEventListener("click", aoClicarNoEditor);
  $("#btn-repor").addEventListener("click", repor);
  $("#btn-sair").addEventListener("click", sair);

  // Fechar: botões com o atributo data-fechar, o fundo escuro, e a tecla Escape (no computador)
  document.addEventListener("click", (evento) => {
    if (evento.target.closest("[data-fechar]")) fecharTudo();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharTudo();
  });
}

async function iniciar() {
  ligarBotoes();

  try {
    // 1) A biblioteca do Supabase tem de ter chegado (senão falta internet)
    if (!window.supabase) {
      throw new Error("Não consegui carregar a biblioteca do Supabase. Verifica a ligação à internet.");
    }
    // 2) O config.js tem de estar bem preenchido
    if (problemaDeConfiguracao) {
      throw new Error(problemaDeConfiguracao);
    }
    // 3) Criamos a ligação ao teu projeto (se o endereço estiver mal, o Supabase falha aqui)
    clienteSupabase = window.supabase.createClient(configSupabase.url, configSupabase.chave);
    ligarSessao();                           // começa a "ouvir" o login
    // 4) Vamos buscar os dados. Espera no máximo 6 segundos; se não chegarem, mostra o exemplo.
    await Promise.race([
      carregarDoSupabase(),
      new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error("a ligação demorou demasiado")), 6000)),
    ]);
  } catch (erro) {
    // Qualquer problema cai aqui: a mensagem fica no ecrã e a página aparece na mesma (com o exemplo)
    console.error(erro);
    motivoSemLigacao = textoDoErro(erro);
    mostrarAviso("Erro: " + textoDoErro(erro), 0);   // 0 = fica no ecrã até lhe tocares
  }

  desenhar(true);                                              // desenha a página
  document.documentElement.classList.remove("a-carregar");     // e mostra-a
}

iniciar(); // arranca tudo
