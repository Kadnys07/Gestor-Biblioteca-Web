const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const PDFDocument = require('pdfkit');
// ARQUITETO: Importação das bibliotecas de validação.
const { cpf } = require('cpf-cnpj-validator'); 
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 3000;

// --- FUNÇÕES AUXILIARES ---
function calcularIdade(dataNascimento) {
    if (!dataNascimento) return 0;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    return idade;
}

// --- DADOS E IDs (Simulação de Banco de Dados) ---
let proximoLivroId = 4;
let proximoLeitorId = 2;
let proximoEmprestimoId = 2;

let livros = [
    { id: 1, titulo: "O Senhor dos Anéis", autor: "J.R.R. Tolkien", genero: "Fantasia", disponivel: 3, status: 'ativo' },
    { id: 2, titulo: "1984", autor: "George Orwell", genero: "Distopia", disponivel: 5, status: 'ativo' },
    { id: 3, titulo: "Dom Casmurro", autor: "Machado de Assis", genero: "Romance", disponivel: 0, status: 'ativo' }
];
let leitores = [
    { id: 1, nome: "Ana Silva", cpf: "11122233344", nascimento: "1990-01-01", celular: "11912345678", email: "ana.silva@email.com", cep: "12345678", endereco: "Rua das Flores, 123" }
];
let emprestimos = [
    { id: 1, livroId: 1, leitorId: 1, dataInicio: "2024-07-01", devolucao: "2024-07-08", status: "pendente" }
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
    const [ano, mes, dia] = data.split('T')[0].split('-');
    return `${dia}/${mes}/${ano}`;
};
function requireLogin(req, res, next) {
    if (req.session && req.session.logado) {
        next();
    } else {
        res.redirect('/login');
    }
}

// --- ROTAS DE AUTENTICAÇÃO E NAVEGAÇÃO ---
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('pages/login', { title: 'Login', erro: null, hideSidebar: true }));
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    if (email === 'gestor@biblioteca.com' && senha === '123456') {
        req.session.logado = true;
        res.redirect('/home');
    } else {
        res.render('pages/login', { title: 'Login', erro: 'Utilizador ou senha inválidos!', hideSidebar: true });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => { res.redirect('/login'); });
});
app.get('/home', requireLogin, (req, res) => res.render('pages/home', { title: 'Home', hideSidebar: false }));

// --- ROTAS DE LIVROS ---
app.get('/livros/novo', requireLogin, (req, res) => {
    res.render('pages/livros_novo', { title: 'Novo Livro', hideSidebar: true, erro: null, valores: {} });
});

app.post('/livros/novo', requireLogin, (req, res) => {
    const { titulo, autor, genero, disponivel } = req.body;
    const quantidade = Number(disponivel);
    if (isNaN(quantidade) || quantidade < 0 || !Number.isInteger(quantidade)) {
        return res.render('pages/livros_novo', { title: 'Novo Livro', hideSidebar: true, erro: 'A quantidade disponível deve ser um número inteiro maior ou igual a zero.', valores: req.body });
    }
    livros.push({ id: proximoLivroId++, titulo, autor, genero, disponivel: quantidade, status: 'ativo' });
    res.redirect('/livros');
});

app.post('/livros/editar', requireLogin, (req, res) => {
    const { id, titulo, autor, genero, disponivel } = req.body;
    const quantidade = Number(disponivel);
    if (isNaN(quantidade) || quantidade < 0 || !Number.isInteger(quantidade)) {
        return res.status(400).json({ success: false, message: 'A quantidade disponível deve ser um número inteiro maior ou igual a zero.' });
    }
    const livroIndex = livros.findIndex(l => l.id == id);
    if (livroIndex !== -1) {
        livros[livroIndex] = { ...livros[livroIndex], id: Number(id), titulo, autor, genero, disponivel: quantidade };
        res.json({ success: true, message: 'Livro atualizado com sucesso!', data: livros[livroIndex] });
    } else {
        res.status(404).json({ success: false, message: 'Livro não encontrado.' });
    }
});

// --- ROTAS DE LEITORES ---
app.get('/leitores/novo', requireLogin, (req, res) => {
    res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: null, valores: {} });
});

