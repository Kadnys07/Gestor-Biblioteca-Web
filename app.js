const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Dados em memória
let livros = [
  { titulo: "O Senhor dos Anéis", autor: "J.R.R. Tolkien", genero: "Fantasia", disponivel: 3 },
  { titulo: "1984", autor: "George Orwell", genero: "Distopia", disponivel: 5 },
  { titulo: "Dom Casmurro", autor: "Machado de Assis", genero: "Romance", disponivel: 0 }
];
let leitores = [
  {
    nome: "Ana Silva",
    cpf: "111.222.333-44",
    nascimento: "1990-01-01",
    celular: "(11) 91234-5678",
    email: "ana.silva@email.com",
    cep: "12345-678",
    endereco: "Rua das Flores, 123"
  }
];
let emprestimos = [
  {
    livro: "O Senhor dos Anéis",
    leitor: "Ana Silva",
    cpf: "111.222.333-44",
    coleta: "01-07-2024",
    devolucao: "08-07-2024",
    status: "pendente"
  }
];

// Configuração do EJS e layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'biblioteca-secret',
  resave: false,
  saveUninitialized: false
}));

// Middleware para proteger rotas
function requireLogin(req, res, next) {
  if (req.session && req.session.logado) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Rotas

// Página inicial redireciona para login
app.get('/', (req, res) => res.redirect('/login'));

// LOGIN (sem sidebar)
app.get('/login', (req, res) => {
  res.render('pages/login', { title: 'Login', erro: null, hideSidebar: true });
});
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  if (email === 'gestor@biblioteca.com' && senha === '123456') {
    req.session.logado = true;
    res.redirect('/home');
  } else {
    res.render('pages/login', { title: 'Login', erro: 'Usuário ou senha inválidos!', hideSidebar: true });
  }
});
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// CADASTROS (sem sidebar)
app.get('/livros/novo', requireLogin, (req, res) => {
  res.render('pages/livros_novo', { title: 'Novo Livro', hideSidebar: true });
});
app.post('/livros/novo', requireLogin, (req, res) => {
  const { titulo, autor, genero, disponivel } = req.body;
  livros.push({ titulo, autor, genero, disponivel: Number(disponivel) });
  res.redirect('/livros');
});

app.get('/leitores/novo', requireLogin, (req, res) => {
  res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true });
});
app.post('/leitores/novo', requireLogin, (req, res) => {
  const { nome, cpf, nascimento, celular, email, cep, endereco } = req.body;
  leitores.push({ nome, cpf, nascimento, celular, email, cep, endereco });
  res.redirect('/leitores');
});

app.get('/emprestimos/novo', requireLogin, (req, res) => {
  res.render('pages/emprestimos_novo', { title: 'Novo Empréstimo', hideSidebar: true, livros, leitores });
});
app.post('/emprestimos/novo', requireLogin, (req, res) => {
  const { livro, leitor, cpf, devolucao } = req.body;
  emprestimos.push({ livro, leitor, cpf, devolucao, status: "pendente" });
  res.redirect('/emprestimos');
});

// PÁGINAS INTERNAS (com sidebar)
app.get('/home', requireLogin, (req, res) => {
  res.render('pages/home', { title: 'Home', hideSidebar: false });
});
app.get('/livros', requireLogin, (req, res) => {
  res.render('pages/livros', { title: 'Livros', livros, hideSidebar: false });
});
app.get('/leitores', requireLogin, (req, res) => {
  res.render('pages/leitores', { title: 'Leitores', leitores, hideSidebar: false });
});
app.get('/emprestimos', requireLogin, (req, res) => {
  res.render('pages/emprestimos', { title: 'Empréstimos', emprestimos, hideSidebar: false });
});
app.get('/relatorios', requireLogin, (req, res) => {
  const totalLeitores = leitores.length;
  const emprestimosAbertos = emprestimos.filter(e => e.status === 'pendente').length;
  res.render('pages/relatorios', {
    title: 'Relatórios',
    hideSidebar: false,
    totalLeitores,
    emprestimosAbertos
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});