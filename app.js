const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// --- DADOS E IDs ---
let proximoLivroId = 1;
let proximoLeitorId = 1;
let proximoEmprestimoId = 1;

let livros = [
    { id: proximoLivroId++, titulo: "O Senhor dos Anéis", autor: "J.R.R. Tolkien", genero: "Fantasia", disponivel: 3, status: 'ativo' },
    { id: proximoLivroId++, titulo: "1984", autor: "George Orwell", genero: "Distopia", disponivel: 5, status: 'ativo' },
    { id: proximoLivroId++, titulo: "Dom Casmurro", autor: "Machado de Assis", genero: "Romance", disponivel: 0, status: 'ativo' }
];
let leitores = [
    {
        id: proximoLeitorId++,
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
        id: proximoEmprestimoId++,
        livroId: 1, 
        leitorId: 1, 
        dataInicio: "2024-07-01",
        devolucao: "2024-07-08",
        status: "pendente"
    }
];


// --- CONFIGURAÇÃO E MIDDLEWARES ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
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

// --- ROTAS ---

// Rota inicial e de autenticação
app.get('/', (req, res) => res.redirect('/login'));

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

app.get('/home', requireLogin, (req, res) => {
    res.render('pages/home', { title: 'Home', hideSidebar: false });
});

// --- ROTAS DE LIVROS ---
app.get('/livros/novo', requireLogin, (req, res) => {
    res.render('pages/livros_novo', { title: 'Novo Livro', hideSidebar: true, erro: null, valores: {} });
});

app.post('/livros/novo', requireLogin, (req, res) => {
    const { titulo, autor, genero, disponivel } = req.body;
    livros.push({
        id: proximoLivroId++,
        titulo,
        autor,
        genero,
        disponivel: Number(disponivel),
        status: 'ativo'
    });
    res.redirect('/livros');
});

app.post('/livros/editar', requireLogin, (req, res) => {
    const { id, titulo, autor, genero, disponivel } = req.body;
    const livroIndex = livros.findIndex(l => l.id == id);
    if (livroIndex !== -1) {
        livros[livroIndex] = { ...livros[livroIndex], id: Number(id), titulo, autor, genero, disponivel: Number(disponivel) };
        res.json({ success: true, message: 'Livro atualizado com sucesso!' });
    } else {
        res.status(404).json({ success: false, message: 'Livro não encontrado.' });
    }
});

// --- ROTAS DE LEITORES ---
app.get('/leitores/novo', requireLogin, (req, res) => {
    res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: null, valores: {} });
});

app.post('/leitores/novo', requireLogin, (req, res) => {
    const { nome, cpf, nascimento, celular, email, cep, endereco } = req.body;
    leitores.push({
        id: proximoLeitorId++,
        nome, cpf, nascimento, celular, email, cep, endereco
    });
    res.redirect('/leitores');
});

app.post('/leitores/editar', requireLogin, (req, res) => {
    const { id, nome, cpf, nascimento, celular, email, cep, endereco } = req.body;
    const leitorIndex = leitores.findIndex(l => l.id == id);
    if (leitorIndex !== -1) {
        leitores[leitorIndex] = { id: Number(id), nome, cpf, nascimento, celular, email, cep, endereco };
        res.json({ success: true, message: 'Leitor atualizado com sucesso!' });
    } else {
        res.status(404).json({ success: false, message: 'Leitor não encontrado.' });
    }
});

// --- ROTAS DE EMPRÉSTIMOS ---
app.get('/emprestimos/novo', requireLogin, (req, res) => {
    const livrosDisponiveis = livros.filter(l => l.disponivel > 0 && l.status === 'ativo');
    res.render('pages/emprestimos_novo', {
        title: 'Novo Empréstimo',
        hideSidebar: true,
        livros: livrosDisponiveis,
        leitores,
        erro: null,
        valores: {}
    });
});