app.post('/leitores/novo', requireLogin, (req, res) => {
    const { nome, cpf: cpfInput, nascimento, celular: celularInput, email, cep, endereco } = req.body;
    const cpfLimpo = (cpfInput || '').replace(/\D/g, '');
    const celularLimpo = (celularInput || '').replace(/\D/g, '');

    // ARQUITETO: Validações avançadas para garantir a integridade dos dados.
    if (!cpf.isValid(cpfLimpo)) {
        return res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: 'O CPF fornecido é inválido.', valores: req.body });
    }
    if (!validator.isEmail(email)) {
        return res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: 'O formato do e-mail é inválido.', valores: req.body });
    }
    if (!validator.isMobilePhone(celularLimpo, 'pt-BR')) {
        return res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: 'O número de telemóvel é inválido. Utilize o formato com DDD (ex: 11912345678).', valores: req.body });
    }
    const idade = calcularIdade(nascimento);
    if (!nascimento || idade < 5 || idade > 120) {
        return res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: 'Data de nascimento inválida. O leitor deve ter entre 5 e 120 anos.', valores: req.body });
    }
    if (leitores.some(leitor => leitor.cpf === cpfLimpo)) {
        return res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: 'Este CPF já está registado.', valores: req.body });
    }
    if (leitores.some(leitor => leitor.email.toLowerCase() === email.toLowerCase())) {
        return res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: 'Este e-mail já está registado.', valores: req.body });
    }
    
    leitores.push({ id: proximoLeitorId++, nome, cpf: cpfLimpo, nascimento, celular: celularLimpo, email, cep: (cep || '').replace(/\D/g, ''), endereco });
    res.redirect('/leitores');
});

