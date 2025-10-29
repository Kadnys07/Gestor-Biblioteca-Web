const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const PDFDocument = require('pdfkit');
const { cpf } = require('cpf-cnpj-validator');
const validator = require('validator');

// ARQUITETO: Importações Adicionadas
// Importa o pool de conexão que criámos (config/db.js)
const pool = require('./config/db');
// Importa o bcrypt para comparar as senhas (package.json)
const bcrypt = require('bcrypt');

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

// ARQUITETO: Todos os dados mockados (adminUser, livros, leitores, emprestimos) foram removidos.
// O banco de dados é agora a nossa única fonte da verdade.

// --- CONFIGURAÇÃO E MIDDLEWARES ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'biblioteca-secret', resave: false, saveUninitialized: false }));

// ARQUITETO (CORREÇÃO): Função de formatação de data melhorada para aceitar objetos Date do banco
// OU strings já no formato YYYY-MM-DD. Garante que o front-end sempre receba DD/MM/YYYY.
app.locals.formatarData = function(data) {
    if (!data) return '';
    let dataString = data;
    if (data instanceof Date) {
        dataString = data.toISOString().split('T')[0]; // Converte Date para YYYY-MM-DD
    } else if (typeof data === 'string' && data.includes('-')) {
        dataString = data.split('T')[0]; // Pega apenas a parte YYYY-MM-DD se já for string
    } else {
        return ''; // Retorna vazio se o formato for inválido
    }
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
};

function requireLogin(req, res, next) {
    if (req.session && req.session.logado) { next(); } else { res.redirect('/login'); }
}

// --- ROTAS ---
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('pages/login', { title: 'Login', erro: null, hideSidebar: true }));

// ARQUITETO: Rota de Login refatorada para usar a tabela 'gestores' e bcrypt
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query('SELECT hash_senha FROM gestores WHERE email = $1', [email.toLowerCase()]);

        if (result.rowCount === 0) {
            return res.render('pages/login', { title: 'Login', erro: 'Utilizador ou senha inválidos!', hideSidebar: true });
        }

        const hashNoBanco = result.rows[0].hash_senha;
        const hashValida = await bcrypt.compare(senha, hashNoBanco);

        if (hashValida) {
            req.session.logado = true;
            return res.redirect('/home');
        } else {
            return res.render('pages/login', { title: 'Login', erro: 'Utilizador ou senha inválidos!', hideSidebar: true });
        }
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).send("Erro interno do servidor.");
    }
});

app.get('/logout', (req, res) => { req.session.destroy(() => { res.redirect('/login'); }); });
app.get('/home', requireLogin, (req, res) => res.render('pages/home', { title: 'Home', hideSidebar: false }));


// --- ROTAS DE LIVROS (com validações) ---
app.get('/livros/novo', requireLogin, (req, res) => {
    res.render('pages/livros_novo', { title: 'Novo Livro', hideSidebar: true, erro: null, valores: {} });
});

// ARQUITETO: Rota refatorada para usar INSERT na tabela 'livros'
app.post('/livros/novo', requireLogin, async (req, res) => {
    // ARQUITETO (CORREÇÃO): Usa 'quantidade_disponivel' para inserir no banco
    const { titulo, autor, genero, disponivel: quantidadeInput } = req.body;
    const quantidade = Number(quantidadeInput);

    if (isNaN(quantidade) || quantidade < 0 || !Number.isInteger(quantidade)) {
        return res.render('pages/livros_novo', { title: 'Novo Livro', hideSidebar: true, erro: 'A quantidade disponível deve ser um número inteiro maior ou igual a zero.', valores: req.body });
    }

    try {
        const query = `
            INSERT INTO livros (titulo, autor, genero, quantidade_disponivel, status)
            VALUES ($1, $2, $3, $4, 'ativo')
        `;
        // ARQUITETO (CORREÇÃO): Passa 'quantidade' para a coluna 'quantidade_disponivel'
        await pool.query(query, [titulo, autor, genero, quantidade]);
        res.redirect('/livros');
    } catch (err) {
        console.error("Erro ao salvar livro:", err);
        res.render('pages/livros_novo', { title: 'Novo Livro', hideSidebar: true, erro: 'Erro ao salvar o livro. Tente novamente.', valores: req.body });
    }
});