app.post('/emprestimos/novo', requireLogin, (req, res) => {
    const { livroId, leitorId, devolucao } = req.body;
    const hoje = new Date().toISOString().split('T')[0];

    if (devolucao <= hoje) {
        const livrosDisponiveis = livros.filter(l => l.disponivel > 0 && l.status === 'ativo');
        return res.render('pages/emprestimos_novo', {
            title: 'Novo Empréstimo',
            hideSidebar: true,
            livros: livrosDisponiveis,
            leitores,
            erro: 'A data de devolução deve ser uma data no futuro!',
            valores: req.body
        });
    }

    const livro = livros.find(l => l.id == livroId);
    const leitor = leitores.find(l => l.id == leitorId);

    if (livro && leitor && livro.disponivel > 0) {
        livro.disponivel--;
        const dataInicio = hoje;
        emprestimos.push({
            id: proximoEmprestimoId++,
            livroId: Number(livroId),
            leitorId: Number(leitorId),
            dataInicio,
            devolucao,
            status: "pendente"
        });
        res.redirect('/emprestimos');
    } else {
        const livrosDisponiveis = livros.filter(l => l.disponivel > 0 && l.status === 'ativo');
        res.render('pages/emprestimos_novo', {
            title: 'Novo Empréstimo',
            hideSidebar: true,
            livros: livrosDisponiveis,
            leitores,
            erro: 'Livro ou leitor inválido. Tente novamente.',
            valores: req.body
        });
    }
});

app.post('/emprestimos/editar', requireLogin, (req, res) => {
    const { id, devolucao, status } = req.body;
    const emprestimoIndex = emprestimos.findIndex(e => e.id == id);

    if (emprestimoIndex === -1) {
        return res.status(404).json({ success: false, message: 'Empréstimo não encontrado.' });
    }

    const emprestimo = emprestimos[emprestimoIndex];
    const estavaPendente = emprestimo.status === 'pendente';
    const virouDevolvido = status === 'devolvido';
    const livro = livros.find(l => l.id == emprestimo.livroId);

    if (estavaPendente && virouDevolvido && livro) {
        livro.disponivel++;
    }
    
    emprestimo.devolucao = devolucao;
    emprestimo.status = status;

    res.json({ success: true, message: 'Empréstimo atualizado com sucesso!' });
});

// --- ROTAS DE LISTAGEM E RELATÓRIOS ---
app.get('/livros', requireLogin, (req, res) => {
    const livrosAtivos = livros.filter(livro => livro.status === 'ativo');
    res.render('pages/livros', { title: 'Livros', livros: livrosAtivos, hideSidebar: false });
});

app.get('/leitores', requireLogin, (req, res) => {
    res.render('pages/leitores', { title: 'Leitores', leitores, hideSidebar: false });
});

// ROTA CORRIGIDA
app.get('/emprestimos', requireLogin, (req, res) => {
    // A lógica de "join" para exibir os dados na tabela
    const emprestimosInfo = emprestimos.map(emp => {
        // Encontra o livro e o leitor correspondentes pelo ID
        // Usamos '==' em vez de '===' para evitar problemas com tipos (string vs. number)
        const livro = livros.find(l => l.id == emp.livroId);
        const leitor = leitores.find(l => l.id == emp.leitorId);

        // Monta um novo objeto com todas as informações necessárias para a view
        return {
            ...emp, // Mantém o ID do empréstimo, datas e status
            livro: livro ? livro.titulo : 'Livro Excluído', // Pega o título do livro
            leitor: leitor ? leitor.nome : 'Leitor Excluído', // Pega o nome do leitor
            cpf: leitor ? leitor.cpf : 'N/A' // IMPORTANTE: Pega o CPF para a busca funcionar
        };
    });

    res.render('pages/emprestimos', { 
        title: 'Empréstimos', 
        emprestimos: emprestimosInfo, // Envia a lista completa e "joinada"
        hideSidebar: false 
    });
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

app.get('/relatorios/pdf', requireLogin, (req, res) => {
  const doc = new PDFDocument({ margin: 50 });
  const filename = `Relatorio-Emprestimos-${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);
  doc.fontSize(18).font('Helvetica-Bold').text('Relatório de Empréstimos Mensal', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
  doc.moveDown(2);
  const yPosition = doc.y;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Livro', 50, yPosition);
  doc.text('Leitor', 200, yPosition);
  doc.text('Data Empréstimo', 350, yPosition);
  doc.text('Data Devolução', 450, yPosition);
  doc.moveDown();
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();
  doc.fontSize(10).font('Helvetica');
  emprestimos.forEach(emp => {
    const livro = livros.find(l => l.id == emp.livroId) || {};
    const leitor = leitores.find(l => l.id == emp.leitorId) || {};
    const rowY = doc.y;
    doc.text(livro.titulo || 'N/A', 50, rowY, { width: 140 });
    doc.text(leitor.nome || 'N/A', 200, rowY, { width: 140 });
    doc.text(app.locals.formatarData(emp.dataInicio), 350, rowY, { width: 90 });
    doc.text(app.locals.formatarData(emp.devolucao), 450, rowY, { width: 90 });
    doc.moveDown();
  });
  doc.end();
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