app.post('/leitores/editar', requireLogin, (req, res) => {
    const { id, nome, cpf: cpfInput, nascimento, celular: celularInput, email, cep, endereco } = req.body;
    const cpfLimpo = (cpfInput || '').replace(/\D/g, '');
    const celularLimpo = (celularInput || '').replace(/\D/g, '');

    // ARQUITETO: Validações avançadas para a rota de edição.
    if (!cpf.isValid(cpfLimpo)) {
        return res.status(400).json({ success: false, message: 'O CPF fornecido é inválido.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: 'O formato do e-mail é inválido.' });
    }
    if (!validator.isMobilePhone(celularLimpo, 'pt-BR')) {
        return res.status(400).json({ success: false, message: 'O número de telemóvel é inválido. Utilize o formato com DDD.' });
    }
    const idade = calcularIdade(nascimento);
    if (!nascimento || idade < 5 || idade > 120) {
        return res.status(400).json({ success: false, message: 'Data de nascimento inválida. O leitor deve ter entre 5 e 120 anos.' });
    }
    if (leitores.some(leitor => leitor.cpf === cpfLimpo && leitor.id != id)) {
        return res.status(400).json({ success: false, message: 'Este CPF já pertence a outro leitor.' });
    }
    if (leitores.some(leitor => leitor.email.toLowerCase() === email.toLowerCase() && leitor.id != id)) {
        return res.status(400).json({ success: false, message: 'Este e-mail já pertence a outro leitor.' });
    }

    const leitorIndex = leitores.findIndex(l => l.id == id);
    if (leitorIndex !== -1) {
        const leitorAtualizado = { id: Number(id), nome, cpf: cpfLimpo, nascimento, celular: celularLimpo, email, cep: (cep || '').replace(/\D/g, ''), endereco };
        leitores[leitorIndex] = leitorAtualizado;
        res.json({ success: true, message: 'Leitor atualizado com sucesso!', data: leitorAtualizado });
    } else {
        res.status(404).json({ success: false, message: 'Leitor não encontrado.' });
    }
});

// --- ROTAS DE EMPRÉSTIMOS ---
app.get('/emprestimos/novo', requireLogin, (req, res) => {
    const livrosDisponiveis = livros.filter(l => l.disponivel > 0 && l.status === 'ativo');
    res.render('pages/emprestimos_novo', { title: 'Novo Empréstimo', hideSidebar: true, livros: livrosDisponiveis, leitores, erro: null, valores: {} });
});

app.post('/emprestimos/novo', requireLogin, (req, res) => {
    const { livroId, leitorId, devolucao } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    if (devolucao <= hoje) {
        const livrosDisponiveis = livros.filter(l => l.disponivel > 0 && l.status === 'ativo');
        return res.render('pages/emprestimos_novo', { title: 'Novo Empréstimo', hideSidebar: true, livros: livrosDisponiveis, leitores, erro: 'A data de devolução deve ser uma data no futuro!', valores: req.body });
    }
    const livro = livros.find(l => l.id == livroId);
    const leitor = leitores.find(l => l.id == leitorId);
    if (livro && leitor && livro.disponivel > 0) {
        livro.disponivel--;
        emprestimos.push({ id: proximoEmprestimoId++, livroId: Number(livroId), leitorId: Number(leitorId), dataInicio: hoje, devolucao, status: "pendente" });
        res.redirect('/emprestimos');
    } else {
        const livrosDisponiveis = livros.filter(l => l.disponivel > 0 && l.status === 'ativo');
        res.render('pages/emprestimos_novo', { title: 'Novo Empréstimo', hideSidebar: true, livros: livrosDisponiveis, leitores, erro: 'Livro ou leitor inválido. Tente novamente.', valores: req.body });
    }
});

app.post('/emprestimos/editar', requireLogin, (req, res) => {
    const { id, devolucao, status } = req.body;
    const hoje = new Date().toISOString().split('T')[0];
    if (devolucao < hoje && status === 'pendente') {
        return res.status(400).json({ success: false, message: 'A data de devolução deve ser uma data no futuro.' });
    }
    const emprestimoIndex = emprestimos.findIndex(e => e.id == id);
    if (emprestimoIndex !== -1) {
        const emprestimo = emprestimos[emprestimoIndex];
        const estavaPendente = emprestimo.status === 'pendente';
        const virouDevolido = status === 'devolvido';
        const livro = livros.find(l => l.id == emprestimo.livroId);
        if (estavaPendente && virouDevolido && livro) {
            livro.disponivel++;
        }
        emprestimo.devolucao = devolucao;
        emprestimo.status = status;
        const leitor = leitores.find(l => l.id == emprestimo.leitorId);
        const emprestimoInfo = { ...emprestimo, livro: livro ? livro.titulo : 'Excluído', leitor: leitor ? leitor.nome : 'Excluído', cpf: leitor ? leitor.cpf : 'N/A' };
        res.json({ success: true, message: 'Empréstimo atualizado com sucesso!', data: emprestimoInfo });
    } else {
        res.status(404).json({ success: false, message: 'Empréstimo não encontrado.' });
    }
});

// --- ROTAS DE LISTAGEM E RELATÓRIOS ---
app.get('/livros', requireLogin, (req, res) => {
    res.render('pages/livros', { title: 'Livros', livros: livros.filter(livro => livro.status === 'ativo'), hideSidebar: false });
});
app.get('/leitores', requireLogin, (req, res) => {
    res.render('pages/leitores', { title: 'Leitores', leitores, hideSidebar: false });
});
app.get('/emprestimos', requireLogin, (req, res) => {
    const emprestimosInfo = emprestimos.map(emp => {
        const livro = livros.find(l => l.id == emp.livroId);
        const leitor = leitores.find(l => l.id == emp.leitorId);
        return { ...emp, livro: livro ? livro.titulo : 'Livro Excluído', leitor: leitor ? leitor.nome : 'Leitor Excluído', cpf: leitor ? leitor.cpf : 'N/A' };
    });
    res.render('pages/emprestimos', { title: 'Empréstimos', emprestimos: emprestimosInfo, hideSidebar: false });
});
app.get('/relatorios', requireLogin, (req, res) => {
    const totalLeitores = leitores.length;
    const emprestimosAbertos = emprestimos.filter(e => e.status === 'pendente').length;
    res.render('pages/relatorios', { title: 'Relatórios', hideSidebar: false, totalLeitores, emprestimosAbertos });
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
    console.log(`Servidor a ser executado em http://localhost:${PORT}`);
});

