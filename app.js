const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Dados em memória
let livros = [
  { titulo: "O Senhor dos Anéis", autor: "J.R.R. Tolkien", genero: "Fantasia", disponivel: 3, status: 'ativo' },
  { titulo: "1984", autor: "George Orwell", genero: "Distopia", disponivel: 5, status: 'ativo' },
  { titulo: "Dom Casmurro", autor: "Machado de Assis", genero: "Romance", disponivel: 0, status: 'ativo' }
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
    dataInicio: "2024-07-01",
    devolucao: "2024-07-08",
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
app.use(express.json());
app.use(session({
  secret: 'biblioteca-secret',
  resave: false,
  saveUninitialized: false
}));

app.locals.formatarData = function(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

function requireLogin(req, res, next) {
  if (req.session && req.session.logado) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Rotas... (outras rotas)
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

// --- ROTAS DE LIVROS ---
app.get('/livros/novo', requireLogin, (req, res) => {
  res.render('pages/livros_novo', { title: 'Novo Livro', hideSidebar: true });
});
app.post('/livros/novo', requireLogin, (req, res) => {
  const { titulo, autor, genero, disponivel } = req.body;
  livros.push({ titulo, autor, genero, disponivel: Number(disponivel), status: 'ativo' });
  res.redirect('/livros');
});
app.post('/livros/editar', requireLogin, (req, res) => {
  const { id, titulo, autor, genero, disponivel } = req.body;
  if (livros[id]) {
    livros[id] = { ...livros[id], titulo, autor, genero, disponivel: Number(disponivel) };
    res.json({ success: true, message: 'Livro atualizado com sucesso!' });
  } else {
    res.status(404).json({ success: false, message: 'Livro não encontrado.' });
  }
});

// --- ROTAS DE LEITORES ---
app.get('/leitores/novo', requireLogin, (req, res) => {
  res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true });
});
app.post('/leitores/novo', requireLogin, (req, res) => {
  const { nome, cpf, nascimento, celular, email, cep, endereco } = req.body;
  leitores.push({ nome, cpf, nascimento, celular, email, cep, endereco });
  res.redirect('/leitores');
});
app.post('/leitores/editar', requireLogin, (req, res) => {
  const { id, nome, cpf, nascimento, celular, email, cep, endereco } = req.body;
  if (leitores[id]) {
    leitores[id] = { nome, cpf, nascimento, celular, email, cep, endereco };
    res.json({ success: true, message: 'Leitor atualizado com sucesso!' });
  } else {
    res.status(404).json({ success: false, message: 'Leitor não encontrado.' });
  }
});


// --- ROTAS DE EMPRÉSTIMOS (COM LÓGICA DE ESTOQUE) ---
app.get('/emprestimos/novo', requireLogin, (req, res) => {
    // Filtra para enviar ao formulário apenas livros que estão disponíveis
    const livrosDisponiveis = livros.filter(livro => livro.disponivel > 0);
    res.render('pages/emprestimos_novo', { title: 'Novo Empréstimo', hideSidebar: true, livros: livrosDisponiveis, leitores });
});

app.post('/emprestimos/novo', requireLogin, (req, res) => {
    const { livro: livroTitulo, leitor: leitorCPF, devolucao } = req.body;
    
    // Encontra o livro e o leitor nos arrays
    const livro = livros.find(l => l.titulo === livroTitulo);
    const leitor = leitores.find(l => l.cpf === leitorCPF);

    if (!livro || !leitor) {
        // Idealmente, aqui enviaríamos uma mensagem de erro para o usuário
        return res.redirect('/emprestimos');
    }

    // Verifica se o livro está disponível
    if (livro.disponivel > 0) {
        // Diminui a quantidade disponível
        livro.disponivel -= 1;

        const dataInicio = new Date().toISOString().split('T')[0];
        emprestimos.push({
            livro: livro.titulo,
            leitor: leitor.nome,
            cpf: leitor.cpf,
            dataInicio,
            devolucao,
            status: "pendente"
        });
    }
    
    res.redirect('/emprestimos');
});

app.post('/emprestimos/editar', requireLogin, (req, res) => {
    const { id, devolucao, status: novoStatus } = req.body;

    if (emprestimos[id]) {
        const emprestimoAntigo = emprestimos[id];
        const statusAntigo = emprestimoAntigo.status;

        // Lógica para devolução de livro
        if (statusAntigo === 'pendente' && novoStatus === 'devolvido') {
            const livro = livros.find(l => l.titulo === emprestimoAntigo.livro);
            if (livro) {
                livro.disponivel += 1; // Aumenta a quantidade disponível
            }
        }
        // Lógica para reverter uma devolução (caso o usuário mude de 'devolvido' para 'pendente')
        else if (statusAntigo === 'devolvido' && novoStatus === 'pendente') {
             const livro = livros.find(l => l.titulo === emprestimoAntigo.livro);
             if (livro && livro.disponivel > 0) { // Garante que não fique negativo
                livro.disponivel -= 1;
             }
        }
        
        // Atualiza o empréstimo
        emprestimos[id] = { ...emprestimoAntigo, devolucao, status: novoStatus };
        res.json({ success: true, message: 'Empréstimo atualizado com sucesso!' });

    } else {
        res.status(404).json({ success: false, message: 'Empréstimo não encontrado.' });
    }
});


// --- PÁGINAS INTERNAS ---
app.get('/home', requireLogin, (req, res) => {
  res.render('pages/home', { title: 'Home', hideSidebar: false });
});
app.get('/livros', requireLogin, (req, res) => {
  const livrosAtivos = livros.filter(livro => livro.status === 'ativo');
  res.render('pages/livros', { title: 'Livros', livros: livrosAtivos, hideSidebar: false });
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