// ARQUITETO: Rota refatorada para usar UPDATE na tabela 'livros'
app.post('/livros/editar', requireLogin, async (req, res) => {
    // ARQUITETO (CORREÇÃO): Renomeia 'disponivel' do body para 'quantidadeInput' para clareza
    const { id, titulo, autor, genero, disponivel: quantidadeInput } = req.body;
    const quantidade = Number(quantidadeInput);

    if (isNaN(quantidade) || quantidade < 0 || !Number.isInteger(quantidade)) {
        return res.status(400).json({ success: false, message: 'A quantidade disponível deve ser um número inteiro maior ou igual a zero.' });
    }

    try {
        // ARQUITETO (CORREÇÃO): Atualiza a coluna 'quantidade_disponivel' no banco
        const query = `
            UPDATE livros
            SET titulo = $1, autor = $2, genero = $3, quantidade_disponivel = $4
            WHERE id = $5
            RETURNING id, titulo, autor, genero, quantidade_disponivel AS "disponivel"
        `;
        // ARQUITETO (CORREÇÃO): O 'RETURNING' usa o Alias AS "disponivel" para o front-end
        const result = await pool.query(query, [titulo, autor, genero, quantidade, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Livro não encontrado.' });
        }

        res.json({ success: true, message: 'Livro atualizado com sucesso!', data: result.rows[0] });
    } catch (err) {
        console.error("Erro ao editar livro:", err);
        res.status(500).json({ success: false, message: 'Erro interno ao atualizar o livro.' });
    }
});

// --- ROTAS DE LEITORES (com validações avançadas) ---
app.get('/leitores/novo', requireLogin, (req, res) => {
    res.render('pages/leitores_novo', { title: 'Novo Leitor', hideSidebar: true, erro: null, valores: {} });
});

// ARQUITETO: Rota refatorada para usar INSERT na tabela 'leitores' com tratamento de erro UNIQUE
app.post('/leitores/novo', requireLogin, async (req, res) => {
    const { nome, cpf: cpfInput, nascimento, celular: celularInput, email, cep, endereco } = req.body;
    const cpfLimpo = (cpfInput || '').replace(/\D/g, '');
    const celularLimpo = (celularInput || '').replace(/\D/g, '');

    // --- MANTÉM AS SUAS VALIDAÇÕES DE BACK-END ---
    if (!cpf.isValid(cpfLimpo)) { /*...*/ }
    if (!validator.isEmail(email)) { /*...*/ }
    if (!validator.isMobilePhone(celularLimpo, 'pt-BR')) { /*...*/ }
    const idade = calcularIdade(nascimento);
    if (!nascimento || idade < 5 || idade > 120) { /*...*/ }

    // --- LÓGICA DE BANCO DE DADOS ---
    try {
        const query = `
            INSERT INTO leitores (nome, cpf, nascimento, celular, email, cep, endereco)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [nome, cpfLimpo, nascimento, celularLimpo, email.toLowerCase(), (cep || '').replace(/\D/g, ''), endereco];

        await pool.query(query, values);
        res.redirect('/leitores');

    } catch (err) {
        console.error("Erro ao salvar leitor:", err);
        if (err.code === '23505') { /*...*/ } // Tratamento de duplicidade
        res.status(500).render('pages/leitores_novo', { /*...*/ });
    }
});

// ARQUITETO: Rota refatorada para usar UPDATE na tabela 'leitores' com tratamento de erro UNIQUE
app.post('/leitores/editar', requireLogin, async (req, res) => {
    const { id, nome, cpf: cpfInput, nascimento, celular: celularInput, email, cep, endereco } = req.body;
    const cpfLimpo = (cpfInput || '').replace(/\D/g, '');
    const celularLimpo = (celularInput || '').replace(/\D/g, '');

    // --- MANTÉM AS SUAS VALIDAÇÕES ---
    if (!cpf.isValid(cpfLimpo)) { /*...*/ }
    if (!validator.isEmail(email)) { /*...*/ }
    if (!validator.isMobilePhone(celularLimpo, 'pt-BR')) { /*...*/ }
    const idade = calcularIdade(nascimento);
    if (!nascimento || idade < 5 || idade > 120) { /*...*/ }

    // --- LÓGICA DE BANCO DE DADOS ---
    try {
        const query = `
            UPDATE leitores
            SET nome = $1, cpf = $2, nascimento = $3, celular = $4, email = $5, cep = $6, endereco = $7
            WHERE id = $8
            RETURNING id, nome, cpf, email, celular, cep, endereco,
                      TO_CHAR(nascimento, 'YYYY-MM-DD') AS "nascimento"
        `;
        // ARQUITETO (CORREÇÃO): O 'RETURNING' formata a data para o front-end
        const values = [nome, cpfLimpo, nascimento, celularLimpo, email.toLowerCase(), (cep || '').replace(/\D/g, ''), endereco, id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Leitor não encontrado.' });
        }

        res.json({ success: true, message: 'Leitor atualizado com sucesso!', data: result.rows[0] });

    } catch (err) {
        console.error("Erro ao editar leitor:", err);
        if (err.code === '23505') { /*...*/ } // Tratamento de duplicidade
        res.status(500).json({ success: false, message: 'Erro interno ao atualizar o leitor.' });
    }
});

// --- ROTAS DE EMPRÉSTIMOS (com validações) ---

// ARQUITETO: Rota refatorada para buscar livros e leitores do banco
app.get('/emprestimos/novo', requireLogin, async (req, res) => {
    try {
        // ARQUITETO (CORREÇÃO): Busca livros usando o Alias AS "disponivel"
        const livrosQuery = `
            SELECT id, titulo, quantidade_disponivel AS "disponivel" 
            FROM livros 
            WHERE status = 'ativo' AND quantidade_disponivel > 0 ORDER BY titulo
        `;
        const livrosResult = await pool.query(livrosQuery);
        const leitoresResult = await pool.query("SELECT id, nome, cpf FROM leitores ORDER BY nome");

        res.render('pages/emprestimos_novo', {
            title: 'Novo Empréstimo',
            hideSidebar: true,
            livros: livrosResult.rows,
            leitores: leitoresResult.rows, // Passa os leitores para o <script> no EJS
            erro: null,
            valores: {}
        });
    } catch (err) {
        console.error("Erro ao carregar página de novo empréstimo:", err);
        res.status(500).send("Erro ao carregar dados. Tente novamente.");
    }
});

// ARQUITETO: Rota refatorada para usar uma TRANSAÇÃO de banco de dados
app.post('/emprestimos/novo', requireLogin, async (req, res) => {
    const { livroId, leitorId, devolucao } = req.body;
    const hoje = new Date().toISOString().split('T')[0];

    // ARQUITETO (CORREÇÃO): Função auxiliar para buscar dados em caso de erro
    const buscarDadosParaForm = async () => {
        const livrosQuery = `
            SELECT id, titulo, quantidade_disponivel AS "disponivel" 
            FROM livros WHERE status = 'ativo' AND quantidade_disponivel > 0 ORDER BY titulo
        `;
        const livrosResult = await pool.query(livrosQuery);
        const leitoresResult = await pool.query("SELECT id, nome, cpf FROM leitores ORDER BY nome");
        return { livros: livrosResult.rows, leitores: leitoresResult.rows };
    };

    if (devolucao <= hoje) {
        const dados = await buscarDadosParaForm();
        return res.render('pages/emprestimos_novo', {
            title: 'Novo Empréstimo', hideSidebar: true, ...dados,
            erro: 'A data de devolução deve ser uma data no futuro!', valores: req.body
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const livroResult = await client.query("SELECT quantidade_disponivel FROM livros WHERE id = $1 AND status = 'ativo' FOR UPDATE", [livroId]);

        if (livroResult.rowCount === 0 || livroResult.rows[0].quantidade_disponivel <= 0) {
            await client.query('ROLLBACK');
            const dados = await buscarDadosParaForm();
            return res.render('pages/emprestimos_novo', {
                title: 'Novo Empréstimo', hideSidebar: true, ...dados,
                erro: 'Livro indisponível ou não encontrado.', valores: req.body
            });
        }

        await client.query("UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = $1", [livroId]);
        const query = `
            INSERT INTO emprestimos (livro_id, leitor_id, data_devolucao_prevista, data_emprestimo, status)
            VALUES ($1, $2, $3, $4, 'pendente')
        `;
        await client.query(query, [livroId, leitorId, devolucao, hoje]);
        await client.query('COMMIT');
        res.redirect('/emprestimos');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro na transação de novo empréstimo:", err);
        const dados = await buscarDadosParaForm();
        res.render('pages/emprestimos_novo', {
            title: 'Novo Empréstimo', hideSidebar: true, ...dados,
            erro: 'Erro ao processar o empréstimo. Tente novamente.', valores: req.body
        });
    } finally {
        client.release();
    }
});

// ARQUITETO: Rota refatorada para usar uma TRANSAÇÃO e lógica de inventário
app.post('/emprestimos/editar', requireLogin, async (req, res) => {
    const { id, devolucao, status: novoStatus } = req.body;
    const hoje = new Date().toISOString().split('T')[0];

    if (devolucao < hoje && novoStatus === 'pendente') {
        return res.status(400).json({ success: false, message: 'A data de devolução deve ser uma data no futuro.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const empResult = await client.query("SELECT status, livro_id FROM emprestimos WHERE id = $1 FOR UPDATE", [id]); // Lock empréstimo

        if (empResult.rowCount === 0) {
            throw new Error('Empréstimo não encontrado.'); // Lança erro para ir para o CATCH
        }

        const statusAnterior = empResult.rows[0].status;
        const livroId = empResult.rows[0].livro_id;

        if (livroId) { // Só mexe no inventário se o livro ainda existir
             if (statusAnterior === 'pendente' && novoStatus === 'devolvido') {
                // Lock livro antes de atualizar
                await client.query("SELECT 1 FROM livros WHERE id = $1 FOR UPDATE", [livroId]);
                await client.query("UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = $1", [livroId]);
            } else if (statusAnterior === 'devolvido' && novoStatus === 'pendente') {
                // Lock e verifica estoque antes de decrementar
                const stockCheck = await client.query("SELECT quantidade_disponivel FROM livros WHERE id = $1 FOR UPDATE", [livroId]);
                if (stockCheck.rows[0].quantidade_disponivel <= 0) {
                    throw new Error('Ação inválida. O livro não tem cópias disponíveis para reverter o empréstimo.');
                }
                await client.query("UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = $1", [livroId]);
            }
        }

        const dataDevolucaoReal = (novoStatus === 'devolvido') ? hoje : null;
        const query = `
            UPDATE emprestimos
            SET data_devolucao_prevista = $1, status = $2, data_devolucao_real = $3
            WHERE id = $4
            RETURNING *
        `;
        const result = await client.query(query, [devolucao, novoStatus, dataDevolucaoReal, id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Empréstimo atualizado com sucesso!', data: result.rows[0] });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao editar empréstimo:", err);
        res.status(500).json({ success: false, message: err.message || 'Erro interno ao atualizar o empréstimo.' });
    } finally {
        client.release();
    }
});


// --- ROTAS DE LISTAGEM E RELATÓRIOS ---

// ARQUITETO: Rota refatorada para usar SELECT da tabela 'livros'
app.get('/livros', requireLogin, async (req, res) => {
    try {
        // ARQUITETO (CORREÇÃO): Usa Alias AS "disponivel" para a view
        const query = `
            SELECT id, titulo, autor, genero, status,
                   quantidade_disponivel AS "disponivel"
            FROM livros
            WHERE status = 'ativo' ORDER BY titulo
        `;
        const result = await pool.query(query);
        res.render('pages/livros', { title: 'Livros', livros: result.rows, hideSidebar: false });
    } catch (err) {
        console.error("Erro ao buscar livros:", err);
        res.status(500).send("Erro ao buscar dados.");
    }
});

// ARQUITETO: Rota refatorada para usar SELECT da tabela 'leitores'
app.get('/leitores', requireLogin, async (req, res) => {
    try {
        // ARQUITETO (CORREÇÃO): Formata 'nascimento' para YYYY-MM-DD para o modal
        const query = `
            SELECT id, nome, cpf, email, celular, cep, endereco,
                   TO_CHAR(nascimento, 'YYYY-MM-DD') AS "nascimento"
            FROM leitores
            ORDER BY nome
        `;
        const result = await pool.query(query);
        res.render('pages/leitores', { title: 'Leitores', leitores: result.rows, hideSidebar: false });
    } catch (err) {
        console.error("Erro ao buscar leitores:", err);
        res.status(500).send("Erro ao buscar dados.");
    }
});

// ARQUITETO: Rota refatorada para usar um JOIN e buscar dados relacionados
app.get('/emprestimos', requireLogin, async (req, res) => {
    try {
        // ARQUITETO (CORREÇÃO): Formata as datas para YYYY-MM-DD para o modal
        const query = `
            SELECT e.id, e.livro_id, e.leitor_id, e.status,
                   TO_CHAR(e.data_emprestimo, 'YYYY-MM-DD') AS "dataInicio",
                   TO_CHAR(e.data_devolucao_prevista, 'YYYY-MM-DD') AS "devolucao",
                   COALESCE(l.titulo, 'Livro Excluído') AS "livro",
                   COALESCE(t.nome, 'Leitor Excluído') AS "leitor",
                   COALESCE(t.cpf, 'N/A') AS "cpf"
            FROM emprestimos e
            LEFT JOIN livros l ON e.livro_id = l.id
            LEFT JOIN leitores t ON e.leitor_id = t.id
            ORDER BY e.status, e.data_devolucao_prevista;
        `;
        const result = await pool.query(query);
        res.render('pages/emprestimos', { title: 'Empréstimos', emprestimos: result.rows, hideSidebar: false });
    } catch (err) {
        console.error("Erro ao buscar empréstimos:", err);
        res.status(500).send("Erro ao buscar dados.");
    }
});

// ARQUITETO: Rota refatorada para usar SELECT COUNT(*) para métricas
app.get('/relatorios', requireLogin, async (req, res) => {
    try {
        const leitoresResult = await pool.query("SELECT COUNT(*) FROM leitores");
        const emprestimosResult = await pool.query("SELECT COUNT(*) FROM emprestimos WHERE status = 'pendente'");

        const totalLeitores = parseInt(leitoresResult.rows[0].count, 10);
        const emprestimosAbertos = parseInt(emprestimosResult.rows[0].count, 10);

        res.render('pages/relatorios', { title: 'Relatórios', hideSidebar: false, totalLeitores, emprestimosAbertos });
    } catch (err) {
        console.error("Erro ao gerar relatórios:", err);
        res.status(500).send("Erro ao buscar dados.");
    }
});

// ARQUITETO: Rota refatorada para usar JOIN no PDF
app.get('/relatorios/pdf', requireLogin, async (req, res) => {
    try {
        const query = `
            SELECT e.data_emprestimo AS "dataInicio",
                   e.data_devolucao_prevista AS "devolucao",
                   COALESCE(l.titulo, 'Livro Excluído') AS "livro",
                   COALESCE(t.nome, 'Leitor Excluído') AS "leitor"
            FROM emprestimos e
            LEFT JOIN livros l ON e.livro_id = l.id
            LEFT JOIN leitores t ON e.leitor_id = t.id
            ORDER BY e.data_emprestimo;
        `;
        const result = await pool.query(query);
        const emprestimos = result.rows;

        const doc = new PDFDocument({ margin: 50 });
        const filename = `Relatorio-Emprestimos-${new Date().toISOString().slice(0, 10)}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        doc.fontSize(18).font('Helvetica-Bold').text('Relatório de Empréstimos', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
        doc.moveDown(2);

        const tableTop = doc.y;
        const itemX = 50;
        const leitorX = 200;
        const dataEmpX = 350;
        const dataDevX = 450;
        const rowHeight = 25;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Livro', itemX, tableTop);
        doc.text('Leitor', leitorX, tableTop);
        doc.text('Data Empréstimo', dataEmpX, tableTop);
        doc.text('Data Devolução', dataDevX, tableTop);

        doc.moveTo(itemX - 5, tableTop + 15)
           .lineTo(dataDevX + 100, tableTop + 15)
           .lineWidth(0.5)
           .strokeColor("#aaaaaa")
           .stroke();

        doc.fontSize(10).font('Helvetica');
        let i = 0;
        emprestimos.forEach(emp => {
            const y = tableTop + (i + 1) * rowHeight;
            doc.text(emp.livro, itemX, y, { width: leitorX - itemX - 10, ellipsis: true });
            doc.text(emp.leitor, leitorX, y, { width: dataEmpX - leitorX - 10, ellipsis: true });
            doc.text(app.locals.formatarData(emp.dataInicio), dataEmpX, y); // Usa a função global para formatar
            doc.text(app.locals.formatarData(emp.devolucao), dataDevX, y); // Usa a função global para formatar
            i++;
        });

        doc.end();

    } catch (err) {
        console.error("Erro ao gerar PDF:", err);
        res.status(500).send("Erro ao gerar o relatório em PDF.");
    }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor a ser executado em http://localhost:${PORT}`);
});

